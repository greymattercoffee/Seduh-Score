# Conventions — Seduh Score

*State: v5.10.3 — matches CHANGELOG.md as of July 2026*

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
    ├── pdf.js                  ← ⚠️ documented, not implemented — see POA-55, no file exists yet
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

⚠️ `pdf.js` is **documented, not built** — see POA-55 in PLAN_OF_ACTION.md. No
module should add a `<script src="../shared/pdf.js">` include; the file does
not exist. BBTC's PDF export today is a self-contained inline overlay, not
this shared module.

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

### PDF export (`shared/pdf.js`) — documented API, not yet built (see POA-55)

⚠️ **This section describes a spec, not shipped code.** `shared/pdf.js` has never been
committed to any branch and no such file exists on disk. CHANGELOG.md's v5.4.0 entry,
this section, and CLAUDE.md's architecture tree all previously described it as shipped —
that was inaccurate; corrected as of the July 2026 full-repo audit. BBTC's PDF export
today is a self-contained inline overlay that does not use this API. Whether this module
gets built to the spec below or the documentation gets unwound instead is a pending
Strategy decision under POA-55 (PLAN_OF_ACTION.md) — do not write code against this API
until that resolves.

Approved third post-B1 shared file (strategy chat, July 2026, MUA-07-SPEC-V2.md). Shared,
format-agnostic PDF export module — owns the `#pdf-overlay` lifecycle, the gated event-identity
header, and the print trigger. Piloted on BBTC; Throwdown/Liga/Cup Taster adoption is separate,
future work (none of them has a PDF export today — see AUDIT.md / MUA-07-SPEC-V2.md for why the
original all-four-modules draft was rescoped).

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

| Element | Always shown | Behind `pdf_branding` gate |
|---|---|---|
| Seduh mark line | ✅ | — |
| `eventName` (plain text) | ✅ (falls back to `fallbackTitle` if unset) | — |
| `logoUrl`, `eventSubtitle`, `eventDate`, `eventVenue` | — | ✅ |

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

*Last updated: July 2026 — v5.10.3 pass (POA-60, pitch page restructure): directory tree entry
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
