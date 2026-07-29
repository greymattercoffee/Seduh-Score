// shared/audience.js — Seduh Score audience overlay
// Full rebuild — v4.6.0 (POA-16). Spec: AUDIENCE-SPEC.md §3.

let audInited = false;
let _podiumData = null;
let _currentState = 'hidden';
let _lastState = null;

let _cfg = {
  accentColour: null,      // hex string | null → falls back to var(--accent)
  logoUrl: null,           // blob URL | data URL | null — ephemeral, not persisted
  projectionMode: 'dark',  // 'dark' | 'light'
  eventId: null,           // reserved for Firebase — not wired yet
};

// ── Config persistence ───────────────────────────────────────────

function _saveConfig() {
  try {
    localStorage.setItem('seduh_aud_config_v1',
      JSON.stringify({ projectionMode: _cfg.projectionMode, accentColour: _cfg.accentColour }));
  } catch(e) {}
}

function _loadConfig() {
  try {
    const raw = localStorage.getItem('seduh_aud_config_v1');
    if (raw) Object.assign(_cfg, JSON.parse(raw));
  } catch(e) {}
}

// ── Theme toggle ─────────────────────────────────────────────────

function _toggleTheme() {
  if (_currentState === 'podium') return; // dark locked during podium
  const ovl = document.getElementById('aud-overlay');
  if (!ovl) return;
  const isDark = ovl.classList.contains('aud-dark');
  ovl.classList.toggle('aud-dark', !isDark);
  ovl.classList.toggle('aud-light', isDark);
  _cfg.projectionMode = isDark ? 'light' : 'dark';
  if      (_currentState === 'enh-dark')         _currentState = 'enh-light';
  else if (_currentState === 'enh-light')         _currentState = 'enh-dark';
  else if (_currentState === 'enh-single-dark')   _currentState = 'enh-single-light';
  else if (_currentState === 'enh-single-light')  _currentState = 'enh-single-dark';
  _saveConfig();
}

// ── Podium ───────────────────────────────────────────────────────

function _renderPodium() {
  const pp = document.getElementById('aud-podium-panel');
  if (!pp) return;

  const data = _podiumData || [];
  const get = rank => data.find(d => d.rank === rank);
  const champ = get(1);
  const ru1   = get(2);
  const ru2   = get(3);

  function tile(entry, label, cls) {
    const name  = entry ? entry.name : '';
    const empty = !entry || !name;
    return `<div class="aud-podium-tile ${cls}${empty ? ' aud-podium-empty' : ''}">
      <div class="aud-podium-label">${label}</div>
      <div class="aud-podium-name">${name || '—'}</div>
    </div>`;
  }

  pp.innerHTML = `
    <div class="aud-podium-stage">
      ${tile(ru1,   '1st Runner Up', 'aud-podium-rank-2')}
      ${tile(champ, 'Champion',      'aud-podium-rank-1')}
      ${tile(ru2,   '2nd Runner Up', 'aud-podium-rank-3')}
    </div>`;
}

function _exitPodium() {
  const ovl = document.getElementById('aud-overlay');
  if (!ovl) return;
  _currentState = _lastState || 'enh-dark';
  const pp = document.getElementById('aud-podium-panel');
  if (pp) pp.style.display = 'none';
  ovl.classList.remove('aud-podium-active');
}

// ── Handoff ──────────────────────────────────────────────────────

function _applyHandoff() {
  try {
    const raw = sessionStorage.getItem('seduh_handoff');
    if (!raw) return;
    const h = JSON.parse(raw);
    if (!h || (h.v !== 1 && h.v !== 2)) return;
    if (h.accent)  _cfg.accentColour = h.accent;
    if (h.logoUrl) _cfg.logoUrl      = h.logoUrl;
  } catch(e) { /* malformed handoff — ignore */ }
}

// ── Public API ───────────────────────────────────────────────────

const Audience = {};

Audience.setEventConfig = function(params) {
  Object.assign(_cfg, params);
  _saveConfig();
};

