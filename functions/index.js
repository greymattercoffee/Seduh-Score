// Seduh Score — Firebase Cloud Functions
// HTTPS callable functions for org account management.
// All require the caller to have super_admin: true in their token claims.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp }      = require('firebase-admin/app');
const { getAuth }            = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage }         = require('firebase-admin/storage');

initializeApp();

function requireSuperAdmin(auth) {
  if (!auth || !auth.token.super_admin) {
    throw new HttpsError('permission-denied', 'Super admin only.');
  }
}

// ── POA-47 — Public onboarding intake helpers ───────────────────────────────

const MAX = { name: 200, email: 200, phone: 40, date: 100, notes: 2000, path: 1000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bug A fix: the client sends the Storage path it uploaded to, never a
// download URL — getDownloadURL() itself requires Storage read access,
// which storage.rules correctly denies to the public (org-requests/ is
// "no public read" by design), so a URL-based handoff can never work here.
// Validating the path shape (and, below, that the object actually exists)
// stands in for what the URL's host/path check used to guard against: an
// attacker pointing this field at something outside org-requests/.
const PAYMENT_PATH_RE = /^org-requests\/[^/]+\/payment\.[A-Za-z0-9]+$/;

function isValidPaymentProofPath(path) {
  return typeof path === 'string' && path.length > 0 && path.length <= MAX.path
    && PAYMENT_PATH_RE.test(path);
}

// No App Check or rate-limiting package is wired into this project yet
// (confirmed: no initializeAppCheck call anywhere, no rate-limit dependency
// in functions/package.json) — a self-contained Firestore-backed IP rate
// limit is used instead so this function ships without new console-side
// provisioning. Revisit App Check once a reCAPTCHA site key exists.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX       = 5;

function getClientIp(request) {
  const req = request.rawRequest;
  const fwd = req?.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req?.ip || 'unknown';
}

async function checkRateLimit(ip) {
  const ref = getFirestore().collection('rate_limits').doc(ip);
  const now = Date.now();
  await getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : null;
    if (!data || now - data.windowStart > RATE_LIMIT_WINDOW_MS) {
      tx.set(ref, { windowStart: now, count: 1 });
      return;
    }
    if (data.count >= RATE_LIMIT_MAX) {
      throw new HttpsError('resource-exhausted', 'Too many submissions from this connection. Please try again later.');
    }
    tx.update(ref, { count: FieldValue.increment(1) });
  });
}

async function writeAudit(orgId, action, actorUid, details) {
  await getFirestore()
    .collection('orgs').doc(orgId)
    .collection('audit').add({
      action,
      actor:     actorUid,
      timestamp: FieldValue.serverTimestamp(),
      details:   details ?? null,
    });
}

// ── Pagon (POA-41) — Org roster functions ───────────────────────────────────

// createOrg — create a new orgs doc at status:'pending', source:'manual'.
// No Firebase Auth account is created here — that happens at activation.
exports.createOrg = onCall(async (request) => {
  requireSuperAdmin(request.auth);
  const { displayName, email, notes } = request.data;
  if (!displayName || !email) {
    throw new HttpsError('invalid-argument', 'displayName and email are required.');
  }
  const ref = getFirestore().collection('orgs').doc();
  await ref.set({
    displayName,
    email,
    status:           'pending',
    tier:             null,
    expiry:           null,
    notes:            notes ?? '',
    paymentProofPath: null,
    source:           'manual',
    createdAt:        FieldValue.serverTimestamp(),
    activatedAt:      null,
    activatedBy:      null,
  });
  await writeAudit(ref.id, 'created', request.auth.uid, displayName);
  return { orgId: ref.id };
});

// activateOrg — creates the org's Firebase Auth account server-side (first
// activation only), sets custom claims, updates the org doc, writes audit.
// Works for both pending→active and tier changes on an already-active org.
// Writes 'activated' audit entry for first activation, 'tier_changed' for
// subsequent updates (determined by reading the current status from Firestore).
//
// POA-56: Auth user creation lives here, server-side, on purpose — it used
// to happen client-side via createUserWithEmailAndPassword() called on the
// admin's own signed-in Auth instance, which signs the client in as the
// newly-created user the instant it resolves. That silently ended the
// admin's super_admin session, so the activateOrgFn call that followed ran
// unauthenticated and was rejected by requireSuperAdmin below — activation
// never actually completed. Do not reintroduce client-side Auth user
// creation for orgs; resolve the account here instead.
exports.activateOrg = onCall(async (request) => {
  requireSuperAdmin(request.auth);
  const { orgId, password, tier, expiry, start } = request.data;
  if (!orgId || !tier) {
    throw new HttpsError('invalid-argument', 'orgId and tier are required.');
  }
  const db     = getFirestore();
  const orgRef = db.collection('orgs').doc(orgId);
  const snap   = await orgRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Org not found.');
  }
  const orgData   = snap.data();
  const email     = orgData.email;
  const wasActive = orgData.status === 'active';
  const expiryVal = expiry ?? null;
  // start: an explicit value always wins. Omitted on a fresh pending→active
  // activation defaults to "now" (preserves the old immediate-access
  // behaviour). Omitted on an already-active org's tier update preserves
  // whatever start was set before — a blank field must never silently
  // reset an org's start to "now", which would grant early access to an
  // org that was deliberately scheduled ahead of their event.
  const startVal = start ?? (wasActive
    ? (orgData.start ?? Math.floor(Date.now() / 1000))
    : Math.floor(Date.now() / 1000));

  // Resolve (or create) the org's Auth account by email — the orgs doc's
  // own email field is the source of truth, never a client-supplied one.
  // Re-activating an org, or a duplicate public-form submission for the
  // same email, both land here with an existing account: reuse it rather
  // than erroring, per POA-56 handoff step 1.7.
  let userRecord;
  let createdNewUser = false;
  try {
    userRecord = await getAuth().getUserByEmail(email);
  } catch (e) {
    if (e.code !== 'auth/user-not-found') throw e;
    if (!password) {
      throw new HttpsError('invalid-argument', 'Password is required to activate a new org account.');
    }
    userRecord = await getAuth().createUser({ email, password });
    createdNewUser = true;
  }

  try {
    await getAuth().setCustomUserClaims(userRecord.uid, {
      subscription_tier:   tier,
      subscription_expiry: expiryVal,
      subscription_start:  startVal,
    });
    await orgRef.update({
      status:      'active',
      tier,
      expiry:      expiryVal,
      start:       startVal,
      activatedAt: FieldValue.serverTimestamp(),
      activatedBy: request.auth.uid,
    });
    const detail = tier + ' · starts ' + new Date(startVal * 1000).toISOString()
      + ' · expires ' + (expiryVal ? new Date(expiryVal * 1000).toISOString() : 'never');
    await writeAudit(orgId, wasActive ? 'tier_changed' : 'activated', request.auth.uid, detail);
  } catch (e) {
    // Don't leave an orphaned Auth account with no matching org record if
    // anything after creation fails — roll it back rather than silently
    // stranding it. Only ever rolls back a user this same call just created.
    if (createdNewUser) {
      await getAuth().deleteUser(userRecord.uid).catch(() => {});
    }
    throw e;
  }

  return { success: true };
});

