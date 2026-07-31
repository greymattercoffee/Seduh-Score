#!/usr/bin/env node
/* scripts/test-live-bracket.js — POA-63 Phase 2, Step 2 verification
 *
 * Unit-verifies the live-bracket translation layer WITHOUT Firestore, a
 * browser, or hand-authored bracket fixtures. Everything under test is
 * extracted verbatim from throwdown/index.html at run time:
 *
 *   · buildLiveBracketData()  — the translation layer itself
 *   · buildThrowdownDemo()    — the REAL shipped demo data (Girls Got Drip
 *                               Vol. 0: 12 participants, a redemption round,
 *                               a bye, and two genuinely unplayed matches)
 *   · buildPairs()            — Throwdown's own round-builder, used to
 *                               produce the uneven 13-participant case rather
 *                               than hand-building one
 *
 * Extraction (rather than duplication) is the point: if throwdown/index.html
 * changes, this test runs against the change instead of against a stale copy.
 *
 * Run:  node scripts/test-live-bracket.js
 *
 * Redemption rounds are INCLUDED, as pool rounds (kind:'pool'), since POA-66
 * taught the renderer to draw pools. 3rd Place is included since POA-67. The
 * earlier main-rounds-only build state was an interim deviation and is closed.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'throwdown', 'index.html');
const html = fs.readFileSync(SRC, 'utf8');

/* ── Extract the code under test ─────────────────────────────────────────── */

function between(startMarker, endMarker) {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker, a);
  if (a === -1 || b === -1) {
    throw new Error('Could not locate markers in throwdown/index.html: ' + startMarker);
  }
  return html.slice(a, b);
}

// Braces-balanced extraction of a top-level `function name(...) { ... }`.
function extractFunction(name) {
  const sig = 'function ' + name + '(';
  const start = html.indexOf(sig);
  if (start === -1) throw new Error('Function not found: ' + name);
  let i = html.indexOf('{', start);
  let depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  throw new Error('Unbalanced braces extracting: ' + name);
}

const translationSrc = between(
  '/* ── POA-63 Phase 2: live-bracket translation layer',
  '/* END buildLiveBracketData'
);

let mid = 100; // buildPairs' only external dependency
const sandbox = { mid: mid };
const factory = new Function(
  'mid',
  translationSrc + '\n' +
  extractFunction('buildThrowdownDemo') + '\n' +
  extractFunction('buildPairs') + '\n' +
  'return { buildLiveBracketData, buildThrowdownDemo, buildPairs };'
);
const { buildLiveBracketData, buildThrowdownDemo, buildPairs } = factory(mid);

/* ── Mirror of the renderer's rules, for invariant checks ────────────────── */
// Copied deliberately from shared/audience.js (_bktMatchPending and the
// Math.floor(slots.length / 2) pairing) so this test can assert what the
// renderer WILL do with the translated data without importing the renderer or
// booting a DOM. If these ever diverge from audience.js, that divergence is
// itself the bug this is meant to catch.
function rendererMatchPending(a, b) {
  if (!a || !b) return false;
  if (a.isBye || b.isBye) return false;
  return !!a.name && !!b.name && (a.score == null || b.score == null);
}
function rendererMatchCount(slots) {
  return Math.floor(slots.length / 2);
}

/* ── Tiny assert harness ─────────────────────────────────────────────────── */
let pass = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { failures.push(label); console.log('  ✗ ' + label); }
}
function eq(actual, expected, label) {
  ok(actual === expected, label + '  (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')');
}

/* ══ CASE 1 — real shipped demo data (12 participants) ═══════════════════ */
console.log('\nCASE 1 — real shipped demo data (buildThrowdownDemo, 12 participants)');
const demo = buildThrowdownDemo();
const live = buildLiveBracketData(demo.bracket, demo.participants);

// Exactly the three rounds Throwdown has generated. Projection was removed in
// POA-72 — the tree shows only rounds that exist.
eq(live.rounds.length, 3, 'three real rounds, nothing projected (POA-72)');
eq(live.rounds[0].roundLabel, 'Round 1', 'round 0 label passes through verbatim');
eq(live.rounds[1].roundLabel, 'Redemption Round 1', 'redemption round IS included (POA-66)');
eq(live.rounds[1].kind, 'pool', 'redemption round carries kind:"pool"');
eq(live.rounds[2].roundLabel, 'Round 3', 'round 2 label passes through verbatim');
ok(live.rounds[0].kind === undefined && live.rounds[2].kind === undefined,
   'pair-shaped rounds carry no kind — absent means "bracket"');
