// audio.js — Procedural Web Audio SFX + haptic feedback

let audioCtx = null;
let masterGain = null;

function ensureContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function vol() {
  return Settings.get('sfxVolume');
}

// ── SFX: Tile tap ──
function playTap() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 1800;
  gain.gain.setValueAtTime(0.08 * vol(), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.04);
}

// ── SFX: Word submitted successfully — ascending arpeggio ──
function playSubmit() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.06;
    gain.gain.setValueAtTime(0.1 * vol(), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  });
}

// ── SFX: Invalid word — low dull thud ──
function playInvalid() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 200;
  osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.12 * vol(), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.16);
}

// ── SFX: Chip count tick (Balatro-style scoring) ──
function playChipCount(pitch) {
  if (vol() === 0) return;
  pitch = pitch || 800;
  const ctx = ensureContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = pitch;
  gain.gain.setValueAtTime(0.05 * vol(), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

// ── SFX: Gold earned — metallic clink ──
function playGold() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  [3000, 4500].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.015;
    gain.gain.setValueAtTime(0.06 * vol(), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  });
}

// ── SFX: Charm trigger — sparkle burst ──
function playCharm() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const bufferSize = ctx.sampleRate * 0.04;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 6000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06 * vol(), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
  source.connect(hp).connect(gain).connect(masterGain);
  source.start();
  source.stop(ctx.currentTime + 0.05);
}

// ── SFX: Grid deal — rapid dice scatter ──
function playDeal() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  for (let i = 0; i < 8; i++) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.015);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800 + Math.random() * 2000;
    bp.Q.value = 2;
    const gain = ctx.createGain();
    const t = ctx.currentTime + i * 0.03;
    gain.gain.setValueAtTime(0.04 * vol(), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    source.connect(bp).connect(gain).connect(masterGain);
    source.start(t);
    source.stop(t + 0.025);
  }
}

// ── SFX: Shake — rattle ──
function playShake() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const bufferSize = Math.floor(ctx.sampleRate * 0.2);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 400;
  bp.Q.value = 1;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08 * vol(), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  source.connect(bp).connect(gain).connect(masterGain);
  source.start();
  source.stop(ctx.currentTime + 0.21);
}

// ── SFX: Final score slam — impact ──
function playScoreSlam() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  // Low sine thump
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 100;
  osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2 * vol(), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.13);
  // Noise burst
  const bufferSize = Math.floor(ctx.sampleRate * 0.06);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.1 * vol(), ctx.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  src.connect(g2).connect(masterGain);
  src.start();
  src.stop(ctx.currentTime + 0.07);
}

// ── SFX: Victory fanfare — major arpeggio ──
function playVictory() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const notes = [262, 330, 392, 523]; // C4, E4, G4, C5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc2.type = 'triangle';
    osc.frequency.value = freq;
    osc2.frequency.value = freq;
    const t = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0.12 * vol(), t);
    gain.gain.linearRampToValueAtTime(0.08 * vol(), t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(masterGain);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + 0.65);
    osc2.stop(t + 0.65);
  });
}

// ── SFX: Game over — descending minor ──
function playGameOver() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const notes = [330, 294, 262, 247]; // E4, D4, C4, B3
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.2;
    gain.gain.setValueAtTime(0.1 * vol(), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.45);
  });
}

// ── SFX: Screen transition — whoosh ──
function playTransition() {
  if (vol() === 0) return;
  const ctx = ensureContext();
  const bufferSize = Math.floor(ctx.sampleRate * 0.3);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(200, ctx.currentTime);
  bp.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.3);
  bp.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06 * vol(), ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  source.connect(bp).connect(gain).connect(masterGain);
  source.start();
  source.stop(ctx.currentTime + 0.31);
}

// ── Haptics ──

function haptic(style) {
  if (!Settings.get('hapticsOn')) return;
  if (navigator.vibrate) {
    switch (style) {
      case 'light': navigator.vibrate(5); break;
      case 'medium': navigator.vibrate(15); break;
      case 'heavy': navigator.vibrate([20, 10, 30]); break;
    }
  }
}

window.GameAudio = {
  ensureContext,
  playTap, playSubmit, playInvalid,
  playChipCount, playGold, playCharm,
  playDeal, playShake, playScoreSlam,
  playVictory, playGameOver, playTransition,
  haptic
};
