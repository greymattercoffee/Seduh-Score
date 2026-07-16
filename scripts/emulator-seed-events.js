// scripts/emulator-seed-events.js
// Dev-only utility: writes a couple of test docs into the Firestore Emulator's
// `upcoming_events` collection, for exercising shared/upcoming-events.js
// (index.html's featured-event ribbon + the logged-in Console reel,
// coming-soon/index.html's carousel) during local emulator sessions. The
// Firestore emulator always starts empty — there is no --import snapshot
// configured in firebase.json — so without this, both surfaces correctly
// (not buggily) show "No upcoming events yet". Never touches production —
// refuses to run unless FIRESTORE_EMULATOR_HOST is set.
//
// Usage (from repo root, emulators already running):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
//   GCLOUD_PROJECT=seduh-score \
//   NODE_PATH=./functions/node_modules \
//   node scripts/emulator-seed-events.js

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Refusing to run: FIRESTORE_EMULATOR_HOST is not set. ' +
    'This script only ever runs against the Firestore emulator.');
  process.exit(1);
}

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'seduh-score' });

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function daysFromNow(days, hour) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Mirrors the exact field shape admin/index.html writes (POA-42):
// eventName, eventDate (ISO string), eventVenue, eventFormat, eventDescription,
// eventId (slug), imageUrl. Matches shared/upcoming-events.js's read shape and
// the FORMAT_META keys ('throwdown' | 'liga' | 'cup-taster' | 'btc').
const TEST_EVENTS = [
  {
    eventName: 'Girls Got Drip Vol. 1',
    eventDate: daysFromNow(14, 14),
    eventVenue: 'Bandar Seri Begawan',
    eventFormat: 'throwdown',
    eventDescription: 'All-women barista knockout — 16-brewer bracket, redemption round, live audience view.',
    imageUrl: null,
  },
  {
    eventName: 'Liga Kopi Musim 2',
    eventDate: daysFromNow(28, 10),
    eventVenue: 'Kiulap, Brunei',
    eventFormat: 'liga',
    eventDescription: 'Round-robin league, second season — 8 brewers across 7 rounds.',
    imageUrl: null,
  },
  {
    eventName: 'Girls Got Drip Vol. 0',
    eventDate: daysFromNow(-21, 14),
    eventVenue: 'Bandar Seri Begawan',
    eventFormat: 'throwdown',
    eventDescription: 'The one that started it — completed event, kept as a "recently on Seduh Score" test case.',
    imageUrl: null,
  },
];

async function main() {
  const db = getFirestore();
  const col = db.collection('upcoming_events');

  const existing = await col.get();
  if (!existing.empty) {
    console.log('upcoming_events already has ' + existing.size + ' doc(s) — skipping seed to avoid duplicates.');
    console.log('Delete them via the Firestore Emulator UI (usually http://127.0.0.1:4000/firestore) to re-seed clean.');
    return;
  }

  for (const ev of TEST_EVENTS) {
    const doc = { ...ev, eventId: slugify(ev.eventName) };
    await col.add(doc);
    console.log('Seeded: ' + ev.eventName + ' (' + ev.eventDate + ')');
  }
  console.log('\nSeeded ' + TEST_EVENTS.length + ' test event(s) into the Firestore emulator\'s upcoming_events collection.');
  console.log('Refresh index.html — the top ribbon and, once signed in, the Console reel should now show real data.');
}

main().catch(err => { console.error(err); process.exit(1); });
