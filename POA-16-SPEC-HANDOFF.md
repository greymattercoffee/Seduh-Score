# Seduh Score — Audience View Rebuild (POA-16)
## Spec Session Handoff — produce AUDIENCE-SPEC.md

---

## Before anything else

Read in this order — no exceptions, no skipping:
1. `CHANGELOG.md` — confirm current version (v4.5.1)
2. `CONVENTIONS.md` — read in full; paste into context
3. `PLAN_OF_ACTION.md` — read POA-09, POA-11, POA-16 entries
4. `shared/audience.js` — read current implementation in full

Confirm before proceeding:
- Regression guard in place: no `.aud-*` class renamed or removed
- `audInited` guard is absent in current implementation — confirmed debt
- BBTC has no `Audience.init()` or `Audience.show()` call — confirmed isolation

---

## What this session produces

One file: `AUDIENCE-SPEC.md`

This is the build contract. Claude Code builds `shared/audience.js` and all
module migration passes directly from this spec. It must be complete enough
that no architectural decisions remain open for Claude Code to resolve alone.

This session does **not** write any JavaScript, does not modify any existing
file, and does not produce a CHANGELOG entry. Code ships in the build session.

---

## What has already been decided — do not reopen

### Strategy session (locked)
- Frame: directed narrative presentation — drama and stakes, not data mirror
- Lite tier: single panel, light theme default, no branding, no podium
- Enhanced tier: dual panel, dark theme default, branding slots, live toggle, podium mode
- Podium: full-screen mode change, organiser-triggered, Enhanced only
- Dark/light: `setEventConfig` sets default; live toggle overrides for session
- BTC migrates to new contract — does not get special accommodation
- Full backward compat at call level for Cup Taster — then migrate in build session
- URL access: hooks planted now; four URL states; responsive from day one
- Firebase write path: localStorage first → Firebase background sync → resync on reconnect

### Design session (locked — from POA-16-PASS-OUTPUT.md)
- Dual-panel split: 42 / 58 (standings / results)
- Single panel: results fills full width, no empty left column
- Latest result is the largest element everywhere — recency hierarchy
- Mobile stack: results above standings
- Header: Seduh mark + event name + module tag LEFT;
         live indicator · logo · toggle · close RIGHT
- Logo slot: 48px tall, max 150px wide, `object-fit:contain`, `--rad-s`;
             container always present in Enhanced, absent in Lite and phone header
- Toggle: sun/moon 38px icon, header-right, absent in Lite
- Podium: full-screen takeover, centred champion, runner-up left / 2nd runner-up right
- Remote page: light/paper base (justified deviation — no token changes)
- Live indicator: ambient pulse + "updated Xs ago" — never a spinner, live state only
- One new token: `--aud-accent: var(--accent)` — set on `#aud-overlay`, inherited

### Gate decisions (locked)
| Key | minTier | Notes |
|---|---|---|
| `audience_enhanced` | `per_event` | Presentation + branding — dual panel, dark mode, toggle, logo, accent, podium |
| `audience_links_concluded` | `community` | Concluded results page — static, no live data, all tiers |
| `audience_links_snapshot` | `per_event` | Live snapshot URL + last updated — post-Firebase, almost-confirmed |
| `audience_links_live` | `null` (platform switch) | Real-time push — Annual minimum, super admin switch |

`audience_links` key from CONVENTIONS.md splits into `audience_links_concluded`
(community+) and `audience_links_snapshot` (per_event+). Update `gates.js`
FEATURES registry to reflect this split. `audience_links_live` retains
`minTier: null`.

---

## Design token handoff (binding — from Pass 1)

```
Dark mode:   bg --surface-deep #1c1510 · card --deep-card #26201a
             text --deep-ink #faf7f1 · 2nd --deep-ink2 #c8b6a4 · border --deep-bd #3a2c20
Light mode:  bg --bg #f3efe8 · card --surface #ffffff
             text --txt #211a14 · 2nd --txt2 #4d443c · border --border #e5ddd0
Accent:      --aud-accent (defaults to var(--accent), set on #aud-overlay)
Type:        event name --fs-h2/--fs-display · 800
             latest result --fs-display · 800
             standings row --fs-lead · 700
             module tag --fs-label mono · 0.14em tracking
             podium champion --fs-hero · 800
Radius:      panels/cards --rad 14px · inner --rad-s 9px · badges --rad-pill 99px
Toggle:      sun/moon 38px, header-right, absent in Lite
Header:      left = Seduh mark + event name + module tag
             right = live indicator · logo · toggle · close
Logo:        48px tall, max 150px wide, object-fit:contain, --rad-s tile
```

