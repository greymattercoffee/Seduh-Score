# AUDIENCE-SPEC.md
## Seduh Score — Audience View Rebuild (POA-16)
### Build Contract · v4.5.1 → v4.6.0

---

## Pre-session confirmations

- Current version: **v4.5.1** ✅ (confirmed from CHANGELOG)
- Regression guard in place: no `.aud-*` class renamed or removed ✅
- `audInited` guard is absent in current `audience.js` — confirmed debt ✅
- BBTC has no `Audience.init()` or `Audience.show()` call — confirmed isolation ✅
- `audience_links` key in current `gates.js` is split in this build into
  `audience_links_concluded` and `audience_links_snapshot` ✅

---

## Scope

This spec governs:
1. Full rebuild of `shared/audience.js`
2. Token addition in `shared/theme.css`
3. Feature registry update in `shared/gates.js`
4. Migration passes for all four modules (Throwdown, Liga, BTC, Cup Taster)
5. New `audience/index.html` remote viewer stub

This spec does **not** govern: CHANGELOG entries, version bump decisions,
PR strategy. Those belong to the build session and strategy chat respectively.

---

## Locked decisions — not reopened here

All of the following are locked and carried forward as-is:

- Frame: directed narrative presentation, not a static data display
- Lite tier: single panel, light theme default, no branding, no podium
- Enhanced tier: dual panel, dark theme default, branding slots, live toggle, podium mode
- Podium: full-screen mode change, organiser-triggered, Enhanced only
- Dark/light: `setEventConfig()` sets default; live toggle overrides per session
- BTC migrates to new contract — no special accommodation, no legacy shims
- Cup Taster: backward-compatible call → migrates to full contract in build session
- URL access: hooks planted now; four URL states; responsive from day one
- Firebase write path: localStorage first → Firebase background sync → resync on reconnect
- Dual-panel split: 42 / 58 (standings / results)
- Single panel: results fills full width, no empty left column
- Latest result is the largest element — recency hierarchy
- Mobile stack: results above standings
- Remote page: light/paper base (justified deviation — no token changes to `theme.css`)

---

## Design token reference (binding)

All values below are the source of truth. Audience overlay uses inline hex
equivalents per the CONVENTIONS.md exception (CSS variables not guaranteed
to cascade into overlay context). `--aud-accent` is the sole exception —
set directly on `#aud-overlay` where cascade is guaranteed.

```
Dark mode:
  bg           --surface-deep   #1c1510
  card         --deep-card      #26201a
  text         --deep-ink       #faf7f1
  text-2       --deep-ink2      #c8b6a4
  border       --deep-bd        #3a2c20

Light mode:
  bg           --bg             #f3efe8
  card         --surface        #ffffff
  text         --txt            #211a14
  text-2       --txt2           #4d443c
  border       --border         #e5ddd0

Accent:
  --aud-accent                  defaults to var(--accent)
                                set as CSS custom property on #aud-overlay

Typography:
  event name        --fs-h2 / --fs-display    800
  latest result     --fs-display              800
  standings row     --fs-lead                 700
  module tag        --fs-label mono           0.14em tracking
  podium champion   --fs-hero                 800

Radius:
  panels / cards    --rad       14px
  inner             --rad-s     9px
  badges            --rad-pill  99px

Header:
  LEFT:   Seduh mark · event name · module tag
  RIGHT:  live indicator · logo · toggle · close

Logo tile:
  48px tall, max 150px wide, object-fit:contain, --rad-s
  Container always present in Enhanced; absent in Lite and phone header

Toggle:
  sun/moon icon, 38px, header-right
  Absent in Lite
```

---

## 1. `shared/theme.css` — token addition

Add one token to the `:root` block:

```css
--aud-accent: var(--accent);
```

This is the only `theme.css` change in this build. The token is set as a
CSS custom property on `#aud-overlay` itself at render time (via inline style
or JS), inheriting down to all descendant elements. This allows organiser
accent override without touching `theme.css` per event.

**No other token changes.** The `--surface-deep` suite already exists from
v4.4.2 and is used as-is.

---

## 2. `shared/gates.js` — FEATURES registry update

Replace the current `audience_enhanced` and `audience_links` entries with:

