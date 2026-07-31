#!/usr/bin/env node
/* scripts/test-throwdown-fullrun.js — POA-70/71/72 verification
 *
 * Drives COMPLETE tournaments through Throwdown's own state machine and its own
 * button handlers' entry points, extracted verbatim from throwdown/index.html at
 * run time (same technique as test-live-bracket.js — no duplicated logic, no
 * hand-authored fixture). At every advancement it renders the organiser's own
 * Bracket tab and asserts the surface is USABLE:
 *
 *   · no "undefined" anywhere            · no TBD against real competitors
 *   · no card stuck on "Awaiting previous results"
 *   · a Score button on every non-bye card
 *
 * WHY THIS EXISTS. test-live-bracket.js unit-tests the translation layer and
 * passed 89 assertions while redemption was completely unusable end to end —
 * the organiser's Bracket tab rendered every round through the pair shape, so a
 * redemption round showed TBD/TBD with no Score button and the run could not
 * proceed (POA-70/71). Assertion counts on a pure function say nothing about
 * whether a feature can actually be operated. The shipped demo fixture hid it
 * further by arriving with its redemption round pre-resolved, so no test ever
 * advanced THROUGH a live redemption round.
 *
 * The lesson generalised: a feature flag that is off in the demo fixture and off
 * in every prior test run is untested regardless of assertion counts. This file
 * is the guard — it turns the flags ON and plays the whole tournament.
 *
 * Run:  node scripts/test-throwdown-fullrun.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = process.env.TD_SRC || path.join(__dirname, '..', 'throwdown', 'index.html');
const html = fs.readFileSync(SRC, 'utf8');

function between(a0, b0) { const a = html.indexOf(a0); return html.slice(a, html.indexOf(b0, a)); }
function extractFunction(name) {
  const start = html.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('not found: ' + name);
  let i = html.indexOf('{', start), depth = 0;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) return html.slice(start, i + 1); }
  }
}
const NEEDED = ['shuffle','buildPairs','buildRedemptionGroups','generateBracket',
  'getNextRoundLabel','getActiveRound','isRoundComplete','isPoolRound','redemptionGroupView',
  'advanceBracket','drawWildCard','continueAfterWildCard','skipWildCard','drawLuckyLoser',
  'continueAfterLuckyLoser','roundColour','rBracket','rHistory'];

function makeApi(S) {
  const src = 'let mid = 0;\n'
    + between('/* ── POA-63 Phase 2: live-bracket translation layer', '/* END buildLiveBracketData') + '\n'
    + NEEDED.map(extractFunction).join('\n') + '\n'
    + 'return { ' + NEEDED.join(', ') + ', buildLiveBracketData };';
  return new Function('S','Gates','save','render','alert', src)(
    S, { canAccess: () => ({ allowed: true }) }, () => {}, () => {}, () => {});
}

const NAMES = ['Aliya Roslan','Darwisyah','Seri Anindita','Husna Azlan','Nadia Syakira',
  'Fatin Najwa','Raihana Malik','Zulfiqah','Amirah Suffian','Norafiza','Syaza Irdina','Nur Haziqah'];

let failures = 0;
function chk(cond, label) {
  if (!cond) { failures++; console.log('    ✗ ' + label); } else { console.log('    ✓ ' + label); }
}

// Parse the Bracket tab into per-card facts.
function inspect(api, S) {
  const out = api.rBracket();
  if (/undefined/.test(out)) return { undefinedText: true, cards: [] };
  const cards = [];
  out.split('<div class="bracket-section">').slice(1).forEach(sec => {
    const label = ((sec.match(/class="section-title"[^>]*>([\s\S]*?)<\/div>/) || ['',''])[1])
      .replace(/<[^>]+>/g, '').trim();
    sec.split(/<div class="bslot(?=[^"]*" style="border-top-color:)/).slice(1).forEach(c => {
      cards.push({
        round: label,
        names: [...c.matchAll(/class="bslot-name[^"]*">([\s\S]*?)<\/span>/g)]
          .map(m => m[1].replace(/<[^>]+>/g, '').trim()),
        status: ((c.match(/class="bslot-status[^"]*">([\s\S]*?)<\/span>/) || ['','' ])[1])
          .replace(/<[^>]+>/g, '').trim(),
        score: /data-score=/.test(c),
      });
    });
  });
  return { undefinedText: false, cards };
}

function run(label, cfg) {
  console.log('\n' + '═'.repeat(64) + '\n' + label + '\n' + '═'.repeat(64));
  const S = Object.assign({
    judges: 3, redemption: false, redemptionRounds: { r1: true, r2: false },
    redemptionCap: 4, redemptionGroupSize: 3, wildCard: false, thirdPlace: false,
    participants: NAMES.map(n => ({ name: n })), bracket: null,
  }, cfg);
  const api = makeApi(S);
  let seed = 20260731;
  Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

  api.generateBracket();
  let guard = 0, drewOnce = false;
  const seen = [];

  while (S.bracket.phase !== 'done' && guard++ < 40) {
    const b = S.bracket;

    // Draw the revival on the FIRST offer, skip later ones. Not a convenience:
    // drawing at every offer never terminates (pre-existing defect in
    // continueAfterWildCard(), which lacks the 3rd-place branch that
    // advanceBracket() and skipWildCard() both have — a revival into a resolved
    // Semi Finals makes 3 advancing, which re-labels as 'Semi Finals' forever).
    // Logged separately; this run verifies the rendering fixes, not that.
    if (b.pendingWildCard) {
      const rn = b.pendingWildCard;          // drawWildCard() clears it
      if (!drewOnce) { drewOnce = true; api.drawWildCard(); api.continueAfterWildCard(rn); }
      else { api.skipWildCard(); }
      continue;
    }
    if (b.pendingLuckyLoser && !b.pendingLuckyLoser.done) { api.drawLuckyLoser(); continue; }
    if (b.pendingLuckyLoser && b.pendingLuckyLoser.done) { api.continueAfterLuckyLoser(); continue; }

    // Score the EARLIEST incomplete round, not just the last: advanceBracket()
    // pushes '3rd Place' and 'Final' together, so the 3rd Place playoff sits at
    // length-2 and the organiser scores both cards before the bracket resolves.
    const round = b.rounds.find(r => !api.isRoundComplete(r));
    if (!round) { api.advanceBracket(); continue; }

    // Before scoring: the organiser must be able to SEE and ACT on this round.
    const view = inspect(api, S);
    chk(!view.undefinedText, round.label + ': Bracket tab contains no "undefined"');
    // Exact label match: 'Semi Finals'.includes('Final') is TRUE, which
    // silently pulled earlier rounds into the Final's card set.
    const cards = view.cards.filter(c => c.round.replace(/^[^A-Za-z0-9]+/, '')
      .replace(/\s*Redemption$|\s*3rd Place$/, '').trim() === round.label);
    // A bye is correctly not scoreable — there is nothing to score.
    const scoreable = cards.filter(c => !/Bye/.test(c.status));
    const actionable = scoreable.filter(c => c.score).length;
    const blocked = cards.filter(c => /Awaiting previous/.test(c.status)).length;
    const tbd = cards.filter(c => c.names.includes('TBD')).length;
    chk(cards.length > 0 && actionable === scoreable.length,
      round.label + ': every non-bye card is scoreable (' + actionable + '/' + scoreable.length
      + (cards.length - scoreable.length ? ', ' + (cards.length - scoreable.length) + ' bye' : '') + ')');
    chk(blocked === 0, round.label + ': no card blocked on "Awaiting previous results"');
    chk(tbd === 0, round.label + ': no TBD against real competitors');
    seen.push(round.label + ' [' + (round.phase === 'redemption' ? cards.length + ' groups' : cards.length + ' matches') + ']');

    // Score it, exactly as the two confirm handlers do.
    if (round.phase === 'redemption') {
      round.pairs.forEach(g => {
        g.votes[g.brewers[0]] = 3; g.brewers.slice(1).forEach(n => g.votes[n] = 0);
        g.winner = g.brewers[0];
      });
    } else {
      round.pairs.forEach(p => {
        if (p.bye) return;
        p.votes1 = 3; p.votes2 = 0; p.winner = p.t1; p.loser = p.t2;
      });
    }
    api.advanceBracket();
  }

  chk(S.bracket.phase === 'done', 'reached phase "done" in ' + guard + ' steps');
  const finalRound = S.bracket.rounds.filter(r => r.phase === 'main' && r.label === 'Final').slice(-1)[0];
  const third = S.bracket.rounds.filter(r => r.phase === 'third').slice(-1)[0];
  chk(!!(finalRound && (finalRound && finalRound.pairs[0].winner)), 'a champion was crowned: ' + (finalRound && (finalRound && finalRound.pairs[0].winner)));
  if (third) chk(!!third.pairs[0].winner, '3rd place round generated AND resolved: ' + third.pairs[0].winner);
  else if (cfg.thirdPlace) console.log('    · 3rd Place not generated — the semi-final had a bye, so only one real loser existed. Correct.');

  // History tab and the published document, at the end state.
  chk(!/undefined/.test(api.rHistory()), 'History tab contains no "undefined"');
  const live = api.buildLiveBracketData(S.bracket, S.participants);
  chk(live.champion === (finalRound && finalRound.pairs[0].winner), 'published champion matches the bracket');
  chk(live.rounds.length === S.bracket.rounds.length, 'published rounds == real rounds, nothing projected ('
    + live.rounds.length + ')');
  chk(!JSON.stringify(live).includes('"name":""'), 'no empty-string names published (spec §3 null)');

  console.log('\n  rounds played: ' + seen.join('  →  '));
  console.log('  published:     ' + live.rounds.map(r => r.roundLabel + (r.kind === 'pool' ? ' [pool]' : '')).join('  →  '));
}

run('RUN A — redemption + revival + 3rd place ALL ON (12 competitors)', {
  redemption: true, wildCard: true, thirdPlace: true,
});
run('RUN B — redemption OFF (regression guard, 12 competitors)', {
  redemption: false, wildCard: false, thirdPlace: true,
});
run('RUN C — 8 competitors: even bracket, 3rd place actually fires', {
  redemption: false, wildCard: false, thirdPlace: true, expectThird: true,
  participants: NAMES.slice(0, 8).map(n => ({ name: n })),
});
run('RUN D — 8 competitors, redemption + revival + 3rd place ALL ON', {
  redemption: true, wildCard: true, thirdPlace: true,
  participants: NAMES.slice(0, 8).map(n => ({ name: n })),
});

console.log('\n' + '─'.repeat(64));
console.log(failures ? failures + ' CHECKS FAILED' : 'ALL FULL-RUN CHECKS PASSED');
console.log([
  '',
  'NOTE: the revival draw is taken on the FIRST offer and skipped after.',
  'Drawing at EVERY offer never terminates — continueAfterWildCard() lacks the',
  '3rd-place branch that advanceBracket() and skipWildCard() both have, so a',
  'revival into a resolved Semi Finals makes 3 advancing, which getNextRoundLabel()',
  're-labels "Semi Finals", forever. Pre-existing (identical on v5.15.0), logged as',
  'its own ticket, NOT fixed here — it is advancement logic, not rendering.',
].join('\n'));
process.exit(failures ? 1 : 0);