eq(live.bracketSize, 12, 'bracketSize counts competitors seeded into round 1');

const r1 = live.rounds[0], pool = live.rounds[1], r3 = live.rounds[2];
eq(r1.slots.length, 12, 'Round 1 → 6 pairs × 2 = 12 slots');
eq(r3.slots.length, 10, 'Round 3 → 5 pairs (incl. bye) × 2 = 10 slots');

ok(r1.slots.every(s => s.score !== null), 'Round 1 fully scored — every slot carries a score');
eq(r1.slots[0].name, 'Aliya Roslan', 'slot name maps from t1');
eq(r1.slots[0].score, 2, 'slot score maps from votes1');
eq(r1.slots[1].score, 1, 'slot score maps from votes2');

// The bye (d13: Syaza Irdina, t2 null)
const byeA = r3.slots[8], byeB = r3.slots[9];
eq(byeA.name, 'Syaza Irdina', 'bye slot carries the advancing name');
eq(byeA.isBye, true, 'bye slot flagged isBye');
eq(byeA.score, null, 'bye carries no score (never played)');
eq(byeB.name, null, 'bye partner slot is null per spec §3, not undefined');
eq(byeB.isBye, false, 'bye partner is not itself flagged isBye');

// Revival markers — bracket-wide derivation
const revived = ['Husna Azlan', 'Fatin Najwa', 'Norafiza'];
const allSlots = live.rounds.flatMap(r => r.slots);
ok(allSlots.filter(s => revived.includes(s.name)).every(s => s.revivalMarker === true),
   'every revived name carries revivalMarker');
ok(allSlots.filter(s => s.name && !revived.includes(s.name)).every(s => s.revivalMarker === false),
   'no non-revived name carries revivalMarker');
ok(allSlots.filter(s => !s.name).every(s => s.revivalMarker === false),
   'empty slots never carry revivalMarker');

// Champion not yet decided
eq(live.champion, null, 'champion null while bracket.phase !== done');
eq(live.runnerUp, null, 'runnerUp null while bracket.phase !== done');

/* ══ CASE 1b — NO projection; the last round may hold many matches ═════════ */
console.log('\nCASE 1b — only real rounds are published, and a multi-match last round survives');

// Every published round corresponds to a round Throwdown actually generated.
eq(live.rounds.map(r => r.roundLabel).join(' → '),
   'Round 1 → Redemption Round 1 → Round 3',
   'published rounds are exactly Throwdown’s generated rounds');
ok(live.rounds.every(r => r.slots.some(s => s.name)),
   'no empty projected column is published — every round has real competitors');

// This is the case POA-65 fixed and projection has been MASKING in production
// ever since: mid-event the last round is the round being played, with N
// matches, not a one-match Final. With projection gone this is now the normal
// shape of every live publish, so it is load-bearing rather than theoretical.
const lastRound = live.rounds[live.rounds.length - 1];
eq(lastRound.roundLabel, 'Round 3', 'last round is the round being PLAYED, not a Final');
eq(rendererMatchCount(lastRound.slots), 5,
   'renderer sees all 5 matches of the multi-match last round — none truncated');
const realMatchesKept = rendererMatchCount(r1.slots) + rendererMatchCount(r3.slots);
eq(realMatchesKept, 11, 'all 11 real matches survive into renderable columns');
eq(live.rounds.reduce((n, r) => n + rendererMatchCount(r.slots), 0) - rendererMatchCount(pool.slots),
   11, 'no match is invented and none is lost');

// The arithmetic that killed projection (POA-72): Round 1's six winners plus a
// revival plus up to four redemption survivors is 9–11 into the next round.
// Projection modelled pure halving and drew SIX slots for them.
eq(Math.ceil(rendererMatchCount(r1.slots) / 2) * 2, 6,
   'pure-halving projection would have drawn 6 Quarter Final slots…');
eq(r3.slots.filter(s => s.name).length, 9,
   '…but the real next round holds 9 competitors — the shape was unachievable');

