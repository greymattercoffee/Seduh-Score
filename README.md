# Seduh Score ☕

**Coffee competition platform for organizers.** Single-folder web app — no server, no build step, no dependencies.

**[→ Open Seduh Score](https://mfosa7222.github.io/seduh-score/)**

---

## Modules

| Module | Status | Format |
|---|---|---|
| **BBTC** | ✅ Live | Brunei Barista Team Championship — head-to-head team scoring with seeded knockout bracket |
| **Throwdown 1v1** | ✅ Live | Individual knockout bracket with randomized seeding and optional redemption round |
| **Liga Seduh** | 🔜 Planned | Round robin league — season standings and match scheduling |

---

## How to deploy

### GitHub Pages (recommended)
1. Push this folder to a public GitHub repo
2. Go to **Settings → Pages → Deploy from branch → main / (root)**
3. Share `https://yourusername.github.io/seduh-score/`

### Local
Download the folder and open `index.html` in any modern browser. No internet required.

---

## BBTC — Barista Team Championship

Team head-to-head competition. The secretary enters cup-by-cup token scores for each match.

**Scoring:** 3 judges · 1 token each · max 3 tokens per cup shared between both teams  
**Rounds:** Preliminary (15 drinks, 10 min) · QF/SF/Final (20 drinks, 15 min)  
**Bracket seeding (8 teams):** QF1: 1v8 · QF2: 3v6 · QF3: 4v5 · QF4: 2v7

**Workflow:** Setup → Prelims → Standings (set QF spots) → Bracket → Score → Export PDF/CSV

---

## Throwdown 1v1

Individual knockout bracket. Judges vote for a winner per match.

**Judges:** 3 to 5 per match (odd number recommended — no tie possible)  
**Bracket:** Randomized seeding · automatic byes for odd participant counts  
**Redemption:** Optional per-round — losers get a second chance, winners merge back into the main bracket (not available from QF and above)

**Workflow:** Setup (participants, judges, redemption config) → Generate Bracket → Score each match → Champion

---

## Shared components

All modules share:
- **⏱ Timer** — 5/10/15 min countdown with fullscreen court display
- **📺 Audience view** — light-theme overlay for projector
- **💾 Storage** — localStorage persistence per module, survives refresh
- **🎨 Theme** — unified design system (`shared/theme.css`)

---

## File structure

```
seduh-score/
├── index.html              ← dashboard / module selector
├── bbtc/
│   └── index.html          ← BBTC module
├── throwdown/
│   └── index.html          ← Throwdown 1v1 module
├── shared/
│   ├── theme.css           ← design tokens and shared styles
│   ├── timer.js            ← countdown timer component
│   ├── audience.js         ← audience overlay component
│   └── storage.js          ← localStorage wrapper
├── CHANGELOG.md
└── README.md
```

---

## Built by

Firdaus Omar · Grey Matter Coffee Werks, Brunei  
[@mfosaminumkopi](https://instagram.com/mfosaminumkopi) · Podcast: Mfosa Sembang Kopi  
Competition record: Malaysian Aeropress Championship · ASEAN Barista Team Championship · Liga Seduh Bawah Tanah (founder)

---

## License

MIT — free to use, adapt, and share with the coffee community.
