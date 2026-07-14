# Seduh Score ☕

*State: v5.11.0 — matches CHANGELOG.md as of July 2026*

**Coffee competition platform for organisers in Brunei and Southeast Asia.**

Built by [Firdaus Omar](https://github.com/mfosa7222) · [Grey Matter Coffee Werks](https://greymattercoffee.github.io), Brunei

**[→ Open Seduh Score](https://seduhscore.com)**

---

## So... what actually is this? (the non-techy version)

Okay, put the portafilter down for a second. Here's Seduh Score, explained like we're just chatting over the bar during a slow Tuesday shift.

**Seduh Score runs the scoring at coffee competitions.** Throwdowns, brewing leagues, cupping/sensory comps, team championships — the whole "who made the best cup" drama, but organised instead of someone's cousin trying to track it on a torn receipt.

**Why it exists:** Firdaus was running these events, saw scoring being held together by group chats and spreadsheets that didn't survive contact with a live crowd, and got tired of it. So he built the thing himself. It's now used to actually run real events on the ground here in Brunei — not a concept, not a prototype, the real deal on competition day.

**What it does, module by module:**

- **☕ Throwdown** — the classic 1-on-1 knockout. Two baristas, one bracket, judges pick a winner each round until someone's left standing.
- **🏆 Barista Team Championship** — same idea but for teams, following the official ASEAN format. Judges hand out points cup by cup.
- **🔁 Liga Seduh** — a league, not a knockout. Everyone brews against everyone in small groups over several rounds, standings update live, top brewers go to a judged final.
- **👅 Cup Taster** — the "spot the odd cup" sensory game. Three cups, two are the same, find the different one before the clock runs out.
- **⏱️ Timer** — just a big, honest countdown clock for competition floors. Free forever, no strings.

**Do you need to sign up for anything?** For the basic versions — nope. Anyone can open a link and run a small event on the spot, no account, no downloads, nothing to install. Bigger events (more competitors, extra features, saved history across seasons) sit behind an organiser account, the same way a café upgrades from a hand-grinder to something that can actually keep up on a Saturday morning.

**Is my data safe / going anywhere weird?** Competition results stay with the organiser running the event — nothing gets sold, nothing gets shared around, and there's no ads or tracking nonsense bolted onto any of this. It's a scoring tool, not a data harvesting operation wearing a coffee-cup costume.

**Who's behind it?** One guy, a laptop, way too many cups of coffee, and a genuine love for the local competition scene. If you run events and this looks useful, or you just want to say hi about it — reach out through Grey Matter Coffee Werks.

That's it. That's the app. Scroll on if you want the nerdy stuff — no judgment either way.

---

## Modules

| Module | Status | Tier | Format |
|---|---|---|---|
| **Throwdown** | ✅ Live | Community / Per-Event / Annual | Individual knockout bracket with randomised seeding, redemption round, revival draw |
| **Barista Team Championship** | ✅ Live | Annual only | Team head-to-head scoring, seeded knockout bracket, ASEAN Barista Team Championship format |
| **Liga Seduh** | ✅ Live | Community / Per-Event / Annual | Round robin league — season standings, match scheduling, judged Final |
| **Cup Taster** | ✅ Live | Community / Per-Event / Annual | Sensory identification — blind trio format, timed heats, configurable stages |

**Community** modules are free, no account required, with sensible caps (participant/brewer limits, no advanced reports). **Per-Event** unlocks the full module for a single competition. **Annual** is a full organisational account — unlimited scale, persistent data across seasons, multi-user access, and Barista Team Championship access. Details and pricing via Grey Matter Coffee Werks.

---

## Shared Components

| Component | File | Purpose |
|---|---|---|
| Theme | `shared/theme.css` | Design system — colours, typography, components |
| Storage | `shared/storage.js` | localStorage wrapper for in-session competition data |
| Gates | `shared/gates.js` | Tier / feature access control (`Gates.canAccess()`) |
| Auth | `shared/auth.js` | Firebase auth state, drives `[data-auth]` UI |
| Firebase | `shared/firebase.js` | Firebase SDK init — App, Auth, Firestore, Storage |
| Event Config | `shared/eventconfig.js` | Organiser branding/customisation (accent colour, logo, event details) |
| Timer | `shared/timer.js` | 5 / 7 / 10 / 15 min countdown with fullscreen display |
| Audience View | `shared/audience.js` | Projector overlay — live standings and results |
| Sound | `shared/sound.js` | Synthesised timer/reveal audio cues, no audio files. Used by BBTC, Liga, and Timer. API: `unlock()` / `beep()` / `horn()` |

---

## Throwdown

<!-- MODULE:throwdown -->
Individual knockout bracket. Two competitors face off per match — judges vote for a winner.

**Format:** Randomised seeding · majority vote per match · configurable rounds (R1 → QF → SF → Final)

**Community (up to 16 participants)**
Standard knockout bracket. Run a clean single-elimination event with no account required.

**Per-Event / Annual (unlimited participants)**
Adds a redemption round — losers re-enter in groups for a second chance. Optional revival draw revives one additional loser per round. Full report export at the end.

**Limits:** Community tier caps at 16 participants. Redemption and revival draw require a paid tier.
<!-- /MODULE:throwdown -->

**Technical:** Variable judge count · colour-coded rounds · revival markers (⬆ R) · judge list record-keeping · audience overlay · PDF export · demo mode · JSON save/load

---

## Barista Team Championship

<!-- MODULE:btc -->
Follows the format of the ASEAN Barista Team Championship by ASEAN Coffee Federation.

Team head-to-head competition. Two teams of baristas compete per match — judges award tokens cup by cup.

**Format:** 3 judges · 1 token each per cup · up to 3 tokens per cup shared between both teams
**Rounds:** Preliminary (15 drinks) · Quarterfinal / Semifinal / Final (20 drinks)

**Annual only**
This module requires an annual organisational account — the championship format is built for a season, not a single event.

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

**Per-Event / Annual (unlimited brewers)**
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

**Per-Event / Annual (unlimited contestants and sets)**
Adds per-trio difficulty analytics, score distribution, and CSV export.

**Limits:** Community tier caps at 8 contestants and 3 sets. Multi-stage advancement (Prelims → Semis → Finals) is supported at both tiers.
<!-- /MODULE:cup_taster -->

**Technical:** Multi-heat partitioning · score distribution · avg time per set · hardest trio callout · audience overlay · demo mode · JSON save/load

---

## Timer

Standalone fullscreen countdown — 5 / 7 / 10 / 15 minute presets. Always free, no account, no limits.

---

## Data & Privacy

Competition data belongs to the organisation running the event. Community-tier sessions run entirely in the browser (`localStorage`) with no server involved. Paid-tier organiser accounts use Firebase (Auth, Firestore, Storage) to persist data across sessions and devices. No competition data is sold or shared, and no advertising trackers are embedded anywhere on the platform. Sessions can be exported as JSON/CSV for backup at any time.

---

## IP & Licensing

Seduh Score is built and maintained by Firdaus Omar / Grey Matter Coffee Werks, Brunei.
© 2026 Grey Matter Coffee Werks. All rights reserved.

Organisational licensing is available for coffee associations, competition bodies, and event organisers in Brunei and Southeast Asia. Contact via Grey Matter Coffee Werks.

---

## Development

**Stack:** Pure HTML, CSS, JavaScript — no framework, no build step, no bundler
**Live:** `seduhscore.com` via Firebase Hosting
**Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)

**Documentation:**
- `CONVENTIONS.md` — code patterns, token names, git workflow
- `CHANGELOG.md` — version history, what changed and when

**Current version:** v5.8.0
