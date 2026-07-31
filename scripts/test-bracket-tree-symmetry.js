#!/usr/bin/env node
/* scripts/test-bracket-tree-symmetry.js — POA-75
 *
 * Guards the invariant behind the column-width defect: .aud-bkt-side and
 * .aud-bkt-col are both flex:1 (shared/theme.css), so each side of the
 * mirrored tree divides its own EQUAL width budget by however many
 * .aud-bkt-col children IT holds. A pool or single-match round (POA-66/67)
 * only ever adds a column to the left, never mirrored — so without a
 * same-width spacer on the right, matching rounds on each side render at
 * DIFFERENT widths. Measured before the fix: 32 competitors, 3rd Place on,
 * Round 1 (etc.) at 164px left vs 205px right — a ~20% mismatch on cards
 * that should be identical.
 *
 * _bktTreeHTML() and its dependencies are pure string builders (no `document`
 * calls — only the outer renderBracketTree() touches the DOM), so this runs
 * in plain Node: extract the functions verbatim from shared/audience.js,
 * count `.aud-bkt-col` occurrences within each `.aud-bkt-side`, and assert
 * parity. Column-count parity is what PRODUCES width parity (same flex
 * divisor); actual pixel width needs a real browser and is out of reach for
 * a Node script, which is exactly why the count invariant is the guard.
 *
 * Run: node scripts/test-bracket-tree-symmetry.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'shared', 'audience.js');
const js = fs.readFileSync(SRC, 'utf8');

function extractFunction(name) {
  const sig = 'function ' + name + '(';
  const start = js.indexOf(sig);
  if (start === -1) throw new Error('Function not found: ' + name);
  let i = js.indexOf('{', start), depth = 0;
  for (; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}') { depth--; if (depth === 0) return js.slice(start, i + 1); }
  }
  throw new Error('Unbalanced braces extracting: ' + name);
}

// Every pure string-builder _bktTreeHTML transitively depends on. Deliberately
// excludes _bktApplyScale (touches `document`) and renderBracketTree() itself
// (mounts to a container) — this test exercises the HTML-string layer only.
const NEEDED = [
  '_bktRoundColour', '_bktMatchPending', '_bktSlotChanged', '_bktMatchJustResolved',
  '_bktSlotHTML', '_bktMatchHTML', '_bktMatchesForRound', '_bktPairsHTML',
  '_bktColumnHTML', '_bktPoolGroups', '_bktPoolGroupHTML', '_bktPoolColumnHTML',
  '_bktIsPool', '_bktTreeHTML',
];
const src = NEEDED.map(extractFunction).join('\n') + '\nreturn { _bktTreeHTML };';
const { _bktTreeHTML } = new Function(src)();

// Extract the content of the FIRST div found after `marker`, by depth-
// counting <div ...> / </div> tags — not a naive string split. A naive split
// on the next class name bleeds centerHTML into "left", since centerHTML
// sits between the left div's close and the right div's open and can itself
// contain aud-bkt-col-label markup (the Final's own title).
function divContentAfter(html, marker) {
  // The marker lives INSIDE the div's own opening tag (its class attribute),
  // so the tag start is the nearest '<div' at or BEFORE the marker — not the
  // next one forward, which would be the first nested child instead.
  const markerIdx = html.indexOf(marker);
  const tagStart = html.lastIndexOf('<div', markerIdx);
  let i = html.indexOf('>', tagStart) + 1;
  const contentStart = i;
  let depth = 1;
  while (depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) throw new Error('unbalanced div');
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
    else { depth--; if (depth === 0) return html.slice(contentStart, nextClose); i = nextClose + 6; }
  }
}

function sideColumnCounts(bracketData) {
  const html = _bktTreeHTML(bracketData, null);
  const left = divContentAfter(html, 'aud-bkt-side-left');
  const right = divContentAfter(html, 'aud-bkt-side-right');
  // Match a DIV whose class value contains "aud-bkt-col" as its OWN token —
  // bounded by a quote or whitespace on the right, not by a hyphen. Without
  // that boundary this also matches "aud-bkt-col-label" (the column's own
  // child, one per real column) and would silently double-count every real
  // column while leaving a bare spacer (no label child) counted once —
  // exactly the kind of self-inflicted asymmetry this test exists to rule
  // OUT, not manufacture.
  const count = (s) => (s.match(/class="aud-bkt-col(?=["\s])/g) || []).length;
  return { left: count(left), right: count(right) };
}

let pass = 0;
const failures = [];
function ok(cond, label) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { failures.push(label); console.log('  ✗ ' + label); }
}

/* ══ CASE 1 — the exact regression: 32 competitors, 3rd Place, no redemption ══ */
console.log('CASE 1 — 32 competitors, 3rd Place ON, redemption/revival OFF (the real event config)');
function buildPairs32() {
  // Mirrors buildPairs()'s shape without importing throwdown/index.html —
  // this test targets the renderer, not Throwdown's bracket generation.
  const pairs = [];
  for (let i = 0; i < 16; i++) {
    pairs.push({ t1: 'A' + i, t2: 'B' + i, bye: false, matchId: 'r1-' + i, winner: 'A' + i, loser: 'B' + i, votes1: 3, votes2: 0 });
  }
  return pairs;
}
function slotsFromPairs(pairs) {
  const slots = [];
  pairs.forEach(function (p) {
    slots.push({ name: p.t1, score: p.votes1, isBye: false, revivalMarker: false });
    slots.push({ name: p.t2, score: p.votes2, isBye: false, revivalMarker: false });
  });
  return slots;
}
const d32 = {
  bracketSize: 32,
  champion: 'Champ', runnerUp: 'RunnerUp',
  rounds: [
    { roundLabel: 'Round 1', slots: slotsFromPairs(buildPairs32()) },
    // advanceBracket() pushes 3rd Place and Final atomically, back-to-back
    // (throwdown/index.html) — a published document never has 3rd Place as
    // the terminal round with nothing after it. Omitting Final here would
    // make _bktTreeHTML's "last round with exactly one match IS the Final"
    // rule (POA-65) misidentify 3rd Place itself as the Final and route it
    // to the centre — a real, separate latent edge case, but not the shape
    // any real live document can take, and not what this test targets.
    { roundLabel: '3rd Place', slots: [{ name: 'X', score: 3, isBye: false, revivalMarker: false }, { name: 'Y', score: 0, isBye: false, revivalMarker: false }] },
    { roundLabel: 'Final', slots: [{ name: 'Champ', score: 3, isBye: false, revivalMarker: false }, { name: 'RunnerUp', score: 0, isBye: false, revivalMarker: false }] },
  ],
};
const c32 = sideColumnCounts(d32);
ok(c32.left === c32.right, 'left/right column counts match (got left=' + c32.left + ' right=' + c32.right + ')');