Audience.init = function() {
  if (audInited) return;
  audInited = true;

  const closeBtn = document.getElementById('aud-close');
  if (closeBtn) closeBtn.addEventListener('click', Audience.close);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') Audience.close();
  });

  const toggle = document.getElementById('aud-theme-toggle');
  if (toggle) toggle.addEventListener('click', _toggleTheme);

  const podiumBack = document.getElementById('aud-podium-back');
  if (podiumBack) podiumBack.addEventListener('click', _exitPodium);

  _loadConfig();
};

Audience.show = function({ title = '', moduleTag = '', lbHTML, histHTML = '', podium } = {}) {
  _applyHandoff();
  const ovl = document.getElementById('aud-overlay');
  if (!ovl) return;

  // MUA-04 — event identity band (Per-Event / Annual tiers, handoff v2 only)
  const _handoff = (() => {
    try { return JSON.parse(sessionStorage.getItem('seduh_handoff') || '{}'); }
    catch { return {}; }
  })();
  const hasBranding = _handoff.v >= 2 && !!_handoff.eventName;
  const tierOk = typeof Gates !== 'undefined'
    && Gates.canAccess('audience_branding').allowed;

  let band = ovl.querySelector('.aud-event-band');
  if (hasBranding && tierOk) {
    if (!band) {
      band = document.createElement('div');
      band.className = 'aud-event-band';
      ovl.insertBefore(band, ovl.firstChild);
    }
    band.style.cssText = [
      'display:flex', 'align-items:center', 'gap:16px', 'padding:16px 24px',
      'background:' + (_handoff.bgColor || 'var(--surface-deep)'),
      'border-bottom:1px solid rgba(255,255,255,0.12)'
    ].join(';');
    band.innerHTML =
      (_handoff.logoUrl
        ? `<img src="${_handoff.logoUrl}" alt=""` +
          ` style="height:60px;width:60px;object-fit:contain;border-radius:8px;flex-shrink:0;">`
        : '') +
      `<div style="min-width:0;">` +
        `<div style="font-family:var(--font-display);font-size:var(--fs-h2);` +
             `font-weight:var(--fw-bold);color:#fff;` +
             `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">` +
          _handoff.eventName +
        `</div>` +
        (_handoff.eventSubtitle
          ? `<div style="font-size:var(--fs-sm);color:rgba(255,255,255,0.75);` +
               `white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">` +
              _handoff.eventSubtitle +
            `</div>`
          : '') +
      `</div>`;
  } else {
    if (band) band.remove();
  }

  // Store or clear podium data — undefined podium param clears it
  _podiumData = (podium && podium.length > 0) ? podium : null;

  const enhanced = Gates.canAccess('audience_enhanced').allowed;

  // ── Accent colour ─────────────────────────────────────────────
  if (_cfg.accentColour) {
    ovl.style.setProperty('--aud-accent', _cfg.accentColour);
  } else {
    ovl.style.removeProperty('--aud-accent');
  }

  // ── Header ────────────────────────────────────────────────────
  const ts = document.getElementById('aud-ts');
  if (ts) ts.textContent = title || 'Seduh Score';

  const tag = document.getElementById('aud-tag');
  if (tag) {
    tag.textContent = moduleTag || '';
    tag.style.display = moduleTag ? '' : 'none';
  }

  const logo = document.getElementById('aud-logo');
  if (logo) {
    if (enhanced && _cfg.logoUrl) {
      logo.src = _cfg.logoUrl;
      logo.style.display = '';
    } else {
      logo.style.display = 'none';
    }
  }

  // ── Panels ────────────────────────────────────────────────────
  const hist = document.getElementById('aud-hist');
  if (hist) hist.innerHTML = histHTML || '<div class="aud-empty">No results yet.</div>';

  const lb = document.getElementById('aud-lb');
  const hasDualPanel = enhanced && !!lb && !!lbHTML && lbHTML !== '';
  if (lb) {
    if (hasDualPanel) {
      lb.innerHTML = lbHTML;
      lb.style.display = '';
    } else {
      lb.style.display = 'none';
    }
  }

  // ── Theme and layout classes ──────────────────────────────────
  const isDark = enhanced ? (_cfg.projectionMode !== 'light') : false;
  ovl.classList.toggle('aud-dark',     isDark);
  ovl.classList.toggle('aud-light',    !isDark);
  ovl.classList.toggle('aud-enhanced', enhanced);
  ovl.classList.toggle('aud-lite',     !enhanced);
  ovl.classList.toggle('aud-dual',     hasDualPanel);
  ovl.classList.toggle('aud-single',   !hasDualPanel);

  // ── Podium panel always hidden on show() ──────────────────────
  const pp = document.getElementById('aud-podium-panel');
  if (pp) pp.style.display = 'none';
  ovl.classList.remove('aud-podium-active');

  // ── State ─────────────────────────────────────────────────────
  if (!enhanced) {
    _currentState = 'lite';
  } else if (hasDualPanel) {
    _currentState = isDark ? 'enh-dark' : 'enh-light';
  } else {
    _currentState = isDark ? 'enh-single-dark' : 'enh-single-light';
  }

  ovl.style.display = 'flex';
};

