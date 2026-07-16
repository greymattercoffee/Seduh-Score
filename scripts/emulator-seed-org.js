// scripts/emulator-seed-org.js
// Dev-only utility: creates (or reuses) a per_event-tier test org user against
// the Firebase Auth Emulator, for testing tier-gated features (throwdown_report,
// pdf_branding, redemption/revival, etc.) via index.html's "Org login" panel.
// Sets the same custom-claim shape functions/index.js's activateOrg sets in
// production (subscription_tier/subscription_expiry/subscription_start), just
// without the Firestore org doc or super_admin-caller requirement. Never
// touches production — refuses to run unless FIREBASE_AUTH_EMULATOR_HOST is set.
//
// Usage (from repo root, emulators already running):
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//   GCLOUD_PROJECT=seduh-score \
//   NODE_PATH=./functions/node_modules \
//   node scripts/emulator-seed-org.js [tier]
//
// tier defaults to 'per_event'; pass 'annual' to seed that tier instead.

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to run: FIREBASE_AUTH_EMULATOR_HOST is not set. ' +
    'This script only ever runs against the Auth emulator.');
  process.exit(1);
}

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const TEST_EMAIL    = 'org-test@seduhscore.local';
const TEST_PASSWORD = 'test-password-123';
const tier = process.argv[2] || 'per_event';
if (tier !== 'per_event' && tier !== 'annual') {
  console.error('Unknown tier "' + tier + '" — expected "per_event" or "annual".');
  process.exit(1);
}

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'seduh-score' });

async function main() {
  const auth = getAuth();
  let user;
  try {
    user = await auth.getUserByEmail(TEST_EMAIL);
  } catch {
    user = await auth.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  }
  await auth.setCustomUserClaims(user.uid, {
    subscription_tier:   tier,
    subscription_expiry: null,                        // never expires
    subscription_start:  Math.floor(Date.now() / 1000), // active immediately
  });
  console.log('Seeded emulator ' + tier + ' test org user:');
  console.log('  email:   ' + TEST_EMAIL);
  console.log('  password:' + TEST_PASSWORD);
  console.log('  uid:     ' + user.uid);
  console.log('Sign in via index.html\'s "Org login" panel — the session carries');
  console.log('over to every module (Throwdown, BBTC, Liga, Cup Taster).');
}

main().catch(err => { console.error(err); process.exit(1); });
