/* ─────────────────────────────────────────
   Seduh Score — Shared Audience Overlay
   Usage: Audience.show({ title, moduleTag, lbHTML, histHTML })
   lbHTML is optional — if aud-lb element is absent it is silently skipped.
───────────────────────────────────────── */
const Audience = (() => {
  const el  = id => document.getElementById(id);
  const ovl = () => el('aud-overlay');

  function init() {
    el('aud-close')?.addEventListener('click', () => ovl().classList.remove('show'));
  }

  function show({ title = 'Seduh Score', moduleTag = '', lbHTML = '', histHTML = '' }) {
    const now = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
    el('aud-ts').innerHTML = (title || 'Seduh Score') + '<br>' + now;

    const titleBlock = el('aud-title-block');
    if (titleBlock) {
      titleBlock.querySelector('.aud-title').textContent = title;
    }
    const modTag = el('aud-module-tag');
    if (modTag) {
      modTag.textContent = moduleTag;
      modTag.style.display = moduleTag ? '' : 'none';
    }

    const lbEl = el('aud-lb');
    if (lbEl) lbEl.innerHTML = lbHTML || '<div style="text-align:center;padding:2.5rem;color:#9CA3AF">No data yet.</div>';
    el('aud-hist').innerHTML = histHTML || '<div style="text-align:center;padding:2.5rem;color:#9CA3AF">No results yet.</div>';
    ovl().classList.add('show');
  }

  return { init, show };
})();
