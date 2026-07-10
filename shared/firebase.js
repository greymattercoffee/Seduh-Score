// shared/firebase.js
// Firebase JS SDK v10 — modular imports via CDN

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage, connectStorageEmulator } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';
import { getFunctions, connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js';

const firebaseConfig = {
  apiKey:            "AIzaSyDwlaPgB_5g3xXDTq539JN09aWBpdHM6e4",
  authDomain:        "seduh-score.firebaseapp.com",
  projectId:         "seduh-score",
  storageBucket:     "seduh-score.firebasestorage.app",
  messagingSenderId: "298052620542",
  appId:             "1:298052620542:web:53376c72eaf81b35a8d5af",
  measurementId:     "G-GTFF3TYD37"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);
window._sdDb = db; // exposed for gates.js (classic script cannot import ES modules)

// Local dev only — connects to the Firebase Emulator Suite instead of the
// live project. Gated on hostname === 'localhost' (or the equivalent IP
// literal) so this can never fire when served from seduhscore.com. Firebase
// Hosting preview channels resolve to *.web.app / *.firebaseapp.com
// subdomains, never "localhost", so they're unaffected by this guard too.
// Calling getFunctions(app) here (rather than getApp() at each call site)
// is deliberate: the Functions SDK caches instances per (app, region), so
// every other getFunctions(getApp()) call in the codebase (admin/index.html,
// onboard/index.html) resolves to this same, already-emulator-connected
// instance — no other file needs to change.
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  const fns = getFunctions(app);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(fns, 'localhost', 5001);
  connectStorageEmulator(storage, 'localhost', 9199);
  console.info('[Seduh Score] Connected to Firebase Emulator Suite (localhost).');
} else {
  // Enable offline persistence for competition-day reliability — emulator
  // sessions skip this; IndexedDB persistence against a Firestore emulator
  // that gets wiped/restarted mid-session is a footgun, not a benefit.
  enableIndexedDbPersistence(db).catch(err => {
    // 'failed-precondition': multiple tabs open — acceptable
    // 'unimplemented': browser unsupported — acceptable
    console.warn('Firestore persistence unavailable:', err.code);
  });
}

export { auth, db, storage };
