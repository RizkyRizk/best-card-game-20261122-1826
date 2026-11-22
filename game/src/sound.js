// Ember Court sounds: tiny synthesised blips through WebAudio, no files.
// The context is created on the first user gesture; every call is guarded, so
// a browser that refuses audio never breaks the game.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureCtx() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(freq, dur, type = 'sine', gain = 0.08, when = 0) {
  const audio = ensureCtx();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, audio.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + when + dur);
    osc.connect(g).connect(audio.destination);
    osc.start(audio.currentTime + when);
    osc.stop(audio.currentTime + when + dur);
  } catch {
    // Audio is decoration; never let it break the game.
  }
}

export const sfx = {
  play: () => blip(520, 0.09, 'triangle', 0.07),
  attack: () => { blip(180, 0.12, 'sawtooth', 0.06); blip(90, 0.15, 'square', 0.05, 0.02); },
  damage: () => blip(140, 0.14, 'sawtooth', 0.06),
  heal: () => { blip(660, 0.1, 'sine', 0.06); blip(880, 0.14, 'sine', 0.05, 0.08); },
  turn: () => blip(440, 0.07, 'triangle', 0.05),
  win: () => { blip(523, 0.16, 'triangle', 0.08); blip(659, 0.16, 'triangle', 0.08, 0.14); blip(784, 0.3, 'triangle', 0.08, 0.28); },
  lose: () => { blip(392, 0.2, 'sine', 0.07); blip(311, 0.2, 'sine', 0.07, 0.18); blip(233, 0.4, 'sine', 0.07, 0.36); },
  click: () => blip(700, 0.05, 'sine', 0.04),
};
