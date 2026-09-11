# Conventions — Seduh Score

*State: v5.16.1 — matches CHANGELOG.md as of September 2026*

Coding patterns, architecture decisions, and development standards for the Seduh Score platform. Read this at the start of any new chat session before touching code.

---

## Architecture

Seduh Score is a **static multi-file web app** — no build step, no bundler, no server. Each module is a self-contained `index.html` that loads shared components via relative `<script>` and `<link>` tags.

```
seduh-score/
├── index.html                  ← platform front door
├── admin/index.html            ← super admin panel (not pushed to public)
├── audience/index.html         ← remote audience viewer stub
├── bbtc/index.html             ← fully self-contained module
├── cup-taster/index.html       ← fully self-contained module
├── liga/index.html             ← fully self-contained module
├── throwdown/index.html        ← fully self-contained module
├── timer/index.html            ← standalone timer page
├── about/index.html            ← README renderer, public (v5.3.2)
├── coming-soon/index.html      ← teaser landing page, served at "/" via Hosting redirect (v5.3.1/5.3.3)
├── tour/index.html             ← module tour page (POA-43, v5.6.0)
├── pitch/index.html            ← unlisted "The Platform" pitch page (POA-52, v5.8.0;
│                                 restructured POA-60, v5.10.3 — problem-first,
│                                 pricing + governance sections, no version/spiral
│                                 lore — moved to bts/)
├── bts/index.html               ← unlisted "Behind the Seduh" build-story page
│                                 (POA-60, v5.10.3) — codename spiral (7 shipped
│                                 cycles), per-cycle timeline, founder bio
├── onboard/index.html          ← public org onboarding intake form (POA-47, v5.9.0)
├── booth/                      ← mini-games: setup/, display/, guess/, grinder/ (v5.3.0-booth+).
│                                 Guess pages support ?demo=1 — self-running fake data,
│                                 zero Firestore traffic (v5.10.2-booth).
│                                 Live but unlisted — booth/ was never in the Hosting
│                                 ignore list, so it ships with every deploy (confirmed
│                                 reachable July 2026). First event use target Oct 2026
│                                 per STRATEGY.md; rules hardened & deployed (POA-59,
│                                 v5.10.2-booth.3, July 2026).
└── shared/                     ← loaded by every module
    ├── theme.css
    ├── storage.js
    ├── gates.js                ← v4.3+ tier/feature gating
    ├── auth.js                 ← v4.8+ Firebase auth state + Gates.init()
    ├── audience.js
    ├── eventconfig.js          ← v4.7+ organiser customisation component
    ├── firebase.js             ← v4.8+ Firebase SDK init (app/auth/Firestore/Storage).
    │                              Consumers: admin, onboard, booth (v5.10.2-booth —
    │                              booth previously duplicated its own init)
    ├── pdf.js                  ← shared PDF export (POA-55) — first consumer Throwdown
    ├── sound.js                ← synthesised timer/reveal audio cues (no audio files); used by
    │                              bbtc/index.html, liga/index.html, timer/index.html
    ├── version.js              ← v5.5.1+ platform version constant (POA-42 Part A) — sourced by index.html footer
    ├── upcoming-events.js      ← v5.5.2+ shared event carousel (POA-42 Part B) — UpcomingEvents.mount()
    ├── timer.js
    └── assets/                 ← seduh-mark.svg + favicons
```

Each module includes shared files like this:
```html
<link rel="stylesheet" href="../shared/theme.css">
<script src="../shared/storage.js"></script>
<script src="../shared/gates.js"></script>
<script src="../shared/timer.js"></script>
<script src="../shared/audience.js"></script>
<script src="../shared/eventconfig.js"></script>
<!-- firebase.js + auth.js loaded as type="module" before </body> -->
```

`pdf.js` shipped under POA-55 — see the PDF export section below for the full
API. Throwdown is the first consumer (`<script src="../shared/pdf.js">`).
BBTC migrated onto it at v5.12.5 (MUA-07), closing out the stash that had
been parked since the July 2026 full-repo audit. Liga/Cup Taster adoption is
separate, future work.

**Rule:** Never copy shared component code into a module file. Always reference from `../shared/`.

**Rule (B1 — locked):** Each module stays one self-contained `index.html`. No build step, no bundler. `shared/` expansion is the consistency mechanism — new shared files must be explicitly approved in the strategy chat before creation. Approved post-B1 shared files: `gates.js` (v4.3), `eventconfig.js` (v4.7), `firebase.js` and `auth.js` (v4.8), `pdf.js` (v5.4, MUA-07), `version.js` (v5.5.1, POA-42 Part A), `upcoming-events.js` (v5.5.2, POA-42 Part B).

---

## State management

Each module has a single `S` state object. All application state lives here. Nothing else is authoritative.

```javascript
// Pattern — BBTC
let S = {
  // Setup
  judges: [], teams: [], eventDate: '', eventVenue: '',
  qfSlots: 8,
  // Competition
  matches: [], bracket: null,
  // UI state (not meaningful to persist but included for simplicity)
  tab: 'setup', sid: null, creating: false,
  bracketPicking: null, bracketJids: [],
  nm: { t1: '', t2: '', round: 'preliminary', jids: [] },
};
```

```javascript
// Pattern — Throwdown
const DEFAULT_STATE = () => ({
  eventName: '', eventDate: '', eventVenue: '',
  judges: 3,
  redemption: false,
  redemptionRounds: { r1: true, r2: false },
  redemptionCap: 0,
  wildCard: false,
  participants: [], bracket: null, matches: [],
  tab: 'setup', scoringMatchId: null,
});
let S = DEFAULT_STATE();
```

**Rule:** Use `DEFAULT_STATE` as a factory function (not a constant object) so reset always produces a clean fresh state, not a reference to the same object.

### Counters

Module-level counters track auto-incremented IDs. They are persisted alongside state:

```javascript
let mid = 0;  // match/pair ID counter
let jid = 0;  // judge ID counter (BBTC only)
```

---

## Persistence

### Storage wrapper (shared)

```javascript
// Usage
Store('seduh_bbtc_v3').save({ ...S, _mid: mid, _jid: jid });
const d = Store('seduh_bbtc_v3').load(); // returns null if empty
Store('seduh_bbtc_v3').clear();
```

### Storage keys

**Format (B2 — locked):** `seduh_{module}_{vN}` — `seduh_` prefix mandatory, no exceptions.

| Module | Key |
|---|---|
| BBTC | `seduh_bbtc_v3` |
| Throwdown | `seduh_throwdown_v1` |
| Liga Seduh | `seduh_liga_v1` |
| Cup Taster | `seduh_cup_taster_v1` |
| Dashboard | `seduh_event_v1` |
| Audience config | `seduh_aud_config_v1` |

**Rule:** Bump the key suffix when the state shape changes in a breaking way (e.g. `seduh_bbtc_v3` → `seduh_bbtc_v4`). This prevents old saved data from crashing the new version. Document the key change in CHANGELOG. When bumping a key, write a one-time load-path migration shim to copy data from the old key to the new one and delete the old key — run it before `loadState()` on the first boot after the key change.

### What not to persist

Timer state (`TMR` / `TIMER` object) is module-level and never persisted. It resets on page load intentionally.

---

## Render / bind cycle

Every state change triggers a full re-render. There is no virtual DOM, no diffing.

```javascript
function render() {
  save();                                          // persist first
  document.getElementById('app').innerHTML = ...;  // full DOM replace
  bind();                                          // re-attach all listeners
}
```

**Rule:** Always call `render()` at the end of any action that changes state. Never manipulate the DOM directly — always go through render.

**Rule:** Never attach event listeners outside of `bind()`. All listeners are destroyed and recreated on every render. This is intentional.

### The `on()` helper

All modules use a convenience helper:

```javascript
const $ = id => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el.addEventListener(ev, fn); };
```

The `if (el)` guard is important — many elements only exist in certain tab states.

---

## Render function naming

| Function | Purpose |
|---|---|
| `render()` | Master render — saves state, sets innerHTML, calls bind |
| `rMain()` | Renders the full app shell (header + tabs + active tab body) |
| `rSetup()` | Setup tab content |
| `rPrelims()` | Preliminary matches tab (BBTC) |
| `rBracket()` | Bracket tab |
| `rHistory()` | History tab |
| `rStandings()` | Standings/Leaderboard tab |
| `rScoring()` | Full-screen scoring view (BBTC) |
| `rCreateForm()` | Create match inline form (BBTC) |
| `bind()` | All event listener registration — called after every render |

**Rule:** Every render function returns an HTML string. No direct DOM manipulation inside render functions.

---

## Data structures

### BBTC — Match object