```javascript
// Audience view
'audience_enhanced':          { minTier: 'per_event' },
// Presentation mode: dual panel, dark theme, branding, podium, live toggle

'audience_links_concluded':   { minTier: 'community' },
// Concluded results page — static snapshot, all tiers, no live data

'audience_links_snapshot':    { minTier: 'per_event' },
// Live snapshot URL + last-updated timestamp — post-Firebase; almost-confirmed
// Built now so no retrofit needed when Firebase ships

'audience_links_live':        { minTier: null },
// Real-time push — Annual minimum; platform switch only; super admin enables
```

`audience_links` key is removed. It does not appear in any module file
(Cup Taster v4.4.0 used `audience_enhanced` only; no module ever called
`Gates.canAccess('audience_links')`). Safe to remove.

**`minTier: 'community'` handling:** `canAccess()` must treat `'community'`
as allowing all tiers (community, per_event, annual). In the current stub
implementation all calls return `{ allowed: true }` — no logic change needed
until Firebase. When the stub is replaced, the tier hierarchy check
`community < per_event < annual` means `minTier: 'community'` passes for
every tier. This is correct.

---

## 3. `shared/audience.js` — full rebuild

### 3.1 Module-level variables

```javascript
let audInited = false;
let _cfg = {
  accentColour: null,      // hex string | null → falls back to var(--accent)
  logoUrl: null,           // blob URL | data URL | null — ephemeral, not persisted
  projectionMode: 'dark',  // 'dark' | 'light'
  eventId: null,           // reserved for Firebase — not wired yet
};
```

`_cfg` is the internal config state. It is populated by `Audience.setEventConfig()`
and read by `Audience.show()` and `Audience.showPodium()`.

### 3.2 `Audience.setEventConfig(params)`

**Call timing:** Called once during module init or event setup. Not called
on every render. Modules call it after the event name is established —
typically at the end of `init()` or when the organiser confirms event details.
Not called again on subsequent renders unless the organiser changes config.

**Signature:**

```javascript
Audience.setEventConfig({
  accentColour: null,     // hex string | null  → falls back to var(--accent)
  logoUrl: null,          // blob URL | data URL | null
  projectionMode: 'dark', // 'dark' | 'light' — overlay starting state
  eventId: null,          // reserved — not wired until Firebase
});
```

**Merge behaviour:** Partial config merges with current `_cfg`. Properties
not supplied are left unchanged. This allows a module to set only
`projectionMode` without wiping a previously-uploaded logo.

```javascript
Audience.setEventConfig = function(params) {
  Object.assign(_cfg, params);
  // Persist projection mode to localStorage — see §3.8
};
```

**Persistence:** `projectionMode` and `accentColour` are persisted to
`seduh_aud_config_v1`. `logoUrl` is **not** persisted — blob URLs are
tab-scoped and ephemeral. Data URLs can be large. Organiser re-uploads logo
on each session. This is by design and must be noted in a UI hint near the
logo upload control ("Logo clears on page refresh — re-upload each session").

**Module reset:** When a module resets its state (e.g. Throwdown reset
confirmation), it is not responsible for clearing audience config. Audience
config is event-scoped, not competition-state-scoped. It persists through
resets unless the organiser explicitly changes it. The `audience/index.html`
remote viewer page has no direct access to `setEventConfig()` — that path
is Firebase-only (post-v4.7).

**Storage on `setEventConfig()` call:** After merging, write `projectionMode`
and `accentColour` to localStorage via the storage key defined in §3.8.

### 3.3 `Audience.init()`

**Guard pattern — one-time per page session:**

```javascript
Audience.init = function() {
  if (audInited) return;
  audInited = true;

  // Wire #aud-close (null-guarded via on() helper pattern)
  const closeBtn = document.getElementById('aud-close');
  if (closeBtn) closeBtn.addEventListener('click', Audience.close);

  // Wire Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') Audience.close();
  });

  // Wire light/dark toggle — Enhanced only
  // Toggle presence checked; no-op if absent (Lite tier)
  const toggle = document.getElementById('aud-theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function() {
      _toggleTheme();
    });
  }

  // Wire podium back button — Enhanced only
  const podiumBack = document.getElementById('aud-podium-back');
  if (podiumBack) {
    podiumBack.addEventListener('click', function() {
      _exitPodium();
    });
  }

  // Restore persisted config (projectionMode, accentColour)
  _loadConfig();
};
```

