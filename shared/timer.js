/* ─────────────────────────────────────────
   Seduh Score — Shared Timer Module
   Usage: Timer.init() then Timer.open()
───────────────────────────────────────── */
const Timer = (() => {
  let ms = 600000, preset = 600, running = false, iv = null;
  let beeped = false, horned = false;  // one-shot audio cue guards
  let inited = false;                  // guard so init() wires up only once

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

    // One-minute warning beep — fires once
    if (!beeped && ms <= 60000 && ms > 0) {
      beeped = true;
      if (window.Sound) Sound.beep();
    }

    // Last 10 seconds — red flashing display.
    // Remove 'running' so the warning style can't be overridden by the amber run colour.
    const inWarn = ms <= 10000 && ms > 0;
    const o = ovl();
    if (o) {
      o.classList.toggle('warning', inWarn);
      if (inWarn) o.classList.remove('running');
    }

    if (ms <= 0) {
      clearInterval(iv); running = false; ms = 0;
      ovl().classList.remove('running','warning');
      ovl().classList.add('done');
      if (!horned) { horned = true; if (window.Sound) Sound.horn(); }
    }
  }

  function setPreset(secs) {
    if (running) { clearInterval(iv); running = false; }
    ovl().classList.remove('running','done','warning');
    ms = secs * 1000; preset = secs;
    beeped = secs <= 60;   // no 1-min warning if total time is <= 1 min
    horned = false;
    dsp().textContent = fmt(ms);
    document.querySelectorAll('[data-secs]').forEach(b =>
      b.classList.toggle('on', +b.dataset.secs === secs));
  }

  function init() {
    if (inited) return;   // listeners are on the static overlay — wire once
    inited = true;
    // Presets
    document.querySelectorAll('[data-secs]').forEach(b =>
      b.addEventListener('click', () => setPreset(+b.dataset.secs)));

    el('tmr-start')?.addEventListener('click', () => {
      if (running || ms <= 0) return;
      if (window.Sound) Sound.unlock();   // user gesture — enable audio
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
      beeped = preset <= 60;
      horned = false;
      dsp().textContent = fmt(ms);
      ovl().classList.remove('running','done','warning');
    });
    el('tmr-close')?.addEventListener('click', () => ovl().classList.remove('show'));
    el('tmr-fs')?.addEventListener('click',   () => ovl().classList.toggle('fs'));

    // Tap the display to exit fullscreen — works on mobile, no keyboard needed
    dsp()?.addEventListener('click', () => {
      if (ovl()?.classList.contains('fs')) ovl().classList.remove('fs');
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
