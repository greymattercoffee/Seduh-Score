# Changelog — Seduh Score

---

## [4.0.2] — CSS Audit & theme.css cleanup · June 2026

### shared/theme.css
- Three separate `:root` blocks consolidated into one canonical block —
  section comments preserved for readability
- Version comment added: `/* Seduh Score — theme.css v4.1 — audited June 2026 */`
- **Dead token removed:** `--rad-xs` — confirmed unused across all modules
- **9 orphan classes removed:** `.plat-hdr-module`, `.chip-num`, `.chip-rm`,
  `.inf-v`, `.inf-l`, `.badge-am`, `.badge-bl`, `.badge-rd`, `.badge-gn` —
  confirmed unused across all modules
- `border-radius:99px` literal replaced with `var(--rad-pill)` across 9
  selectors within theme.css — no module files touched
- All `.tmr-*` / `.aud-*` / `#pdf-overlay` overlay classes and print rules
  confirmed intact — 80/80 verification pass
- Net: 95 tokens in single `:root` block; 1 token removed, 9 classes removed

---

## [4.0.1] — Timer fixes · June 2026

### Shared
- **Fix: Timer horn inaudible** — time's-up horn was synthesised at 100–150 Hz,
  below the range most laptop and phone speakers reproduce. Raised to 330 Hz
  (square) / 247 Hz (sawtooth) so it carries on any device.
- **Fix: Last-10-seconds flash not showing on standalone timer page** —
  `theme.css` sets `#tmr-overlay { display:none; position:fixed }` for the
  popup overlay pattern used by BBTC and Throwdown. The standalone
  `timer/index.html` never overrode this, so the timer element was hidden
  entirely. Added CSS overrides in `timer/index.html` to keep the timer
  always-visible and in page flow (`position:static`), switching to full-screen
  fixed only when the `.fs` class is applied.
- **Timer warning state hardened** — `running` class is removed during the
  warning window so the red flash can never be overridden by the amber running
  colour.

