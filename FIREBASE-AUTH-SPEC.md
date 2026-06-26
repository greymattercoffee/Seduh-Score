# Seduh Score — Firebase Auth & Admin Panel Spec
*Strategy session: June 2026 · Target version: v4.8.0*
*Confidential — knowledge base only. Do not push to public repo.*

---

## Overview

This spec covers three pillars of the Firebase Auth milestone:

1. **Auth** — Replace simulated `[data-auth]` toggle with real Firebase Email/Password login
2. **Gates** — Replace `gates.js` stub with real Firebase custom claims + Firestore platform switches
3. **Admin Panel** — Internal tool for org account management and platform switch control

All decisions in this spec are locked. Claude Code must not interpret or fill gaps — if anything is unclear, stop and flag it.

---

## Pre-conditions

Before any build session starts, confirm:

- Firebase project `seduh-score` exists at console.firebase.google.com ✅
- Email/Password auth provider is enabled in Firebase Console ✅
- Firestore database created (if not yet, create in production mode)
- Firebase Hosting configured (v4.6 milestone — must ship before this)
- Firebase SDK version to use: **Firebase JS SDK v10 (modular)**

---

## Version & file plan

**Version bump:** v4.7.0 → v4.8.0 (minor bump — significant user-facing architecture change)

**New files:**
- `shared/firebase.js` — Firebase app init, auth and Firestore exports
- `shared/auth.js` — Auth state management, session handler
- `admin/index.html` — Internal admin panel (standalone, self-contained)

**Modified files:**
- `index.html` — Wire real auth to existing `[data-auth]` markup
- `shared/gates.js` — Replace stub internals with Firebase claims + Firestore reads

**Unchanged files:**
- All module files (`throwdown/`, `liga/`, `bbtc/`, `cup-taster/`) — zero changes
- `shared/storage.js` — unchanged (Firebase adapter deferred to v5.0)
- `shared/audience.js`, `shared/eventconfig.js`, `shared/timer.js` — unchanged
- `shared/theme.css` — unchanged

**Rule:** Modules must not be touched in this milestone. The `Gates.canAccess()` API contract is unchanged. If modules need changes, stop and escalate to strategy chat.

---

## Pillar 1 — Firebase initialisation (`shared/firebase.js`)

### Purpose
Single source of truth for Firebase app, auth instance, and Firestore instance. Loaded by `index.html`, `admin/index.html`, and `shared/auth.js`. Never loaded by module files directly.

### Implementation

```javascript
// shared/firebase.js
// Firebase JS SDK v10 — modular imports via CDN

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, enableIndexedDbPersistence }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  // Paste exact config object from Firebase Console → Project Settings
  // These are public identifiers — safe to commit. Security enforced by Firestore rules.
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Enable offline persistence for competition-day reliability
enableIndexedDbPersistence(db).catch(err => {
  // 'failed-precondition': multiple tabs open — acceptable
  // 'unimplemented': browser unsupported — acceptable
  console.warn('Firestore persistence unavailable:', err.code);
});

export { auth, db };
```

### Security note
Firebase config values (apiKey, projectId, etc.) are **not secrets** — they are public identifiers. Security is enforced by Firebase Security Rules, not by hiding the config. Commit the config to the repo. Do not use environment variables — there is no build step.

### Script loading order in `index.html`
```html
<!-- Existing classic scripts — unchanged, load first -->
<script src="shared/storage.js"></script>
<script src="shared/timer.js"></script>
<script src="shared/audience.js"></script>
<script src="shared/gates.js"></script>
<script src="shared/eventconfig.js"></script>

<!-- New Firebase modules — load after classic scripts -->
<script type="module" src="shared/firebase.js"></script>
<script type="module" src="shared/auth.js"></script>
```

`gates.js` stays a classic script — module files call it as a classic script and cannot be changed in this milestone. `auth.js` calls `Gates.init(user)` on the global `Gates` object; this works because classic scripts execute synchronously before ES module scripts resolve.

---

## Pillar 2 — Auth state management (`shared/auth.js`)

### Purpose
Manages the Firebase auth session. Translates Firebase auth state into the existing `[data-auth]` attribute that the front door markup already uses. The front door HTML does not change — only what drives the attribute changes.

### On page load
Firebase SDK checks for a cached session automatically (persistence: `local` — default, no config needed). `onAuthStateChanged` fires once with either a user object or null.

**Logged in (user found):**
- Set `document.documentElement.setAttribute('data-auth', 'in')`
- Populate org chip with `user.email`
- Call `Gates.init(user)` to load claims + platform switches
- Clear the cold-start offline timeout (see below)

**Not logged in (null):**
- Set `document.documentElement.setAttribute('data-auth', 'out')`
- Gates stay in default state (all Community-level access only)

