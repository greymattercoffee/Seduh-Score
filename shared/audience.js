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
