#!/usr/bin/env node
/* scripts/test-throwdown-sweep.js
 *
 * Combinatorial flag sweep over Throwdown's advancement logic:
 *   field size × redemption × revival × 3rd place × revival policy
 * Each combination plays a COMPLETE tournament and reports structural failures.
 *
 * WHY. Five blocking defects in Throwdown's advancement logic were found in two
 * days (POA-70/71, POA-73, POA-76, POA-77). Every one was pre-existing, and
 * every one surfaced only by playing a whole tournament with the features
 * actually switched on. Ticket-directed testing kept missing them because each
 * ticket pointed at one flag; the defects live in the COMBINATIONS.
 *
 * test-throwdown-fullrun.js plays four hand-chosen configurations. This plays
 * all of them, so a regression in an unpopular flag combination cannot hide.
 *
 * Run:  node scripts/test-throwdown-sweep.js        (default: r1 only, as shipped)
 *       R2=1 node scripts/test-throwdown-sweep.js   (both redemption rounds)
 *
 * Exit code is 0 even with findings: the known-open tickets below still fail by
 * design. Read the output; do not treat it as a pass/fail gate until they close.
 *
 * KNOWN OPEN at time of writing (v5.16.0):
 *   POA-73  NON-TERMINATING              — every rev=Y pol=always combination
 *   POA-73  LABEL COLLISION              — downstream symptom of the same loop
 *   POA-77  SINGLETON REDEMPTION GROUP   — trailing group of 1 when losers %% groupSize == 1
 */
'use strict';
const fs = require('fs');
const path = require('path');
const SRC = process.env.TD_SRC || path.join(__dirname, '..', 'throwdown', 'index.html');
const html = fs.readFileSync(SRC, 'utf8');

function between(a0,b0){const a=html.indexOf(a0);return html.slice(a,html.indexOf(b0,a));}
function ex(n){const s=html.indexOf('function '+n+'(');if(s===-1)throw new Error(n);
  let i=html.indexOf('{',s),d=0;for(;i<html.length;i++){if(html[i]==='{')d++;else if(html[i]==='}'){d--;if(!d)return html.slice(s,i+1);}}}
const N=['shuffle','buildPairs','buildRedemptionGroups','generateBracket','getNextRoundLabel',
'getActiveRound','isRoundComplete','isPoolRound','redemptionGroupView','advanceBracket',
'drawWildCard','continueAfterWildCard','skipWildCard','drawLuckyLoser','continueAfterLuckyLoser',
'roundColour','rBracket','rHistory'];

function makeApi(S){
  const src='let mid=0;\n'
    + between('/* ── POA-63 Phase 2: live-bracket translation layer','/* END buildLiveBracketData')+'\n'
    + N.map(ex).join('\n')+'\nreturn {'+N.join(',')+',buildLiveBracketData};';
  return new Function('S','Gates','save','render','alert',src)(
    S,{canAccess:()=>({allowed:true})},()=>{},()=>{},()=>{});
}
const POOL=['Aliya','Darwisyah','Seri','Husna','Nadia','Fatin','Raihana','Zulfiqah',
'Amirah','Norafiza','Syaza','Haziqah','Iman','Balqis','Wardah','Adlina'];

const MAX_STEPS = 60;