/* ══ CASE 2 — the 0-vs-0 trap (the real bug this layer exists to avoid) ══ */
console.log('\nCASE 2 — unplayed matches must not publish as scored 0–0');
// d11/d12 in Round 3 are genuinely unplayed: winner null, votes1/votes2 both 0.
const pend1 = [r3.slots[4], r3.slots[5]];   // Nadia Syakira vs Norafiza
const pend2 = [r3.slots[6], r3.slots[7]];   // Zulfiqah vs Amirah Suffian
eq(pend1[0].score, null, 'unplayed match slot A score is null, NOT 0');
eq(pend1[1].score, null, 'unplayed match slot B score is null, NOT 0');
eq(pend2[0].score, null, 'second unplayed match slot A score is null, NOT 0');
ok(pend1[0].name && pend1[1].name, 'unplayed match still carries both names');

// If scores had leaked through as 0, the renderer would score this a TIE.
ok(!(pend1[0].score === pend1[1].score && pend1[0].score !== null),
   'unplayed match does not render as a 0–0 tie');

// Provisional taps: votes mutate live in the score modal BEFORE confirm.
const midScoring = JSON.parse(JSON.stringify(demo.bracket));
const tapping = midScoring.rounds[2].pairs[2];   // d11, still winner:null
tapping.votes1 = 2;                              // organiser has tapped 2 votes
tapping.votes2 = 1;                              // ...and 1, but NOT confirmed
const leaked = buildLiveBracketData(midScoring, demo.participants);
eq(leaked.rounds[2].slots[4].score, null, 'provisional vote taps do NOT publish (winner still null)');
eq(leaked.rounds[2].slots[5].score, null, 'provisional vote taps do NOT publish, slot B');

/* ══ CASE 3 — active-glow invariant against real data ════════════════════ */
console.log('\nCASE 3 — active-glow (Phase 1 invariant) holds on translated data');
function pendingCount(round) {
  let n = 0;
  for (let i = 0; i < rendererMatchCount(round.slots); i++) {
    if (rendererMatchPending(round.slots[i * 2], round.slots[i * 2 + 1])) n++;
  }
  return n;
}
eq(pendingCount(r1), 0, 'Round 1 (fully scored) glows on zero matches');
eq(pendingCount(r3), 2, 'Round 3 glows on exactly its 2 genuinely-unplayed matches');
ok(!rendererMatchPending(byeA, byeB), 'a bye never glows');
eq(pendingCount(pool), 0, 'a pool round never glows — the rule is pair-shaped (POA-66)');

// The Phase 1 bug in its live form: an unscored LATER round must not glow
// while an EARLIER round is still unplayed. Build that exact situation.
const twoRound = {
  phase: 'main',
  revivedNames: [],
  rounds: [
    { label: 'Quarter Finals', phase: 'main', roundNum: 1, pairs: [
      { id: 'a', t1: 'A', t2: 'B', bye: false, winner: null, loser: null, votes1: 0, votes2: 0 },
      { id: 'b', t1: 'C', t2: 'D', bye: false, winner: null, loser: null, votes1: 0, votes2: 0 },
    ]},
    // Seeded but unpopulated — this is what a not-yet-reached round looks like.
    { label: 'Semi Finals', phase: 'main', roundNum: 2, pairs: [
      { id: 'c', t1: null, t2: null, bye: false, winner: null, loser: null, votes1: 0, votes2: 0 },
    ]},
  ],
};
const tr = buildLiveBracketData(twoRound, []);
eq(pendingCount(tr.rounds[0]), 2, 'Quarterfinals glow — both matches locked in and unplayed');
eq(pendingCount(tr.rounds[1]), 0, 'Semi Finals do NOT glow before Quarterfinals are scored');
eq(tr.rounds.length, 2, 'exactly the two rounds given — nothing appended (POA-72)');

/* ══ CASE 4 — uneven participant count, via Throwdown's own buildPairs ═══ */
console.log('\nCASE 4 — uneven bracket (13 participants, built by Throwdown’s buildPairs)');
const names13 = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12','P13'];
const pairs13 = buildPairs(names13);
eq(pairs13.length, 7, 'buildPairs gives 6 real pairs + 1 bye for 13 names');
const uneven = {
  phase: 'main', revivedNames: [],
  rounds: [{ label: 'Round 1', phase: 'main', roundNum: 1, pairs: pairs13 }],
};
const ul = buildLiveBracketData(uneven, names13.map(n => ({ name: n })));
eq(ul.bracketSize, 13, 'bracketSize is 13, not rounded to a power of two');
eq(ul.rounds[0].slots.length, 14, '13 competitors → 14 slots (bye padded to a full pair)');

