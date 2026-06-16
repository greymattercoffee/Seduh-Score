/* ─────────────────────────────────────────
   Seduh Score — Shared Sound Module
   Synthesised timer cues (no audio files).
   Usage: Sound.unlock() on a user gesture,
          then Sound.beep() / Sound.horn().
───────────────────────────────────────── */
const Sound = (() => {
  let ctx = null;

  const getCtx = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    return ctx;
  };

  // Call on a user gesture (e.g. Start click) to satisfy autoplay policy
  function unlock() {
    const c = getCtx();
    if (c && c.state === 'suspended') c.resume();
  }

  // Single tone with a quick attack and exponential decay
  function tone(freq, startOffset, dur, type = 'sine', peak = 0.3) {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g); g.connect(c.destination);
    const t0 = c.currentTime + startOffset;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // Three quick beeps — one-minute warning
  function beep() {
    unlock();
    tone(880, 0.00, 0.12, 'sine', 0.3);
    tone(880, 0.18, 0.12, 'sine', 0.3);
    tone(880, 0.36, 0.12, 'sine', 0.3);
  }

  // Time's-up horn — mid frequencies so it's audible on phone/laptop speakers
  // (sub-200Hz tones are nearly silent on small speakers).
  function horn() {
    unlock();
    const c = getCtx();
    if (!c) return;
    [[330, 'square', 0.32], [247, 'sawtooth', 0.22]].forEach(([f, type, peak]) => {
      const osc = c.createOscillator();
      const g   = c.createGain();
      osc.type = type;
      osc.frequency.value = f;
      osc.connect(g); g.connect(c.destination);
      const t0 = c.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.06); // quick swell
      g.gain.setValueAtTime(peak, t0 + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.7); // fade out
      osc.start(t0);
      osc.stop(t0 + 1.75);
    });
  }

  return { unlock, beep, horn };
})();