/* ══ CASE 2 — a pool (redemption) round as the trailing column ══ */
console.log('\nCASE 2 — pool round trailing, same asymmetry risk as 3rd Place');
const dPool = {
  bracketSize: 8, champion: null, runnerUp: null,
  rounds: [
    { roundLabel: 'Round 1', slots: slotsFromPairs([
      { t1: 'A', t2: 'B', votes1: 3, votes2: 0 }, { t1: 'C', t2: 'D', votes1: 3, votes2: 0 },
      { t1: 'E', t2: 'F', votes1: 3, votes2: 0 }, { t1: 'G', t2: 'H', votes1: 3, votes2: 0 },
    ]) },
    { roundLabel: 'Redemption Round 1', kind: 'pool', slots: [
      { name: 'B', score: 2, group: 0 }, { name: 'D', score: 1, group: 0 },
    ] },
  ],
};
const cPool = sideColumnCounts(dPool);
ok(cPool.left === cPool.right, 'pool-trailing: left/right column counts match (got left=' + cPool.left + ' right=' + cPool.right + ')');

/* ══ CASE 3 — no asymmetric round at all: parity should hold trivially ══ */
console.log('\nCASE 3 — ordinary bracket, no 3rd Place, no pool — control case');
const dPlain = {
  bracketSize: 8, champion: 'A', runnerUp: 'E',
  rounds: [
    { roundLabel: 'Quarter Finals', slots: slotsFromPairs([
      { t1: 'A', t2: 'B', votes1: 2, votes2: 1 }, { t1: 'C', t2: 'D', votes1: 2, votes2: 1 },
      { t1: 'E', t2: 'F', votes1: 2, votes2: 1 }, { t1: 'G', t2: 'H', votes1: 2, votes2: 1 },
    ]) },
    { roundLabel: 'Semi Finals', slots: slotsFromPairs([
      { t1: 'A', t2: 'C', votes1: 2, votes2: 1 }, { t1: 'E', t2: 'G', votes1: 2, votes2: 1 },
    ]) },
    { roundLabel: 'Final', slots: slotsFromPairs([{ t1: 'A', t2: 'E', votes1: 2, votes2: 1 }]) },
  ],
};
const cPlain = sideColumnCounts(dPlain);
ok(cPlain.left === cPlain.right, 'plain bracket (no 3rd/pool round): left/right column counts match (got left=' + cPlain.left + ' right=' + cPlain.right + ')');

/* ══ CASE 4 — the spacer must be genuinely empty, not a labelled ghost round ══ */
console.log('\nCASE 4 — the spacer carries no label (POA-67 precedent: never a labelled empty twin)');
const html32 = _bktTreeHTML(d32, null);
const rightSide32 = divContentAfter(html32, 'aud-bkt-side-right');
ok(/aria-hidden="true"/.test(rightSide32), 'right side carries an aria-hidden spacer');
// The spacer must be a bare, contentless div — no label, no matches, no TBD
// text. Matched exactly, not just "aria-hidden is present somewhere".
const spacerMatch = rightSide32.match(/<div class="aud-bkt-col" aria-hidden="true"><\/div>/);
ok(!!spacerMatch, 'spacer is a bare, contentless div — no label, no matches, no TBD text');

/* ── Report ──────────────────────────────────────────────────────────────── */
console.log('\n' + '─'.repeat(60));
if (failures.length) {
  console.log('FAILED — ' + pass + ' passed, ' + failures.length + ' failed:');
  failures.forEach(f => console.log('   ✗ ' + f));
  process.exit(1);
}
console.log('ALL PASSED — ' + pass + ' assertions');