Audience.showPodium = function() {
  if (!Gates.canAccess('audience_enhanced').allowed) return;
  if (!_podiumData || _podiumData.length === 0) return;

  const ovl = document.getElementById('aud-overlay');
  if (!ovl) return;

  _lastState = _currentState;
  _currentState = 'podium';

  _renderPodium();

  const pp = document.getElementById('aud-podium-panel');
  if (pp) pp.style.display = 'flex';
  ovl.classList.add('aud-podium-active');
  ovl.style.display = 'flex';
};

Audience.close = function() {
  const ovl = document.getElementById('aud-overlay');
  if (!ovl) return;
  ovl.style.display = 'none';
  _currentState = 'hidden';
};

// ── Bracket-tree renderer (POA-63 Phase 1) ─────────────────────────
// Separate rendering target from #aud-overlay — mounts into a caller-provided
// container (Phase 2's audience/index.html will own it), not the organiser's
// own overlay. Public input shape is BRACKET-LIVE-SPEC.md §3, locked — do not
// design around this file's internal match/slot structure as if it were the
// contract. No size-specific branching anywhere below: every computation is
// driven by rounds.length/slots.length at call time, so an irregular (e.g.
// 13-participant) bracket renders exactly as correctly as a clean 8/16/24 one.

function _bktRoundColour(label) {
  // Mirrors throwdown/index.html's own roundColour() meaning (undocumented
  // until this session — see BRACKET-LIVE-SPEC.md §7) — final=green,
  // semi=amber, redemption=purple, round1=neutral, else=blue.
  const l = String(label || '').toLowerCase();
  if (l.includes('redemption')) return 'purple';
  if (l.includes('semi'))       return 'amber';
  if (l.includes('quarter'))    return 'blue'; // checked before 'final' — "quarterfinals" contains that substring
  if (l.includes('final'))      return 'green';
  if (l.includes('round 1'))    return null;
  return 'blue';
}

// "Active" = this match's own two participants are both known, but neither
// has a score yet — "these two are locked in, about to play." Deliberately
// NOT a look-back at the previous round: an earlier design checked whether
// the previous round's slots had a *name*, but a round's slots carry real
// participant names from the moment that round is seeded/populated — for
// round 0 that's true from bracket creation, before anything is played — so
// that check was true from minute one of the tournament, and cascaded
// incorrectly into later rounds too. A real match is "concluded" only once
// its slots carry scores (or it's a bye, which auto-advances without ever
// being "about to play") — checking that on the match's own slots needs no
// cross-round lookup at all, which also means no halving-relationship
// assumption to defend here (unlike a size/shape assumption, there's simply
// nothing left to assume).
function _bktMatchPending(a, b) {
  if (!a || !b) return false;
  if (a.isBye || b.isBye) return false;
  return !!a.name && !!b.name && (a.score == null || b.score == null);
}