**Reset behaviour:** `audInited` is never reset. The overlay element is
static and does not require listener rewiring across render cycles. This
mirrors the `inited` guard pattern in `shared/timer.js`.

**Placement rule (mirrors Timer.init()):** Call `Audience.init()` as the
first line inside `bind()` — same rule as `Timer.init()`. Safe to call on
every render cycle due to the guard.

### 3.4 `Audience.show(params)` — extended signature

**Full signature:**

```javascript
Audience.show({
  title: '',           // required — event name shown in header
  moduleTag: '',       // optional — round/stage badge (e.g. 'Quarterfinals')
  lbHTML: '',          // optional — standings panel HTML; omit for single-panel
  histHTML: '',        // required — results panel HTML (see §3.4 notes)
  podium: null,        // optional — podium data array; see §3.6 for format
                       // Passing podium does NOT auto-trigger podium mode.
                       // It is stored for use when Audience.showPodium() is called.
});
```

**`histHTML` requirement:** `histHTML` is required. If omitted or empty,
the results panel renders an empty state message ("No results yet"). It does
not throw. The module must always pass `histHTML`.

**`lbHTML` — dual vs single panel:**
- `lbHTML` present → dual panel rendered (Enhanced tier; ignored / single panel in Lite)
- `lbHTML` absent / `null` / `undefined` → single panel (results fills full width)
- Empty string `''` is treated as absent — single panel

**`podium` param:** Optional array. When passed, stored internally as
`_podiumData`. Does not automatically switch to podium mode. `showPodium()`
must be called explicitly by the organiser action. If `podium` is not passed
on a given `show()` call, `_podiumData` is cleared (organiser cannot trigger
podium until show() provides new data).

**Gate behaviour in `Audience.show()`:**
- `Gates.canAccess('audience_enhanced').allowed === false` → render single panel,
  light theme, no logo slot, no toggle, no podium button — regardless of params
- `lbHTML` param is silently ignored in Lite (not passed to layout)

**Backward compatibility:** All current callers pass `title`, `lbHTML`
(if applicable), and `histHTML`. The `moduleTag` and `podium` params are
new and optional — no existing caller breaks.

### 3.5 Overlay states — complete enumeration

| State | ID | Trigger | Panel layout | Theme | Notes |
|---|---|---|---|---|---|
| Hidden | `hidden` | default / `close()` | — | — | `#aud-overlay` display:none |
| Lite active | `lite` | `show()` — community tier | Single panel (histHTML) | Light | No branding, no toggle, no podium btn |
| Enhanced dark | `enh-dark` | `show()` — per_event+, projectionMode:'dark' | Dual panel | Dark | Branding slots, toggle, podium btn |
| Enhanced light | `enh-light` | toggle fired | Dual panel | Light | Branding slots, toggle, podium btn |
| Enhanced single-dark | `enh-single-dark` | `show()` — per_event+, lbHTML omitted, projectionMode:'dark' | Single panel | Dark | Throwdown pattern |
| Enhanced single-light | `enh-single-light` | toggle fired | Single panel | Light | |
| Podium | `podium` | `showPodium()` — per_event+ | Full-screen takeover | Dark (locked) | Champion centred; back button visible |
| Podium dismissed | — | Back button | Returns to last non-podium state | Restored | `_lastState` restored |

**Open/close restore behaviour:** When the overlay is closed and reopened
via a subsequent `show()` call, the mode is restored from `_cfg.projectionMode`
(which reflects the last toggle-persisted state). Podium mode is not restored
on reopen — `show()` always opens in the dual/single panel state.

**`_lastState` tracking:** Before entering podium mode, the current state
identifier is stored in `_lastState`. On `_exitPodium()`, the overlay
returns to `_lastState`. This means if the organiser was in `enh-light` and
triggers podium, dismissing podium returns to `enh-light`.

### 3.6 Podium mode — JavaScript contract

**Trigger model:** Separate `Audience.showPodium()` call. Not triggered
automatically by any state change. The organiser explicitly presses a
"Reveal podium" button in the module UI — that button calls `Audience.showPodium()`.