```javascript
{
  id: '0',                    // String(mid++)
  round: 'preliminary',       // 'preliminary' | 'quarterfinals' | 'semifinals' | 'finals'
  t1: 'Team Alpha',
  t2: 'Team Beta',
  jids: ['0','1','2'],        // judge IDs from S.judges
  drinks: [[2,1],[1,1],...],  // Array of [t1tokens, t2tokens] per drink
  s1: { fastest: false, sigBev: false },
  s2: { fastest: false, sigBev: false },
  t1time: '8:42',
  t2time: '9:10',
  done: false,
  bracketSlot: null,          // 'qf1' | 'sf1' | 'final' | etc. — null for prelim
}
```

### BBTC — Bracket slot object

```javascript
{
  id: 'qf1',                  // 'qf1'|'qf2'|'qf3'|'qf4'|'sf1'|'sf2'|'final'|'third'
  label: 'QF 1',
  seeds: [1, 8],              // seed numbers (empty for SF/Final)
  t1: 'Team Alpha',           // null until populated
  t2: 'Team Beta',
  matchId: null,              // set when organizer starts scoring this slot
  winner: null,               // set after match is finalised
  loser: null,
  from: ['qf1', 'qf2'],      // slot IDs whose winners feed into this slot
}
```

### Throwdown — Pair object

```javascript
{
  id: 't0',                   // String(mid++)
  t1: 'Aliya Roslan',
  t2: 'Darwisyah',
  bye: false,                 // true if t2 is null (odd bracket)
  winner: null,               // set after scoring
  loser: null,
  votes1: 0,                  // judge votes for t1
  votes2: 0,                  // judge votes for t2
}
```

### Throwdown — Round object

```javascript
{
  label: 'Round 1',           // display label
  phase: 'main',              // 'main' | 'redemption'
  roundNum: 1,                // which main round number (used for revival draw tracking)
  pairs: [...],               // array of pair objects
}
```

---

## Scoring logic (BBTC)

```javascript
const isPre = r => r === 'preliminary';
const jPts1 = m => m.drinks.reduce((a, r) => a + r[0], 0);
const jPts2 = m => m.drinks.reduce((a, r) => a + r[1], 0);

const t1Tot = m => {
  const p1 = jPts1(m), p2 = jPts2(m);
  return p1
    + (m.s1.fastest ? 2 : 0)
    + (p1 > p2 ? 5 : 0)                        // auto winner bonus
    + (!isPre(m.round) && m.s1.sigBev ? 2 : 0); // sig bev only in knockout
};
```

**Rule:** `calcPrelimLB()` counts only `round === 'preliminary'` matches. This is the authoritative leaderboard for bracket seeding. Never add knockout results to it.

---

## Shared component APIs

### Timer (`shared/timer.js`)

```javascript
Timer.init();        // call once in bind() — wires preset buttons and controls
Timer.open();        // show timer overlay
Timer.close();       // hide timer overlay
Timer.set(secs);     // set countdown (e.g. Timer.set(420) for 7 min)
```

Timer overlay HTML must be present in the module's HTML (copy from existing module). `Timer.init()` finds elements by ID (`tmr-overlay`, `tmr-display`, `tmr-start`, etc.).

**Timer.init() placement rule:** Call `Timer.init()` as the first line inside `bind()` — never at module level. Timer.init() uses an `inited` guard and no-ops safely on repeated calls, so calling it on every render cycle is safe.

**Exception — standalone pages:** `timer/index.html` is a standalone page with no render/bind cycle. `Timer.init()` is called once at the top level immediately after the script loads. This is the only correct deviation from the bind() rule — it applies only to pages with no render/bind cycle.

### Audience (`shared/audience.js`)

```javascript
Audience.init();     // call once per bind() cycle — idempotent (audInited guard)
Audience.show({
  title: 'Throwdown 1v1',
  moduleTag: 'Round 3',  // optional badge label
  lbHTML: '...',          // inner HTML for standings panel (omit → single-panel mode)
  histHTML: '...',        // inner HTML for results panel
  podium: [...],          // optional array — stored for Audience.showPodium()
});
Audience.showPodium();   // full-screen podium takeover — audience_enhanced gate only
```

**Module usage:**

| Module | Audience.init() | Audience.show() | Notes |
|---|---|---|---|
| Throwdown | ✅ in bind() | ✅ | lbHTML omitted — no standings panel in Throwdown |
| Liga Seduh | ✅ in bind() | ✅ | all four params |
| BBTC | ✅ in bind() | ✅ | lbHTML = prelim standings; histHTML = match history; podium deferred |
| Cup Taster | ✅ in bind() | ✅ | single-panel (no lbHTML); podium deferred |

### Bracket-tree renderer (`shared/audience.js`) — POA-63 Phase 1