// "Just resolved" flash — compares the incoming bracketData against a
// snapshot of the previous renderBracketTree() call for this container (see
// _bktPrevData below). Fires when a slot's name or score newly APPEARED
// since that snapshot: name appearing covers a competitor advancing into a
// slot for the first time; score appearing covers a match just being
// entered. Directional on purpose — a value disappearing shouldn't happen
// in a real tournament, and treating "appeared" (not "changed") as the
// trigger means a slot that already had a score keeps quietly holding it on
// the next call without re-flashing.
function _bktSlotChanged(cur, prev) {
  if (!cur) return false;
  const prevName = prev && prev.name;
  const prevScore = prev && prev.score;
  const nameAppeared = !prevName && !!cur.name;
  const scoreAppeared = prevScore == null && cur.score != null;
  return nameAppeared || scoreAppeared;
}

function _bktMatchJustResolved(curA, curB, prevA, prevB) {
  return _bktSlotChanged(curA, prevA) || _bktSlotChanged(curB, prevB);
}

function _bktSlotHTML(slot, isWinner, isTie) {
  slot = slot || {};
  if (slot.isBye) {
    return '<div class="aud-bkt-slot aud-bkt-bye"><span class="aud-bkt-slot-name">🎫 ' +
      (slot.name || 'Bye') + '</span><span class="aud-bkt-bye-tag">Bye</span></div>';
  }
  const hasName = !!slot.name;
  const cls = !hasName ? ' aud-bkt-slot-tbd' : (isTie ? ' aud-bkt-slot-tie' : (isWinner ? ' aud-bkt-slot-winner' : ''));
  const revival = slot.revivalMarker ? '<span class="aud-bkt-revival">⬆ R</span>' : '';
  const score = (slot.score !== null && slot.score !== undefined)
    ? '<span class="aud-bkt-slot-score">' + slot.score + '</span>' : '';
  return '<div class="aud-bkt-slot' + cls + '"><span class="aud-bkt-slot-name">' +
    (hasName ? slot.name : '—') + revival + '</span>' + score + '</div>';
}

function _bktMatchHTML(slotA, slotB, colour, active, justResolved) {
  let winnerA = false, winnerB = false, tie = false;
  if (slotA && slotB && slotA.score != null && slotB.score != null) {
    if (slotA.score > slotB.score) winnerA = true;
    else if (slotB.score > slotA.score) winnerB = true;
    else tie = true;
  }
  const rcCls = colour ? ' aud-bkt-rc-' + colour : '';
  const activeCls = active ? ' aud-bkt-active' : '';
  const resolvedCls = justResolved ? ' aud-bkt-just-resolved' : '';
  return '<div class="aud-bkt-match' + rcCls + activeCls + resolvedCls + '">' +
    _bktSlotHTML(slotA, winnerA, tie) + _bktSlotHTML(slotB, winnerB, tie) + '</div>';
}

// Builds one match per pair of slots in rounds[roundIdx], each tagged with
// its round-colour, whether it's pending (see _bktMatchPending above), and
// whether it just changed since the previous render call for this container
// (see _bktMatchJustResolved above). prevRounds is null on a container's
// first-ever render — nothing flashes then, since there's no prior snapshot
// to diff against (everything already on screen would otherwise flash on
// first paint, which is exactly the noise this is meant to avoid).
function _bktMatchesForRound(rounds, roundIdx, prevRounds) {
  const round = rounds[roundIdx];
  const slots = (round && round.slots) || [];
  const n = Math.floor(slots.length / 2); // single-elim: always an even slot count
  const colour = _bktRoundColour(round && round.roundLabel);
  const prevSlots = (prevRounds && prevRounds[roundIdx] && prevRounds[roundIdx].slots) || null;
  const out = [];
  for (let i = 0; i < n; i++) {
    const slotA = slots[i * 2], slotB = slots[i * 2 + 1];
    const active = _bktMatchPending(slotA, slotB);
    const justResolved = prevSlots
      ? _bktMatchJustResolved(slotA, slotB, prevSlots[i * 2], prevSlots[i * 2 + 1])
      : false;
    out.push({ html: _bktMatchHTML(slotA, slotB, colour, active, justResolved) });
  }
  return out;
}