// THE structural guarantee: the renderer consumes slots two at a time over
// Math.floor(n/2), so an odd slot count would silently DROP a competitor.
// Emitting two slots per pair makes that impossible by construction.
ok(ul.rounds[0].slots.length % 2 === 0, 'slot count is even — renderer cannot drop a competitor');
eq(rendererMatchCount(ul.rounds[0].slots), 7, 'renderer sees all 7 matches, none truncated');
const named13 = ul.rounds[0].slots.filter(s => s.name).length;
eq(named13, 13, 'all 13 competitors survive translation');

// THE POA-65 regression guard, now unmasked. Before that fix this rendered ONE
// match and TWO names — 11 of 13 competitors vanished off the projector.
// Projection used to hide it by appending a one-match Final; with projection
// gone (POA-72) the 7-match round IS the last round, so the fix carries it
// alone. This is the assertion that would fail first if POA-65 regressed.
eq(ul.rounds.length, 1, 'one generated round → one published round, nothing appended');
eq(ul.rounds[0].roundLabel, 'Round 1', 'the only round is the real one');
eq(rendererMatchCount(ul.rounds[ul.rounds.length - 1].slots), 7,
   'last round holds all SEVEN matches — the renderer truncates nothing');
const renderable13 = ul.rounds.reduce((n, r) => n + rendererMatchCount(r.slots), 0);
eq(renderable13, 7, 'all 7 real matches are renderable, none invented, none dropped');

/* ══ CASE 5 — champion / runner-up at a completed bracket ════════════════ */
console.log('\nCASE 5 — champion & runner-up');
const done = {
  phase: 'done', revivedNames: ['Zara'],
  rounds: [
    { label: 'Semi Finals', phase: 'main', roundNum: 1, pairs: [
      { id: 'a', t1: 'Zara', t2: 'Bo', bye: false, winner: 'Zara', loser: 'Bo', votes1: 2, votes2: 1 },
      { id: 'b', t1: 'Cy', t2: 'Dee', bye: false, winner: 'Cy', loser: 'Dee', votes1: 3, votes2: 0 },
    ]},
    { label: '3rd Place', phase: 'third', roundNum: 2, pairs: [
      { id: 'c', t1: 'Bo', t2: 'Dee', bye: false, winner: 'Bo', loser: 'Dee', votes1: 2, votes2: 1 },
    ]},
    { label: 'Final', phase: 'main', roundNum: 2, pairs: [
      { id: 'd', t1: 'Zara', t2: 'Cy', bye: false, winner: 'Zara', loser: 'Cy', votes1: 2, votes2: 1 },
    ]},
  ],
};
const dl = buildLiveBracketData(done, []);
eq(dl.champion, 'Zara', 'champion read from the Final pair');
eq(dl.runnerUp, 'Cy', 'runnerUp read from the Final pair loser');
eq(dl.rounds.length, 3, 'Semi Finals + 3rd Place + Final — 3rd Place now INCLUDED (POA-67)');
eq(dl.rounds[1].roundLabel, '3rd Place', '3rd Place kept in generation order, before the Final');
ok(dl.rounds[1].kind === undefined, '3rd Place is pair-shaped, not a pool');
eq(dl.rounds[dl.rounds.length - 1].roundLabel, 'Final',
   'Final is LAST — the renderer centres rounds[length-1], so this must hold');
eq(rendererMatchCount(dl.rounds[1].slots), 1, '3rd Place holds exactly one match');
eq(dl.rounds[1].slots[0].name, 'Bo', '3rd Place carries its real competitors');

// A Final that is scored but whose bracket has not settled must not publish.
const midFinal = JSON.parse(JSON.stringify(done));
midFinal.phase = 'main';
eq(buildLiveBracketData(midFinal, []).champion, null,
   'champion withheld until bracket.phase === "done"');