**Exception note from CONVENTIONS.md:** Audience view overlays use hardcoded
hex inline styles because they render in contexts where CSS variables may not
cascade correctly. The design token values above are the source of truth —
Claude Code uses their hex equivalents inline. The new `--aud-accent` token
is set on `#aud-overlay` itself where cascade is guaranteed.

---

## The spec session must define the following — all are open

### 1. `Audience.setEventConfig()` — full signature and call timing

Define:
- Complete parameter list with types and defaults
- When it is called (module init? on every render? once on event setup?)
- What happens if called with partial params — merge with defaults or replace?
- Whether config persists to localStorage between sessions
- Storage key if persisted (format: `seduh_aud_config_v1`)
- Whether config is cleared on module reset

Proposed signature for spec to confirm or adjust:
```javascript
Audience.setEventConfig({
  accentColour: null,     // hex string | null → falls back to var(--accent)
  logoUrl: null,          // blob URL | data URL | null
  projectionMode: 'dark', // 'dark' | 'light' — sets overlay starting state
  eventId: null,          // reserved for Firebase URL slug — not wired yet
})
```

### 2. `Audience.show()` — full extended signature

Define the complete new signature. Must be backward compatible with all
current callers. New params are additive and optional.

Proposed signature for spec to confirm or adjust:
```javascript
Audience.show({
  title: '',           // required — event name shown in header
  moduleTag: '',       // optional — round/stage badge (e.g. 'Quarterfinals')
  lbHTML: '',          // optional — standings panel HTML; omit for single-panel
  histHTML: '',        // required — results panel HTML
  podium: null,        // optional array — Enhanced only; triggers podium mode
                       // [{ rank: 1, name: '' }, { rank: 2, name: '' }, { rank: 3, name: '' }]
})
```

Spec must confirm:
- What happens when `podium` is passed but `audience_enhanced` gate fails —
  silently ignored or podium mode shown in Lite?
- Maximum podium entries — fixed at 3 or variable?
- Whether `histHTML` can be omitted (currently required in all callers)

### 3. `audInited` guard pattern

The current implementation stacks a new `#aud-close` listener on every
`Audience.init()` call — called every `bind()` cycle.

Spec must define the exact guard pattern:
```javascript
// Proposed — spec to confirm or adjust
let audInited = false;
Audience.init = function() {
  if (audInited) return;
  audInited = true;
  // wire #aud-close listener
  // wire keyboard Escape listener
  // wire light/dark toggle listener (Enhanced only)
};
```

Confirm: should `audInited` reset when the overlay is closed, or is it truly
one-time for the page session? One-time is correct — the overlay element is
static, listeners don't need rewiring.

### 4. Null guards for `aud-ts` and `aud-hist`

Current debt: both elements are referenced without null guards — accessing
`.innerHTML` on a null reference crashes silently in some render paths.

Spec must define guard pattern for all element references inside `audience.js`:
```javascript
// All element lookups use optional chaining or null-check before write
const el = document.getElementById('aud-hist');
if (el) el.innerHTML = params.histHTML || '';
```

List every element ID inside `audience.js` that requires a null guard.
Confirm whether `#aud-lb` (the existing `aud-lb` guard added in v3.5.0) is
sufficient or needs updating for the new dual/single-panel architecture.

### 5. Light/dark toggle — JavaScript contract

Define:
- Toggle element ID and markup (single `<button id="aud-theme-toggle">`)
- How current mode is stored: CSS class on `#aud-overlay` (e.g. `.aud-dark` /
  `.aud-light`) vs `data-theme` attribute vs module-level variable