// Groups consecutive matches into connector-line pairs. An odd leftover
// match (any match count, not just even ones) gets the single-stub variant
// instead of a two-way bracket connector.
function _bktPairsHTML(matches) {
  let html = '';
  for (let i = 0; i < matches.length; i += 2) {
    const a = matches[i], b = matches[i + 1];
    html += '<div class="aud-bkt-pair' + (!b ? ' aud-bkt-pair-single' : '') + '">' +
      a.html + (b ? b.html : '') + '</div>';
  }
  return html;
}

function _bktColumnHTML(round, matches) {
  const colour = _bktRoundColour(round && round.roundLabel);
  const rcCls = colour ? ' aud-bkt-rc-' + colour : '';
  return '<div class="aud-bkt-col">' +
    '<div class="aud-bkt-col-label' + rcCls + '">' + ((round && round.roundLabel) || '') + '</div>' +
    '<div class="aud-bkt-matches">' + _bktPairsHTML(matches) + '</div>' +
    '</div>';
}

// ── POA-66: pool-shaped rounds ────────────────────────────────────────────
// Some competition rounds are not head-to-head. Throwdown's redemption round
// is N groups of M brewers (M organiser-configurable 2–4, default 3, with a
// possibly-smaller trailing group), each group voting for one winner. Forcing
// that through the pair-shaped path is not merely ugly — measured, at the
// default group size of 3 it DROPS a brewer outright (slots are consumed two
// at a time over floor(n/2)) and INVENTS a head-to-head between two brewers
// who were never in the same group. A pool round is therefore rendered by its
// own path: no pair grouping, no connectors, no active-glow (the glow rule is
// "both named, neither scored", which is meaningless for a pool), and never
// mirror-split — a pool is one column, not two.
//
// Opted into by `kind: 'pool'` on the round. Group membership rides on each
// slot's optional `group` key, so `round.slots` stays the one universal shape
// every round has (BRACKET-LIVE-SPEC.md §3) — a consumer that ignores `group`
// still sees every competitor. Slots with no `group` fall into a single group,
// so a flat pool is expressible too.
function _bktPoolGroups(round) {
  const slots = (round && round.slots) || [];
  const order = [], byKey = {};
  slots.forEach(function (s) {
    const g = (s && s.group != null) ? String(s.group) : '0';
    if (!byKey[g]) { byKey[g] = []; order.push(g); }
    byKey[g].push(s);
  });
  return order.map(function (k) { return byKey[k]; });
}

// One group card. A pool resolves to a single winner rather than a head-to-
// head result, so "winner" here means top score once EVERY brewer in the group
// has one — a partially-scored group stays neutral rather than crowning an
// early leader. Several brewers on the top score render as a tie, matching the
// pair path's behaviour.
function _bktPoolGroupHTML(slots, colour, justResolved) {
  // An explicit `isWinner` on any slot wins over score-derived inference. Some
  // formats resolve a tied pool OUT OF BAND — Throwdown's redemption round has
  // a tiebreaker that names a winner while leaving the votes genuinely tied —
  // and inferring from scores alone would render those groups as unresolved
  // ties, never showing who actually advanced.
  const explicit = slots.some(function (s) { return s && s.isWinner; });
  let rows;
  if (explicit) {
    rows = slots.map(function (s) { return _bktSlotHTML(s, !!(s && s.isWinner), false); }).join('');
  } else {
    // Otherwise: top score, but only once EVERY slot in the group is scored —
    // a partially-scored group stays neutral rather than crowning an early
    // leader mid-vote. Several on the top score render as a tie.
    const allScored = slots.length > 0 && slots.every(function (s) { return s && s.score != null; });
    let maxScore = null, topCount = 0;
    if (allScored) {
      maxScore = Math.max.apply(null, slots.map(function (s) { return s.score; }));
      topCount = slots.filter(function (s) { return s.score === maxScore; }).length;
    }
    rows = slots.map(function (s) {
      const isTop = allScored && s.score === maxScore;
      return _bktSlotHTML(s, isTop && topCount === 1, isTop && topCount > 1);
    }).join('');
  }
  const rcCls = colour ? ' aud-bkt-rc-' + colour : '';
  const jrCls = justResolved ? ' aud-bkt-just-resolved' : '';
  return '<div class="aud-bkt-pool-group' + rcCls + jrCls + '">' + rows + '</div>';
}