### Sign in (login form submit)
```javascript
signInWithEmailAndPassword(auth, email, password)
  .then(() => { /* onAuthStateChanged handles UI update */ })
  .catch(err => { showLoginError(err.code); });
```

### Sign out (sign out button)
```javascript
signOut(auth);
// onAuthStateChanged fires with null — handles UI reset automatically
```

### Redirect hook (Option A now, Option B path later)

Inside the `onAuthStateChanged` handler, after setting `data-auth="in"`:

```javascript
// REDIRECT HOOK — currently Option A (stay on front door)
// To enable Option B later, replace this block with:
// window.location.href = '/org/';
// Current behaviour: stay on front door, UI updates in place via [data-auth]
```

This comment must be present verbatim in the built file.

### Cold-start offline handling

If `onAuthStateChanged` has not fired within 5 seconds of page load, show a non-blocking banner:

> "You appear to be offline. If you were previously signed in, your session will restore when your connection returns."

- Banner styled with `--rd` background, white text
- Dismissible with × button
- Does not alter `[data-auth]` or block any module access
- Cleared immediately when `onAuthStateChanged` eventually fires

```javascript
const offlineTimeout = setTimeout(showOfflineBanner, 5000);
onAuthStateChanged(auth, user => {
  clearTimeout(offlineTimeout);
  // ... rest of handler
});
```

### Token refresh via `onIdTokenChanged`

```javascript
onIdTokenChanged(auth, user => {
  if (user) Gates.init(user); // re-read claims after silent token refresh
});
```

This fires after every token refresh (~55 min). Re-reading claims means if Firdaus extends a window from the admin panel mid-session, the organiser picks it up on next refresh. Invisible to the organiser.

### Expiry soft warning

After `Gates.init()` completes and expiry is known, `auth.js` starts a 60-second interval:

```javascript
const expiryInterval = setInterval(() => {
  if (Gates.isExpired()) {
    showExpiryBanner();
    clearInterval(expiryInterval);
  }
}, 60000);
```

`Gates.isExpired()` is a new public method on gates.js (see below). Returns `true` if `_expiry` is set and has passed.

Expiry banner text:
> "Your access window has ended. You can finish your current session, but some features may become unavailable on next login."

- Styled with `--am` (amber) — warning, not error
- Dismissible with × button
- Session continues uninterrupted — no features cut off
- Next cold start after expiry: `getTier()` returns `'community'`, gates enforce accordingly

---

## Pillar 3 — Gates replacement (`shared/gates.js`)

### What changes
Internal methods `getTier()` and `isEnabled()` are replaced with real implementations. The public `Gates.canAccess()` API is **completely unchanged** — same signature, same return shape. Zero module changes required.

### New internal state

```javascript
let _tier     = 'community';   // 'community' | 'per_event' | 'annual'
let _expiry   = null;          // Unix timestamp (seconds) or null
let _switches = {};            // { featureKey: boolean }
```

### `Gates.init(user)` — new public method

Called by `auth.js` only. Never called from module files.

```javascript
Gates.init = async function(user) {
  const result = await user.getIdTokenResult();
  _tier   = result.claims.subscription_tier   || 'community';
  _expiry = result.claims.subscription_expiry || null;

  try {
    const snap = await getDoc(doc(db, 'platform', 'switches'));
    _switches = snap.exists() ? snap.data() : {};
  } catch (e) {
    // Firestore unreachable — _switches stays {}
    // Platform-switch-only features stay hidden (safe default)
    console.warn('Platform switches unavailable:', e);
  }
};
```

### `Gates.isExpired()` — new public method

Called by `auth.js` expiry monitor only.

```javascript
Gates.isExpired = function() {
  return _expiry !== null && (Date.now() / 1000) > _expiry;
};
```

### New internal: `getTier()`

```javascript
function getTier() {
  if (!_tier || _tier === 'community') return 'community';
  if (Gates.isExpired()) return 'community'; // expired = community access
  return _tier;
}
```

### New internal: `isEnabled(featureKey)`

```javascript
function isEnabled(featureKey) {
  const feature = FEATURES[featureKey];
  if (!feature) return false;
  if (feature.minTier === null) {
    // Platform-switch-only — must be explicitly true in switches doc
    return _switches[featureKey] === true;
  }
  // Tier-gated features: enabled unless explicitly false
  // Absence from _switches means enabled
  return _switches[featureKey] !== false;
}
```

### `Gates.canAccess()` — unchanged

```javascript
// This function signature and return shape do not change.
// Internal implementation only.
Gates.canAccess = function(featureKey) {
  const feature = FEATURES[featureKey];
  if (!feature) return { allowed: false, reason: 'disabled' };
  if (!isEnabled(featureKey)) return { allowed: false, reason: 'disabled' };
  if (feature.minTier === null) return { allowed: true }; // passed isEnabled
  const rank = tierRank(getTier());
  const required = tierRank(feature.minTier);
  if (rank < required) return { allowed: false, reason: 'tier' };
  return { allowed: true };
};
```

