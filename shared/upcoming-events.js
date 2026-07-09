// shared/upcoming-events.js — Seduh Score shared upcoming/recent events carousel
// v5.5.2 (POA-42 Part B). API: UpcomingEvents.mount(selector, options)
//
// Extracted from coming-soon/index.html's original inline carousel (v5.3.1+).
// Consumers: coming-soon/index.html (media:'photo'), index.html front-page
// banner (media:'icon'). Both read the same Firestore `upcoming_events`
// collection through this one module — no independent copies to drift.

(function() {
  const CACHE_KEY = 'seduh_upcoming_events_cache';
  const ROTATE_MS = 5000;
  const WINDOW_DAYS = 10;
  const QUERY_LIMIT = 5;

  // Deviation from POA-42-PART-B-CODE-HANDOFF.md: the brief calls for a new
  // `format` field, but the admin panel already writes `eventFormat` for this
  // exact fact (throwdown/liga/cup-taster, hyphenated). Adding a second field
  // for the same value would just create a new drift source, so this module
  // reads/writes `eventFormat` — the existing field — and adds a `btc` option
  // to it rather than introducing a parallel `format` field.
  //
  // BTC colour: purple (--pu). Doesn't collide with the locked semantic
  // contract (blue=rounds, green=completion/winners, purple=redemption,
  // red=destructive/ties, amber=brand) — purple's only existing UI meaning is
  // Throwdown's redemption feature and demo-mode flag, a different surface
  // entirely from an event-listing badge. Icon uses 👥 (team) rather than ☕,
  // which is already claimed by Cup Taster in this same rotation.
  const FORMAT_META = {
    'throwdown':  { label: 'Throwdown',  cls: 'fmt-am', icon: '⚡', color: 'var(--am)', bg: 'var(--am-bg)', bd: 'var(--am-bd)' },
    'liga':       { label: 'Liga',       cls: 'fmt-gn', icon: '🏆', color: 'var(--gn)', bg: 'var(--gn-bg)', bd: 'var(--gn-bd)' },
    'cup-taster': { label: 'Cup Taster', cls: 'fmt-bl', icon: '☕', color: 'var(--bl)', bg: 'var(--bl-bg)', bd: 'var(--bl-bd)' },
    'btc':        { label: 'BTC',        cls: 'fmt-pu', icon: '👥', color: 'var(--pu)', bg: 'var(--pu-bg)', bd: 'var(--pu-bd)' },
  };
  const DEFAULT_FORMAT_META = { label: 'Event', cls: 'fmt-am', icon: '☕', color: 'var(--am)', bg: 'var(--am-bg)', bd: 'var(--am-bd)' };

  function fmtMeta(ev) {
    return FORMAT_META[ev && ev.eventFormat] || DEFAULT_FORMAT_META;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return esc(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Brunei' }) + ' BNT';
  }

  function isPast(ev) {
    const d = new Date(ev && ev.eventDate);
    return !isNaN(d) && d.getTime() < Date.now();
  }

  function kickerLabel(ev) {
    return isPast(ev) ? 'Recently on Seduh Score' : 'Upcoming on Seduh Score';
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function saveCache(list) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ events: list, cachedAt: Date.now() })); } catch {}
  }

  function injectStyles() {
    if (document.getElementById('ue-styles')) return;
    const style = document.createElement('style');
    style.id = 'ue-styles';
    style.textContent = [
      // shared
      '.ue-offline{display:none;margin:var(--space-4) 0 0;padding:8px 14px;background:var(--surface2);border:1.5px solid var(--border);border-radius:var(--rad-pill);font-family:var(--font-mono);font-size:var(--fs-xs);color:var(--txt3);max-width:fit-content}',
      '.ue-empty{color:var(--txt3);font-family:var(--font-mono);font-size:var(--fs-xs)}',

      // media:'photo' — coming-soon carousel card
      '.ue-photo-wrap{position:relative;max-width:var(--container-narrow);margin:0 auto}',
      '.ue-slide{opacity:0;transition:opacity .8s ease}',
      '.ue-slide.ue-active{opacity:1}',
      '.ue-slide-image{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:var(--rad);background:var(--surface2);display:block;box-shadow:var(--shadow-sm)}',
      '.ue-slide-image-empty{display:flex;align-items:center;justify-content:center;color:var(--txt3);font-family:var(--font-mono);font-size:var(--fs-xs)}',
      '.ue-slide-content{padding:var(--space-5) 0}',
      '.ue-kicker{font-family:var(--font-mono);font-size:var(--fs-xs);font-weight:var(--fw-bold);text-transform:uppercase;letter-spacing:var(--ls-label);color:var(--txt3);margin-bottom:var(--space-2)}',
      '.ue-format-badge{display:inline-block;padding:4px 12px;border-radius:var(--rad-pill);font-family:var(--font-mono);font-size:var(--fs-xs);font-weight:var(--fw-bold);text-transform:uppercase;letter-spacing:var(--ls-label);border:1.5px solid;margin-bottom:var(--space-3)}',
      '.ue-format-badge.fmt-am{background:var(--am-bg);border-color:var(--am-bd);color:var(--am)}',
      '.ue-format-badge.fmt-gn{background:var(--gn-bg);border-color:var(--gn-bd);color:var(--gn)}',
      '.ue-format-badge.fmt-bl{background:var(--bl-bg);border-color:var(--bl-bd);color:var(--bl)}',
      '.ue-format-badge.fmt-pu{background:var(--pu-bg);border-color:var(--pu-bd);color:var(--pu)}',
      '.ue-event-name{font-family:var(--font-display);font-weight:var(--fw-extrabold);font-size:var(--fs-display);color:var(--txt);letter-spacing:var(--ls-tight);line-height:var(--lh-snug);margin-bottom:var(--space-2)}',
      '.ue-event-date,.ue-event-venue{font-size:var(--fs-body);color:var(--txt2)}',
      '.ue-description{font-size:var(--fs-body);color:var(--txt3);margin-top:var(--space-3);line-height:var(--lh-body)}',
      '.ue-timer-bar{height:3px;background:var(--border);border-radius:var(--rad-pill);overflow:hidden;margin-top:var(--space-5)}',
      '.ue-timer-bar-fill{height:100%;width:0%;background:var(--am)}',
      '.ue-controls{display:flex;align-items:center;justify-content:center;gap:var(--space-4);padding:var(--space-4) 0 var(--space-2)}',
      '.ue-btn-nav{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--border);background:var(--surface);color:var(--txt2);font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .14s,color .14s}',
      '.ue-btn-nav:hover{border-color:var(--am-bd);color:var(--am)}',
      '.ue-counter{font-family:var(--font-mono);font-size:var(--fs-sm);color:var(--txt3);min-width:44px;text-align:center}',

      // media:'icon' — full-bleed front-page banner
      '.ue-icon-wrap{position:relative;overflow:hidden}',
      '.ue-icon-slide{display:none;align-items:center;gap:20px;flex-wrap:wrap}',
      '.ue-icon-slide.ue-active{display:flex}',
      '.ue-icon-swatch{width:56px;height:56px;border-radius:var(--rad-s);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0}',
      '.ue-icon-main{min-width:0;flex:1}',
      '.ue-icon-kicker{display:flex;align-items:center;gap:8px;margin-bottom:6px}',
      '.ue-icon-dot{width:8px;height:8px;border-radius:50%;background:var(--gn);box-shadow:0 0 0 3px var(--gn-bg)}',
      '.ue-icon-name{font-family:var(--font-display);font-weight:800;font-size:clamp(20px,2.6vw,28px);letter-spacing:-.02em;line-height:1.05;color:var(--ink)}',
      '.ue-icon-meta{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:8px;font-size:13px;font-weight:600;color:var(--ink2)}',
      '.ue-icon-side{display:flex;align-items:center;gap:14px;flex-shrink:0;margin-left:auto}',
      '.ue-dots{display:flex;gap:6px}',
      '.ue-dot{width:7px;height:7px;border-radius:50%;background:var(--border2);border:none;cursor:pointer;padding:0}',
      '.ue-dot.ue-active{background:var(--accent)}',
      '@media(max-width:600px){.ue-icon-side{margin-left:0;width:100%;justify-content:space-between}}',
    ].join('');
    document.head.appendChild(style);
  }

  function makeInstance(container, options) {
    const media = options.media === 'icon' ? 'icon' : 'photo';
    const onEventClick = typeof options.onEventClick === 'function' ? options.onEventClick : function() {};

    let events = [];
    let idx = 0;
    let autoTimer = null;
    let unsubscribe = null;

    const offlineEl = document.createElement('div');
    offlineEl.className = 'ue-offline';
    const bodyEl = document.createElement('div');
    container.innerHTML = '';
    container.appendChild(offlineEl);
    container.appendChild(bodyEl);

    function showOffline(stale) {
      offlineEl.style.display = 'block';
      offlineEl.textContent = stale
        ? 'Offline mode — showing cached events (may be outdated)'
        : 'Offline mode — showing cached events';
    }
    function hideOffline() { offlineEl.style.display = 'none'; }

    function renderEmpty(msg) {
      bodyEl.innerHTML = '<div class="ue-empty">' + esc(msg) + '</div>';
    }

    function runFill() {
      const fill = bodyEl.querySelector('.ue-timer-bar-fill');
      if (!fill) return;
      fill.style.transition = 'none';
      fill.style.width = '0%';
      void fill.offsetWidth; // force reflow so the transition below restarts cleanly
      fill.style.transition = 'width ' + (ROTATE_MS / 1000) + 's linear';
      fill.style.width = '100%';
    }

    function renderPhoto(fade) {
      const ev = events[idx];
      const meta = fmtMeta(ev);
      const html =
        '<div class="ue-photo-wrap">' +
          '<div class="ue-slide ue-active">' +
            (ev.imageUrl
              ? '<img class="ue-slide-image" src="' + esc(ev.imageUrl) + '" alt="">'
              : '<div class="ue-slide-image ue-slide-image-empty">☕ Image coming soon</div>') +
            '<div class="ue-slide-content">' +
              '<div class="ue-kicker">' + esc(kickerLabel(ev)) + '</div>' +
              '<div class="ue-format-badge ' + meta.cls + '">' + esc(meta.label) + '</div>' +
              '<div class="ue-event-name">' + esc(ev.eventName) + '</div>' +
              '<div class="ue-event-date">' + formatDate(ev.eventDate) + '</div>' +
              '<div class="ue-event-venue">' + esc(ev.eventVenue) + '</div>' +
              (ev.eventDescription ? '<div class="ue-description">' + esc(ev.eventDescription) + '</div>' : '') +
              '<div class="ue-timer-bar"><div class="ue-timer-bar-fill"></div></div>' +
            '</div>' +
          '</div>' +
          (events.length > 1
            ? '<div class="ue-controls">' +
                '<button class="ue-btn-nav" id="ue-prev" aria-label="Previous event">‹</button>' +
                '<span class="ue-counter">' + (idx + 1) + ' / ' + events.length + '</span>' +
                '<button class="ue-btn-nav" id="ue-next" aria-label="Next event">›</button>' +
              '</div>'
            : '') +
        '</div>';

      const apply = () => {
        bodyEl.innerHTML = html;
        runFill();
        const prev = bodyEl.querySelector('#ue-prev');
        const next = bodyEl.querySelector('#ue-next');
        if (prev) prev.addEventListener('click', () => goTo(idx - 1));
        if (next) next.addEventListener('click', () => goTo(idx + 1));
      };

      const existing = bodyEl.querySelector('.ue-slide');
      if (fade && existing) {
        existing.style.opacity = '0';
        setTimeout(apply, 300);
      } else {
        apply();
      }
    }

    function renderIcon() {
      const html = events.map((ev, i) => {
        const meta = fmtMeta(ev);
        const metaParts = [formatDate(ev.eventDate), ev.eventVenue].filter(Boolean);
        return '<div class="ue-icon-slide' + (i === idx ? ' ue-active' : '') + '">' +
          '<div class="ue-icon-swatch" style="background:' + meta.bg + ';color:' + meta.color + ';border:1.5px solid ' + meta.bd + '">' + meta.icon + '</div>' +
          '<div class="ue-icon-main">' +
            '<div class="ue-icon-kicker"><span class="ue-icon-dot"></span><span class="eyebrow">' + esc(kickerLabel(ev)) + '</span></div>' +
            '<div class="ue-icon-name">' + esc(ev.eventName) + '</div>' +
            (metaParts.length ? '<div class="ue-icon-meta">' + metaParts.map(esc).join(' · ') + '</div>' : '') +
          '</div>' +
          '<div class="ue-icon-side">' +
            '<span class="ue-format-badge ' + meta.cls + '">' + esc(meta.label) + '</span>' +
            (events.length > 1
              ? '<div class="ue-dots">' + events.map((_, j) =>
                  '<button class="ue-dot' + (j === idx ? ' ue-active' : '') + '" data-i="' + j + '" aria-label="Go to event ' + (j + 1) + '"></button>'
                ).join('') + '</div>'
              : '') +
          '</div>' +
        '</div>';
      }).join('');

      bodyEl.innerHTML = '<div class="ue-icon-wrap">' + html + '</div>';
      bodyEl.querySelectorAll('.ue-icon-slide').forEach((slide, i) => {
        slide.addEventListener('click', e => {
          if (e.target.closest('.ue-dot')) return;
          onEventClick(events[i]);
        });
      });
      bodyEl.querySelectorAll('.ue-dot').forEach(dot => {
        dot.addEventListener('click', e => {
          e.stopPropagation();
          goTo(Number(dot.dataset.i));
        });
      });
    }

    function renderSlide(fade) {
      if (!events.length) { renderEmpty('No upcoming events yet — check back soon.'); return; }
      if (media === 'photo') renderPhoto(fade);
      else renderIcon();
    }

    function scheduleAuto() {
      clearTimeout(autoTimer);
      if (events.length <= 1) return;
      autoTimer = setTimeout(() => goTo(idx + 1), ROTATE_MS);
    }

    function goTo(newIdx) {
      if (!events.length) return;
      idx = ((newIdx % events.length) + events.length) % events.length;
      renderSlide(true);
      scheduleAuto();
    }

    function applyEvents(list, fromCache) {
      events = list;
      idx = 0;
      renderSlide(false);
      scheduleAuto();
      if (fromCache) {
        const cache = loadCache();
        const stale = !!(cache && (Date.now() - cache.cachedAt > 60 * 60 * 1000));
        showOffline(stale);
      } else {
        hideOffline();
      }
    }

    function fallbackToCache(reason) {
      const cache = loadCache();
      if (cache && Array.isArray(cache.events) && cache.events.length) {
        applyEvents(cache.events, true);
      } else {
        renderEmpty(reason);
        hideOffline();
      }
    }

    function onKeydown(e) {
      if (e.key === 'ArrowLeft') goTo(idx - 1);
      if (e.key === 'ArrowRight') goTo(idx + 1);
    }
    document.addEventListener('keydown', onKeydown);

    async function start() {
      try {
        const { db } = await import('/shared/firebase.js');
        const { collection, query, where, orderBy, limit, onSnapshot } =
          await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

        const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const q = query(
          collection(db, 'upcoming_events'),
          where('eventDate', '>=', cutoff),
          orderBy('eventDate', 'asc'),
          limit(QUERY_LIMIT)
        );

        unsubscribe = onSnapshot(q,
          snap => {
            const list = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() }));
            saveCache(list);
            applyEvents(list, false);
          },
          err => {
            console.warn('upcoming_events snapshot error, falling back to cache:', err);
            fallbackToCache('Unable to load events right now.');
          }
        );
      } catch (e) {
        console.warn('Firestore unavailable, falling back to cache:', e);
        fallbackToCache('Unable to load events right now.');
      }
    }

    start();

    return {
      destroy() {
        clearTimeout(autoTimer);
        document.removeEventListener('keydown', onKeydown);
        if (unsubscribe) unsubscribe();
      }
    };
  }

  window.UpcomingEvents = {
    mount: function(selector, options) {
      options = options || {};
      const container = document.querySelector(selector);
      if (!container) return null;
      if (container._ueInstance) container._ueInstance.destroy();
      injectStyles();
      container._ueInstance = makeInstance(container, options);
      return container._ueInstance;
    }
  };
})();