/* ══ CASE 7 — redemption → pool round mapping (POA-66) ═══════════════════ */
console.log('\nCASE 7 — redemption rounds map to pool shape, groups preserved');
eq(pool.slots.length, 6, 'demo redemption: 3 groups × 2 brewers = 6 slots');
eq(pool.slots.map(s => s.group).join(','), '0,0,1,1,2,2', 'group index preserved per slot');
eq(pool.slots[0].name, 'Darwisyah', 'brewer names map from group.brewers');
eq(pool.slots[0].score, 1, 'votes map from group.votes once the group is settled');
eq(pool.slots[1].score, 2, 'second brewer score maps too');
ok(pool.slots.filter(s => s.isWinner).length === 3, 'exactly one explicit winner per settled group');
eq(pool.slots[1].isWinner, true, 'the group winner is flagged (Husna Azlan)');
ok(!pool.slots[0].isWinner, 'the non-winner is not flagged');
ok(pool.slots.every(s => s.isBye === false), 'pool slots are never byes');

// Unsettled group must publish no scores — votes increment LIVE as judges tap,
// exactly like the pair path.
const unsettled = JSON.parse(JSON.stringify(demo.bracket));
const grp = unsettled.rounds[1].pairs[0];
grp.winner = null;
grp.votes[grp.brewers[0]] = 2; // judge has tapped, not confirmed
const up = buildLiveBracketData(unsettled, demo.participants).rounds[1];
eq(up.slots[0].score, null, 'unsettled pool group publishes no scores');
ok(!up.slots[0].isWinner && !up.slots[1].isWinner, 'unsettled pool group crowns nobody');

// Tiebreaker: winner named while votes stay TIED. Score-derived inference
// would render this as an unresolved tie and hide who advanced.
const tb = JSON.parse(JSON.stringify(demo.bracket));
const tg = tb.rounds[1].pairs[0];
tg.votes[tg.brewers[0]] = 2; tg.votes[tg.brewers[1]] = 2;
tg.tiebreaker = tg.brewers[1]; tg.winner = tg.brewers[1];
const tp = buildLiveBracketData(tb, demo.participants).rounds[1];
eq(tp.slots[0].score, 2, 'tiebreaker group still publishes the real (tied) votes');
eq(tp.slots[1].score, 2, 'both tied scores published honestly');
eq(tp.slots[1].isWinner, true, 'tiebreaker winner is stated explicitly');
ok(!tp.slots[0].isWinner, 'the tied loser is not flagged as winner');

// A pool round as the LAST round — the live state the organiser sits in while
// scoring redemption. Nothing may be appended after it (POA-72), and the pool
// itself must survive intact as the trailing column.
const poolLast = { phase: 'redemption', revivedNames: [], rounds: [
  { label: 'Round 1', phase: 'main', pairs: buildPairs(['A','B','C','D','E','F','G','H']) },
  { label: 'Redemption Round 1', phase: 'redemption', pairs: [
    { id: 'x', brewers: ['B','D','F'], votes: { B: 0, D: 0, F: 0 }, tiebreaker: null, winner: null }] },
]};
const pl = buildLiveBracketData(poolLast, []);
eq(pl.rounds.length, 2, 'pool as last round — nothing projected after it');
eq(pl.rounds[1].kind, 'pool', 'pool round present');
eq(pl.rounds[pl.rounds.length - 1].roundLabel, 'Redemption Round 1',
   'the trailing column is the pool itself, not an invented Final');
eq(pl.rounds[1].slots.length, 3, 'all three brewers survive as the last column');

/* ══ CASE 6 — degenerate inputs (fail-open posture) ══════════════════════ */
console.log('\nCASE 6 — degenerate input never throws');
[null, undefined, {}, { rounds: null }, { rounds: [] }, { rounds: [null] }].forEach((bad, i) => {
  let threw = false, res = null;
  try { res = buildLiveBracketData(bad, null); } catch (e) { threw = true; }
  ok(!threw && res && Array.isArray(res.rounds), 'degenerate input #' + i + ' returns a safe empty shape');
});

/* ── Report ──────────────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(60));
if (failures.length) {
  console.log('FAILED — ' + pass + ' passed, ' + failures.length + ' failed:');
  failures.forEach(f => console.log('   ✗ ' + f));
  process.exit(1);
}
console.log('ALL PASSED — ' + pass + ' assertions');
