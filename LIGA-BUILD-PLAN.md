# Liga Seduh — Phased Build Plan for Claude Code

Companion to `LIGA-SPEC.md`. Five phases, each sized to fit comfortably inside a
single Claude Code session, each ending with the module in a **working, syntax-valid,
committable state**. One phase per session. Commit between phases.

## How to run this (usage-limit strategy)

1. **Put both files in the repo first:** copy `LIGA-SPEC.md` and this file into the
   repo root (or `/docs`). Claude Code reads them from disk — far cheaper than
   pasting them into the chat every session.
2. **One phase = one session.** Start each session with the short prompt given for
   that phase. Don't carry conversation history forward — the git commit *is* the
   handoff.
3. **End every phase the same way:** run the syntax check (extract non-`src`
   `<script>` blocks → `new Function()`), open the file in a browser, tick the
   acceptance checks, then `git commit`. If usage runs out mid-phase, the previous
   commit is always a clean restart point.
4. If a phase still feels too big in practice, each one has a marked **mid-phase
   checkpoint** where the file is also in a valid state — stop and commit there.

---

## Phase 1 — Skeleton, state & Setup tab

**Goal:** `liga/index.html` exists, loads, persists, and the full season can be
configured. No schedule logic yet.

**Build:**
- File scaffold: shared includes (`../shared/theme.css`, `storage.js`, `timer.js`,
  `audience.js`), timer + audience overlay HTML copied from Throwdown, `#app` root.
- `DEFAULT_STATE()`, `S`, `mid`/`bid` counters, `Store('seduh_liga_v1')`,
  `save()` / `load()` on boot, `render()` / `bind()` cycle, `$` / `on()` helpers.
- App shell `rMain()`: header with event name, `← Home`, `⬇ Save` / `⬆ Load` JSON
  (`_module:'liga'` guard — copy the BBTC `exportJSON`/`importJSON` pattern),
  Reset (confirm + `store.clear()`), tab bar (Setup · Schedule · Standings ·
  Final · Report — non-Setup tabs render an empty-state message for now).
- `rSetup()`: event name/date/venue · brewer roster add/remove · rounds input with
  the `rounds ≤ floor((N−1)/2)` validation message · device list management
  (seed defaults from spec §7) · "Generate schedule" button (stub: alert "Phase 2").
- *Mid-phase checkpoint:* after the shell + persistence work, before `rSetup()`.

**Accept:** page loads with no console errors · brewers/devices/rounds survive a
refresh · JSON save/load round-trips · wrong-module JSON is rejected · Home works.

**Session prompt:**
> Read CONVENTIONS.md, then LIGA-SPEC.md and LIGA-BUILD-PLAN.md. Build **Phase 1
> only** as described in the plan. Use throwdown/index.html as the structural
> reference for the scaffold, overlays, and JSON save/load. Stop after Phase 1,
> run the syntax check, and summarize what was built.

---

## Phase 2 — Schedule generator & Schedule tab

**Goal:** a valid no-repeat schedule generates and displays. Matches not yet scorable.

**Build:**
- `generateSchedule()` per spec §4: randomized greedy with retry (~5000 attempt
  cap) · pair `Set` keyed `"idA|idB"` sorted · triad/duo partitioning by `N mod 3`
  (two duos preferred over a solo) · per-brewer duo-count fairness · failure path
  reports the maximum feasible rounds.
- Match objects created per spec §8 (`votes: {}`, `result: null`, `done: false`).
- `scheduleLocked` flow: roster + rounds lock once the first match is scored;
  "Regenerate schedule" button available until then.
- `rSchedule()`: matches grouped by round with colour-coded round headers
  (blue = round semantics), match cards showing brewers, type badge (duo/solo),
  done/pending state. Cards are display-only this phase — a disabled "Score" button.
- *Mid-phase checkpoint:* after `generateSchedule()` passes a console test
  (generate for N=9/R=4, N=8/R=3, N=7/R=3; assert no repeated pairs), before
  `rSchedule()`.

**Accept:** N=9/R=4 generates all-triads with zero repeated pairs · N=8 yields one
duo per round · N=7 yields two duos per round · duo assignments spread across
brewers · infeasible configs fail with a clear message, not a hang.

**Session prompt:**
> Read CONVENTIONS.md, LIGA-SPEC.md §4 + §8, and LIGA-BUILD-PLAN.md Phase 2.
> liga/index.html already has the Phase 1 scaffold — read it before editing.
> Build Phase 2 only. Test the generator in isolation before wiring the UI.

---

## Phase 3 — Match scoring & `resolveMatch()`

**Goal:** matches can be scored end to end, including every tie path. The single
hardest phase — give it a full session.

