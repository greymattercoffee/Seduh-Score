/* ─────────────────────────────────────────
   Seduh Score — Shared Timer Module
   Usage: Timer.init() then Timer.open()
───────────────────────────────────────── */
const Timer = (() => {
  let ms = 600000, preset = 600, running = false, iv = null;

  const fmt = t => {
    const s = Math.max(0, Math.ceil(t / 1000));
    return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
  };

  const el  = id => document.getElementById(id);
  const ovl = () => el('tmr-overlay');
  const dsp = () => el('tmr-display');

  function tick() {
    ms -= 100;
    dsp().textContent = fmt(ms);
    if (ms <= 0) {
      clearInterval(iv); running = false; ms = 0;
      ovl().classList.remove('running');
      ovl().classList.add('done');
    }
  }

  function setPreset(secs) {
    if (running) { clearInterval(iv); running = false; }
    ovl().classList.remove('running','done');
    ms = secs * 1000; preset = secs;
    dsp().textContent = fmt(ms);
    document.querySelectorAll('[data-secs]').forEach(b =>
      b.classList.toggle('on', +b.dataset.secs === secs));
  }

  function init() {
    // Presets
    document.querySelectorAll('[data-secs]').forEach(b =>
      b.addEventListener('click', () => setPreset(+b.dataset.secs)));

    el('tmr-start')?.addEventListener('click', () => {
      if (running || ms <= 0) return;
      ovl().classList.add('running'); ovl().classList.remove('done');
      running = true;
      iv = setInterval(tick, 100);
    });
    el('tmr-pause')?.addEventListener('click', () => {
      if (!running) return;
      clearInterval(iv); running = false;
      ovl().classList.remove('running');
    });
    el('tmr-reset')?.addEventListener('click', () => {
      clearInterval(iv); running = false;
      ms = preset * 1000;
      dsp().textContent = fmt(ms);
      ovl().classList.remove('running','done');
    });
    el('tmr-close')?.addEventListener('click', () => ovl().classList.remove('show'));
    el('tmr-fs')?.addEventListener('click',   () => ovl()?.classList.toggle('fs'));

    // Tap the display to exit fullscreen — works on mobile, no keyboard needed
    dsp()?.addEventListener('click', () => {
      if (ovl()?.classList.contains('fs')) ovl().classList.remove('fs');
    });

    // Escape key to exit fullscreen
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && ovl()?.classList.contains('fs')) ovl().classList.remove('fs');
    });

    dsp().textContent = fmt(ms);
  }

  return {
    init,
    open:  () => ovl().classList.add('show'),
    close: () => ovl().classList.remove('show'),
    set:   secs => setPreset(secs),
  };
})();
