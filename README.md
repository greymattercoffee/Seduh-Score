# Brunei Barista Team Championship

An organizer tool for running the Brunei Barista Team Competition — a head-to-head team coffee competition. Built as a single HTML file. No server, no dependencies, no installation required.

**[→ Open the app](https://yourusername.github.io/brunei-barista-championship/)**

---

## What it does

The app is used by the competition secretary to manage matches in real time, from setup through to the final standings.

- Register teams and a judge pool
- Create matches manually — pick the round, two teams, and 3 judges from the pool
- Score each match drink-by-drink using shared token logic (max 3 tokens per cup, split between both teams)
- Automatic winner bonus, manual fastest-team and signature beverage bonuses
- Live leaderboard with configurable quarter-finals cutline
- Audience view for projector display
- Export results as PDF (print-ready, A4) or CSV (full cup-by-cup data)
- All data persists in the browser — survives refreshes and tab closes

---

## Competition rules implemented

| Round | Drinks | Time limit | Max judge points |
|---|---|---|---|
| Preliminary | 15 | 10 min | 45 |
| Quarter Finals | 20 | 15 min | 60 |
| Semi Finals | 20 | 15 min | 60 |
| Finals | 20 | 15 min | 60 |

**Scoring per cup:** 3 judges, 1 token each. Max 3 tokens per cup shared between both teams.

**Bonus points**
- +5 Round winner — automatic, awarded to the team with more judge tokens
- +2 Fastest team — manual, mutually exclusive between the two teams
- +2 Signature beverage — manual, Quarter Finals and beyond only

---

## How to use

### Option A — GitHub Pages (recommended)
1. Fork or clone this repo
2. Go to **Settings → Pages → Deploy from branch → main / (root)**
3. Share the generated URL with your organizers

### Option B — Run locally
Download `index.html` and open it in any modern browser. No internet connection required after download.

---

## Organizer workflow

1. **Setup** — Enter event date and venue (optional), add team names and judges to the pool
2. **Matches** — Click **+ Create match**, select round, teams, and 3 judges, then create
3. **Score ▶** — Open a match, enter finish times, tap the 0/1/2/3 buttons per drink per team, tick bonuses
4. **Finalise** — Saves the match and updates the leaderboard
5. **Leaderboard** — Set QF spots to highlight which teams advance
6. **📺 Audience** — Opens a light full-screen view for projection, showing leaderboard and results side by side
7. **📄 Export PDF** — Generates a print-ready A4 results document (standings + match results)
8. **📊 Export CSV** — Downloads full data including cup-by-cup scores for every match

### Resetting between events
Use the **↺ Reset** button in the header to wipe all data and start fresh for a new competition day.

---

## Files

```
brunei-barista-championship/
├── index.html      — the full application (single file)
├── CHANGELOG.md    — version history
└── README.md       — this file
```

---

## Browser support

Works in all modern browsers — Chrome, Edge, Firefox, Safari. Tested on desktop and mobile. Data is stored in `localStorage` and is specific to each browser/device.

---

## Built by

Firdaus Omar — Grey Matter Coffee Werks, Brunei  
Competition background: Malaysian Aeropress Championship, ASEAN Barista Team Championship, Liga Seduh Bawah Tanah

---

## License

MIT — free to use, adapt, and share.