```javascript
Audience.showPodium = function() {
  const access = Gates.canAccess('audience_enhanced');
  if (!access.allowed) return; // no-op in Lite — no fallback single-panel podium

  if (!_podiumData || _podiumData.length === 0) return; // no-op if no data

  _lastState = _currentState; // save for return
  _currentState = 'podium';
  _renderPodium();
  document.getElementById('aud-overlay').style.display = 'flex';
};
```

**Podium data format:**

```javascript
// Passed as podium param in Audience.show()
[
  { rank: 1, name: 'Competitor Name' },  // Champion — centred, largest
  { rank: 2, name: 'Competitor Name' },  // 1st Runner Up — left
  { rank: 3, name: 'Competitor Name' },  // 2nd Runner Up — right
]
```

**Maximum podium entries:** Fixed at 3. A fourth entry is ignored if passed.
Fewer than 3 entries are valid — podium renders whatever is present.
An absent rank slot renders as an empty tile (greyed).

**Podium dismissal:** `#aud-podium-back` button. Returns to `_lastState`
(the dual or single panel state before podium was triggered). Does **not**
close the overlay. `#aud-close` closes the overlay from any state including podium.

**Gate failure in `showPodium()`:** If `audience_enhanced` gate fails,
`showPodium()` is a no-op. It does not show a degraded podium in Lite.
The "Reveal podium" button in the module UI must also be gated —
`Gates.canAccess('audience_enhanced').allowed === false` → button hidden.

**Podium layout:** Full-screen takeover. Dark theme locked (ignores
current light/dark state — podium is always dark). Champion centred and
largest. 1st Runner Up left, 2nd Runner Up right. Back button top-left.
`--rank-1/-2/-3` medal tokens apply to name chips.

**Podium at mobile (≤640px):** Champion stacks above runners. Runners
display side-by-side below champion (or stacked if both present). No
side-by-side layout at mobile.

### 3.7 Light/dark toggle — JavaScript contract

**Element:** `<button id="aud-theme-toggle">` — single button, sun/moon icon.
Present in overlay markup for Enhanced tier. Absent in Lite markup.

**Mode storage:** CSS class on `#aud-overlay`:
- `.aud-dark` — dark theme active
- `.aud-light` — light theme active (overrides default dark)

Class is toggled by `_toggleTheme()`. JS also tracks current mode in
`_cfg.projectionMode` for persistence.

```javascript
function _toggleTheme() {
  const ovl = document.getElementById('aud-overlay');
  if (!ovl) return;
  const isDark = ovl.classList.contains('aud-dark');
  ovl.classList.toggle('aud-dark', !isDark);
  ovl.classList.toggle('aud-light', isDark);
  _cfg.projectionMode = isDark ? 'light' : 'dark';
  _saveConfig(); // persist toggle choice
}
```

**Session persistence:** Toggle choice is persisted to `seduh_aud_config_v1`
so a refresh mid-competition restores the organiser's chosen mode. This is
the `projectionMode` field in the config object.

**Toggle gate:** Toggle is present only when `Gates.canAccess('audience_enhanced').allowed`.
In Lite, `#aud-theme-toggle` is absent from the markup entirely — the init
listener wiring null-checks for it.

**Toggle visibility at mobile:** Visible at all viewport sizes. The organiser
may be on a phone and need to switch modes.

### 3.8 Config persistence — storage

**Storage key:** `seduh_aud_config_v1`

**Persisted fields:**

```javascript
{
  projectionMode: 'dark',  // 'dark' | 'light'
  accentColour: null,      // hex string | null
}
```

**NOT persisted:** `logoUrl` (blob URLs are tab-scoped and ephemeral;
data URLs are large; organiser re-uploads each session — this is by design).
`eventId` (Firebase concern — not local).

**Load on init:** `_loadConfig()` is called inside `Audience.init()`. It
reads `seduh_aud_config_v1` from localStorage, merges into `_cfg`. If key
is absent (first session), defaults are used.

**Save on change:** `_saveConfig()` writes `{ projectionMode, accentColour }`
to `seduh_aud_config_v1`. Called by `_toggleTheme()` and by `setEventConfig()`
when `projectionMode` or `accentColour` changes.

**Storage mechanism:** Direct `localStorage` calls (not via `Store()` wrapper)
because this config is audience-module-scoped and accessed inside
`audience.js` without a module key context. Pattern:

```javascript
function _saveConfig() {
  try {
    localStorage.setItem('seduh_aud_config_v1',
      JSON.stringify({ projectionMode: _cfg.projectionMode, accentColour: _cfg.accentColour }));
  } catch(e) {}
}

function _loadConfig() {
  try {
    const raw = localStorage.getItem('seduh_aud_config_v1');
    if (raw) Object.assign(_cfg, JSON.parse(raw));
  } catch(e) {}
}
```

### 3.9 Null guards — complete element ID list

All element lookups inside `audience.js` use null guards. Full list:

| Element ID | Guard pattern |
|---|---|
| `#aud-overlay` | `const ovl = document.getElementById('aud-overlay'); if (!ovl) return;` |
| `#aud-close` | `if (closeBtn)` in init |
| `#aud-lb` | `const lb = document.getElementById('aud-lb'); if (lb) lb.innerHTML = ...` |
| `#aud-hist` | `const hist = document.getElementById('aud-hist'); if (hist) hist.innerHTML = ...` |
| `#aud-ts` | `const ts = document.getElementById('aud-ts'); if (ts) ts.innerHTML = ...` |
| `#aud-theme-toggle` | `if (toggle)` in init |
| `#aud-podium-back` | `if (podiumBack)` in init |
| `#aud-logo` | `const logo = document.getElementById('aud-logo'); if (logo) logo.src = ...` |
| `#aud-tag` | `const tag = document.getElementById('aud-tag'); if (tag) tag.textContent = ...` |
| `#aud-podium-panel` | `const pp = document.getElementById('aud-podium-panel'); if (pp) pp.innerHTML = ...` |

**`#aud-lb` guard:** The existing guard added in v3.5.0 (`if (lb)`) is
retained and is sufficient. The new dual/single panel architecture does not
change this — `#aud-lb` is simply absent from the overlay markup in Lite
and in single-panel Enhanced, and the guard handles this correctly.

### 3.10 Responsive behaviour — CSS contract

**Breakpoint:** `640px`. Below this, the dual panel collapses to a single
stacked layout.

**Stack order at ≤640px:** Results panel (`#aud-hist`) above standings
panel (`#aud-lb`). This is locked from the design session.

**Header at ≤640px:** Logo slot hidden. Seduh mark + event name + module tag
remain. Live indicator, toggle, and close remain (toggle stays accessible).

**Podium at ≤640px:** Champion stacks above runners. Runners display
side-by-side directly below champion if viewport allows; if not, also stacked.

**Viewport contexts:**
| Context | Width range | Notes |
|---|---|---|
| Projector / large display | ≥1024px | Primary design target; dual panel |
| Organiser device | 768–1200px | Standard tablet/laptop range |
| Remote viewer phone | ≤430px | portrait; accessed via URL post-Firebase |

---

## 4. Overlay markup contract (for reference only — Claude Code ensures alignment)

The following IDs must be present in every module's overlay HTML that calls
`Audience.init()`. IDs that are conditional on tier are noted.

```
#aud-overlay           — root overlay container (always)
#aud-close             — close button (always)
#aud-ts                — event name / header title area (always)
#aud-hist              — results panel (always)
#aud-lb                — standings panel (Enhanced dual-panel only; absent in Lite)
#aud-theme-toggle      — light/dark toggle button (Enhanced only; absent in Lite)
#aud-logo              — logo tile img (Enhanced only; absent in Lite)
#aud-tag               — module tag badge (optional; present in all Enhanced, absent in Lite)
#aud-podium-panel      — podium full-screen panel (Enhanced only; absent in Lite)
#aud-podium-back       — podium back button (Enhanced only; absent in Lite)
#aud-remote-updated    — "Updated Xs ago" timestamp (remote viewer page only)
```

**`--aud-accent` inline style:** `#aud-overlay` receives an inline style
`style="--aud-accent: [hex]"` from `Audience.show()` when `_cfg.accentColour`
is non-null. When null, the attribute is omitted and the CSS variable falls
back to `var(--accent)` as defined in `theme.css`.

---

## 5. Module migration passes

### 5.1 Throwdown — migration (minimal)

Current state: calls `Audience.init()` in `bind()` ✅; calls `Audience.show()`
with `histHTML` only (no `lbHTML`) ✅.

