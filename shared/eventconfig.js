// shared/eventconfig.js — Seduh Score organiser event config component
// v5.2.0 (MUA-02). API: EventConfig.mount() / writeHandoff() / getAccent() / applyToModule()

(function() {
  const ACCENTS = [
    { name: 'Seduh Amber', hex: '#b45309' },
    { name: 'Espresso',    hex: '#1c1917' },
    { name: 'Slate',       hex: '#475569' },
    { name: 'Cobalt',      hex: '#1d4ed8' },
    { name: 'Emerald',     hex: '#047857' },
    { name: 'Ruby',        hex: '#b91c1c' },
    { name: 'Midnight',    hex: '#312e81' },
    { name: 'Copper',      hex: '#c2410c' },
    { name: 'Matcha',      hex: '#4d7c0f' },
    { name: 'Alien',       hex: '#84cc16' },
  ];

  let _accent        = '#b45309';
  let _logoUrl       = null;
  let _bgColor       = null;
  let _eventName     = '';
  let _eventSubtitle = '';
  let _mounted       = false;

  function _readDashboard() {
    try { return JSON.parse(localStorage.getItem('seduh_event_v1') || '{}'); } catch(e) { return {}; }
  }

  function _saveToDashboard(updates) {
    try {
      const current = JSON.parse(localStorage.getItem('seduh_event_v1') || '{}');
      Object.keys(updates).forEach(function(k) { current[k] = updates[k]; });
      localStorage.setItem('seduh_event_v1', JSON.stringify(current));
    } catch(e) {}
  }

  function _esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function _buildSwatches(currentValue, withNone) {
    let out = '';
    if (withNone) {
      const active = currentValue === null ? ' ec-swatch--active' : '';
      out += '<button class="ec-swatch ec-swatch--none' + active + '" data-hex="null" title="No colour" type="button">–</button>';
    }
    out += ACCENTS.map(function(a) {
      const active = a.hex === currentValue ? ' ec-swatch--active' : '';
      return '<button class="ec-swatch' + active + '"'
        + ' style="background:' + a.hex + '"'
        + ' data-hex="' + a.hex + '"'
        + ' title="' + a.name + '"'
        + ' type="button"></button>';
    }).join('');
    return out;
  }

  function _injectStyles() {
    if (document.getElementById('ec-styles')) return;
    const style = document.createElement('style');
    style.id = 'ec-styles';
    style.textContent = [
      '.ec-wrap{display:flex;flex-direction:column;gap:var(--space-5);margin-top:var(--space-4)}',
      '.ec-section{display:flex;flex-direction:column;gap:var(--space-2)}',
      '.ec-label{font-size:var(--fs-sm);font-weight:var(--fw-medium);color:var(--txt2)}',
      '.ec-input{width:100%;padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--rad-s);font-size:var(--fs-body);color:var(--txt);background:var(--surface);outline:none;box-sizing:border-box;transition:border-color .14s}',
      '.ec-input:focus{border-color:var(--accent)}',
      '.ec-swatches{display:flex;flex-wrap:wrap;gap:var(--space-2)}',
      '.ec-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:transform .15s,border-color .15s;padding:0}',
      '.ec-swatch:hover{transform:scale(1.15)}',
      '.ec-swatch--active{border-color:var(--txt)}',
      '.ec-swatch--none{background:var(--surface);border:2px dashed var(--border2);font-size:12px;color:var(--txt3);display:inline-flex;align-items:center;justify-content:center;line-height:1}',
      '.ec-upload-btn{display:inline-flex;align-items:center;cursor:pointer}',
      '.ec-logo-preview{display:flex;align-items:center;gap:var(--space-3);margin-top:var(--space-2)}',
      '.ec-logo-img{max-height:48px;object-fit:contain;border-radius:var(--rad-xs)}',
      '.ec-logo-error{font-size:var(--fs-sm);color:var(--rd);margin-top:var(--space-1)}',
    ].join('');
    document.head.appendChild(style);
  }

  function _render(container) {
    container.innerHTML = '<div class="ec-wrap">'
      + '<div class="ec-section">'
      + '<label class="ec-label" for="ec-name">Competition name</label>'
      + '<input class="ec-input" id="ec-name" type="text" placeholder="e.g. Girls Got Drip Vol. 2" value="' + _esc(_eventName) + '">'
      + '</div>'
      + '<div class="ec-section">'
      + '<label class="ec-label" for="ec-subtitle">Subtitle</label>'
      + '<input class="ec-input" id="ec-subtitle" type="text" placeholder="Category | City Year" value="' + _esc(_eventSubtitle) + '">'
      + '</div>'
      + '<div class="ec-section">'
      + '<div class="ec-label">Accent colour</div>'
      + '<div class="ec-swatches" id="ec-accent-swatches">' + _buildSwatches(_accent, false) + '</div>'
      + '</div>'
      + '<div class="ec-section">'
      + '<div class="ec-label">Band background</div>'
      + '<div class="ec-swatches" id="ec-bg-swatches">' + _buildSwatches(_bgColor, true) + '</div>'
      + '</div>'
      + '<div class="ec-section">'
      + '<div class="ec-label">Event logo</div>'
      + '<label class="ec-upload-btn btn-o" role="button">Upload logo'
      + '<input type="file" accept=".png,.jpg,.jpeg,.svg" hidden>'
      + '</label>'
      + '<div class="ec-logo-preview"' + (_logoUrl ? '' : ' hidden') + '>'
      + '<img class="ec-logo-img"' + (_logoUrl ? ' src="' + _logoUrl + '"' : '') + ' alt="Event logo preview" style="' + (_logoUrl ? 'display:inline-block' : 'display:none') + '">'
      + '<button class="ec-logo-clear btn-o btn-rd" type="button">Remove</button>'
      + '</div>'
      + '<p class="ec-logo-error" hidden></p>'
      + '</div>'
      + '</div>';
  }

  function _bindEvents(container) {
    const nameInput = container.querySelector('#ec-name');
    nameInput.addEventListener('input', function() {
      _eventName = nameInput.value;
      _saveToDashboard({ eventName: _eventName });
      EventConfig.applyToModule();
      EventConfig.writeHandoff();
    });

    const subtitleInput = container.querySelector('#ec-subtitle');
    subtitleInput.addEventListener('input', function() {
      _eventSubtitle = subtitleInput.value;
      _saveToDashboard({ eventSubtitle: _eventSubtitle });
      EventConfig.applyToModule();
      EventConfig.writeHandoff();
    });

    container.querySelector('#ec-accent-swatches').querySelectorAll('.ec-swatch').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _accent = btn.dataset.hex;
        container.querySelector('#ec-accent-swatches').querySelectorAll('.ec-swatch').forEach(function(b) {
          b.classList.toggle('ec-swatch--active', b.dataset.hex === _accent);
        });
        _saveToDashboard({ accent: _accent });
        EventConfig.applyToModule();
        EventConfig.writeHandoff();
      });
    });

    container.querySelector('#ec-bg-swatches').querySelectorAll('.ec-swatch').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _bgColor = btn.dataset.hex === 'null' ? null : btn.dataset.hex;
        const bgVal = _bgColor;
        container.querySelector('#ec-bg-swatches').querySelectorAll('.ec-swatch').forEach(function(b) {
          const bVal = b.dataset.hex === 'null' ? null : b.dataset.hex;
          b.classList.toggle('ec-swatch--active', bVal === bgVal);
        });
        _saveToDashboard({ bgColor: _bgColor });
        EventConfig.applyToModule();
        EventConfig.writeHandoff();
      });
    });

    const fileInput = container.querySelector('input[type="file"]');
    const preview   = container.querySelector('.ec-logo-preview');
    const img       = container.querySelector('.ec-logo-img');
    const clearBtn  = container.querySelector('.ec-logo-clear');
    const errorEl   = container.querySelector('.ec-logo-error');

    fileInput.addEventListener('change', function() {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const result = e.target.result;
        if (result.length > 350 * 1024) {
          errorEl.textContent = 'Logo file is too large. Maximum 350KB.';
          errorEl.hidden = false;
          fileInput.value = '';
          return;
        }
        errorEl.hidden = true;
        _logoUrl = result;
        img.src = result;
        img.style.display = 'inline-block';
        preview.hidden = false;
        EventConfig.applyToModule();
        EventConfig.writeHandoff();
      };
      reader.readAsDataURL(file);
    });

    clearBtn.addEventListener('click', function() {
      _logoUrl = null;
      img.src = '';
      img.style.display = 'none';
      preview.hidden = true;
      fileInput.value = '';
      errorEl.hidden = true;
      EventConfig.applyToModule();
      EventConfig.writeHandoff();
    });
  }

  window.EventConfig = {
    mount: function(selector, options) {
      options = options || {};
      const container = document.querySelector(selector);
      if (!container) return;

      // restore from localStorage (persistent across sessions)
      const ds = _readDashboard();
      _accent        = options.defaultAccent || ds.accent || '#b45309';
      _bgColor       = ds.bgColor !== undefined ? ds.bgColor : null;
      _eventName     = ds.eventName     || '';
      _eventSubtitle = ds.eventSubtitle || '';
      _logoUrl       = null; // logo is session-only — blob URLs are ephemeral

      // sessionStorage handoff — upgrade v1 → v2, or restore accent/logo from current session
      try {
        const h = JSON.parse(sessionStorage.getItem('seduh_handoff') || '{}');
        if (h.v === 1) {
          // upgrade in-place to v2; old accent + logoUrl survive
          const v2 = {
            v:             2,
            accent:        h.accent  || _accent,
            logoUrl:       h.logoUrl || null,
            bgColor:       _bgColor,
            eventName:     _eventName,
            eventSubtitle: _eventSubtitle,
            eventDate:     ds.eventDate  || '',
            eventVenue:    ds.eventVenue || '',
          };
          sessionStorage.setItem('seduh_handoff', JSON.stringify(v2));
          if (h.accent)  _accent  = h.accent;
          if (h.logoUrl) _logoUrl = h.logoUrl;
        } else if (h.v === 2) {
          // trust session values for accent and logo
          if (h.accent)  _accent  = h.accent;
          if (h.logoUrl) _logoUrl = h.logoUrl;
        }
      } catch(e) {}

      _injectStyles();
      _render(container);
      _bindEvents(container);
      _mounted = true;
      EventConfig.applyToModule();
    },

    writeHandoff: function() {
      try {
        const ds = _readDashboard();
        sessionStorage.setItem('seduh_handoff', JSON.stringify({
          v:             2,
          accent:        _accent,
          logoUrl:       _logoUrl,
          bgColor:       _bgColor,
          eventName:     _eventName,
          eventSubtitle: _eventSubtitle,
          eventDate:     ds.eventDate  || '',
          eventVenue:    ds.eventVenue || '',
        }));
      } catch(e) {}
    },

    getAccent: function() {
      return _accent;
    }
  };

  window.EventConfig.applyToModule = function() {
    // accent
    if (_accent) {
      document.documentElement.style.setProperty('--accent', _accent);
      document.documentElement.style.setProperty('--am', _accent);
    } else {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--am');
    }
    // event band background colour — consumed by .event-band via var(--event-bg, transparent)
    if (_bgColor) {
      document.documentElement.style.setProperty('--event-bg', _bgColor);
    } else {
      document.documentElement.style.removeProperty('--event-bg');
    }
    // logo URL as CSS variable
    if (_logoUrl) {
      document.documentElement.style.setProperty('--event-logo-url', _logoUrl);
    } else {
      document.documentElement.style.removeProperty('--event-logo-url');
    }
    // populate event band DOM slot
    const band = document.getElementById('event-band');
    if (band) {
      if (_eventName) {
        const logoHtml = _logoUrl
          ? '<img class="eb-logo" src="' + _logoUrl + '" alt="' + _esc(_eventName) + ' logo">'
          : '';
        const subtitleHtml = _eventSubtitle
          ? '<div class="eb-sub">' + _esc(_eventSubtitle) + '</div>'
          : '';
        const ds = _readDashboard();
        const metaParts = [ds.eventDate || '', ds.eventVenue || ''].filter(Boolean);
        const metaHtml = metaParts.length
          ? '<div class="eb-meta">' + _esc(metaParts.join(' · ')) + '</div>'
          : '';
        band.innerHTML = logoHtml
          + '<div class="eb-text">'
          + '<div class="eb-name">' + _esc(_eventName) + '</div>'
          + subtitleHtml
          + metaHtml
          + '</div>';
        band.removeAttribute('data-empty');
      } else {
        band.innerHTML = '';
        band.setAttribute('data-empty', '');
      }
    }
  };
})();