- Whether the session override persists to localStorage
  (recommendation: yes — persist so a refresh mid-competition doesn't reset
  the organiser's mode choice)
- Storage key if persisted: `seduh_aud_config_v1` (shared with setEventConfig)
- Toggle absent in Lite: confirm gate check is `Gates.canAccess('audience_enhanced')`

### 6. Podium mode — JavaScript contract

Define:
- How podium mode is triggered: `Audience.showPodium(podiumArray)` as a
  separate call, or `Audience.show({ ..., podium: [...] })` with the array
  present triggering the mode change automatically
- Recommendation: separate `Audience.showPodium(array)` call. Cleaner — the
  organiser explicitly triggers it; it does not appear automatically on any
  state change. Spec to confirm or override this recommendation.
- How podium mode is dismissed: `#aud-close` (same as overlay close) or
  a separate `#aud-podium-back` button that returns to the dual-panel view
  without closing the overlay entirely
- Recommendation: separate back button — the organiser may want to return
  to live results after the podium reveal. Spec to confirm.
- Gate check: `Gates.canAccess('audience_enhanced')` — if fails, `showPodium()`
  is a no-op (or falls back to showing histHTML in single-panel)

### 7. Overlay states — full list

Spec must enumerate every discrete state the overlay can be in and define
what renders in each:

| State | Trigger | Panel layout | Notes |
|---|---|---|---|
| Hidden | default | — | `display:none` on `#aud-overlay` |
| Lite active | `show()` — community tier | Single panel (results) | Light theme, no branding |
| Enhanced active — dark | `show()` — per_event+, projectionMode:'dark' | Dual panel | Dark theme, branding slots populated |
| Enhanced active — light | toggle fired | Dual panel | Light theme, branding slots populated |
| Enhanced active — single | `show()` — lbHTML omitted | Single panel (results) | For Throwdown — full width |
| Podium | `showPodium()` — per_event+ | Full-screen takeover | Champion centred |
| Podium dismissed | Back button | Returns to last active state | Enhanced dual or single |

Spec must confirm: when the overlay is closed and reopened, does it return to
the last active state (dark/light, podium dismissed) or always open fresh?
Recommendation: restore last mode from localStorage config.

### 8. Responsive behaviour — CSS contract

The overlay must render correctly across three viewport contexts:
- Projector / large display: landscape, ≥1024px
- Organiser device: typically 768–1200px
- Remote viewer phone: portrait, ≤430px (accessed via URL post-Firebase)

Spec must define:
- Breakpoint at which dual panel collapses to single-panel stacked layout
  (recommendation: 640px — below this, panels stack vertically)
- Stack order at mobile: results panel above standings (locked from design session)
- Header behaviour at mobile: logo slot hidden (locked from design session)
- Podium at mobile: champion stacks above runners, not side-by-side
- Whether the toggle is accessible at all viewports or hidden on mobile
  (recommendation: visible at all sizes — organiser may be on phone)

### 9. BTC migration — exact contract

BTC currently has a self-contained audience overlay inside `bbtc/index.html`.
It does not call `Audience.init()` or `Audience.show()`. POA-09 folds into
this rebuild — BTC migrates to the new shared contract in the same build
session.

Spec must define what BTC's migration pass requires:

**What BTC passes to `Audience.show()`:**
- `title`: event name from BTC state
- `moduleTag`: current round label ('Quarterfinals' / 'Semifinals' / 'Finals')
- `lbHTML`: preliminary standings table — with "Preliminary standings" label
- `histHTML`: match history rows with round-colour coding

**Round-colour coding in histHTML:**
BTC's match history rows are tinted by round. This must survive migration.
The colour coding is BTC's own display logic — it lives in the HTML string
BTC passes as `histHTML`. The audience overlay renders it as-is.
Spec must confirm: CSS classes for round colours are defined where?
Options:
- (A) Inside `bbtc/index.html` inline in the histHTML string (current pattern)
- (B) In `shared/theme.css` as named classes (`.aud-round-qf`, etc.)
Option B is preferred — makes the classes available to the overlay's CSS
context reliably. Spec to confirm.

**Round colour mapping (locked semantic meanings):**
- Preliminary: grey (`--txt3` / `--deep-sub`)
- QF: blue (`--bl-bg` / `--bl`)
- SF: amber (`--am-bg` / `--am`)
- Finals: green (`--gn-bg` / `--gn`)

**"Preliminary standings" label:**
BTC passes this as part of `lbHTML` — it is BTC's own label, not a shared
overlay concern. Confirmed in design session State 6 — BTC's label renders
inside the standings panel container.

**BTC migration checklist for spec:**
- [ ] Remove self-contained audience overlay HTML from `bbtc/index.html`
- [ ] Remove self-contained audience JS from `bbtc/index.html`
- [ ] Add `Audience.init()` to BTC's `bind()`
- [ ] Add `rAudienceLbHTML()` function (preliminary standings with label)
- [ ] Add `rAudienceHistHTML()` function (match history with round colours)
- [ ] Add audience button to BTC header (match pattern in other modules)
- [ ] Add `Audience.show()` call wired to audience button
- [ ] Gate check: `Gates.canAccess('audience_enhanced')` for dual-panel
- [ ] BTC has no podium defined yet — `showPodium()` call deferred;
      podium data model for BTC defined here for future use:
      Champion = Final winner, Runner-up = Final loser, 3rd = 3rd place match winner

### 10. Cup Taster migration — exact contract

Cup Taster currently calls `Audience.show()` with the current signature.
It uses `lbHTML` and `histHTML`. The current implementation is backward
compatible — no immediate breakage. However, the build session migrates
Cup Taster to the new contract in full so no legacy shim is left behind.

Migration checklist for spec:
- [ ] Confirm `Audience.init()` is in Cup Taster's `bind()` — already present per v4.4.0
- [ ] Update Cup Taster's `Audience.show()` call to pass `title` and `moduleTag` explicitly
      if not already present
- [ ] Confirm inline hex in `rAudienceLbHTML()` and `rAudienceHeatHTML()` is unchanged
      (audience overlay exception from CONVENTIONS.md — inline hex is correct here)
- [ ] Gate check for `audience_enhanced` already present per v4.4.0 — confirm pattern
      matches new contract (hidden not disabled)
- [ ] Cup Taster podium: not yet defined — `showPodium()` deferred;
      data model: Champion = Finals winner, Runner-up = Finals runner-up,
      3rd = Semis third-place (if applicable) or omit

### 11. Throwdown migration — exact contract

Throwdown currently calls `Audience.show()` without `lbHTML` (no standings
panel). This is the single-panel pattern. Migration is minimal.

Migration checklist for spec:
- [ ] Confirm `Audience.init()` and `Audience.show()` calls match new contract
- [ ] Confirm `lbHTML` is explicitly omitted (not passed as empty string)
- [ ] Add `moduleTag` param to Throwdown's `Audience.show()` call if absent
- [ ] Throwdown podium: Champion = Final winner, Runner-up = Final loser,
      2nd Runner-up = both SF losers (listed together or as a single entry)
      — data model defined here, `showPodium()` call added to Throwdown in build

### 12. Liga Seduh migration — exact contract

Liga currently calls `Audience.show()` with all four params. Migration is
minimal — confirm contract alignment.

Migration checklist for spec:
- [ ] Confirm all four params are passed correctly
- [ ] Add `moduleTag` param if absent (current stage label)
- [ ] Liga podium: Champion = standings position 1, Runner-up = position 2,
      2nd Runner-up = position 3 — data model defined here,
      `showPodium()` call added in build

### 13. Remote viewer page — architectural hooks

The remote viewer page (`audience/index.html` or `live/index.html` — spec
must define the path) is a new file. It is the URL-accessible results page.

Spec must define:
- File path: `audience/index.html` is recommended (clean URL pattern,
  matches module structure). Confirm or override.
- The four URL states and how the page determines which to render:
  - **No event**: no `eventId` param in URL → State D
  - **Pre-event**: Firebase doc exists, `status: 'pending'` → State A
  - **Live**: Firebase doc exists, `status: 'live'` → State B
  - **Concluded**: Firebase doc exists, `status: 'concluded'` → State C
- Pre-Firebase stub behaviour: page always renders State A (pre-event) with
  a friendly "results will appear here" message. No 404, no crash.
- The `last updated` timestamp element: `<span id="aud-remote-updated">` —
  always present in the DOM, visible only in live state.
  Format: "Updated 3s ago" — relative, refreshed by JS interval.
- `audience_links_snapshot` is almost-confirmed post-Firebase. The hooks
  (URL parameter reading, state switching, last-updated element) are built
  now so no retrofit is needed when Firebase ships.
- `audience_links_live` platform switch: real-time push. When this switch
  is on and the org is Annual tier, the page subscribes to Firestore updates.
  Hook only — Firestore listener is a stub (`// TODO: Firebase listener`).

**Stub state for pre-Firebase:**
All four states are rendered based on a URL `?state=` param for development
and testing purposes. When Firebase is live, the param is ignored and the
real status document is read. This allows the page to be tested before
Firebase integration without deploying placeholder content.

### 14. Storage keys

Spec must define all new storage keys introduced in this rebuild:

| Key | Contents | Persisted? |
|---|---|---|
| `seduh_aud_config_v1` | `{ projectionMode, accentColour, logoUrl }` | Yes — survives page reload |
| No key for `eventId` | Firebase concern — not stored locally | — |

`logoUrl` as a blob URL does not persist across sessions (blob URLs are
tab-scoped). Spec must address this: either omit `logoUrl` from storage
(organiser re-uploads on each session) or convert to data URL before
storing. Recommendation: omit from storage — blob URLs are ephemeral
by nature and data URLs of logos can be large. Organiser re-uploads on
each session. Note this explicitly in the spec.

### 15. `gates.js` FEATURES registry update

The build session must update `shared/gates.js` to reflect the new audience
gate keys. Spec must include the exact updated registry entries:

```javascript
// Audience — replace existing 'audience_links' entry with:
'audience_enhanced':          { minTier: 'per_event' },
'audience_links_concluded':   { minTier: 'community' },
'audience_links_snapshot':    { minTier: 'per_event' },  // post-Firebase, almost-confirmed
'audience_links_live':        { minTier: null },          // platform switch — Annual when live
```

Note: `minTier: 'community'` means community tier and above. `canAccess()`
logic must support this — currently the tier hierarchy is
`community < per_event < annual`. Confirm `canAccess()` handles `'community'`
minTier correctly (all tiers pass).

---

## What the spec must not do

- Do not write any JavaScript
- Do not modify any existing file
- Do not make any new architectural decisions beyond those listed above —
  if a question arises that isn't covered here, flag it as an open item
  at the end of the spec rather than resolving it silently
- Do not reopen any decision marked as locked

---

## Build session sequence (after spec is confirmed)

The spec is returned to strategy chat for confirmation before Claude Code
opens. Once confirmed, Claude Code receives `AUDIENCE-SPEC.md` plus both
design files as visual references and builds in this order:

1. `shared/theme.css` — add `--aud-accent` token
2. `shared/gates.js` — update FEATURES registry (audience keys)
3. `shared/audience.js` — full rebuild from spec
4. `throwdown/index.html` — migration pass (minimal)
5. `liga/index.html` — migration pass (minimal)
6. `bbtc/index.html` — migration pass (POA-09 — substantial)
7. `cup-taster/index.html` — migration pass (minimal)
8. `audience/index.html` — new remote viewer page (stub states)
9. `CHANGELOG.md` — entry for the full rebuild

Each file is confirmed before moving to the next. No batching across files.

---

## Open items to flag if unresolved by end of spec session

If any of the following cannot be resolved in the spec session, list them
explicitly at the bottom of `AUDIENCE-SPEC.md` as `OPEN: [item]` so the
build session does not proceed with ambiguity:

- Whether `histHTML` can be omitted from `Audience.show()`
- Whether podium back-button returns to last overlay state or always dual-panel
- Round colour CSS class location (Option A: inline in BTC vs Option B: theme.css)
- File path for remote viewer page (`audience/index.html` vs `live/index.html`)
- Whether `logoUrl` is omitted from localStorage config

---

*POA-16 Spec Session · Seduh Score v4.5.1 · June 2026*
*Strategy decisions locked: June 2026 · Design decisions locked: June 2026*
*Next: AUDIENCE-SPEC.md → strategy chat review → Claude Code build*