function play(cfg){
  const S=Object.assign({judges:3,redemption:false,redemptionRounds:{r1:true,r2:(process.env.R2==="1")},
    redemptionCap:4,redemptionGroupSize:3,wildCard:false,thirdPlace:false,
    participants:POOL.slice(0,cfg.n).map(x=>({name:x})),bracket:null},cfg.flags);
  const api=makeApi(S);
  let seed=cfg.seed;
  Math.random=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};

  api.generateBracket();
  let steps=0, drew=0;
  const issues=[];
  while(S.bracket.phase!=='done' && steps++<MAX_STEPS){
    const b=S.bracket;
    if(b.pendingWildCard){
      const rn=b.pendingWildCard;
      const take = cfg.policy==='always' || (cfg.policy==='once' && drew===0);
      if(take){drew++;api.drawWildCard();api.continueAfterWildCard(rn);}
      else api.skipWildCard();
      continue;
    }
    if(b.pendingLuckyLoser&&!b.pendingLuckyLoser.done){api.drawLuckyLoser();continue;}
    if(b.pendingLuckyLoser&&b.pendingLuckyLoser.done){api.continueAfterLuckyLoser();continue;}
    const r=b.rounds.find(x=>!api.isRoundComplete(x));
    if(!r){api.advanceBracket();continue;}

    const out=api.rBracket();
    if(/undefined/.test(out)) issues.push('rBracket prints "undefined" at '+r.label);
    if(r.phase==='redemption') r.pairs.forEach(g=>{g.votes[g.brewers[0]]=3;
      g.brewers.slice(1).forEach(n2=>g.votes[n2]=0);g.winner=g.brewers[0];});
    else r.pairs.forEach(p=>{if(p.bye)return;p.votes1=3;p.votes2=0;p.winner=p.t1;p.loser=p.t2;});
    api.advanceBracket();
  }

  const b=S.bracket;
  if(b.phase!=='done') issues.push('NON-TERMINATING (hit '+MAX_STEPS+' steps)');
  // Two DIFFERENT things look alike here and must not be conflated:
  //  · same label AND same roundNum  -> a round genuinely pushed twice (re-entry)
  //  · same label, different roundNum -> a naming collision, because
  //    getNextRoundLabel() names purely by field size and redemption can
  //    re-inflate the field to 8 twice. The tournament is still valid.
  const seenKey={}, seenLabel={};
  b.rounds.forEach(r=>{
    const k=r.label+'#'+r.roundNum+'#'+r.phase;
    if(seenKey[k]) issues.push('DUPLICATE PUSH (same label+roundNum): '+r.label);
    seenKey[k]=1;
    const lk=r.label+'#'+r.phase;
    if(seenLabel[lk] && seenLabel[lk]!==r.roundNum) issues.push('LABEL COLLISION (two distinct rounds named the same): '+r.label);
    seenLabel[lk]=r.roundNum;
  });
  // A redemption "group" of one advances unopposed - not a contest.
  b.rounds.filter(r=>r.phase==='redemption').forEach(r=>{
    if(r.pairs.some(g=>(g.brewers||[]).length<2))
      issues.push('SINGLETON REDEMPTION GROUP (one brewer advances unopposed)');
  });
  if(/undefined/.test(api.rHistory())) issues.push('rHistory prints "undefined"');
  if(b.phase==='done'){
    const fin=b.rounds.filter(r=>r.phase==='main'&&r.label==='Final').slice(-1)[0];
    if(!fin||!fin.pairs[0].winner) issues.push('done but no champion');
  }
  const live=api.buildLiveBracketData(b,S.participants);
  if(JSON.stringify(live).includes('"name":""')) issues.push('published empty-string name');
  return {issues:[...new Set(issues)], steps, rounds:b.rounds.map(r=>r.label).join(" → ")};
}

const results=[];
[8,12,13,16].forEach(n=>{
 [false,true].forEach(redemption=>{
  [false,true].forEach(wildCard=>{
   [false,true].forEach(thirdPlace=>{
    (wildCard?['always','once','skip']:['skip']).forEach(policy=>{
      const label='n='+String(n).padEnd(2)+' rd='+(redemption?'Y':'n')+' rev='+(wildCard?'Y':'n')
        +' 3rd='+(thirdPlace?'Y':'n')+' pol='+policy.padEnd(6);
      let r;
      try{ r=play({n,seed:20260731,policy,flags:{redemption,wildCard,thirdPlace}}); }
      catch(e){ r={issues:['THREW: '+e.message],steps:-1,rounds:''}; }
      results.push({label,...r});
    });
   });
  });
 });
});

const bad=results.filter(r=>r.issues.length);
console.log('runs: '+results.length+'   clean: '+(results.length-bad.length)+'   with issues: '+bad.length+'\n');
const byIssue={};
bad.forEach(r=>r.issues.forEach(i=>{
  const k=i.replace(/at .*/,'at <round>').replace(/\(hit \d+ steps\)/,'');
  (byIssue[k]=byIssue[k]||[]).push(r.label);
}));
Object.keys(byIssue).forEach(k=>{
  console.log('■ '+k+'   ['+byIssue[k].length+' combos]');
  byIssue[k].slice(0,8).forEach(l=>console.log('    '+l));
  if(byIssue[k].length>8) console.log('    … +'+(byIssue[k].length-8)+' more');
  console.log('');
});
if(!bad.length) console.log('no structural failures in any combination');
