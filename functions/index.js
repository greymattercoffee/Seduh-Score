// Seduh Score — Firebase Cloud Functions
// Two HTTPS callable functions for org account management.
// Both require the caller to have super_admin: true in their token claims.

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp }      = require('firebase-admin/app');
const { getAuth }            = require('firebase-admin/auth');

initializeApp();

function requireSuperAdmin(auth) {
  if (!auth || !auth.token.super_admin) {
    throw new HttpsError('permission-denied', 'Super admin only.');
  }
}

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
