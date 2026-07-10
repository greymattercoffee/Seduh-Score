// scripts/emulator-seed-admin.js
// Dev-only utility: creates (or reuses) a super_admin test user against the
// Firebase Auth Emulator, for signing into admin/index.html during local
// emulator sessions. Never touches production — refuses to run unless
// FIREBASE_AUTH_EMULATOR_HOST is set.
//
// Usage (from repo root, emulators already running):
//   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//   GCLOUD_PROJECT=seduh-score \
//   NODE_PATH=./functions/node_modules \
//   node scripts/emulator-seed-admin.js

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to run: FIREBASE_AUTH_EMULATOR_HOST is not set. ' +
    'This script only ever runs against the Auth emulator.');
  process.exit(1);
}

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const TEST_EMAIL = 'admin-test@seduhscore.local';
const TEST_PASSWORD = 'test-password-123';

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'seduh-score' });

async function main() {
  const auth = getAuth();
  let user;
  try {
    user = await auth.getUserByEmail(TEST_EMAIL);
  } catch {
    user = await auth.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  }
  await auth.setCustomUserClaims(user.uid, { super_admin: true });
  console.log('Seeded emulator super_admin test user:');
  console.log('  email:   ' + TEST_EMAIL);
  console.log('  password:' + TEST_PASSWORD);
  console.log('  uid:     ' + user.uid);
}

main().catch(err => { console.error(err); process.exit(1); });
