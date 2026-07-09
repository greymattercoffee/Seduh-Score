// Seduh Score — Firebase Cloud Functions
// HTTPS callable functions for org account management.
// All require the caller to have super_admin: true in their token claims.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp }      = require('firebase-admin/app');
const { getAuth }            = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

function requireSuperAdmin(auth) {
  if (!auth || !auth.token.super_admin) {
    throw new HttpsError('permission-denied', 'Super admin only.');
  }
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

// ── Pre-existing functions (unchanged) ──────────────────────────────────────

// setOrgClaims — set subscription_tier + subscription_expiry on an org account
exports.setOrgClaims = onCall(async (request) => {
  requireSuperAdmin(request.auth);
  const { uid, subscription_tier, subscription_expiry } = request.data;
  if (!uid || !subscription_tier) {
    throw new HttpsError('invalid-argument', 'uid and subscription_tier are required.');
  }
  await getAuth().setCustomUserClaims(uid, { subscription_tier, subscription_expiry });
  return { success: true };
});

// getOrgByEmail — look up org UID + current claims by email
exports.getOrgByEmail = onCall(async (request) => {
  requireSuperAdmin(request.auth);
  const { email } = request.data;
  if (!email) {
    throw new HttpsError('invalid-argument', 'email is required.');
  }
  const userRecord = await getAuth().getUserByEmail(email);
  return {
    uid:    userRecord.uid,
    email:  userRecord.email,
    claims: {
      subscription_tier:   userRecord.customClaims?.subscription_tier   ?? null,
      subscription_expiry: userRecord.customClaims?.subscription_expiry ?? null,
    },
  };
});

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
    status:          'pending',
    tier:            null,
    expiry:          null,
    notes:           notes ?? '',
    paymentProofUrl: null,
    source:          'manual',
    createdAt:       FieldValue.serverTimestamp(),
    activatedAt:     null,
    activatedBy:     null,
  });
  await writeAudit(ref.id, 'created', request.auth.uid, displayName);
  return { orgId: ref.id };
});

// activateOrg — set Auth custom claims + update org doc status + write audit.
// Works for both pending→active and tier changes on an already-active org.
// Writes 'activated' audit entry for first activation, 'tier_changed' for
// subsequent updates (determined by reading the current status from Firestore).
exports.activateOrg = onCall(async (request) => {
  requireSuperAdmin(request.auth);
  const { orgId, uid, tier, expiry } = request.data;
  if (!orgId || !uid || !tier) {
    throw new HttpsError('invalid-argument', 'orgId, uid, and tier are required.');
  }
  const db     = getFirestore();
  const orgRef = db.collection('orgs').doc(orgId);
  const snap   = await orgRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Org not found.');
  }
  const wasActive  = snap.data().status === 'active';
  const expiryVal  = expiry ?? null;

  await getAuth().setCustomUserClaims(uid, {
    subscription_tier:   tier,
    subscription_expiry: expiryVal,
  });
  await orgRef.update({
    status:      'active',
    tier,
    expiry:      expiryVal,
    activatedAt: FieldValue.serverTimestamp(),
    activatedBy: request.auth.uid,
  });
  await writeAudit(orgId, wasActive ? 'tier_changed' : 'activated', request.auth.uid, tier);
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