**Build:**
- `resolveMatch(m)` — one **pure function** implementing spec §3 in full:
  triad cases `2-1-0` / `3-0-0` / `1-1-1`, duo cases `2-0` / `1-1`, solo walkover,
  and the final's 5-vote pool (votes + `judgeVotes`). Returns
  `{ placements, points, votesRec, deadlock }`. All downstream tabs read only this.
- Scoring UI on the match card: device dropdown per brewer (from `S.devices`,
  optional) → vote entry per brewer ("Whose cup did X's vote go to?") → app
  auto-detects the case and reveals judge-vote and/or revote controls **only when
  needed** → derived placements + points preview → Confirm sets `done: true`.
- Badges: amber `⚖ TB` on judge-broken matches, walkover badge on solos.
  Completed cards go green per the semantic colour contract.
- Edit/undo: reopening a done match clears `result` and `done` for re-entry.
- *Mid-phase checkpoint:* `resolveMatch()` finished and unit-tested in the console
  against every case in spec §3, before any UI work.

**Accept:** every §3 case scores correctly with the proposed tallies (A → 2/1/0,
B → 3/0/0, C → 2/1/1, duo deadlock → 2/1, solo → 3 pts/3 votes) · revote controls
never appear for clean results · first scored match locks the schedule.

**Session prompt:**
> Read CONVENTIONS.md, LIGA-SPEC.md §3 + §8, and LIGA-BUILD-PLAN.md Phase 3.
> Read liga/index.html first. Build resolveMatch() as a pure function and test
> all spec §3 cases in isolation before building the scoring UI. Phase 3 only.

---

## Phase 4 — Standings & Final

**Goal:** live league table, finalist selection, and the judged Final.

**Build:**
- `calcStandings()`: P · W (1st-place finishes) · Votes · Pts from `resolveMatch`
  results; sort Pts → W → Votes. `rStandings()` renders it (mono numerics,
  `--rank-1/-2/-3` medal tokens for the top three).
- Final tab: locked until all regular matches are `done`. Pre-fills the top 3;
  if a tie spans the cutoff, flag it and let the organizer pick (record as
  "decided by RPS"). Creates the final match (`isFinal: true`, `round: 'final'`).
- Final scoring: reuses the Phase 3 card with two extra external-judge vote
  inputs feeding `judgeVotes`; `resolveMatch()` already handles the 5-vote pool.
  Final result does **not** alter the league table.
- *Mid-phase checkpoint:* standings done and verified, before the Final tab.

**Accept:** standings match hand-calculation for a part-played season · tiebreak
chain orders correctly · cutoff tie triggers the RPS picker · final scores with
5 votes and the league table is unchanged by it.

**Session prompt:**
> Read CONVENTIONS.md, LIGA-SPEC.md §5 + §6, and LIGA-BUILD-PLAN.md Phase 4.
> Read liga/index.html first. Build Phase 4 only.

---

## Phase 5 — Report, Audience view, demo & release

**Goal:** the wrap-up layer, plus everything on the spec §11 checklist.

**Build:**
- `rReport()`: champion + final result · frozen league table · device usage
  summary (matches per device, wins per device, per-brewer device history) ·
  per-brewer season summary · CSV export of standings + device summary.
  (Branded PDF deferred per roadmap.)
- Audience view: `Audience.show()` with `lbHTML` = league table and `histHTML` =
  current-round matchups + recent results. **Inline hex only** — no CSS vars in
  overlay HTML. `Audience.init()` in `bind()`.
- Timer wiring (`Timer.init()` in bind, header ⏱ button).
- `buildLigaDemo()` / `loadLigaDemo()` — a mid-season 9-brewer demo including at
  least one judge-broken match, one sweep, and one duo.
- Dashboard `index.html`: Liga card `live: true`, `href: 'liga/index.html'`.
- CHANGELOG.md `[4.0.0]` entry — changes-only format, no strategy content.
- Full §11 checklist sweep + final syntax check + manual bug sweep before push.
- *Mid-phase checkpoint:* after Report + Audience, before demo/dashboard/changelog.

**Accept:** audience overlay renders correctly on a projector-light background ·
demo loads a believable mid-season state · dashboard launches the module ·
every box in spec §11 is ticked.

**Session prompt:**
> Read CONVENTIONS.md, LIGA-SPEC.md §7 + §10 + §11, and LIGA-BUILD-PLAN.md
> Phase 5. Read liga/index.html and the dashboard index.html first. Build
> Phase 5 only, then run the full §11 compliance checklist and report results.

---

## Phase → commit map

| Phase | Commit message |
|---|---|
| 1 | `feat(liga): module scaffold, state, persistence, Setup tab` |
| 2 | `feat(liga): no-repeat schedule generator and Schedule tab` |
| 3 | `feat(liga): resolveMatch engine and match scoring UI` |
| 4 | `feat(liga): league standings, tiebreaks, judged Final` |
| 5 | `feat(liga): report, audience view, demo mode — Liga Seduh v4.0` |