function _bktPoolColumnHTML(round, prevRound) {
  const colour = _bktRoundColour(round && round.roundLabel);
  const rcCls = colour ? ' aud-bkt-rc-' + colour : '';
  const groups = _bktPoolGroups(round);
  const prevGroups = prevRound ? _bktPoolGroups(prevRound) : null;
  const body = groups.map(function (g, i) {
    const prev = (prevGroups && prevGroups[i]) || null;
    const justResolved = prev
      ? g.some(function (s, j) { return _bktSlotChanged(s, prev[j]); })
      : false;
    return _bktPoolGroupHTML(g, colour, justResolved);
  }).join('');
  return '<div class="aud-bkt-col aud-bkt-col-pool">' +
    '<div class="aud-bkt-col-label' + rcCls + '">' + ((round && round.roundLabel) || '') + '</div>' +
    '<div class="aud-bkt-pool">' + body + '</div>' +
    '</div>';
}

function _bktIsPool(round) {
  return !!(round && round.kind === 'pool');
}

// Mirrored converging tree: every round except the last is split left/right
// by Math.ceil(matchCount/2) — a plain arithmetic split, no size branching,
// works identically whether that round's match count is even or odd. The
// last round (always exactly one Final match — guaranteed by single-
// elimination, not by bracket size) renders centered. Both sides emit their
// columns in the same round0→roundN-2 DOM order; .aud-bkt-side-right's
// row-reverse (theme.css) does the mirroring, so "toward center" is a right-
// pointing connector on the left and a left-pointing one on the right.
function _bktTreeHTML(bracketData, prevBracketData) {
  const rounds = bracketData.rounds || [];
  if (!rounds.length) return '<div class="aud-bkt-tree"></div>';

  const prevRounds = (prevBracketData && prevBracketData.rounds) || null;
  const lastIdx = rounds.length - 1;
  // A pool round is never the Final — a tournament does not end on a pool, and
  // its slot count says nothing about match count (POA-66).
  const lastIsPool = _bktIsPool(rounds[lastIdx]);
  const lastMatches = lastIsPool ? [] : _bktMatchesForRound(rounds, lastIdx, prevRounds);

  // POA-65 — the last round is THE Final only when it actually holds exactly
  // one match. The original version assumed it always was, and rendered only
  // finalMatches[0], so any caller whose last round held more silently LOST
  // the rest. That is what live (incremental) tournament state looks like:
  // rounds are generated as they are reached, so mid-event the last round is
  // the round being played, not the Final. Measured before this fix: a
  // mid-tournament bracket rendered 7 of 11 matches, and a 13-competitor
  // single-round bracket rendered 1 match and 2 of 13 names — silently, with
  // no error. When the last round holds more than one match it is now treated
  // as an ordinary mirrored round and the centre carries only the champion
  // card (or nothing).
  const lastIsFinal = !lastIsPool && lastMatches.length === 1;
  const sideCount = lastIsFinal ? lastIdx : rounds.length;

  let leftHTML = '', rightHTML = '';
  for (let r = 0; r < sideCount; r++) {
    const round = rounds[r];
    // POA-66 — a pool is one column, emitted once. Same no-mirror-split
    // treatment as a single-match round below, for the same reason: the split
    // would otherwise manufacture an empty labelled twin.
    if (_bktIsPool(round)) {
      leftHTML += _bktPoolColumnHTML(round, prevRounds ? prevRounds[r] : null);
      continue;
    }
    const matches = _bktMatchesForRound(rounds, r, prevRounds);
    if (!matches.length) continue; // nothing to draw — never emit a bare label
    // POA-67 — a round holding a single match must not mirror-split. The old
    // unconditional ceil(n/2) split gave such a round one populated column and
    // one EMPTY, still-labelled twin on the opposite side, which reads as a
    // rendering bug on a projector. Bites 3rd Place, which advanceBracket()
    // pushes before the Final as a non-final round of exactly one match.
    if (matches.length === 1) {
      leftHTML += _bktColumnHTML(round, matches);
      continue;
    }
    const leftCount = Math.ceil(matches.length / 2);
    leftHTML  += _bktColumnHTML(round, matches.slice(0, leftCount));
    rightHTML += _bktColumnHTML(round, matches.slice(leftCount));
  }

  const champHTML = bracketData.champion
    ? '<div class="aud-bkt-champion-card"><div class="aud-bkt-champion-label">🏆 Champion</div>' +
      '<div class="aud-bkt-champion-name">' + bracketData.champion + '</div></div>'
    : '';

  // Centre exists only when there is something to put in it — a real Final,
  // a champion card, or both. An always-emitted centre would otherwise hold a
  // 220px dead column mid-tournament.
  let centerHTML = '';
  if (lastIsFinal) {
    const finalRound = rounds[lastIdx];
    centerHTML =
      '<div class="aud-bkt-center">' +
        '<div class="aud-bkt-col-label aud-bkt-rc-green">' + ((finalRound && finalRound.roundLabel) || 'Final') + '</div>' +
        lastMatches[0].html +
        champHTML +
      '</div>';
  } else if (champHTML) {
    centerHTML = '<div class="aud-bkt-center">' + champHTML + '</div>';
  }

  return '<div class="aud-bkt-tree">' +
    '<div class="aud-bkt-side aud-bkt-side-left">' + leftHTML + '</div>' +
    centerHTML +
    '<div class="aud-bkt-side aud-bkt-side-right">' + rightHTML + '</div>' +
    '</div>';
}