Approved addition to `audience.js` — a **separate rendering target** from
`Audience.show()`/`Audience.showPodium()`. Mounts into a caller-provided
container (Phase 2's `audience/index.html` will own it), not the organiser's
own `#aud-overlay` — this is a different display surface entirely (the
projector-scale remote viewer), not a modification of the existing overlay.
Standalone as of Phase 1 — no Firestore wiring yet (Phase 2).

```javascript
Audience.renderBracketTree(container, bracketData, options);
```

- `container` — any DOM element the caller provides.
- `bracketData` — locked public contract, `BRACKET-LIVE-SPEC.md` §3:
  ```javascript
  {
    bracketSize: number,        // 8, 16, 24, etc. — informational only, the
                                 // renderer itself branches on nothing but
                                 // rounds.length/slots.length at call time
    rounds: [{
      roundLabel: string,
      kind: 'bracket' | 'pool', // OPTIONAL — absent means 'bracket'
      slots: [{ name, score, isBye, revivalMarker,
                group,          // OPTIONAL — pool rounds only
                isWinner }],    // OPTIONAL — pool rounds only
    }],
    champion: string | null,
    runnerUp: string | null,
    eventName, logoUrl, eventSubtitle, eventDate, eventVenue,   // branding — see below
  }
  ```
- `options`:
  - `branded: boolean` — full identity header (logo + subtitle/date/venue
    meta line) renders when `true`; otherwise fallback-title-only (the
    constant `"Seduh Score"`, not the real `eventName`). Per
    `BRACKET-LIVE-SPEC.md` §2E, `eventName` itself is inside the branded block
    here — unlike `PdfExport`'s `fallbackTitle` pattern, where only
    logo/subtitle/date/venue are gated and `eventName` always shows once set.

    **This flag is an instruction, not a request to be validated.** The
    renderer does **not** check `Gates` — entitlement is a caller concern.
    It briefly did, and that was unbuildable: this renderer's viewer surfaces
    are unauthenticated by design, `Gates` defaults to `'community'` and only
    leaves that default in `Gates.init()` (which runs on auth), so the check
    resolved to `false` on every viewer permanently and a paying org's
    branding could never render.

    **Callers must resolve entitlement themselves, at a point where the tier
    is knowable.** For a cross-device surface that means resolving it on the
    signed-in device and shipping the answer with the data — Throwdown
    evaluates `Gates.canAccess('bracket_branding')` at "Start remote display"
    and writes a `branded` boolean into `throwdown_live/{orgId}` beside the
    branding fields it governs. A same-device caller can simply pass the gate
    result directly. Either way the rule is the same: **resolve the gate where
    you can see the tier, then tell the renderer what to do.**
  - `champMode: 'tree' | 'podium'` — `'podium'` is a full takeover mirroring
    the existing `#aud-podium-panel` precedent exactly (absolutely
    positioned, covers the whole stage including the header). Only two
    tiles (champion/runner-up), not three — this data shape carries no
    2nd/3rd place. The tree keeps rendering underneath even when covered, so
    the just-resolved diff (below) stays correct if a later call switches
    back to `'tree'`.
  - `theme: 'dark' | 'light'` — class swap on `.aud-bkt-stage`
    (`.aud-bkt-theme-dark`/`.aud-bkt-theme-light`), the same pattern
    `#aud-overlay` uses for `.aud-dark`/`.aud-light`.

**Re-render model:** full re-render on every call (`container.innerHTML`
replaced) — matches this codebase's universal render convention, no
incremental DOM patching. Chosen over incremental updates given the expected
cadence (roughly one call per match result, not per-frame).

**Size-agnostic by construction:** every layout computation — column split
(`Math.ceil(matchCount/2)`), connector geometry, per-round slot height,
active/pending glow — is derived from `rounds.length` and each round's own
`slots.length` at call time. Nothing branches on `bracketSize` or assumes a
power-of-2 shape; an irregular (e.g. 13-participant) bracket renders exactly
as correctly as 8/16/24. A round-to-round relationship that doesn't cleanly
resolve (e.g. a redemption round breaking the halving chain) degrades to a
plain TBD placeholder rather than guessing.

**Round-shape rules (POA-65 / POA-66 / POA-67).** The renderer's original
layout assumptions did not match the real shapes of competition rounds; all
three rules below were added after live data showed silent data loss. See the
POA-63 entry in `PLAN_OF_ACTION.md` for the measured before/after.

- **The last round is the Final only when it holds exactly one match**
  (POA-65). Otherwise it renders as an ordinary mirrored round and the centre
  carries only the champion card, or nothing. Callers whose state is
  *incremental* — rounds generated as they are reached, so mid-event the last
  round is the round being played — previously lost every match in that round
  but the first, silently.
- **A round holding a single match is emitted once, not mirror-split**
  (POA-67). The old unconditional split gave such a round one populated column
  and one empty, still-labelled twin. Bites any single-match non-final round;
  3rd Place is the live case.
- **Pool rounds** (`kind: 'pool'`, POA-66) render as **one column of group
  cards** — never mirror-split, no pair-connectors, and **no active-glow**
  (the glow rule is "both slots named, neither scored", which is pair-shaped
  and meaningless for a pool). A pool round is never treated as the Final.
  Group membership rides on each slot's optional `group`; slots with no
  `group` fall into a single group. Use this for any round that is N groups of
  M competitors rather than head-to-head — Throwdown's redemption round today,
  Liga heats and Cup Taster flights expected later.

**Pool winner precedence:** **explicit wins, inference is the fallback.** If
any slot in a group carries `isWinner`, that group is resolved by the
producer's statement and inference is not consulted. Otherwise the renderer
crowns the top score, but only once *every* slot in the group is scored;
several on the top score render as a tie. The explicit path exists because
some formats resolve a pool out of band — Throwdown's redemption tiebreaker
names a winner while leaving the votes genuinely tied, and inference alone
would render those groups as unresolved ties that never show who advanced.

**Active/pending glow (`.aud-bkt-active`):** a same-round check, not a
look-back at the previous round — a match's own two slots both carry a
`name` but neither carries a `score` yet ("locked in, about to play"). An
earlier design checked the *previous* round's slots for a name instead, but
a round's slots carry real names from the moment that round is seeded
(true even for round 0, before anything is played), so that version lit up
falsely from minute one and cascaded incorrectly into later rounds.

**Just-resolved flash (`.aud-bkt-just-resolved`):** each call diffs the
incoming `bracketData` against a snapshot of the *previous* call for that
same `container` (`_bktPrevData`, a `WeakMap` — so a container's first-ever
render never flashes anything already on screen). Any slot whose `name` or
`score` newly *appeared* since that snapshot gets the class baked directly
into the freshly-built HTML string. The animation (`bktFlash`, 1.2s) is
finite with `animation-fill-mode:forwards` — it plays once and holds its
final (zero-alpha, effectively invisible) keyframe rather than looping — so
no JS cleanup is needed; the next full re-render replaces the DOM anyway.

**Scale-to-fit:** fixed 1920×1080 stage, no responsive/mobile breakpoint —
this is a fixed large-display context only. A `ResizeObserver` on
`container` (`_bktObservers`, also container-keyed — a container's children
including the stage are fully replaced on every call, so the observer must
outlive any single render) keeps `.aud-bkt-stage`'s `--bkt-scale` custom
property current as the container resizes.

**Gating:** the base tree view is ungated — available regardless of tier,
matching the existing text audience view's Lite/Enhanced split (Community
isn't locked out of the view entirely, just the branded identity block).
The branded header is governed by `bracket_branding` — `FEATURES` registry
entry `{ minTier: 'per_event' }`, same shape as
`audience_branding`/`pdf_branding` — but that gate is evaluated by the
**caller**, not by the renderer. See the `branded` option above.

### Sound (`shared/sound.js`)

```javascript
Sound.unlock();   // call on a user gesture (e.g. Start click) — satisfies autoplay policy
Sound.beep();     // three quick tones — one-minute warning cue
Sound.horn();     // sustained dual-tone swell — time's-up cue
```

Synthesised via Web Audio API oscillators — no audio files, no assets to load or replace.
`unlock()` lazily creates/resumes a single module-level `AudioContext`; `beep()`/`horn()`
call it internally, so modules don't need to call `unlock()` separately as long as the
first call happens on a user gesture. Currently used by `bbtc/index.html`,
`liga/index.html`, and `timer/index.html` for timer cues.

### Storage (`shared/storage.js`)

```javascript
const store = Store('seduh_throwdown_v1');
store.save({ ...S, _mid: mid });  // always spread + add counters
const d = store.load();           // returns null if nothing saved
store.clear();                    // used by Reset
```

**Firebase adapter seam (v5.0 pre-condition):** The `Store(key)` factory pattern is intentionally shaped for a drop-in Firebase adapter. `save()` is fire-and-forget (void) — compatible. `load()` is synchronous — Firestore cannot fulfil this natively. Before the Firebase adapter ships, either: (a) modules updated to `await store.load()` in a single pass, or (b) adapter uses localStorage as a sync read cache with Firestore syncing in the background. Option (b) is preferred for competition-day offline reliability. This design decision must be made before v5.0 Firebase work starts.

### Gates (`shared/gates.js`) — v4.3+

**Primary module-facing call:**

```javascript
const access = Gates.canAccess('feature_key');
// returns: { allowed: true }
// or:      { allowed: false, reason: 'tier' }
// or:      { allowed: false, reason: 'disabled' }
// or:      { allowed: false, reason: 'not_started' }
```

**Module usage pattern:**

```javascript
const access = Gates.canAccess('cup_taster_analytics');
if (!access.allowed) {
  // reason: 'tier'        → render upgrade prompt
  // reason: 'disabled'    → render nothing (feature not yet live)
  // reason: 'not_started' → org's access window hasn't begun yet (v5.10.0)
  return '';
}
```

**Internal methods — gates.js use only, never called from modules:**

```javascript
Gates.getTier()              // 'community' | 'per_event' | 'annual'
Gates.isEnabled('feature_key') // true | false — checks platform switch
Gates.isExpired()             // true once past subscription_expiry
Gates.isNotYetStarted()       // v5.10.0 — true before subscription_start
Gates.getStartTime()          // v5.10.2 — raw subscription_start Unix seconds, or null
```

**Gate pattern (B3 — updated):**
- Gate logic lives in `shared/gates.js` only — never inline tier or switch checks in module files
- Modules call only `Gates.canAccess('feature_key')` — never `getTier()` or `isEnabled()` directly
- Gated elements are **hidden, not disabled** — use `display:none` or conditional render
- `canAccess()` checks both axes: org tier AND platform switch. Both must pass for `allowed: true`
- `reason: 'tier'` → org's subscription doesn't cover this feature → show upgrade prompt
- `reason: 'disabled'` → super admin has this feature switched off platform-wide → show nothing
- `reason: 'not_started'` → org's `subscription_start` claim is still in the future → treat like
  not-yet-active (v5.10.0). No module currently reads `reason` to differentiate messaging — this
  value costs nothing to add and is available if that changes
- **Throwdown is the reference implementation** for gate touch points
- **BTC gate is routing-layer only** — no gate touch points inside `bbtc/index.html`; access controlled by whether the org account can reach the module URL

### Org access window (`subscription_start` / `subscription_expiry`) — v5.10.0

Both are Auth custom claims set by `activateOrg`, in Unix seconds. `subscription_expiry` gates
the end of access (was already live); `subscription_start` (v5.10.0) gates the beginning — an org
is only ever treated as its real tier when `subscription_start <= now <= subscription_expiry`.
Both checks re-evaluate `Date.now()` live on every `canAccess()`/`getTier()` call — no scheduled
job, no deferred claim-set. Omitting `start` on a fresh activation defaults it to "now" server-side
(immediate access, the pre-v5.10.0 default behaviour); omitting it on an already-active org's tier
update preserves whatever start was set before, so a tier tweak can never silently reset a
deliberately-scheduled org to "now" and grant early access.

**Feature key registry (documented inside gates.js):**

```javascript
const FEATURES = {
  // Module access — routing layer (community = free entry; btc = annual only)
  'btc':                         { minTier: 'annual' },
  // liga, cup_taster, throwdown: free entry — no routing-layer gate

  // Throwdown
  'throwdown_redemption':        { minTier: 'per_event' },
  'throwdown_revival':           { minTier: 'per_event' },
  'throwdown_report':            { minTier: 'per_event' },
  'throwdown_unlimited':         { minTier: 'per_event' }, // >16 participants

  // Liga Seduh
  'liga_device_tracking':        { minTier: 'per_event' },
  'liga_csv_export':             { minTier: 'per_event' },
  'liga_unlimited':              { minTier: 'per_event' }, // >8 brewers

  // Cup Taster
  'cup_taster_analytics':        { minTier: 'per_event' },
  'cup_taster_report':           { minTier: 'per_event' },
  'cup_taster_unlimited':        { minTier: 'per_event' }, // >8 contestants or >3 sets

  // Audience
  'audience_enhanced':           { minTier: 'per_event' },
  'audience_branding':           { minTier: 'per_event' }, // MUA-04: event identity in overlay
  'audience_links_concluded':    { minTier: 'community' }, // concluded-event link
  'audience_links_snapshot':     { minTier: 'per_event' }, // live snapshot URL

  // PDF / report identity
  'pdf_branding':                { minTier: 'per_event' }, // MUA-07: event identity in PDFs

  // Platform switches — minTier: null means tier-independent
  // Feature hidden for ALL orgs regardless of tier until super admin enables it
  'cup_taster_module':           { minTier: null },
  'audience_links_live':         { minTier: null },
}
```

`minTier: null` = platform switch only. No tier entitles an org to this feature until the switch is on.

### eventconfig.js — v4.7.0+

Approved second post-B1 shared file (strategy chat, June 2026).
Organiser event config component — accent colour picker and logo upload. Mounts into a module-provided `#event-config-slot` element.

Public API (three methods only — never call internals from modules):
```javascript
EventConfig.mount(selector, options?)  // render component
EventConfig.writeHandoff()             // write seduh_handoff to sessionStorage
EventConfig.getAccent()               // read current accent hex
```

Handoff contract: sessionStorage key `seduh_handoff`. Always check `v:` sentinel before reading.
Consumed by `audience.js` `_applyHandoff()` inside `Audience.show()`.

**v1 shape** (current, shipped v4.7):
```javascript
{ v: 1, accent: '#...', logoUrl: '...' }
```

**v2 shape** (MUA-02 target — write path in eventconfig.js, read path in audience.js):
```javascript
{
  v: 2,
  accent: '#...',       // existing
  logoUrl: '...',       // existing
  bgColor: null,        // event band background colour (null = no override)
  eventName: '',        // competition name
  eventSubtitle: '',    // constrained format: "Category | City Year"
  eventDate: '',        // display string (not ISO)
  eventVenue: ''        // free text
}
```

v1 handoffs are gracefully upgraded to v2 on read — no data loss. Migration logic lives in
`EventConfig.mount()`. v2 written back to sessionStorage immediately after upgrade.

### PDF export (`shared/pdf.js`) — shipped (POA-55)

Approved third post-B1 shared file (strategy chat, July 2026, MUA-07-SPEC-V2.md). Shared,
format-agnostic PDF export module — owns the `#pdf-overlay` lifecycle, the gated event-identity
header, and the print trigger. Built for real under POA-55 (PLAN_OF_ACTION.md) after a doc-vs-code
drift correction found the module had been described as shipped since v5.4.0 while never existing
on disk. **First consumer is Throwdown** (POA-55 Step 0 pivot — Throwdown had a live event
30 Aug 2026 and benefited from a PDF export sooner than BBTC needed one). **BBTC migrated onto
this API at v5.12.5** (MUA-07 follow-up), closing out the `stash@{0}` refactor that had been
parked on `dev` since the July 2026 full-repo audit. Liga/Cup Taster adoption is separate,
future work (see AUDIT.md / MUA-07-SPEC-V2.md for why the original all-four-modules draft was
rescoped).

Public API (three methods only — never touch `#pdf-overlay` classList from a module):
```javascript
PdfExport.open({
  fallbackTitle: 'Barista Team Championship',  // shown when no eventName is configured
  pages: [
    { sectionTitle: 'Preliminary Standings', metaHtml: '...', bodyHtml: '<table>...</table>' },
    { sectionTitle: 'Match Results',         metaHtml: '...', bodyHtml: '<table>...</table>' },
  ]
});
PdfExport.close();  // hide the overlay
PdfExport.print();  // trigger window.print()
```

The module supplies `pages` — each page's own report markup (`bodyHtml`) and the small
top-right meta block (`metaHtml`, e.g. a section label + date). `shared/pdf.js` builds
everything else: the Seduh mark line, the event identity block, the section title, and the
footer (attribution + export timestamp).

**Header/footer field mapping** (read from `seduh_handoff` v2, same key `audience.js` reads):

| Element | Renders to | Always shown | Behind `pdf_branding` gate |
|---|---|---|---|
| Seduh mark line (constant `"Seduh Score"` text, not data-driven) | `.pdf-event-sub` | ✅ | — |
| `eventName` (plain text, falls back to `fallbackTitle` if unset) | `.pdf-event-name` | ✅ | — |
| `logoUrl` | `.pdf-logo` (`<img>`, inside `.pdf-id-block`) | — | ✅ |
| `eventSubtitle`, `eventDate`, `eventVenue` | joined with `" · "`, filtered for blanks, into one `.pdf-event-meta` line | — | ✅ |

This is a POA-55 implementation judgment call, not spelled out in the original
MUA-07-SPEC-V2.md field table — resolved by precedent: `.pdf-event-meta` already
carries exactly this shape in BBTC's inline PDF export (date + venue joined),
and the constant-brand-line / data-driven-name split mirrors `audience.js`'s
`aud-hdr-sub` ("Seduh Score", constant) vs. `aud-hdr-name` (event title, data-driven).
Confirmed by Strategy — future PDF consumers (Liga, Cup Taster, eventually BBTC's
migration off `shared/pdf.js`) should follow this table as-is, not re-derive it.

`bgColor` never propagates to the PDF header, on any tier — stays scoped to `.event-band` per D1.

**Contract:** `#pdf-overlay` markup (toolbar + `#pdf-content` slot) must already exist in the
module's HTML, same as `#aud-overlay` does for `audience.js`. `.pdf-*` overlay/header/footer CSS
lives in `shared/theme.css`; a module's own `<style>` block only needs its report-table classes
(e.g. BBTC's `.pdf-lb-table`, `.pdf-res-table`).

### Version constant (`shared/version.js`) — v5.5.1+ (POA-42 Part A)

Approved fourth post-B1 shared file. Single source of truth for the version string shown in
`index.html`'s footer — fixes drift where the footer's hardcoded literal (`v4.6.1`) went
unmaintained from POA-32 through v5.5.0.

```javascript
const SEDUH_VERSION = '5.5.1';  // bump alongside CHANGELOG.md's top-line version
```

Loaded as a classic `<script>` (no exports, no `.mount()` — this is a constant, not a
component). `index.html` reads it once on load to set `#footer-version`'s text content.
Currently `index.html`-only; not wired into any module's `index.html`.

### Upcoming events carousel (`shared/upcoming-events.js`) — v5.5.2+ (POA-42 Part B)

Approved sixth post-B1 shared file. Extracted from `coming-soon/index.html`'s original
inline carousel (v5.3.1+) so `index.html`'s front-page banner and `coming-soon/index.html`
read the same Firestore `upcoming_events` collection through one component instead of two
independently drifting copies.

```javascript
UpcomingEvents.mount(selector, {
  media: 'photo' | 'icon',   // 'photo' = coming-soon's original card carousel (unchanged)
                              // 'icon'  = new full-bleed icon banner (index.html front page)
  onEventClick: fn,          // optional — stays a no-op stub until a results/current-event
                              // page exists (deferred to after the 30 Aug 2026 Throwdown)
});
```

Query: `eventDate >= (today − 10 days)`, ascending, `limit(5)` — mixed recent-past +
upcoming in one query, no manual cleanup; events age out of rotation 10 days after their
date. Per-event kicker label ("Recently on Seduh Score" / "Upcoming on Seduh Score") is
computed per rotation frame from that event's own `eventDate`, not a fixed header.

Offline fallback: same `seduh_upcoming_events_cache` localStorage key and stale-after-1h
flag as the original `coming-soon` implementation. Rotation: 5s auto-advance, arrow-key
nav, shared identically between both `media` modes.

**Format/colour/icon registry** (module-internal, not exposed): `throwdown` → amber ⚡,
`liga` → green 🏆, `cup-taster` → blue ☕, `btc` → purple 👥. `btc` is the only format
without a pre-existing badge colour elsewhere in the codebase — purple was chosen because
its only existing UI meaning (Throwdown's redemption feature, demo-mode flag) is a
different surface from an event-listing badge, so it doesn't collide with the semantic
colour contract below. Docs missing `eventFormat` fall back to a generic amber pill/icon
rather than erroring.

**Schema note:** reads/writes the existing `eventFormat` field (admin panel, v5.3.1+) —
not a new `format` field. `eventId` (auto-derived slug, admin panel create-path only,
POA-42 Part B) is carried through for a future results-page hook but not yet read by
this module's rendering; guard against `undefined` on any doc, old or new.

---

## CSS conventions

### Custom properties (theme.css)

All colours are defined as CSS custom properties on `:root`. Never hardcode hex values in module CSS.

| Variable | Usage |
|---|---|
| `--am`, `--am-h`, `--am-bg`, `--am-bd` | Amber — primary brand, BBTC team 1, winner |
| `--bl`, `--bl-bg`, `--bl-bd` | Blue — BBTC team 2 |
| `--gn`, `--gn-bg`, `--gn-bd` | Green — success, QF qualified, completed |
| `--rd`, `--rd-bg`, `--rd-bd` | Red — destructive actions, warnings |
| `--pu`, `--pu-bg`, `--pu-bd` | Purple — Throwdown redemption, demo mode |
| `--bg` | Page background (gray-50) |
| `--surface` | Card/panel background (white) |
| `--border`, `--border2` | Border colours |
| `--txt`, `--txt2`, `--txt3` | Text hierarchy (gray-900, 700, 500) |

**Exception:** Audience view and PDF overlays use hardcoded hex inline styles because they render in contexts where CSS variables may not cascade correctly.

### Display string naming (B4)

The user-facing label for the optional per-round random revival mechanic is **"Revival draw"** — not "wild card". This applies to all display strings, UI labels, button text, banners, and copy. JS identifiers (`wildCard`, `b.wildCards`, `pendingWildCard`, `skipWildCard()`, etc.) retain the old naming and are intentionally left — renaming identifiers is a separate refactor tracked as tech debt in AUDIT.md.

### Button classes

```css
/* Base button classes — shared/theme.css */
.btn-p        /* primary — amber fill */
.btn-o        /* outline — border only */
.btn-sm       /* small — use with colour modifier */
.btn-am       /* amber outline */
.btn-bl       /* blue outline */
.btn-gn       /* green outline */
.btn-rd       /* red outline */
.btn-pu       /* purple outline */

/* Module chrome — .mod-toolbar classes (MUA-06, v5.1+) */
/* These are the current standard for all module action buttons */
.tb-pri           /* primary toolbar pill — amber, always visible */
.tb-sec           /* secondary toolbar outline pill — collapses to ⋯ More at <768px */
.tb-sec-podium    /* green podium variant — conditional on gate + bracket done */
.tb-reset         /* red destructive — always visible, rightmost */
.tb-more          /* overflow menu trigger — hidden until fitToolbar() shows it */

/* Bottom sheet (overflow) item classes */
.ms-item          /* standard sheet row */
.ms-reset         /* red destructive sheet row */
.ms-podium        /* green podium sheet row */
```

`.btn-hdr` + colour modifier is superseded for module chrome. Use `.tb-pri` / `.tb-sec` in
all module toolbars. `.btn-p`, `.btn-o` etc. remain valid for in-content buttons (scoring
controls, setup forms, confirmation prompts).

---

## Demo data pattern

Each module has a `buildXxxDemo()` function that returns a complete hardcoded state object, and a `loadXxxDemo()` function that applies it to `S` and saves.

```javascript
function buildBBTCDemo() {
  // Returns { teams, judges, matches, bracket, qfSlots, eventDate, eventVenue }
  // All matches are pre-scored with realistic token distributions
  // Bracket is mid-QF (2 done, 2 pending, SF1 seeded)
}

function loadBBTCDemo() {
  const d = buildBBTCDemo();
  S.teams = d.teams; S.judges = d.judges; /* ... */
  mid = 14; jid = 3;  // skip past demo IDs
  saveState();
}
```

---

## Bracket engine rules

### BBTC

- Bracket generated from `calcPrelimLB()` — preliminary standings only
- Seeding for 8: QF1=1v8, QF2=3v6, QF3=4v5, QF4=2v7
- SF1 feeds from QF1+QF2 winners. SF2 from QF3+QF4 winners.
- 3rd Place from SF1+SF2 losers.
- Winners auto-advance via `updateBracketAfterMatch(matchId)` on finalise.
- Bracket matches identified by `bracketSlot` field on the match object.

### Throwdown

- `buildPairs(names)` — creates pairs, last gets bye if odd count.
- `advanceBracket()` — called after every pair is scored. Handles: revival draw pause, redemption pool collection, redemption round trigger, main pool advance, redemption cap application, merger of main + redemption winners.
- Revival draw tracked in `b.wildCards = { [roundNum]: name | null }`. `null` means skipped.
- `b.pendingWildCard = roundNum` pauses advancement until organizer draws or skips.

---

## Versioning

Single platform version number. All modules ship together.

- **Patch** (4.2.x) — bug fixes only
- **Minor** (4.x.0) — new features, new module capabilities
- **Major** (x.0.0) — new module, major architecture change

Update CHANGELOG.md before committing any release. The CHANGELOG is the handoff document for new chat sessions.

---

## Git workflow

### Branch structure

```
main   — live, production. Always stable. Firebase Hosting serves from this branch.
dev    — all active development. Work from any device here.
```

**`main` is protected** — never push directly. All changes arrive via Pull Request from `dev`. This ensures the live URL is never broken mid-work and competition-day stability is guaranteed.

### Daily workflow (any device)

**From tablet** — use GitHub's web editor directly on the `dev` branch. Edit files, commit, all in browser. No local repo required.

**From desktop (PowerShell):**
```powershell
cd C:\Users\mfosa\OneDrive\Documents\Seduh-Score
git checkout dev
git add .
git commit -m "type: short description"
git push
```

Commit message types: `feat`, `fix`, `docs`, `refactor`

### Releasing to live

**There is no auto-deploy.** This repo has no `.github/workflows/` — merging
`dev` → `main` only updates the `main` branch on GitHub. Every service
(Hosting, Functions, Storage, Firestore) requires its own explicit
`firebase deploy` after merge, or the merged code silently never reaches
production. This gap actually happened in July 2026: PR #21's onboarding
form merged to `main` cleanly, but `onboard/index.html` wasn't reachable
live until `firebase deploy --only hosting` was run separately and verified
against `firebase hosting:channel:list`'s release timestamp.

When a version is ready:
1. Open a Pull Request on GitHub — `dev` → `main`
2. Review the diff
3. Merge
4. **Deploy checklist — run every item touched by the merged diff, none are automatic:**
   - `firebase deploy --only hosting` — any change under `/`, any module `index.html`, `shared/`
   - `firebase deploy --only functions` — any change under `functions/`
   - `firebase deploy --only storage` — any change to `storage.rules`
   - `firebase deploy --only firestore` — any change to `firestore.rules` or `firestore.indexes.json`
5. Verify: `firebase hosting:channel:list` for Hosting's release timestamp; the
   Firebase Console → Functions/Storage tabs for the other services. A merged
   PR is not a shipped release until this step confirms it.

### Setting up the dev branch (once, on desktop)
```powershell
git checkout -b dev
git push -u origin dev
```

### Repository
Remote: `https://github.com/greymattercoffee/Seduh-Score.git`  
Live URL: `https://seduhscore.com` (Firebase Hosting — custom domain via Cloudflare)  
Firebase project: `seduh-score` · console.firebase.google.com

---

## Firebase Emulator Suite (local dev) — since July 2026

Reusable local-testing infrastructure, first built to verify POA-47/56/57/58
end-to-end without touching production data. Auth, Firestore, Functions, and
Storage emulators — configured in `firebase.json`'s `emulators` block:

| Emulator | Port |
|---|---|
| Auth | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Storage | 9199 |
| Emulator UI | 4000 |

**Start the suite:** `firebase emulators:start` from the repo root.

**Connection guard (`shared/firebase.js`):** gated on
`location.hostname === 'localhost' || location.hostname === '127.0.0.1'` —
the live site and every Firebase Hosting preview channel resolve to
`seduhscore.com` or `*.web.app`/`*.firebaseapp.com`, never `localhost`, so
this can never misfire in production. When the guard is live, all four SDK
instances (`auth`, `db`, `storage`, `getFunctions(app)`) connect to the local
emulators instead of the live project — no other file needs to change,
since the Functions SDK caches one instance per `(app, region)`.

As of v5.10.2-booth this includes the four Firebase-using booth pages
(`setup`, `guess`, `grinder`, `display/guess`) — they import `db` from
`shared/firebase.js` (Firestore functions pinned to the same SDK version,
10.12.0) instead of duplicating their own `initializeApp`. Consequence:
booth pages served locally (e.g. `npx serve` on `localhost`) now talk to
the **emulator**, not production — start `firebase emulators:start` when
exercising booth flows locally, or use `?demo=1` on the guess pages, which
needs no backend at all.

**Seeding a test admin:** `scripts/emulator-seed-admin.js` creates (or
reuses) a `super_admin` test user against the Auth emulator, for signing
into `admin/index.html` locally. Refuses to run unless
`FIREBASE_AUTH_EMULATOR_HOST` is set — never touches production. Run with
the emulators already up:
```
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
GCLOUD_PROJECT=seduh-score NODE_PATH=./functions/node_modules \
node scripts/emulator-seed-admin.js
```
Prints the seeded test email/password/uid to sign in with.

**Reuse for future tickets:** this is standing infrastructure, not a
one-off for POA-47/56/57/58 — any future ticket touching Auth, Firestore,
Functions, or Storage should verify against the emulator suite before
`firebase deploy` to production, the same pattern used for that work.

---

## Firebase — live stack (v4.8.0+)

Firebase project: `seduh-score` · console.firebase.google.com

| Service | Status | Notes |
|---|---|---|
| Hosting | ✅ Live (v4.3+) | Custom domain seduhscore.com via Cloudflare. `firebase.json` also wires `redirects` (`/` → `/coming-soon/`, v5.3.3) |
| Auth — Email/Password | ✅ Live (v4.8+) | `shared/firebase.js` + `shared/auth.js` |
| Firestore rules | ✅ Live (v4.8+) | `firestore.rules`; `platform/switches` doc, `slideshow`, `upcoming_events`, `booth_sessions`/`booth_guess`/`booth_grinder`, `throwdown_records` (v5.5.0, POA-40) collections. Booth hardening + new `booth_contact` collection (v5.10.2-booth.3, POA-59) **deployed to production** July 2026 — verified via live REST checks + the operator-flow checklist, see PLAN_OF_ACTION.md POA-59 |
| Firestore indexes | ✅ Live (v5.3.1-booth+) | `firestore.indexes.json` — composite indexes for `booth_guess` (sessionId+ts) and `booth_grinder` (sessionId+timeMs); wired into `firebase.json`'s `"firestore"` block alongside rules |
| Storage | ✅ Live (v4.8.1+) | Slideshow images; org logos (future) |
| Storage rules | ✅ Live (v5.3.1-rules+) | `storage.rules` (repo file, not console-only) — mirrors Firestore's `super_admin`-write pattern; covers `slideshow/` and `upcoming_events/`; wired into `firebase.json`'s `"storage"` block |
| Cloud Functions | ✅ Live (v4.8+) | Node 24 · us-central1 Gen 2 |

### Cloud Functions
- `createOrg` / `updateOrgNotes` / `archiveOrg` — HTTPS callable, `super_admin` only (POA-41, Pagon) — org roster lifecycle
- **Removed v5.10.1 (POA-57):** `setOrgClaims` and `getOrgByEmail` — dead code, only ever called by
  the legacy Org Management panel (predated Pagon), which was removed in the same pass
- `activateOrg` — HTTPS callable, `super_admin` only (POA-41, Pagon). **v5.10.0 (POA-56):** resolves
  the org's Firebase Auth account itself, by the `email` already on the `orgs` doc — `getUserByEmail`,
  falling back to `createUser({ email, password })` only if not found (re-activation/duplicate-email
  reuses the existing account rather than erroring). Rolls back (`deleteUser`) a newly-created account
  if a later step in the same call fails, so nothing is left orphaned. The client must never call
  `createUserWithEmailAndPassword` for org accounts — doing so on the admin's own signed-in Auth
  instance silently ends the admin's session (see CHANGELOG v5.10.0/POA-56). Also sets
  `subscription_start` (v5.10.0, see Gates section above) alongside `subscription_tier`/`_expiry`
- `submitOrgRequest` — HTTPS callable, publicly callable/unauthenticated (POA-47). Explicit field
  enumeration, hardcodes `status:'pending'`/`source:'public_form'`, Firestore-backed IP rate limit
  (`rate_limits/{ip}`, 5/hour) in place of App Check (not provisioned in this project — no reCAPTCHA
  site key). **v5.10.0 (Bug A):** accepts a Storage **path** (`storagePath`), not a URL — the client
  can never obtain a `getDownloadURL()` for `org-requests/` (no public read, by design), so the
  function validates the path shape and confirms the object exists via the Admin SDK instead. Stores
  it as `paymentProofPath` (renamed from `paymentProofUrl`, since it's a path now, not a URL)

### Auth pattern
Custom claims on the Firebase token: `subscription_tier` ('community' | 'per_event' | 'annual')
and `subscription_expiry` (Unix timestamp). `Gates.init(user)` reads both after every token
refresh. `auth.js` dispatches `seduh:gates-ready` on `window` after `Gates.init()` resolves.
Modules listen with `{ once: true }` and re-render to apply gate state.

### Storage (localStorage) adapter seam — v5.0 pre-condition
`shared/storage.js` is shaped for a future Firebase adapter behind the same
`Store(key).save()/.load()/.clear()` interface. `load()` is currently synchronous —
Firestore cannot fulfil this natively. Decision required before the adapter opens:
option (a) modules updated to `await store.load()`, or option (b) localStorage cache
with Firestore syncing in the background. Option (b) preferred for competition-day
offline reliability. Do not start the Firebase adapter until this is decided in strategy chat.

Two modules still bypass `Store()` directly (v5.0 pre-condition — do not fix early):
- BBTC: `localStorage.setItem/getItem/removeItem` directly
- Dashboard: direct `localStorage` inside `load()`/`save()` wrappers

---

## Live sync pattern — organiser device → public surfaces (POA-63)

**This is the reusable model for Liga, Cup Taster and BBTC, not a Throwdown
one-off.** Throwdown is simply the first consumer. A future session wiring
another format should be able to follow this section without reverse-
engineering `throwdown/index.html`.

The shape: an **organiser's authenticated device** owns the event and writes a
single org-scoped document; one or more **unauthenticated public surfaces**
read it live. Everything below exists because that asymmetry — writer knows who
it is, readers don't — breaks assumptions that hold fine inside a single module.

### The seven mechanics

**1. Single atomic write hook.** Exactly **one** function performs the write,
and every caller goes through it. Not one per action — one per module. Find the
single point in the module's own state-commit flow where a result is
*committed* and write from there; do not hook a display function, which fires
for reasons unrelated to state. Verify by grep: one `setDoc`/`addDoc` call site.
Scattered writes make the fail-open wrapping (3) impossible to guarantee and
the publish gate (2) impossible to enforce.

**2. Publish-gated trigger.** Local scoring stays immediate and unchanged. A
**separate, explicit organiser action** pushes state to the document. The write
*cadence* is unchanged — still one write per result — but the *trigger* is
organiser-initiated. This is not caution about write volume; it is because the
in-venue screen must **follow** the announcement rather than pre-empt it. A
screen that updates the instant a score is typed spoils the reveal, which at a
latte art throwdown is the entire moment. Corollary: publish must be separable
*in time* from confirming the result, so it cannot be folded into the
confirmation dialog.

**3. Fail-open, log-only.** Every write is wrapped so failure **never** blocks
or interrupts local scoring and **never** surfaces a user-facing error dialog.
Console warning, then continue. A failed projector sync must not stop a live
competition. Same principle as POA-40's archive write and competition-day auth.
**But fail-open is not permission to lie**: if the write failed, the UI must say
so. Keep a "did the last write land?" flag and give the status surface three
states — off / live / **not synced** — rather than two. A panel that reports
"Live" after a failed write is worse than one that reports nothing, because the
only other evidence is a console line nobody reads at an event.

**4. Identity and entitlement are copied at start, not read live.** The viewers
are on other devices and cannot see the organiser's `sessionStorage`, tier
claims, or anything else. An explicit "start" action copies the branding fields
**and the entitlement decision** into the document. Known, accepted limitation:
nothing resyncs — mid-event edits and mid-event **tier changes** both require a
stop/restart. Document that where the fields are listed, not only in code.

**5. Org-scoped document, open read, uid-bound write.**
`{collection}/{orgId}`, one live document per org, overwritten in place each
event so it self-cleans instead of accumulating. Read is open **by design** —
a projector and a public link have nobody to log in. Write is bound to the
authenticated org matching the doc id. No booth-style schema lock is needed:
booth locks schemas because its writers are unauthenticated walk-ups, which is
the opposite situation.

**6. Rules deploy as their own step.** Adding a collection means
`firestore.rules` changes, and those do **not** ship with a code merge.
Separate command, separately verified, tracked as its own checklist item.
Verify **both directions**: the new collection reads open and writes deny for a
non-matching org, *and* every pre-existing collection still behaves as before.

**7. Publish only rounds that exist. Never project the ones that don't.**
Throwdown shipped a translation layer that appended empty "TBD" columns for
rounds it had not generated yet, halving down to a one-match Final, so the room
could see the tournament's destination. **Removed in POA-72, and no format
should reinvent it.** Projection has to model how competitors advance, and it
modelled pure single-elimination halving — which is wrong the moment a format
adds competitors *back*. Throwdown's revival draw and redemption round both do:
six Round 1 winners + 1 revival + up to 4 redemption survivors is nine to
eleven going into a Quarter Final the projection had drawn six slots for. That
is normal operation for the format, not an edge case.

The general rule, which outlives the specific arithmetic: **a public surface
must not assert a tournament state the tournament does not have.** Same class
as inventing cross-group matches out of a pool round, and same class as showing
a branded header an org has not paid for — a projected round is a *prediction*
rendered indistinguishably from a result. An empty bracket shape only reassures
if it is achievable; if it contradicts the real structure it is worse than no
shape at all. If a future format genuinely wants the poster look, it must
derive the shape from that format's own advancement rules, not from halving.

Corollary to verify when adopting this: with projection gone, the last round in
the document is routinely the round being **played**, holding N matches — not a
one-match Final. Renderers that assume `rounds[length-1]` is the Final and draw
only its first match will silently drop competitors.

### Entitlement: resolve where the tier is visible

> **A public surface must never evaluate a gate. It consumes an answer; it does
> not compute one.**
> Resolve entitlement on the signed-in device, write the resolved boolean into
> the document, and let the surface render what it is told.

This is not a style preference — it is a correctness requirement, and three
surfaces have already fallen into the trap. `Gates` resolves entirely from the
signed-in user's claims, and `Gates.init()` runs on auth. **On a page with no
auth it never runs**, so:

- `_tier` stays `'community'` → every `minTier: 'per_event'` feature resolves
  **`{allowed:false}`** forever, whatever the org actually pays for;
- `_switches` stays `{}` → `isEnabled()` returns true → every platform-switch
  feature resolves **open**, because the page cannot read `platform/switches`
  (authenticated) to learn otherwise.

So a gate on a public surface fails **closed for tier gates and open for switch
gates**, and in both cases answers a question it has no data for. It does not
throw and it does not warn — it silently returns a confident wrong answer.

Renderers follow from this: a `branded`-style option is an **instruction, not a
request to be validated**. `Audience.renderBracketTree()` deliberately performs
no `Gates` check for exactly this reason. Entitlement is a caller concern.

### Withheld means absent — and absence must be written

**Do not ship what the gate withholds.** The document is world-readable, so
writing gated fields for an unentitled org puts precisely the fields a paid
tier unlocks into public view — a paywall that holds only because the client
agrees to look away.

The subtlety that will catch any format copying this pattern, the moment an org
changes tier:

> **Omitting a key and deleting a key are different operations.**
> Writes use `merge: true` so that publishes don't clear branding. Under merge,
> *omitting* a field **leaves its previous value in place**. An org that was
> entitled, then downgrades and restarts, keeps its branding sitting in a public
> document indefinitely — with `branded:false` alongside it, so nothing renders
> and nothing looks wrong.

Absence therefore has to be written **explicitly**, via Firestore's
`deleteField()`. Throwdown routes this through a `TD_DELETE` sentinel that the
single write hook (1) maps to `deleteField()`, which keeps the firestore import
and the write in one place. Verify by reading the raw document after a
downgrade-and-restart: the keys should be **gone**, not falsy.

### Surface split — one document, two renderings

Where both an in-venue display and a public link are wanted, they are separate
files reading the same document, because their design pressures are
incompatible: a fixed 16:9 non-interactive projector stage versus a responsive
page opened on a phone. Do not merge them.

A consequence worth stating so it is not later filed as a responsive bug:
**`audience/bracket.html` is unreadable at 375px, and that is correct.** It is a
fixed large-display surface that scales its 1920×1080 stage to fit whatever it
is given; at phone width it letterboxes down to something legible only on a
projector. `audience/index.html` is the phone answer. Neither page is a
fallback for the other.

---

## Design System v4.1 (formalised tokens & brand mark)

The v4.1 design system (built in Claude Design, integrated June 2026) formalised the visual language into named tokens. **All v4.0 contract tokens are unchanged** — the additions below are purely additive. Audited token-by-token against production before integration: 45/45 contract tokens identical, all `.tmr-*`/`.aud-*` overlay classes intact, zero selectors removed.

### New token groups (additive — adopt incrementally, literals still valid)

| Group | Tokens | Notes |
|---|---|---|
| Type scale | `--fs-hero/-display/-h2/-stat/-lead/-body/-sm/-xs/-eyebrow/-label/-micro` | Sized to match existing usage — no rendered change |
| Weights | `--fw-regular/-medium/-semibold/-bold/-extrabold` | 400–800 |
| Tracking / leading | `--ls-tight/-snug/-eyebrow/-label/-tag` · `--lh-tight/-snug/-body` | |
| Spacing | `--space-1` (4px) → `--space-10` (60px) | 4px base scale |
| Layout | `--container` (1080px), `--container-narrow` (900px), `--focus-ring` | |
| Borders | `--bw-hair` (1px), `--bw` (1.5px), `--bw-rail` (4px status rail) | |
| Radius | `--rad-pill` (99px) joins existing `--rad-xs/-s/--rad` | |
| Medals | `--rank-1/-2/-3` | Leaderboard rank dots (was hardcoded) |
| Parent brand | `--gmcw-teal` (#3197a7), `--gmcw-ink`, `--gmcw-grey` | Grey Matter Coffee Werks palette |
| Text aliases | `--text-strong/-body/-muted/-faint/-accent` | Optional sugar over `--ink*` |

### Brand marks — usage rules

- **Seduh "brew waves" mark** (`shared/assets/seduh-mark.svg`) is the **platform identity** — a pour radiating in three arcs above a drop, reading as an S for *seduh*. Single colour via `currentColor`; recolour by setting `color:` on the parent (defaults to `--accent` in the header).
- **Grey Matter coffee-bean / GMCW lockup** is the **parent brand's** mark. Never substitute one for the other.
- Header lockup: inline the SVG inside a `.plat-mark` span. The old `.plat-hdr-ac` amber rail is retained for back-compat.
- Favicon set: `favicon.svg`, `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png`.

### Voice (copy conventions)

- Sentence case everywhere; mono eyebrows/labels are the only UPPERCASE.
- Second person to the organiser ("Your changes save to this device").
- Em-dashes for rhythm. Emoji only as functional category glyphs (☕ ⚡ 🏆 ⏱ 📺), never in body copy.
  **Scoped exception (v5.10.2-booth):** booth mini-games deliberately run a playful register —
  emoji in body copy is allowed under `booth/` only. Never import this register into
  organiser- or judge-facing modules.
- Warm, plain, confident — never corporate, never hype.

### Design-session regression guard (updated)

Before any future Claude Design session touching `theme.css`, paste this file in first. Hard contract — never rename or remove:
- Tokens: `--txt/--txt2/--txt3`, `--am*`, `--bl*`, `--gn*`, `--rd*`, `--pu*`, `--accent*`, `--bg`, `--surface*`, `--border*`, `--ink*`
- Classes: all `.tmr-*`, all `.aud-*`, `#tmr-overlay`, `#aud-overlay`, `#pdf-overlay`, `.pdf-*` print rules
- Semantic colour meanings: blue = rounds, green = completion/winners, purple = redemption, red = destructive/ties

### Round-colour addendum (bracket-tree-specific — POA-63)

The bracket-tree renderer (`Audience.renderBracketTree()`, see Shared
component APIs above) colours each round column by its position in the
bracket: blue for early/mid rounds, amber for the semi-final, green for the
final, purple for a redemption round. **This reuses blue/amber/green/purple
as a second, additive meaning — round *identity*, not match *status*** — and
is scoped to this one view only. It does not change or override the
semantic colour contract above anywhere else in the platform (blue still
means rounds/scheduled, green still means completion/winners, purple still
means redemption, wherever those already appear).

This isn't a new pattern the bracket-tree view introduced — confirmed while
building it, `throwdown/index.html`'s own `roundColour()`/`pdfRoundColour()`
functions (~line 1118) already map final→green, semi-final→amber,
quarter-final/round 2+→blue, redemption→purple, for Throwdown's existing
bracket view, its audience overlay, and its PDF export. It simply hadn't
been written down here before this pass. Same treatment MUA-04's
`audience_branding` and MUA-07's `pdf_branding` each got when they shipped.

### Known follow-ups from the v4.1 integration

1. Self-host the three Google Fonts as `.woff2` (currently CDN `@import`) — required for true offline competition-day reliability.
2. Throwdown module-local styles (`.bslot*`, `.score-modal*`, `.vbtn`, `.hr-row*`) remain module-local — promote to shared theme only if needed by another module.
3. Accent-override swatch palette lives in dashboard JS — lift to tokens if preset accents are wanted centrally.
4. Optional `[data-theme="stage"]` scope to formalise the dark projector values currently hardcoded in `#tmr-overlay`.

---

## Session discipline — long-term project health

Seduh Score is a 1+1 project (one developer, one AI collaborator) intended to run for multiple years. Context loss is the primary risk at this scale — not technical complexity. The habits below are the mitigation.

---

### Before starting any session

**The single non-negotiable rule across ALL session types — Strategy, Code, and Design:**

> **Read `CHANGELOG.md` from the knowledge base first. Always. No exceptions.**
>
> Memory of a file is not the same as reading the current file. Working from memory risks hallucination, version drift, and duplicate or conflicting entries. If the KB version has not been read in this session, it has not been read.

**Strategy / architecture sessions (this chat):**
1. Read `CHANGELOG.md` from KB — know the current version and what's pending
2. Read `CONVENTIONS.md` from KB — confirm patterns before any discussion
3. Read `ROADMAP.md` or `PLAN_OF_ACTION.md` if the session touches planning
4. State the specific question or decision to be made before exploring
5. Never create a working CHANGELOG from scratch — always append to the KB version

**Build sessions (Claude Code):**
1. Read `CHANGELOG.md` from KB — know the current version and what's pending
2. Read `CONVENTIONS.md` — know the patterns before touching any file
3. Read the relevant module file — understand current state before changing it
4. State the specific task clearly before writing any code
5. Confirm working directory is the local repo (`cd` before launching Claude)
6. Never access GitHub URLs directly — work from local files only

**Design sessions (Claude Design):**
1. Read `CHANGELOG.md` from KB — know the current version before any visual work
2. Paste `CONVENTIONS.md` in full at the start — non-negotiable
3. State the regression guard explicitly: contract tokens and overlay classes must never be renamed or removed
4. Request files as output, not screenshots

---

### During any build session

- One task at a time — fix, verify, then move to next
- Show the change before applying it on anything non-trivial
- Run a syntax check after every non-trivial edit
- Never rename an existing token, class, or storage key without explicit confirmation
- Never push directly to `main` — all changes go to `dev` first
- If something feels wrong mid-session — stop, come back to the strategy chat

---

### Before closing any session

**Non-negotiable after every build session that ships code:**
- [ ] CHANGELOG.md updated — version number, what changed, what was deferred
- [ ] Any new pattern or decision added to CONVENTIONS.md
- [ ] Knowledge base snapshots replaced if CHANGELOG or CONVENTIONS changed
- [ ] Changes committed to `dev` with a clear commit message

Standing habit, same moment as the CHANGELOG update above — whenever this
session bumped CHANGELOG.md's top-line version: run the audit in
KB-PROTOCOL.md before closing the session.

**After any strategy session where a significant decision was made:**
- [ ] Decision captured in ROADMAP.md, STRATEGY.md, or PLAN_OF_ACTION.md
- [ ] Knowledge base updated if any of those documents changed

**The single highest-leverage habit:**
Never close a build session without a CHANGELOG entry. Everything else can slip occasionally. This one cannot.

---

### Knowledge base consistency

The full protocol for auditing drift across CHANGELOG.md, CLAUDE.md,
CONVENTIONS.md, README.md, PLAN_OF_ACTION.md, ROADMAP.md, and STRATEGY.md
lives in a dedicated document: **KB-PROTOCOL.md**.

Load KB-PROTOCOL.md into any session — Strategy, Code, or Design — to force
a drift audit. It defines which documents are checked on every version bump
versus only on major/minor bumps, the exact version-stamp format every
document must carry, and how to run `scripts/check-doc-versions.sh` for a
mechanical first pass.

**Claude Code sessions specifically:** the same procedure is packaged as an
auto-invoked skill at `.claude/skills/kb-recon/SKILL.md`, so Code sessions
don't require KB-PROTOCOL.md to be manually loaded — the skill fires on the
same trigger conditions (CHANGELOG bump, POA close, business decision) on
its own. Strategy and Design sessions still load KB-PROTOCOL.md directly, since
neither surface supports Claude Code skills. If the audit protocol itself
changes, update KB-PROTOCOL.md first — the skill is a summary of it, not a
fork, and must be re-synced whenever the tier table or trigger matrix changes.

Do not duplicate that logic here — if the audit protocol itself needs to
change, update KB-PROTOCOL.md, not this section.

---

### Before building any new module

1. Write a spec document in the strategy chat first — not in Claude Code
2. Review the spec against CONVENTIONS.md for pattern conflicts
3. Create a build plan with Claude Code session prompts before starting
4. Only then hand off to Claude Code with spec and build plan attached

The spec gate is what keeps architectural consistency alive as the platform grows. Skipping it to "just quickly build it" is how drift starts.

---

### Periodic health check (every major version)

- Read CONVENTIONS.md top to bottom — is it still accurate?
- Read ROADMAP.md — does it reflect current reality?
- Check all knowledge base snapshots match repo files
- Review PLAN_OF_ACTION.md — are deferred items still correctly prioritised?

---

## New chat session checklist (quick reference)

Before starting work in a new session — **all session types: Strategy, Code, Design:**

1. Read `CHANGELOG.md` from KB — know what version we're on and what's pending
2. Read `CONVENTIONS.md` from KB — know the patterns
3. Read the relevant module's `index.html` — understand current state before touching it
4. State the specific task clearly before writing any code
5. Run a syntax check after every non-trivial edit

**If any of steps 1–3 are skipped, stop and do them first. Memory is not a substitute.**

---

*Last updated: July 2026 — v5.16.0 pass (POA-70/71/72/64, redemption end-to-end +
projection removal): new "7. Publish only rounds that exist. Never project the
ones that don't." mechanic under "Live sync pattern" — the seventh, added after
projection's halving-based shape proved incompatible with revival/redemption
adding competitors back into the bracket. General rule stated for reuse by any
future format: a public surface must not assert a tournament state the
tournament does not have. Prior pass — v5.13.0 pass (POA-63 Phase 1, bracket-tree renderer — renumbered
from an initial "POA-62" that collided with an unrelated pre-existing backlog item of the
same number, caught before anything was pushed): new
"Bracket-tree renderer" subsection under Shared component APIs documenting
`Audience.renderBracketTree()` (signature, `options`, re-render model, size-agnosticism,
active-glow, just-resolved flash, scale-to-fit, gating); new "Round-colour addendum" under
Design System v4.1 documenting the blue/amber/green/purple round-identity reuse as
bracket-tree-specific and additive, not a platform-wide redefinition — and noting the
pattern already existed, undocumented, in `throwdown/index.html`'s own `roundColour()`/
`pdfRoundColour()`. Prior pass — v5.10.3 pass (POA-60, pitch page restructure): directory tree entry
for `pitch/index.html` updated to reflect the "The Platform" reframe (problem-first, pricing +
governance sections, version timeline/spiral moved out) and a new `bts/index.html` entry added
for the "Behind the Seduh" build-story page it moved into. Prior pass — v5.10.2-booth pass (Guess the Bean visual overhaul + booth
Firebase consolidation): Voice section gains the scoped booth emoji exception; directory
tree notes `?demo=1` on the guess pages and lists booth as a `firebase.js` consumer;
Emulator section documents the localhost consequence for booth pages (they now hit the
emulator locally, not production). Prior pass — KB reconciliation (post PR #21 merge + deploy): corrected
the "Firebase Hosting picks up main automatically" claim under "Releasing to live" — no
`.github/workflows/` exists, every service needs its own explicit `firebase deploy`, now
written as an explicit post-merge checklist; this gap caused a real deploy delay for the
PR #21 onboarding form. New "Firebase Emulator Suite (local dev)" section documents the
emulator ports, `shared/firebase.js` connection guard, and `scripts/emulator-seed-admin.js`
as reusable infrastructure for future tickets, not a one-off for POA-47/56/57/58. Prior
pass — v5.10.2 (POA-58 banner fix): Gates internal-methods list adds
`Gates.getStartTime()`. Prior pass — v5.10.1 (POA-57, legacy Org Management panel removal): Cloud Functions
section drops `setOrgClaims`/`getOrgByEmail` (removed, dead code) and notes the removal. Prior pass
— v5.10.0 (access-window enforcement + POA-56 + Bug A): Gates section
documents the new `reason: 'not_started'` value, `Gates.isNotYetStarted()`, and a new "Org access
window" subsection explaining `subscription_start`/`subscription_expiry`. Cloud Functions section's
`activateOrg` and `submitOrgRequest` entries rewritten to describe the v5.10.0 server-side Auth user
creation and path-based Storage resolution respectively. Prior pass — v5.9.0 (POA-47, codename Seria, public onboarding intake form): directory tree gets three entries this pass — `tour/`, `pitch/`, and the new `onboard/` (the first two were missing from this file entirely, backfilled alongside the new one); Cloud Functions section documents `createOrg`/`activateOrg`/`updateOrgNotes`/`archiveOrg` (previously undocumented, POA-41) and the new `submitOrgRequest`. Prior pass — v5.5.2 (POA-42 Part B, shared upcoming-events module + front-page banner): new `shared/upcoming-events.js` documented (tree entry, B1 approved-files list, component API section) — sixth post-B1 shared file, superseding the ribbon-vs-carousel flag raised in the v5.5.1 pass. Prior pass — v5.5.1 (POA-42 Part A, front-page version pill fix): new `shared/version.js` documented (tree entry, B1 approved-files list, component API section). Prior pass — v5.5.0 (POA-40, Throwdown results archive / Seduh Records seed): Firestore live-stack table's rules row now lists the new `throwdown_records` collection. Prior pass — CONVENTIONS audit v5.4.0 (reconciling v5.1.2 → v5.4.0 CHANGELOG drift): directory tree updated (added `about/`, `coming-soon/`, `booth/`), `shared/sound.js` documented (tree entry + component API section), Firebase live-stack table split into six rows (Firestore rules/indexes and Storage/Storage rules now listed separately, per `firestore.indexes.json` and `storage.rules`), Hosting row notes the `/` → `/coming-soon/` redirect. BBTC's residual `.hdr-s`/`.hdr-t` inner-class rename is not tracked in this file (no POA cross-reference table exists here to correct) — it now lives under PLAN_OF_ACTION.md's POA-38, not the already-closed POA-06.*
