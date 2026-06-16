# Seduh Score ☕

**Coffee competition platform for organizers.** Single-folder web app — no server, no build step, no dependencies.

Built by [Firdaus Omar](https://github.com/mfosa7222) · [Grey Matter Coffee Werks](https://greymattercoffee.github.io), Brunei

**[→ Open Seduh Score](https://greymattercoffee.github.io/Seduh-Score/)**

---

## Modules

| Module | Status | Format |
|---|---|---|
| **BBTC** | ✅ Live | Brunei Barista Team Championship — head-to-head team scoring with seeded knockout bracket |
| **Throwdown 1v1** | ✅ Live | Individual knockout bracket with randomized seeding, redemption round, wild card revival |
| **Liga Seduh** | 🔜 v4.0 | Round robin league — season standings and match scheduling |

---

## Shared Tools

| Component | File | Purpose |
|---|---|---|
| Timer | `shared/timer.js` | 5 / 7 / 10 / 15 min countdown with fullscreen court display |
| Audience View | `shared/audience.js` | Light-theme projector overlay — standings and results |
| Storage | `shared/storage.js` | localStorage wrapper with consistent key management |
| Theme | `shared/theme.css` | Design system — colours, typography, components |

---

## How to deploy

### GitHub Pages (recommended)
1. Push this folder to a public GitHub repo
2. Go to **Settings → Pages → Deploy from branch → main / (root)**
3. Share `https://greymattercoffee.github.io/Seduh-Score/`

### Local
Download the folder and open `index.html` in any modern browser. No internet required.

---

## BBTC — Barista Team Championship

Team head-to-head competition. The secretary enters cup-by-cup token scores for each match.

**Scoring:** 3 judges · 1 token each · max 3 tokens per cup shared between both teams  
**Rounds:** Preliminary (15 drinks, 10 min) · QF/SF/Final (20 drinks, 15 min)  
**Bracket seeding (8 teams):** QF1: 1v8 · QF2: 3v6 · QF3: 4v5 · QF4: 2v7

**Workflow:** Setup → Prelims → Standings (set QF spots) → Bracket → Score → Export PDF/CSV

**Features:** Judge selection per match · PDF export with round headers · Audience view with colour-coded match rows · Demo mode · JSON save/load · Home navigation

---

## Throwdown 1v1

Individual knockout bracket. Judges vote for a winner per match.

**Scoring:** Variable judge count · majority vote per match  
**Rounds:** Configurable · Round 1 → QF → SF → Final  
**Redemption:** Optional pool — losers re-enter, capped per round  
**Wild card:** Optional per-round random revival of one loser

**Workflow:** Setup → Bracket → Score matches → Audience view → Export

**Features:** Colour-coded rounds (grey / blue / amber / green / purple) · Revival markers (⬆ R) · Judge list record-keeping · Audience overlay with single-panel results · Demo mode · JSON save/load · Home navigation

---

## Liga Seduh *(Planned — v4.0)*

Round robin league format. Every participant plays a defined number of matches. Live cumulative standings update after each result. Supports multi-session event days (season play across multiple dates).

---

## Platform Roadmap

| Phase | Versions | Focus |
|---|---|---|
| **Foundation** | Now → v4.0 | Three solid modules tested in real events |
| **Brand & IP** | v4.1 → v4.5 | Grey Matter Coffee Werks branding, custom domain, licensing groundwork |

See the Roadmap PDF for detailed version milestones.

---

## Data & Privacy

All competition data is stored locally in the browser (`localStorage`). No data is sent to any server. Sessions can be exported as JSON for backup and reloaded at any time.

---

## IP & Licensing

Seduh Score is built and maintained by Firdaus Omar / Grey Matter Coffee Werks, Brunei.  
© 2026 Grey Matter Coffee Werks. All rights reserved.

Organizational licensing available for coffee associations, competition bodies, and event organisers in Brunei and Southeast Asia. Contact via Grey Matter Coffee Werks.

---

## Development

**Stack:** Pure HTML, CSS, JavaScript — no framework, no build step  
**Repo:** `github.com/greymattercoffee/Seduh-Score`  
**Live:** `greymattercoffee.github.io/Seduh-Score`  
**Local path:** `C:\Users\mfosa\OneDrive\Documents\Seduh-Score`

**Documentation:**
- `CONVENTIONS.md` — code patterns, token names, git workflow
- `CHANGELOG.md` — version history, what changed and when

**Current version:** v3.6.0