// updateOrgNotes — update the notes field and write a note_added audit entry.
// Audit write is server-side only; client cannot write to the audit subcollection.
exports.updateOrgNotes = onCall(async (request) => {
  requireSuperAdmin(request.auth);
  const { orgId, notes } = request.data;
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required.');
  }
  await getFirestore().collection('orgs').doc(orgId).update({ notes: notes ?? '' });
  await writeAudit(orgId, 'note_added', request.auth.uid, null);
  return { success: true };
});

// archiveOrg — set status to archived and write an archived audit entry.
exports.archiveOrg = onCall(async (request) => {
  requireSuperAdmin(request.auth);
  const { orgId } = request.data;
  if (!orgId) {
    throw new HttpsError('invalid-argument', 'orgId is required.');
  }
  await getFirestore().collection('orgs').doc(orgId).update({ status: 'archived' });
  await writeAudit(orgId, 'archived', request.auth.uid, null);
  return { success: true };
});

// ── POA-47 — Public onboarding intake ───────────────────────────────────────

// submitOrgRequest — publicly callable, unauthenticated. Writes a new orgs
// doc at status:'pending', source:'public_form'. Every field is validated
// and mapped explicitly — no pass-through of arbitrary client payload, and
// the client can never set status/tier/expiry/source itself.
exports.submitOrgRequest = onCall(async (request) => {
  await checkRateLimit(getClientIp(request));

  const d = request.data || {};
  const displayName      = typeof d.displayName === 'string' ? d.displayName.trim() : '';
  const email             = typeof d.email === 'string' ? d.email.trim() : '';
  const contactName       = typeof d.contactName === 'string' ? d.contactName.trim() : '';
  const contactPhone      = typeof d.contactPhone === 'string' ? d.contactPhone.trim() : '';
  const proposedEventDate = typeof d.proposedEventDate === 'string' ? d.proposedEventDate.trim() : '';
  const tierInterest      = d.tierInterest;
  const storagePath       = d.storagePath;
  const notes             = typeof d.notes === 'string' ? d.notes.trim() : '';

  if (!displayName || displayName.length > MAX.name) {
    throw new HttpsError('invalid-argument', 'Organisation / cafe name is required.');
  }
  if (!EMAIL_RE.test(email) || email.length > MAX.email) {
    throw new HttpsError('invalid-argument', 'A valid contact email is required.');
  }
  if (!contactName || contactName.length > MAX.name) {
    throw new HttpsError('invalid-argument', 'Contact name is required.');
  }
  if (!contactPhone || contactPhone.length > MAX.phone) {
    throw new HttpsError('invalid-argument', 'Contact phone is required.');
  }
  if (!proposedEventDate || proposedEventDate.length > MAX.date) {
    throw new HttpsError('invalid-argument', 'Proposed event date is required.');
  }
  if (tierInterest !== 'per_event' && tierInterest !== 'annual') {
    throw new HttpsError('invalid-argument', 'Tier interest must be per_event or annual.');
  }
  if (!isValidPaymentProofPath(storagePath)) {
    throw new HttpsError('invalid-argument', 'A valid payment screenshot upload is required.');
  }
  const [fileExists] = await getStorage().bucket().file(storagePath).exists();
  if (!fileExists) {
    throw new HttpsError('invalid-argument', 'Payment screenshot upload not found — please try again.');
  }
  if (notes.length > MAX.notes) {
    throw new HttpsError('invalid-argument', 'Notes are too long.');
  }

  const ref = getFirestore().collection('orgs').doc();
  await ref.set({
    displayName,
    email,
    contactName,
    contactPhone,
    proposedEventDate,
    tierInterest,
    notes,
    paymentProofPath: storagePath,
    status:           'pending',
    tier:             null,
    expiry:           null,
    source:           'public_form',
    createdAt:        FieldValue.serverTimestamp(),
    activatedAt:      null,
    activatedBy:      null,
  });
  await writeAudit(ref.id, 'request_submitted', 'public_form', displayName);
  return { orgId: ref.id, success: true };
});
