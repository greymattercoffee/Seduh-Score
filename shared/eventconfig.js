// shared/eventconfig.js — Seduh Score organiser event config component
// v4.7.0 (POA-17 Phase A). API: EventConfig.mount() / writeHandoff() / getAccent()

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

  let _accent = '#b45309';
  let _logoUrl = null;
  let _mounted = false;

  function _injectStyles() {
    if (document.getElementById('ec-styles')) return;
    const style = document.createElement('style');
    style.id = 'ec-styles';
    style.textContent = [
      '.ec-wrap{display:flex;flex-direction:column;gap:var(--space-5);margin-top:var(--space-4)}',
      '.ec-section{display:flex;flex-direction:column;gap:var(--space-2)}',
      '.ec-label{font-size:var(--fs-sm);font-weight:var(--fw-medium);color:var(--txt2)}',
      '.ec-swatches{display:flex;flex-wrap:wrap;gap:var(--space-2)}',
      '.ec-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:transform .15s,border-color .15s;padding:0}',
      '.ec-swatch:hover{transform:scale(1.15)}',
      '.ec-swatch--active{border-color:var(--txt)}',
      '.ec-upload-btn{display:inline-flex;align-items:center;cursor:pointer}',
      '.ec-logo-preview{display:flex;align-items:center;gap:var(--space-3);margin-top:var(--space-2)}',
      '.ec-logo-img{max-height:48px;object-fit:contain;border-radius:var(--rad-xs)}',
      '.ec-logo-error{font-size:var(--fs-sm);color:var(--rd);margin-top:var(--space-1)}',
    ].join('');
    document.head.appendChild(style);
  }

  function _render(container) {
    const swatches = ACCENTS.map(function(a) {
      const active = a.hex === _accent ? ' ec-swatch--active' : '';
      return '<button class="ec-swatch' + active + '"'
        + ' style="background:' + a.hex + '"'
        + ' data-hex="' + a.hex + '"'
        + ' title="' + a.name + '"'
        + ' type="button"></button>';
    }).join('');

    container.innerHTML = '<div class="ec-wrap">'
      + '<div class="ec-section">'
      + '<div class="ec-label">Accent colour</div>'
      + '<div class="ec-swatches">' + swatches + '</div>'
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
    container.querySelectorAll('.ec-swatch').forEach(function(btn) {
      btn.addEventListener('click', function() {
        _accent = btn.dataset.hex;
        container.querySelectorAll('.ec-swatch').forEach(function(b) {
          b.classList.toggle('ec-swatch--active', b.dataset.hex === _accent);
        });
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
      _accent  = options.defaultAccent || '#b45309';
      _logoUrl = null;
      try {
        const h = JSON.parse(sessionStorage.getItem('seduh_handoff') || '{}');
        if (h.v === 1) {
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
        sessionStorage.setItem('seduh_handoff', JSON.stringify({
          v: 1,
          accent:  _accent,
          logoUrl: _logoUrl,
        }));
      } catch(e) {}
    },

    getAccent: function() {
      return _accent;
    }
  };

  window.EventConfig.applyToModule = function() {
    if (_accent) {
      document.documentElement.style.setProperty('--accent', _accent);
      document.documentElement.style.setProperty('--am', _accent);
    } else {
      document.documentElement.style.removeProperty('--accent');
      document.documentElement.style.removeProperty('--am');
    }
    // Logo slot deferred to Design session — remove for now
    // const logo = document.getElementById('mod-org-logo');
    // const divider = document.getElementById('mod-org-divider');
    // if (logo) { ... }
  };
})();