### Liga Seduh
- **Fix: Timer audio missing** — `liga/index.html` was loading `timer.js` but
  not `sound.js`. Beep (last 10 s) and horn (time's up) now fire correctly.

---

## [4.0.0] — Liga Seduh · June 2026

### liga/index.html (new module)
- **Liga Seduh Bawah Tanah** — full round-robin league module
- Setup: event info, brewer roster (add/remove), rounds with ceiling validation
  (`floor((N−1)/2)`), device list management
- Schedule generator: randomised greedy with retry (up to 5000 attempts),
  no-repeat pair constraint, duo fairness rotation; N mod 3 determines
  triads/duos per round
- Scoring: `resolveMatch()` pure function handles all cases — 2-1-0 clean,
  3-0-0 sweep (revote for 2nd/3rd), 1-1-1 deadlock (tiebreaker judge + revote),
  duo 2-0/1-1, solo walkover; amber ⚖ TB badge on judge-broken matches
- Standings: live league table sorted Pts → W → Votes; `--rank-1/-2/-3` medal
  tokens for top 3
- Final tab: locked until all regular matches are done; auto-selects top 3;
  cutoff-tie detection triggers RPS picker with checkboxes; 5-vote pool
  (3 brewer + 2 external judge); Final result does not alter league table
- Report tab: champion result, frozen league table, device usage summary
  (matches/wins per device, per-brewer device history), per-brewer season
  summary, CSV export
- Audience view: `Audience.show()` with live standings and current-round
  matchups; inline hex throughout (no CSS var cascade into overlay)
- Demo mode: 8-brewer mid-season state (2 of 3 rounds done) including a sweep,
  a deadlock, and a duo
- JSON save/load with `_module:'liga'` guard; storage key `seduh_liga_v1`

### index.html (dashboard)
- Liga Seduh card set to `live:true`, `href:'liga/index.html'`
- Module count updates to 3 live

---

## [3.6.0] — Design System v4.1 (partial) · June 2026

### shared/theme.css
- Formalised token system — additive only, all v4.0 contract tokens unchanged
- New named foundations: type scale (`--fs-*`), weights (`--fw-*`), tracking/leading
  (`--ls-*`/`--lh-*`), spacing (`--space-1`→`--space-10`), layout (`--container`,
  `--container-narrow`, `--focus-ring`), border widths (`--bw-*`)
- New semantic tokens: `--rank-1/-2/-3` (leaderboard medals), `--gmcw-teal/-ink/-grey`
  (Grey Matter Coffee Werks parent palette), `--text-*` aliases over `--ink*`
- New surface/border tokens: `--ink2/3/4`, `--surface2/3`, `--border/2/3`, `--am-soft`
- Brown-tinted shadow tokens (`--shadow-sm/-md/-lg`) formalised — warm paper, never
  cold grey
- `.plat-mark` class added — header lockup slot for inline Seduh brew-waves SVG mark;
  `.plat-hdr-ac` rail retained for back-compat
- Typography helper classes added: `.eyebrow`, `.mono`, `.label`, `.hint`, `.empty`
- All `.tmr-*` / `.aud-*` / `#pdf-overlay` overlay classes preserved verbatim

### shared/assets/ (new folder)
- `seduh-mark.svg` — Seduh brew-waves brand mark (single colour, `currentColor`)
- `favicon.svg`, `favicon-32.png`, `favicon-16.png`, `apple-touch-icon.png` — favicon set

### CONVENTIONS.md
- Design System v4.1 section added: new token tables, brand mark usage rules,
  voice/copy conventions, updated regression guard, known follow-ups

### Deferred to v4.1 completion (post Liga Seduh)
- `.plat-mark` header markup integration across all module files
- Module inner `font-family:system-ui` → platform type system

---

## [3.5.3] — Jun 2025

### Standalone Timer
- **Custom timer input** — type any duration in minutes and press Set (or Enter) to load it. Preset buttons remain for quick access; custom value clears them. Hides in fullscreen mode.

---

## [3.5.2] — Jun 2025

### BBTC
- **Fix: Timer listener accumulation** — all static timer element listeners (close, fullscreen, presets, start/pause/reset, display-tap) moved out of `bind()` into a new one-time `initTimer()` call. Previously, switching tabs re-ran `bind()`, which re-registered the `tmr-fs` toggle listener — after any tab switch the toggle fired twice per click and cancelled itself, making fullscreen impossible to enter or exit.
- **Fix: Timer Escape key** — Escape now exits the BBTC timer overlay fullscreen mode (handled in `initTimer()`).

### Shared
- **Fix: Timer Escape key** — Escape exits fullscreen in Throwdown and the standalone timer page. Added to `shared/timer.js` `init()` — no-op on standalone (overlay element absent, optional chaining guards).
- **Fix: timer.js null guard** — `tmr-fs` click now uses optional chaining (`ovl()?.classList.toggle`) to prevent a silent TypeError on the standalone timer page where `#tmr-overlay` does not exist.

---

## [3.5.1] — Jun 2025

### Shared
- **Fix: Timer fullscreen display-tap** — tapping the large timer display exits fullscreen mode. Works on all devices including mobile (no keyboard required). `cursor:pointer` added to `.fs` display rule in `theme.css`. Listener added in `shared/timer.js` (covers Throwdown); `bbtc/index.html` has its own equivalent handler in `initTimer()`.
- **Standalone Timer page** — `timer/index.html` added. Loads `shared/timer.js` and `shared/theme.css`. Default 7 min preset. Fullscreen court display with Escape key and `fs-exit` button. Grey Matter Coffee Werks credit in header. Passive entry point to Seduh Score platform via footer link.

---

## [3.5.0] — Jun 2025

### BBTC
- **JSON Save/Load** — `⬇ Save` and `⬆ Load` header buttons. Exports full state as a timestamped `.json` file; imports with `_module:'bbtc'` guard to prevent cross-module contamination. `mid` and `jid` counters included in export. `DEFAULT_STATE`-style merge on import for safe state restoration.

### Shared
- **audience.js** — `aud-lb` guard added (prevents duplicate leaderboard panel).

### Platform
- **Dashboard redesigned** — permanent Grey Matter Coffee Werks / Firdaus Omar lockup in header and footer. "Make it your own" slide-over: competition name, subtitle, date, venue, accent colour (6 coffee tones, amber default), logo upload, 3 cover layouts (Band / Editorial / Ticket). Persists to `seduh_event_v1`.
- **Theme refreshed (v4.0 design system)** — strict superset of previous theme. Token names preserved (`--txt*`, `--am*`, `--bl*`, `--gn*`, `--rd*`, `--pu*`, all `.tmr-*` and `.aud-*` classes). Values warmed up. New tokens added for dashboard (`--ink*`, `--surface2/3`, `--border3`, `--am-soft`, `--accent*`, `--rad-xs`, font vars). Modules inherit new look with zero markup changes.

---

## [3.1.1] — Jun 2025

### BBTC
- **Home button** — added ← Home to the header. Navigates back to the dashboard, matching Throwdown behaviour.
- **Fix: Finalise handler invalid tab** — `fin` handler had three consecutive `S.tab=` assignments from iterative edits; the first set tab to `'matches'`, a key that does not exist in BBTC. Collapsed to a single expression: bracket match → `'bracket'`, prelim → `'prelims'`, fallback → `'prelims'`.

---

## [3.1.0] — Jun 2025

### BBTC
- **Fix: Judge selection broken on create match form** — stray semicolon in `rCreateForm()` cut off judge pill buttons from the DOM silently. Fixed.
- **Fix: Demo button non-functional** — `load-demo` handler was never registered in `bind()`. Fixed.
- **Fix: Demo card on wrong tab** — demo card was injected into Bracket tab instead of Setup. Fixed.
- **PDF round grouping** — match results table now has a coloured section header per round (Preliminary = grey, QF = blue, SF = amber, Finals = green).
- **Audience view label** — corrected from "Standings" to "Preliminary Standings".
- **Audience view match colour coding** — result rows tinted and tagged by round.
- **Edit button on completed bracket matches** — consistent with preliminary match card behaviour.
- **Demo mode** — Setup tab. 8 teams, 3 judges, 12 prelim matches, QF in progress. Confirms before overwriting live data.

### Throwdown
- **7 min timer preset** — added for Girls Got Drip format.
- **Redemption cap** — max number revived from redemption pool. `0` = no limit.
- **Wild card revival** — optional per-round toggle. Randomly revives one loser after each completed main round. Skip available. Disabled from QF and above.
- **Demo mode** — Girls Got Drip Vol. 0 format: 12 participants, redemption R1 cap 4, Round 3 in progress.

### Platform
- Git remote URL corrected to `mfosa7222/Seduh-Score`.
- README URLs corrected throughout.

---

## [3.0.0] — Platform Launch

- Project renamed from BBTC-Score to **Seduh Score**.
- Multi-module architecture: dashboard `index.html` + `bbtc/` + `throwdown/` + `shared/`.
- Shared components extracted: `theme.css`, `timer.js`, `audience.js`, `storage.js`.
- **Throwdown 1v1** module added: randomized bracket, bye handling, redemption round, judge vote scoring, auto-advancement, audience view, standings, history, timer, persistence, reset.
- **Dashboard** module selector added.

---

## [2.0.0] — Bracket Engine & Design Overhaul (BBTC)

- Colour system redesigned for WCAG AA contrast.
- Standings tab — preliminary round only. Bracket seeding from preliminary points exclusively.
- Tabs reorganised: Setup · Prelims · Bracket · History · Standings.
- localStorage key updated to `bbtc_v3`.
- Bracket engine: full QF / SF / Final + 3rd Place. Flexible for 2–8+ advancing teams.
- Timer overlay: 5/10/15 min presets, fullscreen court display.

---

## [1.6.0]
- Audience view — light theme for projector display.
- CSV export: leaderboard, match summary, cup-by-cup scores (UTF-8 BOM).

## [1.5.0]
- Round winner bonus (+5) auto-awarded.
- Event date and venue fields added to PDF export.

## [1.4.0]
- A4 PDF export. localStorage persistence. Reset with confirmation.

## [1.3.0]
- 0/1/2/3 token scoring with shared 3-token constraint per cup.
- Token usage counter. Finish time fields.

## [1.2.0]
- Full-screen audience overlay. QF leaderboard contrast fix.

## [1.1.0]
- Manual match creation with judge pool selection. History tab. QF cutline on leaderboard.

## [1.0.0] — Initial Release (BBTC)
- Setup: teams, judges. Manual matches. Cup-by-cup scoring. Bonus points.