Migration checklist:
- [ ] `Audience.init()` call confirmed in `bind()` — no change if already present
- [ ] `Audience.show()` call updated to pass `title` (event name from `S.eventName`)
      and `moduleTag` (current round label e.g. 'Round 3') explicitly
- [ ] `lbHTML` confirmed absent (not passed as empty string — must be `undefined`
      or the param simply omitted from the call object)
- [ ] `podium` array constructed and passed when bracket is complete:
  ```javascript
  // Podium data — passed to show(); showPodium() called by separate button
  const podiumData = bracketComplete ? [
    { rank: 1, name: finalWinner },
    { rank: 2, name: finalLoser },
    { rank: 3, name: sfLosers.join(' · ') }, // both SF losers as one entry
  ] : null;
  ```
- [ ] "Reveal podium" button added to Throwdown header/UI, gated behind
      `Gates.canAccess('audience_enhanced')` — calls `Audience.showPodium()`
- [ ] Inline hex in `rAudienceHistHTML()` unchanged (CONVENTIONS.md exception)

### 5.2 Liga Seduh — migration (minimal)

Current state: calls `Audience.init()` in `bind()` ✅; calls `Audience.show()`
with all four params ✅.

Migration checklist:
- [ ] `Audience.init()` call confirmed in `bind()` — no change if already present
- [ ] `moduleTag` param confirmed passed (current stage label) — add if absent
- [ ] `podium` array constructed and passed when final standings are set:
  ```javascript
  const podiumData = standings.length >= 1 ? [
    { rank: 1, name: standings[0].name },
    { rank: 2, name: standings[1]?.name || '' },
    { rank: 3, name: standings[2]?.name || '' },
  ] : null;
  ```
- [ ] "Reveal podium" button gated behind `audience_enhanced` — calls `Audience.showPodium()`
- [ ] Inline hex in audience render functions unchanged

### 5.3 BTC (formerly BBTC) — migration (substantial — POA-09)

Current state: self-contained audience overlay inside `bbtc/index.html`.
No `Audience.init()` or `Audience.show()` calls. Full migration required.

Migration checklist:
- [ ] **Remove** self-contained audience overlay HTML from `bbtc/index.html`
      (the entire `#aud-overlay` block and its contents currently inlined)
- [ ] **Remove** self-contained audience JS from `bbtc/index.html`
      (all audience-related functions currently local to the module)
- [ ] Add `<script src="../shared/audience.js"></script>` if not already present
- [ ] Add `Audience.init()` as first call in `bind()` (before or after `Timer.init()`)
- [ ] Add `rAudienceLbHTML()` function — preliminary standings with "Preliminary standings"
      label. Returns an HTML string. Inline hex only (CONVENTIONS.md exception).
- [ ] Add `rAudienceHistHTML()` function — match history rows with round-colour
      CSS classes (see §5.3a below). Returns an HTML string.
- [ ] Add audience button to BTC header — matches `.btn-hdr` pattern in other modules
- [ ] Wire audience button in `bind()` to call `Audience.show({...})`
- [ ] `Audience.show()` call:
  ```javascript
  Audience.show({
    title: S.eventName || 'Barista Team Championship',
    moduleTag: _currentRoundLabel(), // e.g. 'Quarterfinals'
    lbHTML: rAudienceLbHTML(),
    histHTML: rAudienceHistHTML(),
    podium: null, // deferred — showPodium() not yet triggered for BTC
  });
  ```
- [ ] Gate check: `Gates.canAccess('audience_enhanced')` already handled inside
      `Audience.show()` — module does not need to gate the button itself
      (button always shows; audience.js renders Lite or Enhanced based on gate)
- [ ] BTC podium deferred: `showPodium()` call not added in this build.
      Podium data model is defined here for future use (see §5.3b).

#### 5.3a Round colour classes (Option B — shared/theme.css)

Round-colour CSS classes for `histHTML` rows are defined in `shared/theme.css`
as named classes. **Option B is confirmed.** This makes classes available to
the overlay's CSS context reliably, since the overlay is a child of the page.

Classes to add to `shared/theme.css`:

