# Changelog — Seduh Score

---

## [3.5.0] — Jun 2025

### BBTC
- **JSON Save/Load** — `⬇ Save` and `⬆ Load` header buttons. Exports full state as a timestamped `.json` file; imports with `_module:'bbtc'` guard to prevent cross-module contamination. `mid` and `jid` counters included in export. `DEFAULT_STATE`-style merge on import for safe state restoration.

### Throwdown
- **JSON Save/Load** — `💾 Save` (green) and `📂 Load` (blue) header buttons between Timer and Audience. Mirrors BBTC pattern: `_module:'throwdown'` guard, `_mid` counter, `DEFAULT_STATE()` merge on import. Storage key `seduh_throwdown_v1`.
- **Judge list** — `judgeList[]` added to state. Judges named and displayed per match.
- **Standings tab removed** — replaced by leaderboard in Audience view. Cleaner navigation.
- **Round colour coding** — `roundColour()` helper. Rounds visually distinguished by colour across the bracket view.
- **Revival markers** — `b.revivedNames[]` tracks redemption returnees. Revived participants shown with ⬆ R badge in bracket.
- **Audience view redesigned** — single-panel results layout. Cleaner projector display.

### Shared
- **audience.js** — `aud-lb` guard added (prevents duplicate leaderboard panel). `title` param supported in `aud-ts`. `Audience.init()` called in `bind()` correctly.

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