// Fixed 16:9 stage (1920x1080), scale-to-fit whatever size the caller's
// container currently is — no responsive/mobile breakpoint, per the handoff
// (this is a fixed large-display context only). Keyed by container, not by
// the stage element itself, since renderBracketTree() fully replaces
// container's children (including the stage) on every call — the container
// is the one element that stays stable across repeated calls, so a single
// ResizeObserver per container (not recreated each render) can keep
// rescaling whichever stage element currently exists inside it.
let _bktObservers = new WeakMap();

// Previous call's bracketData per container — the source snapshot the
// just-resolved flash (_bktMatchJustResolved above) diffs against. Also
// container-keyed for the same reason as _bktObservers: a container can be
// rendered into repeatedly, and each call needs to know what the container
// looked like last time, not what any OTHER container looked like.
let _bktPrevData = new WeakMap();

function _bktApplyScale(container) {
  const stageEl = container.querySelector('.aud-bkt-stage');
  if (!stageEl) return;
  const w = container.clientWidth, h = container.clientHeight;
  if (!w || !h) return;
  const scale = Math.min(w / 1920, h / 1080);
  stageEl.style.setProperty('--bkt-scale', scale);
}

// Branded identity block — gated on bracket_branding, same two-layer
// AND-pattern as Audience.show()'s own MUA-04 band (options-level intent
// flag AND a runtime Gates check). Per BRACKET-LIVE-SPEC.md §2E, eventName
// itself is part of the gated block here (not just logo/subtitle/date/venue
// like PdfExport's fallbackTitle pattern) — unbranded always shows the
// constant "Seduh Score" title, never the real event name.
function _bktHeaderHTML(bracketData, options) {
  options = options || {};
  // `options.branded` is an INSTRUCTION, not a request to be validated.
  // Entitlement is a caller concern; this is a renderer.
  //
  // This previously AND-ed in Gates.canAccess('bracket_branding'), which was
  // unbuildable for the surfaces this renderer actually serves: both viewer
  // pages are unauthenticated by design (a projector and a public summary have
  // nobody to log in), Gates defaults to 'community' and only leaves it in
  // Gates.init() — which runs on auth. So the gate resolved to false on every
  // viewer forever, and a paying org's branding could never render. Measured
  // both sides in one run: organiser signed in at per_event -> allowed:true;
  // viewer on the same document -> allowed:false.
  //
  // Entitlement is now decided where the tier is knowable — the organiser
  // evaluates the gate at "Start remote display" and writes `branded` into
  // throwdown_live/{orgId} alongside the branding fields it governs. See
  // BRACKET-LIVE-SPEC.md §2E.
  const showBrand = !!options.branded;

  const name = (showBrand && bracketData.eventName) ? bracketData.eventName : 'Seduh Score';
  const logo = (showBrand && bracketData.logoUrl)
    ? '<img class="aud-bkt-hdr-logo" src="' + bracketData.logoUrl + '" alt="">'
    : '';
  const metaParts = showBrand
    ? [bracketData.eventSubtitle, bracketData.eventDate, bracketData.eventVenue].filter(Boolean)
    : [];
  const meta = metaParts.length
    ? '<div class="aud-bkt-hdr-meta">' + metaParts.join(' · ') + '</div>'
    : '';

  return '<div class="aud-bkt-hdr">' +
    logo +
    '<div class="aud-bkt-hdr-id">' +
      '<div class="aud-bkt-hdr-sub">Seduh Score · Live Bracket</div>' +
      '<div class="aud-bkt-hdr-name">' + name + '</div>' +
      meta +
    '</div>' +
    '<div class="aud-bkt-hdr-live"><span class="dot"></span>Live</div>' +
    '</div>';
}

