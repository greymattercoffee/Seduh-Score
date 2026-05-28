# Changelog

All notable changes to the Brunei Barista Team Championship Organizer are documented here.

---

## [1.6.0] — Audience View Refresh & CSV Export

### Changed
- **Audience view** redesigned from dark theme to a clean light theme — white cards on warm off-white background, dark text, amber accents, and subtle card shadows. Significantly easier to read on projectors and large screens.
- QF-qualified rows in audience view now use a left green border stripe for stronger visual distinction.

### Added
- **Export CSV** button (📊) in the main header. Downloads a single `.csv` file containing three sections:
  - **Leaderboard** — rank, team, W/L record, total points, QF qualified flag
  - **Match Results** — one row per match with round, judge points, bonus flags, grand totals, and finish times for both teams
  - **Cup-by-Cup Scores** — full token breakdown per drink (D1–D15 or D20) for every completed match
- File is UTF-8 BOM encoded for seamless opening in Microsoft Excel on Windows.
- File name auto-includes event date if set (e.g. `BBTC_Results_14_June_2025.csv`).

---

## [1.5.0] — Auto Winner Bonus & Event Info

### Changed
- **Round winner bonus (+5)** is now awarded automatically to the team with the higher judge token count. The manual winner checkbox has been removed.
- Winner indicator in the scoring view displays as a read-only auto-checked row that activates as scores are entered.
- Fastest team bonus (+2) remains manually toggled and stays mutually exclusive between the two teams.

### Added
- **Event info card** in Setup tab with optional Date and Venue text fields.
- Date and venue appear as a subtitle line on both pages of the PDF export.
- Date and venue persist to localStorage alongside all other state.

---

## [1.4.0] — PDF Export & localStorage Persistence

### Added
- **Export PDF** button (📄) in the main header.
- Generates a print-ready A4 preview overlay with two pages:
  - Page 1: Final Standings table with QF cutline and qualifying indicators
  - Page 2: Match Results grouped by round, with winner highlighted and finish times
- `@media print` CSS hides all UI chrome — only the two A4 pages are printed.
- **localStorage persistence** — all competition data (teams, judges, matches, scores, QF slots) survives page refresh or tab close.
- **↺ Reset button** in header clears all data after confirmation dialog.

### Fixed
- Audience view now renders as an in-page full-screen overlay instead of attempting `window.open()`, which was blocked by browser popup blockers.

---

## [1.3.0] — Scoring Logic Overhaul & Time Recording

### Changed
- **Scoring grid rebuilt** around correct head-to-head token logic. Each drink row now shows **0 / 1 / 2 / 3** buttons per team. The combined tokens across both teams for any single drink cannot exceed 3 — the opposing team's higher options are automatically disabled.
- Replaced previous per-team judge token columns (which allowed 6 tokens per cup) with the shared constraint model.

### Added
- **Token usage counter** in the scoring header showing `X/45` or `X/60` used, turning red if the cap is exceeded.
- **Finish time fields** for both teams at the top of each scoring view (e.g. `8:42`). Times do not trigger a re-render while typing so focus is never lost.
- Finish times shown in the History tab alongside match scores.

---

## [1.2.0] — Audience View & Leaderboard QF Highlight Fix

### Added
- **📺 Audience view** — full-screen overlay showing a live leaderboard and match results side by side, designed for projection on a large screen. Refreshes from live data every time it is opened.
- Audience view includes amber/blue winner colouring, finish times, and QF cutline.

### Fixed
- Leaderboard QF highlight now uses explicit dark teal text (`#085041`) on the light green background, replacing the previous washed-out white text that was unreadable.

---

## [1.1.0] — Manual Match Creation, Judge Pool & History

### Changed
- **Removed** auto match generation. All matches are now created manually.
- **Create match form** lets the organizer select the round, Team 1, Team 2, and exactly 3 judges from the pool for each match individually.
- Each match stores its own assigned judges; scoring grids display those judge names.

### Added
- **Judge pool** in Setup — add as many judges as needed; the pool is shared across all matches.
- **History tab** — shows all finalised matches with round label, both team scores, and winner highlighted. Draws labelled as "draw".
- **Leaderboard tab** — ranks all teams by cumulative points with W/L record and matches played.
- **QF spots input** on the Leaderboard — set how many teams advance to quarter finals. Qualifying rows are highlighted green with a "QF ✓" badge. A cutline appears after the last qualifying position.
- Match list shows a round label badge on each match card.

---

## [1.0.0] — Initial Release

### Added
- **Setup tab** — register teams and judges (3 judges per match).
- **Round configuration** — Preliminary (15 drinks, 10 min, max 45 pts) and Quarter Finals / Semi Finals / Finals (20 drinks, 15 min, max 60 pts).
- **Match generation** — auto-pairs registered teams randomly for the selected round.
- **Scoring view** — per-team drink grids with judge token toggles (0 or 1 per judge per drink). Per-team column and row totals.
- **Bonus points** — Fastest team (+2, manual, mutually exclusive), Round winner (+5, manual, mutually exclusive), Signature beverage (+2, Quarter Finals and beyond only).
- **Grand total** display per team in scoring view.
- **Matches tab** — shows all matches with status (pending / complete), scores, and winner badge.
- **Finalise match** saves result and returns to Matches tab.
- Edit button re-opens any completed match for correction.

---

## Scoring Reference

| Round | Drinks | Time | Max Judge Pts | Max Total (with all bonuses) |
|---|---|---|---|---|
| Preliminary | 15 | 10 min | 45 | 52 |
| Quarter Finals | 20 | 15 min | 60 | 69 |
| Semi Finals | 20 | 15 min | 60 | 69 |
| Finals | 20 | 15 min | 60 | 69 |

**Bonus points**
- +2 Fastest team (manual, one team per match)
- +5 Round winner (auto — awarded to team with more judge tokens)
- +2 Signature beverage (Quarter Finals and beyond, manual)
