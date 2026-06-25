# Seduh Score ☕

**Coffee competition platform for organisers.** Single-folder web app — no server, no build step, no dependencies.

Built by [Firdaus Omar](https://github.com/mfosa7222) · [Grey Matter Coffee Werks](https://greymattercoffee.github.io), Brunei

**[→ Open Seduh Score](https://greymattercoffee.github.io/Seduh-Score/)**

---

## Modules

| Module | Status | Tier | Format |
|---|---|---|---|
| **Throwdown** | ✅ Live | Community / Org | Individual knockout bracket with randomized seeding, redemption round, revival draw |
| **Barista Team Championship** | ✅ Live | Org · Annual | Team head-to-head scoring with seeded knockout bracket |
| **Liga Seduh** | ✅ Live | Community / Org | Round robin league — season standings, match scheduling, judged Final |
| **Cup Taster** | ✅ Live | Community / Org | Sensory identification — blind trio format, timed heats, configurable stages |

Community modules are accessible without an account. Org modules require an organisational login.

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

## Throwdown

<!-- MODULE:throwdown -->
Individual knockout bracket. Two competitors face off per match — judges vote for a winner.

**Format:** Randomised seeding · majority vote per match · configurable rounds (R1 → QF → SF → Final)

**Community (up to 16 participants)**
Standard knockout bracket. Run a clean single-elimination event with no account required.

**Org (unlimited participants)**
Adds a redemption round — losers re-enter in groups for a second chance. Optional revival draw revives one additional loser per round. Full report export at the end.

**Limits:** Community tier caps at 16 participants. Redemption and revival draw require an org account.
<!-- /MODULE:throwdown -->

**Technical:** Variable judge count · colour-coded rounds · revival markers (⬆ R) · judge list record-keeping · audience overlay · demo mode · JSON save/load

---

## Barista Team Championship

<!-- MODULE:btc -->
Follows the format of the ASEAN Barista Team Championship by ASEAN Coffee Federation.

Team head-to-head competition. Two teams of baristas compete per match — judges award tokens cup by cup.

**Format:** 3 judges · 1 token each per cup · up to 3 tokens per cup shared between both teams
**Rounds:** Preliminary (15 drinks) · Quarterfinal / Semifinal / Final (20 drinks)

**Org · Annual only**
This module requires an annual organisational account.

**Limits:** Scoring structure follows standard BTC format — not configurable.
<!-- /MODULE:btc -->

**Technical:** Judge selection per match · PDF export · audience view with colour-coded match rows · demo mode · JSON save/load

---

## Liga Seduh

<!-- MODULE:liga -->
Round robin brewing league. Every brewer competes in small groups across multiple rounds. Live standings update after each result. Top 3 advance to a judged Final.

**Format:** Groups of 3 (1v1v1) · self-adjudicating votes · tiebreaker judge for deadlocks
**Final:** Top 3 brewers + 2 external judges · 5-vote pool

**Community (up to 8 brewers)**
Full round robin with automatic no-repeat schedule and judged Final.

**Org (unlimited brewers)**
Adds device usage tracking and CSV export.

**Limits:** Community tier caps at 8 brewers. Match schedule is auto-generated to ensure no two brewers meet twice — manual ordering is not supported.
<!-- /MODULE:liga -->

**Technical:** No-repeat schedule generator · live league table · audience overlay · demo mode · JSON save/load

---

## Cup Taster

<!-- MODULE:cup_taster -->
Sensory identification competition. Contestants identify the odd cup in blind trios — scored on accuracy, timed as tiebreaker.

**Format:** Trios (2 identical cups, 1 different) · configurable trios per stage · configurable stage structure
**Timing:** Master countdown for each heat · individual stop per contestant · timeout assigns maximum time

**Community (up to 8 contestants, up to 3 sets)**
Single or multi-stage event. Prelims-only format supported for smaller events.

**Org (unlimited contestants and sets)**
Adds per-trio difficulty analytics, score distribution, and CSV export.

**Limits:** Community tier caps at 8 contestants and 3 sets. Multi-stage advancement (Prelims → Semis → Finals) is supported at both tiers.
<!-- /MODULE:cup_taster -->

**Technical:** Multi-heat partitioning · score distribution · avg time per set · hardest trio callout · audience overlay · demo mode · JSON save/load

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

**Documentation:**
- `CONVENTIONS.md` — code patterns, token names, git workflow
- `CHANGELOG.md` — version history, what changed and when

**Current version:** v4.6.1