// champMode:'podium' full takeover — mirrors the existing #aud-podium-panel
// precedent exactly: an absolutely-positioned panel that covers the entire
// stage (including the header), toggled by presence/class rather than a
// separate render path. The underlying tree is still built and still
// updates _bktPrevData even when covered, so switching back to
// champMode:'tree' on a later call continues the just-resolved diff from
// the real state, not a stale one. Two tiles, not three — this data shape
// only carries champion/runnerUp, unlike the 3-rank organiser podium.
function _bktPodiumHTML(bracketData) {
  const champ = bracketData.champion || '—';
  const runnerUp = bracketData.runnerUp || '—';
  return '<div class="aud-bkt-podium-panel show">' +
    '<div class="aud-bkt-podium-stage">' +
      '<div class="aud-bkt-podium-tile">' +
        '<div class="aud-bkt-podium-label">Runner-Up</div>' +
        '<div class="aud-bkt-podium-name">' + runnerUp + '</div>' +
      '</div>' +
      '<div class="aud-bkt-podium-tile aud-bkt-podium-champ">' +
        '<div class="aud-bkt-podium-label">🏆 Champion</div>' +
        '<div class="aud-bkt-podium-name">' + champ + '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

Audience.renderBracketTree = function(container, bracketData, options) {
  options = options || {};
  if (!container || !bracketData) return;
  const theme = options.theme === 'light' ? 'light' : 'dark';
  const prevData = _bktPrevData.get(container) || null;

  const podiumHTML = options.champMode === 'podium' ? _bktPodiumHTML(bracketData) : '';

  container.innerHTML =
    '<div class="aud-bkt-viewport"><div class="aud-bkt-stage aud-bkt-theme-' + theme + '">' +
      _bktHeaderHTML(bracketData, options) +
      _bktTreeHTML(bracketData, prevData) +
      podiumHTML +
    '</div></div>';

  _bktPrevData.set(container, bracketData);

  _bktApplyScale(container); // synchronous — correct scale before first paint, don't wait on the observer's first callback

  let ro = _bktObservers.get(container);
  if (!ro) {
    ro = new ResizeObserver(() => _bktApplyScale(container));
    ro.observe(container);
    _bktObservers.set(container, ro);
  }
};
