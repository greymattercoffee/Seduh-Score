// shared/firebase.js
// Firebase JS SDK v10 — modular imports via CDN

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyDwlaPgB_5g3xXDTq539JN09aWBpdHM6e4",
  authDomain:        "seduh-score.firebaseapp.com",
  projectId:         "seduh-score",
  storageBucket:     "seduh-score.firebasestorage.app",
  messagingSenderId: "298052620542",
  appId:             "1:298052620542:web:53376c72eaf81b35a8d5af",
  measurementId:     "G-GTFF3TYD37"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
window._sdDb = db; // exposed for gates.js (classic script cannot import ES modules)

// Enable offline persistence for competition-day reliability
enableIndexedDbPersistence(db).catch(err => {
  // 'failed-precondition': multiple tabs open — acceptable
  // 'unimplemented': browser unsupported — acceptable
  console.warn('Firestore persistence unavailable:', err.code);
});

export { auth, db };