```css
.aud-round-pre  { background: <grey-bg>;  color: <grey>;  }  /* --txt3 equiv */
.aud-round-qf   { background: <blue-bg>;  color: <blue>;  }  /* --bl-bg / --bl */
.aud-round-sf   { background: <amber-bg>; color: <amber>; }  /* --am-bg / --am */
.aud-round-fin  { background: <green-bg>; color: <green>; }  /* --gn-bg / --gn */
```

Inline hex values (CONVENTIONS.md exception applies to overlay content only —
these classes are in `theme.css` so use CSS variable references here):

```css
.aud-round-pre  { background-color: var(--surface2);  color: var(--txt3); }
.aud-round-qf   { background-color: var(--bl-bg);     color: var(--bl);   }
.aud-round-sf   { background-color: var(--am-bg);     color: var(--am);   }
.aud-round-fin  { background-color: var(--gn-bg);     color: var(--gn);   }
```

BTC's `rAudienceHistHTML()` applies these classes to match history rows.
Each row gets the class for its round. Other modules may adopt these classes
as well (Throwdown does not currently use round-colour coding in audience view).

#### 5.3b BTC podium data model (for future use)

```javascript
// When BTC bracket is complete and showPodium() is wired:
{
  rank: 1, name: finalWinner,      // Champion = Final winner
  rank: 2, name: finalLoser,       // 1st Runner Up = Final loser
  rank: 3, name: thirdPlaceWinner, // 3rd = 3rd place match winner
}
```

### 5.4 Cup Taster — migration (minimal)

Current state: `Audience.init()` in `bind()` ✅ (per v4.4.0 CHANGELOG);
`Audience.show()` called with `lbHTML` and `histHTML` ✅;
`Gates.canAccess('audience_enhanced')` gate check present ✅.

Migration checklist:
- [ ] Confirm `Audience.init()` is first line of `bind()` — no change if correct
- [ ] Update `Audience.show()` call to pass `title` (event name or 'Cup Taster')
      and `moduleTag` (current stage label e.g. 'Preliminary' / 'Finals') explicitly
      if not already present
- [ ] Confirm `lbHTML` and `histHTML` are passed correctly — no change expected
- [ ] Confirm gate check pattern for `audience_enhanced` matches
      `Gates.canAccess('audience_enhanced').allowed` (not a bare boolean)
      and that the element is hidden, not disabled
- [ ] Inline hex in `rAudienceLbHTML()` and `rAudienceHeatHTML()` confirmed
      unchanged — CONVENTIONS.md exception; inline hex is correct here
- [ ] Cup Taster podium deferred: `showPodium()` not added in this build.
      Podium data model:
      ```
      rank 1: Finals winner
      rank 2: Finals runner-up
      rank 3: Semis 3rd-place finisher (if applicable stage ran), else omitted
      ```

---

## 6. `audience/index.html` — remote viewer stub

### 6.1 File path decision

**Confirmed: `audience/index.html`**

Rationale: clean URL pattern (`seduhscore.com/audience/`), consistent with
module structure (`throwdown/`, `liga/`, etc.), does not imply live-only
(`live/` would be misleading pre-Firebase).

### 6.2 Four URL states

The page reads `?state=` param for pre-Firebase development/testing.
When Firebase is live, this param is ignored and the real Firestore status
document is read instead.

| State | URL param (stub) | Condition (Firebase, future) | Content rendered |
|---|---|---|---|
| A — Pre-event | `?state=pre` | Firebase doc exists, `status:'pending'` | Holding page — "Event hasn't started yet" |
| B — Live | `?state=live` | Firebase doc exists, `status:'live'` | Live results (snapshot or real-time) |
| C — Concluded | `?state=concluded` | Firebase doc exists, `status:'concluded'` | Final results record — static |
| D — No event | `?state=none` or no param | No `eventId` in URL / no doc | "No event configured" fallback |

**Default stub state:** If no `?state=` param is present, render State A
(pre-event holding page) with a generic "Results will appear here when the
event is live." message. Never 404, never crash.

**`eventId` in URL:** Post-Firebase, the URL slug `seduhscore.com/live/[eventId]`
(or `audience/[eventId]`) identifies the Firestore document. Pre-Firebase,
`?eventId=` param is accepted but ignored — page always renders the stub state.

### 6.3 Page structure and elements