### `tierRank()` — unchanged

```javascript
function tierRank(tier) {
  return { community: 0, per_event: 1, annual: 2 }[tier] ?? -1;
}
```

### Unauthenticated / offline default

If `Gates.init()` has not been called:
- `_tier` = `'community'`, `_switches` = `{}`
- Community features work normally
- All gated features return `{ allowed: false, reason: 'tier' }`
- All platform-switch features return `{ allowed: false, reason: 'disabled' }`

This is correct. Unauthenticated users get Community access only.

---

## Pillar 4 — Admin Panel (`admin/index.html`)

### Access control

First thing on page load — before rendering any UI:

```javascript
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = '../index.html'; return; }
  const result = await user.getIdTokenResult();
  if (!result.claims.super_admin) {
    window.location.href = '../index.html';
    return;
  }
  renderAdminPanel(user);
});
```

`super_admin: true` is set manually in Firebase Console on Firdaus's account only. Never set via the admin panel — only via Console. This prevents any privilege escalation path.

### File structure

`admin/index.html` — fully self-contained. Inline CSS, inline JS. Loads `firebase.js` only. Does **not** load `theme.css`, `gates.js`, `timer.js`, `audience.js`, `storage.js`, or `eventconfig.js`. The admin panel is an isolated internal tool, not a platform module. Styling is minimal and functional.

### Two Cloud Functions required

Custom claims cannot be set from browser JS (Firebase security constraint). Two HTTPS callable Cloud Functions bridge this:

**`setOrgClaims`**

Input:
```javascript
{ uid: string, subscription_tier: string, subscription_expiry: number | null }
```
Behaviour:
1. Verify caller has `super_admin: true` (reject if not)
2. `admin.auth().setCustomUserClaims(uid, { subscription_tier, subscription_expiry })`
3. Return `{ success: true }`

**`getOrgByEmail`**

Input:
```javascript
{ email: string }
```
Behaviour:
1. Verify caller has `super_admin: true`
2. `admin.auth().getUserByEmail(email)`
3. Return `{ uid, email, claims: { subscription_tier, subscription_expiry } }`

These are the only Cloud Functions in this milestone.

### Admin panel UI

Layout: single column, dark background (`--surface-deep`), max-width 600px, centred. No Seduh mark in header — internal tool only.

**Org Management section:**

```
Org Management

Email  [ ________________________ ]  [ Find ]

— after Find —
Email:   organiser@cafe.com
UID:     abc123...
Tier:    per_event
Expiry:  31 Aug 2026 23:59 BNT

Set access:
Tier:   [ Community ▾ / Per-Event ▾ / Annual ▾ ]
Start:  [ date input ]
End:    [ date input ]

[ Set Window ]     [ Revoke Now ]
```

"Revoke Now" sets `subscription_expiry` to `Math.floor(Date.now() / 1000) - 1` (one second in the past — immediately expired).

No "Delete account" — accounts are never deleted via admin panel. Use Firebase Console directly if needed.

**Platform Switches section:**

```
Platform Switches

cup_taster_module      [ ON  ]
audience_links_live    [ OFF ]
```

Toggle buttons. Green (`--gn`) = on. Muted (`--txt3`) = off. Click to toggle. On toggle: write to Firestore `platform/switches`, show inline "Saved." text that fades after 2 seconds. No confirm dialog — the stakes are low and the action is easily reversed.

### Date/time handling

All dates stored as Unix timestamps (seconds) in Firebase custom claims and Firestore. Admin panel date pickers are local date inputs (`<input type="datetime-local">`). Convert to Unix timestamp on save:

```javascript
const ts = Math.floor(new Date(inputValue).getTime() / 1000);
```

Display expiry times in BNT (Brunei Time, UTC+8). Convert for display:

```javascript
new Date(expiry * 1000).toLocaleString('en-BN', { timeZone: 'Asia/Brunei' })
```

---

## Firestore data model

### `platform/switches` (single document)

```json
{
  "cup_taster_module": true,
  "audience_links_live": false,
  "_updated": "<server timestamp>"
}
```

Create this document manually in Firebase Console before first admin panel run.

### `events/{eventId}` (collection — hooks only, no UI this milestone)

```javascript
{
  org_uid: string,
  event_name: string,
  module: 'throwdown' | 'liga' | 'bbtc' | 'cup_taster',
  created_at: timestamp,
  // v5.1 fields — do not set, do not null, just absent:
  // registration_open: timestamp
  // registration_close: timestamp
  // registration_entries: array
}
```

