# Conventions — Seduh Score

Coding patterns, architecture decisions, and development standards for the Seduh Score platform. Read this at the start of any new chat session before touching code.

---

## Architecture

Seduh Score is a **static multi-file web app** — no build step, no bundler, no server. Each module is a self-contained `index.html` that loads shared components via relative `<script>` and `<link>` tags.

```
seduh-score/
├── index.html              ← dashboard launcher only
├── bbtc/index.html         ← fully self-contained module
├── throwdown/index.html    ← fully self-contained module
└── shared/                 ← loaded by every module
    ├── theme.css
    ├── timer.js
    ├── audience.js
    └── storage.js
```

Each module includes shared files like this:
```html
<link rel="stylesheet" href="../shared/theme.css">
<script src="../shared/storage.js"></script>
<script src="../shared/timer.js"></script>
<script src="../shared/audience.js"></script>
```

**Rule:** Never copy shared component code into a module file. Always reference from `../shared/`.

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
Store('bbtc_v3').save({ ...S, _mid: mid, _jid: jid });
const d = Store('bbtc_v3').load(); // returns null if empty
Store('bbtc_v3').clear();
```

### Storage keys

| Module | Key |
|---|---|
| BBTC | `bbtc_v3` |
| Throwdown | `seduh_throwdown_v1` |

**Rule:** Bump the key suffix when the state shape changes in a breaking way (e.g. `bbtc_v3` → `bbtc_v4`). This prevents old saved data from crashing the new version. Document the key change in CHANGELOG.

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

Both modules use a convenience helper:

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
  roundNum: 1,                // which main round number (used for wild card tracking)
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

### Audience (`shared/audience.js`)

```javascript
Audience.init();     // call once — wires close button
Audience.show({
  title: 'Throwdown 1v1',
  moduleTag: 'Round 3',  // optional badge label
  lbHTML: '...',          // inner HTML for standings panel
  histHTML: '...',        // inner HTML for results panel
});
```

### Storage (`shared/storage.js`)

```javascript
const store = Store('my_key');
store.save({ ...S, _mid: mid });  // always spread + add counters
const d = store.load();           // returns null if nothing saved
store.clear();                    // used by Reset
```

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

### Button classes

```css
.btn-p        /* primary — amber fill */
.btn-o        /* outline — border only */
.btn-sm       /* small — use with colour modifier */
.btn-am       /* amber outline */
.btn-bl       /* blue outline */
.btn-gn       /* green outline */
.btn-rd       /* red outline */
.btn-pu       /* purple outline */
```

Header action buttons use `.btn-hdr` + colour modifier.

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

**v3.5 note:** These will be extracted to `/shared/demo.js` with `Demo.loadBBTC()` and `Demo.loadThrowdown()` as the public API.

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
- `advanceBracket()` — called after every pair is scored. Handles: wild card pause, redemption pool collection, redemption round trigger, main pool advance, redemption cap application, merger of main + redemption winners.
- Wild card tracked in `b.wildCards = { [roundNum]: name | null }`. `null` means skipped.
- `b.pendingWildCard = roundNum` pauses advancement until organizer draws or skips.

---

## Versioning

Single platform version number. All modules ship together.

- **Patch** (3.1.x) — bug fixes only
- **Minor** (3.x.0) — new features, new module capabilities
- **Major** (x.0.0) — new module, major architecture change

Update CHANGELOG.md before committing any release. The CHANGELOG is the handoff document for new chat sessions.

---

## Git workflow

### Branch structure

```
main   — live, public-facing, what GitHub Pages serves. Always stable.
dev    — all active development. Work from any device here.
```

**`main` is protected** — never push directly. All changes arrive via Pull Request from `dev`. This ensures the live URL is never broken mid-work and competition-day stability is guaranteed.

### Daily workflow (any device)

**From phone or tablet** — use GitHub's web editor directly on the `dev` branch. Edit files, commit, all in browser. No local repo required.

**From desktop (PowerShell):**
```powershell
cd C:\Users\mfosa\OneDrive\Documents\Seduh-Score
git checkout dev
git add .
git commit -m "type: short description"
git push
```

Commit message types: `feat`, `fix`, `docs`, `refactor`

### Releasing to live (any device)

When a version is ready:
1. Open a Pull Request on GitHub — `dev` → `main`
2. Review the diff
3. Merge
4. GitHub Pages rebuilds automatically — live within ~60 seconds

### Setting up the dev branch (once, on desktop)
```powershell
git checkout -b dev
git push -u origin dev
```

### Repository
Remote: `https://github.com/greymattercoffee/Seduh-Score.git`  
Live URL: `https://greymattercoffee.github.io/Seduh-Score/`  
GitHub Pages: deploys from `main` branch root only.

---

## Firebase (future — v4.2+)

Firebase project `seduh-score` is registered at console.firebase.google.com.  
Email/Password authentication provider is enabled.  
No services actively used until v4.2 (hosting) and v5.0 (Firestore + Auth).

**Architecture intention for v5.0+:** `shared/storage.js` will gain a Firebase adapter behind the same `Store(key).save()/.load()/.clear()` interface. Modules will not need to change — only the adapter switches. This is why `storage.js` exists as an abstraction layer rather than direct `localStorage` calls in module code.

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
- Warm, plain, confident — never corporate, never hype.

### Design-session regression guard (updated)

Before any future Claude Design session touching `theme.css`, paste this file in first. Hard contract — never rename or remove:
- Tokens: `--txt/--txt2/--txt3`, `--am*`, `--bl*`, `--gn*`, `--rd*`, `--pu*`, `--accent*`, `--bg`, `--surface*`, `--border*`, `--ink*`
- Classes: all `.tmr-*`, all `.aud-*`, `#tmr-overlay`, `#aud-overlay`, `#pdf-overlay`, `.pdf-*` print rules
- Semantic colour meanings: blue = rounds, green = completion/winners, purple = redemption, red = destructive/ties

### Known follow-ups from the v4.1 integration

1. Self-host the three Google Fonts as `.woff2` (currently CDN `@import`) — required for true offline competition-day reliability.
2. Throwdown module-local styles (`.bslot*`, `.score-modal*`, `.vbtn`, `.hr-row*`) remain module-local — promote to shared theme only if Liga Seduh needs them.
3. Accent-override swatch palette lives in dashboard JS — lift to tokens if preset accents are wanted centrally.
4. Optional `[data-theme="stage"]` scope to formalise the dark projector values currently hardcoded in `#tmr-overlay`.
5. Module inner `font-family:system-ui` → platform type system (carried over from v4.0 HANDOFF).

---

## New chat session checklist

Before starting work in a new session:

1. Read `CHANGELOG.md` — know what version we're on and what's pending
2. Read `CONVENTIONS.md` (this file) — know the patterns
3. Read the relevant module's `index.html` — understand current state before touching it
4. State the specific task clearly before writing any code
5. Run a syntax check after every non-trivial edit

---

*Last updated: June 2026 — v4.1 design system integration*
