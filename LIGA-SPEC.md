# Liga Seduh — Build Specification (v4.0)

Handoff document for Claude Code. Read `CONVENTIONS.md` and `CHANGELOG.md` first.
Target file: `liga/index.html` — new self-contained module, ~1500+ lines expected.

---

## 1. Format overview

**Liga Seduh Bawah Tanah** — round-robin brewing league, self-adjudicating, 1v1v1 format.

- Brewers compete in **triads** (3-person matches). Everything is open — own brewer,
  own water, own filter — same coffee for all.
- Cups are **blind/randomized**. Each brewer in a match casts **1 vote** for a cup
  after brewing. Self-voting is therefore possible (voters don't know whose cup is whose).
- Season = a configured number of rounds. Each round, every brewer plays exactly
  one match. **No brewer ever meets the same opponent twice** across the season.
- Top 3 on the league table advance to the **Final**.

## 2. Points & votes

| Placement | Points |
|---|---|
| 1st | 3 |
| 2nd | 1 |
| 3rd | 0 |

The table also tracks **total votes received** per brewer — it is the second tiebreaker.

## 3. Match resolution algorithm

Three voters, three cups. Possible initial distributions: `2-1-0`, `3-0-0`, `1-1-1`.

**Case A — `2-1-0` (clean):** placements map directly to vote counts. Done.

**Case B — `3-0-0` (sweep):** 1st is decided. Winning cup is removed; the three
brewers **revote** between the remaining 2 cups (3 votes over 2 cups — cannot tie)
to decide 2nd vs 3rd. No judge needed.

**Case C — `1-1-1` (deadlock):** the **tiebreaker judge** tastes and casts the
deciding vote. That cup wins — the winner records **2 votes** (original 1 + judge's 1)
and max points. The winning cup is removed; the three brewers revote between the
remaining 2 cups to decide 2nd vs 3rd (cannot tie).

**Vote recording rule (PROPOSED — confirm with Firdaus):** a brewer's recorded
votes for the match = votes received in the **initial** round, plus the judge's
vote if applicable. Revotes decide **placement order only** — they do not add to
vote tallies (otherwise a 2nd-place brewer could record more votes than the winner).
Resulting tallies per case: A → `2/1/0` · B → `3/0/0` · C → `2/1/1`.

### Duo matches (when field size requires)

2 brewers, 2 cups, 2 votes. Distributions: `2-0` (clean) or `1-1` (deadlock →
judge breaks it; winner records 2 votes). Points: 1st = 3, 2nd = 1. No 3rd place.

### Solo walkover

If a match is reduced to 1 brewer (odd field arrangement or no-show):
**auto-win — 3 points, 3 votes.** Marked visibly as a walkover.

## 4. Field size & scheduling

Generated **once, at season start**, after Setup is confirmed.

- `N mod 3 == 0` → all triads each round.
- `N mod 3 == 2` → one **duo** per round.
- `N mod 3 == 1` → two **duos** per round (preferred over a solo walkover —
  avoids free points). Solo only as a fallback (e.g. N too small, or no-shows).
- **Fairness:** rotate duo assignments so no brewer lands in a duo twice while
  others have none (track per-brewer duo count during generation).

**No-repeat constraint:** a pair may meet at most once across the season (triads
and duos both count as meetings).

**Algorithm:** randomized greedy with retry. Per attempt: shuffle brewers, partition
each round into groups respecting the pair-set and duo-fairness constraints; on a
dead end, retry the whole attempt (cap ~5000 attempts). Maintain a `Set` of met
pairs keyed `"idA|idB"` (sorted). If no valid schedule is found, report the maximum
feasible round count and ask the organizer to reduce rounds.

**Setup validation guard:** each triad burns 2 new opponents per brewer per round,
so as a hard ceiling `rounds ≤ floor((N − 1) / 2)`. Validate at setup with a clear
message before attempting generation.

**Reshuffle:** a "Regenerate schedule" button is available until the first match
is scored, then locked.

## 5. League table & tiebreaks

Columns: **Pos · Brewer · P · W · Votes · Pts** (P = played, W = 1st-place finishes).

Sort order: **Pts desc → W desc → Votes desc**. If brewers are still tied *at the
top-3 cutoff*, the tie is broken by **rock-paper-scissors at the venue** — the app
flags the tie on the Final tab and lets the organizer manually pick who advances
(record it as a manual override, e.g. small note "decided by RPS").

## 6. The Final

- Top 3 brewers, same blind-cup format, **plus 2 external judges** → 5 votes total.
- Tie resolution generalizes the same way: if there's a tie for 1st, the tiebreaker
  judge decides; decided cups are removed and remaining voters revote for the
  remaining placements. *(Assumption — confirm.)*
- The Final **does not feed the league table** — it stands alone and decides the
  champion. League table is frozen as the regular-season record. *(Assumption — confirm.)*
- Final match object: `isFinal: true`, `judgeVotes: [cupOwnerId, cupOwnerId]` for
  the two external judges alongside the three brewer votes.

## 7. Brewing device tracking

- `S.devices` — editable pre-set list, managed in Setup (add/remove). Seed defaults:
  `V60, AeroPress, Kalita Wave, Origami, Orea, Hario Switch, Clever Dripper, Chemex, French Press`.
- On each match card, a **device dropdown per brewer** (plus the device list is
  re-editable by returning to Setup mid-season — new devices appear in dropdowns
  immediately). Device selection is optional per match (empty allowed).
- **End report:** device usage summary — matches brewed per device, wins per device,
  and per-brewer device history across the season.

## 8. State shape

```javascript
const DEFAULT_STATE = () => ({
  eventName: 'Liga Seduh Bawah Tanah', eventDate: '', eventVenue: '',
  brewers: [],          // [{ id, name }]
  devices: [ ...seed list above ],
  rounds: 3,
  scheduleLocked: false,
  matches: [],          // generated by scheduler; includes the final when created
  tab: 'setup',
  scoringMatchId: null,
});
let S = DEFAULT_STATE();
let mid = 0;            // match id counter
let bid = 0;            // brewer id counter
// Persist counters: Store('seduh_liga_v1').save({ ...S, _mid: mid, _bid: bid, _module: 'liga' })
```

### Match object

```javascript
{
  id: String(mid++),
  round: 1,                       // 1..S.rounds; final uses round: 'final'
  type: 'triad' | 'duo' | 'solo',
  isFinal: false,
  brewerIds: ['0','4','7'],
  devices: { '0': 'V60', '4': '', '7': 'AeroPress' },   // per-brewer, optional
  votes: { '0': '4', '4': '4', '7': '0' },              // voterId → cupOwnerId
  judgeVote: null,                // cupOwnerId — 1-1-1 deadlock only
  revote: null,                   // { voterId → cupOwnerId } over remaining 2 cups
  judgeVotes: [],                 // final only — 2 external judge picks
  result: null,                   // derived: { placements:[ids], points:{id:n}, votesRec:{id:n}, deadlock:bool }
  done: false,
}
```

`result` is computed by a single pure function `resolveMatch(m)` implementing §3 —
keep all placement/points/vote logic there so standings, report, and audience view
all derive from one source of truth.

## 9. Tabs & flows

`Setup → Schedule → Standings → Final → Report`

- **Setup:** event details · brewer roster (add/remove; locked after schedule lock) ·
  rounds count with validation message showing the ceiling · device list management ·
  Generate schedule button.
- **Schedule:** matches grouped by round, colour-coded round headers; each match
  card = scoring surface: device dropdowns per brewer → vote entry ("Whose cup did
  [Brewer] vote for?") → app auto-detects sweep/deadlock and reveals judge-vote /
  revote controls only when needed → derived placements + points shown for review →
  Confirm. Deadlock-resolved matches get a small amber `⚖ TB` badge; walkovers a
  badge too.
- **Standings:** live league table per §5.
- **Final:** unlocks when all regular matches are done. Pre-fills top 3; flags
  RPS-needed ties at the cutoff and allows manual selection. Scoring flow same as
  Schedule but with 2 extra judge vote inputs.
- **Report:** champion + final result · final league table · device usage summary
  (§7) · per-brewer season summary. CSV export of standings + device summary.
  Branded PDF export deferred per roadmap (v4.1 follow-up).

Header actions (match BBTC/Throwdown patterns): `← Home` · `⬇ Save` / `⬆ Load`
(JSON, `_module:'liga'` guard) · `📺 Audience` · `⏱ Timer` · Demo · Reset.

## 10. Audience view

Shared `Audience.show()` API:

```javascript
Audience.show({
  title: S.eventName,
  moduleTag: 'Round ' + currentRound,   // or 'Final'
  lbHTML: ...,    // league table — Pos, Brewer, P, W, Votes, Pts
  histHTML: ...,  // current round matchups (with done/pending state) + recent results
});
```

**Inline hex colours only** in audience HTML — CSS vars don't cascade into the
overlay context (established rule).

## 11. Conventions compliance checklist

- [ ] Storage key `seduh_liga_v1`; bump suffix on breaking shape changes
- [ ] `_module: 'liga'` guard on JSON import
- [ ] `DEFAULT_STATE()` factory pattern; full re-render + `bind()` cycle; `on()` helper
- [ ] Render function naming: `rSetup / rSchedule / rStandings / rFinal / rReport`
- [ ] Shared components referenced from `../shared/` — never copied in
- [ ] Token contract respected — no hardcoded hex in module CSS (audience/PDF excepted)
- [ ] Semantic colours: blue = rounds, green = completion/winners (Liga module
  colour `#0b7a52` on dashboard), red = destructive, purple reserved for redemption
  semantics (not used here — deadlock badge is amber)
- [ ] `buildLigaDemo()` / `loadLigaDemo()` demo pattern
- [ ] Voice: sentence case, mono eyebrows only, second person to organizer
- [ ] Syntax check (`<script>` block extraction + `new Function()`) before handoff
- [ ] Update dashboard `index.html`: Liga card `live: true`, `href: 'liga/index.html'`
- [ ] CHANGELOG.md entry (changes-only format, no strategy)

## 12. Open confirmations (resolve before build)

1. **Vote recording in deadlocks** — confirm the proposed rule in §3 (revotes set
   order only; tallies = initial round + judge vote where applicable).
2. **Final ties** — same judge-break + revote mechanism applied with the 5-vote pool?
3. **Final standalone** — confirmed the final result does not alter league points?
4. **Duos over solos** for `N mod 3 == 1` fields — confirm preference.