Do not build any UI for events in this milestone. Document the schema in Firestore Security Rules only.

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Platform switches — any authenticated org can read; super admin write only
    match /platform/switches {
      allow read: if request.auth != null;
      allow write: if request.auth.token.super_admin == true;
    }

    // Events — locked until v5.1
    match /events/{eventId} {
      allow read, write: if false;
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Error states — front door login form

All errors display inline below the login form. `--rd` colour. No `alert()` calls. Form fields stay populated on error.

| Firebase error code | Message shown |
|---|---|
| `auth/wrong-password` | "Incorrect password. Please try again." |
| `auth/user-not-found` | "No account found with that email." |
| `auth/too-many-requests` | "Too many attempts. Please wait a few minutes and try again." |
| `auth/network-request-failed` | "Connection problem. Check your internet and try again." |
| Any other | "Sign in failed. Please try again." |

---

## Build session sequence

Four sessions recommended. Do not merge to `main` until all four are complete.

**Session 1 — Firebase init + auth wiring**
Files: `shared/firebase.js` (new), `shared/auth.js` (new), `index.html` (modified)
Goal: real login/logout, `[data-auth]` driven by Firebase, session persistence, offline banner
Test: login → reload tab → still logged in. Close browser → reopen → still logged in. Sign out → `data-auth="out"`.

**Session 2 — Gates replacement**
Files: `shared/gates.js` (modified)
Goal: real `getTier()`, real `isEnabled()`, `Gates.init()`, `Gates.isExpired()`, expiry warning
Test: log in as per_event org → gated features appear. Log in as community org → gated features hidden. Set expiry to past → soft warning appears, features still work.

**Session 3 — Cloud Functions**
Files: Firebase Functions (backend — not in repo)
Goal: `setOrgClaims` and `getOrgByEmail` deployed and tested
Test: call from browser console → claims update → read back in token on next refresh.

**Session 4 — Admin panel**
Files: `admin/index.html` (new)
Goal: full org management UI + platform switches UI
Test: find org → set per_event window → verify gates in module → revoke → verify block on next login.

Version bump to v4.8.0 and PR dev → main after Session 4 only.

---

## CHANGELOG entry (draft — append after build complete)

```markdown
## [4.8.0] — Firebase Auth + Admin Panel · July 2026

### shared/firebase.js (new)
- Firebase app init (SDK v10 modular)
- Auth and Firestore instance exports
- IndexedDB persistence enabled for offline competition-day reliability

### shared/auth.js (new)
- onAuthStateChanged drives [data-auth] attribute on <html>
- Gates.init(user) called on login and on token refresh (onIdTokenChanged)
- Cold-start offline banner (5s timeout, dismissible)
- Expiry soft warning (60s interval, amber banner, dismissible)
- Redirect hook planted for future Option B post-login destination

### shared/gates.js
- Stub replaced: getTier() reads subscription_tier from Firebase token claims
- Stub replaced: isEnabled() reads Firestore platform/switches document
- Gates.init(user) — new public method, called by auth.js only
- Gates.isExpired() — new public method, called by auth.js expiry monitor
- canAccess() API unchanged — zero module changes required
- Offline default: _tier='community', _switches={} — safe Community-only access

### index.html
- Real Firebase Email/Password auth wired to existing [data-auth] markup
- Login error states: inline messages, no alert()
- Session persists across tab close (Firebase local persistence default)

### admin/index.html (new)
- Internal super_admin tool — not public-facing, no front door entry point
- Org lookup by email (getOrgByEmail Cloud Function)
- Set subscription tier + access window (setOrgClaims Cloud Function)
- Revoke access (sets expiry to now-1s)
- Platform switch toggles (direct Firestore write)
- All times displayed in BNT (UTC+8)

### Firebase Cloud Functions (new — backend)
- setOrgClaims: set subscription_tier + subscription_expiry on org UID
- getOrgByEmail: look up org UID + current claims by email

### Firestore
- platform/switches document created (cup_taster_module: true, audience_links_live: false)
- Security rules deployed
```

---

## What this milestone does NOT include

- Google sign-in (v5.1)
- Organiser self-activation of access window (v4.9)
- Persistent event data in Firestore (v5.0)
- Storage.js Firebase adapter (v5.0)
- Seduh ID competitor registry (v5.0+)
- Multi-admin access (future)
- Front door entry point to admin panel (future)
- Any changes to module files (throwdown, liga, bbtc, cup-taster)

---

*Spec locked: June 2026*
*All decisions confirmed in strategy session with Firdaus Omar*
*Hard deadline: auth stable + throwdown org provisioned before Firdaus departs for BTC regionals mid-July*
*Next immediate step: register seduhscore.com via Cloudflare → v4.6 Firebase Hosting session → build sessions 1–4 above*