```html
<!-- Required elements — all must be present in DOM regardless of state -->
<span id="aud-remote-updated">Updated 3s ago</span>
<!-- Visible only in State B (live); hidden in A, C, D -->

<div id="aud-remote-state">
  <!-- State content rendered here — all four state templates defined in JS -->
</div>
```

**Last-updated element:**
- ID: `aud-remote-updated`
- Format: "Updated Xs ago" — relative, refreshed by JS interval (every 5s)
- Visible: State B (live) only; `display:none` in all other states
- Pre-Firebase: always hidden (no real timestamp available)

### 6.4 Pre-Firebase stub behaviour

```javascript
// State determination — pre-Firebase
function getStubState() {
  const p = new URLSearchParams(window.location.search);
  const s = p.get('state');
  if (s === 'live') return 'live';
  if (s === 'concluded') return 'concluded';
  if (s === 'none') return 'none';
  return 'pre'; // default
}
```

All four state templates are defined and rendered in the stub so the page
can be fully tested before Firebase integration.

### 6.5 Firebase hooks (stub only — no real Firebase code in this build)

```javascript
// TODO (v4.7 Firebase): read eventId from URL path or ?eventId= param
// const eventId = getEventIdFromUrl();
// const doc = await firebase.firestore().doc(`events/${eventId}`).get();
// const status = doc.data().status; // 'pending' | 'live' | 'concluded'
// renderState(status, doc.data());

// TODO (audience_links_live gate): Firestore real-time listener
// if (Gates.canAccess('audience_links_live').allowed) {
//   firebase.firestore().doc(`events/${eventId}`).onSnapshot(snap => { ... });
// }
```

### 6.6 Responsiveness

The remote viewer page is designed mobile-first (portrait ≤430px primary).
It renders correctly at all three viewport contexts. Single-panel layout
(no dual panel on this page — it is a read-only viewer, not the full overlay).
Light/paper base confirmed — no `--surface-deep` tokens on this page.

### 6.7 Page-level shared file inclusion

```html
<link rel="stylesheet" href="../shared/theme.css">
<script src="../shared/gates.js"></script>
<!-- No timer.js, no audience.js, no storage.js required for stub -->
```

---

## 7. Summary — new storage keys introduced in this build

| Key | Contents | Persisted | Notes |
|---|---|---|---|
| `seduh_aud_config_v1` | `{ projectionMode, accentColour }` | Yes | Survives reload; logoUrl intentionally excluded |

No other new storage keys. BTC migration uses existing `Store('seduh_bbtc_v3')`
for competition state — unchanged.

---

## 8. Build session sequence (from handoff)

Build in this order — confirm each file before moving to the next:

1. `shared/theme.css` — add `--aud-accent` token + `.aud-round-*` classes
2. `shared/gates.js` — update FEATURES registry (audience key split)
3. `shared/audience.js` — full rebuild from this spec
4. `throwdown/index.html` — migration pass (minimal)
5. `liga/index.html` — migration pass (minimal)
6. `bbtc/index.html` — migration pass (POA-09 — substantial)
7. `cup-taster/index.html` — migration pass (minimal)
8. `audience/index.html` — new remote viewer page (stub states)
9. `CHANGELOG.md` — single entry for full rebuild

No batching across files. Each file confirmed before next begins.

---

## 9. Open items

All five items from the handoff are now resolved. No open items remain.

| Item | Resolution |
|---|---|
| `histHTML` can be omitted? | No — required param. Empty state message renders if absent/empty. Module must always pass it. |
| Podium back-button returns to last overlay state or always dual-panel? | Returns to `_lastState` (last non-podium state — could be dual or single panel Enhanced). |
| Round colour CSS class location (Option A vs B)? | **Option B** — `shared/theme.css` as `.aud-round-pre/.aud-round-qf/.aud-round-sf/.aud-round-fin`. |
| File path for remote viewer page? | **`audience/index.html`**. |
| `logoUrl` omitted from localStorage config? | **Yes** — omitted. Blob URLs ephemeral; data URLs large. Organiser re-uploads each session. UI hint required. |

---

*AUDIENCE-SPEC.md · POA-16 · Seduh Score v4.5.1 · June 2026*
*Strategy decisions locked: June 2026 · Design decisions locked: June 2026*
*Spec decisions locked: June 2026*
*Next: strategy chat review → Claude Code build session*
