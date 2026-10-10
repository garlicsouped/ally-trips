/* ============================================================
   SOUND MODULE
   Lightweight 8-bit style sound effects and background chiptune
   loop, synthesized live with the Web Audio API so there are no
   external audio files to load. Sound effects and background
   music are independent toggles, each respects only its own
   setting.
   ============================================================ */

let audioCtx = null;
let musicInterval = null;
let musicStep = 0;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(freq, duration, type, volume) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.value = volume || 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) { /* audio not available, fail silently */ }
}

/* Used for UI sound effects, respects the Sound Effects toggle only */
function playBlip(freq, duration, type, volume) {
  const settings = getSettings();
  if (!settings.soundEffects) return;
  playTone(freq, duration, type, volume);
}

function sfxClick() {
  playBlip(520, 0.08, 'square', 0.06);
}

function sfxCheck() {
  playBlip(660, 0.06, 'square', 0.07);
  setTimeout(() => playBlip(880, 0.1, 'square', 0.07), 60);
}

function sfxUncheck() {
  playBlip(440, 0.08, 'square', 0.05);
}

function sfxSuccess() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playBlip(f, 0.15, 'square', 0.08), i * 90);
  });
}

function sfxError() {
  playBlip(220, 0.15, 'sawtooth', 0.06);
}

/* ---------------- BACKGROUND CHIPTUNE ---------------- */
/* A simple original looping melody, built from scratch, not
   based on any copyrighted composition. */
const CHIPTUNE_MELODY = [
  523, 0, 659, 0, 784, 659, 523, 0,
  587, 0, 698, 0, 880, 698, 587, 0,
  523, 659, 784, 1047, 784, 659, 523, 0,
  494, 587, 659, 784, 659, 587, 494, 0
];

function playMusicStep() {
  const settings = getSettings();
  if (!settings.backgroundMusic) {
    stopMusic();
    return;
  }
  const note = CHIPTUNE_MELODY[musicStep % CHIPTUNE_MELODY.length];
  if (note > 0) {
    playTone(note, 0.18, 'triangle', 0.045);
  }
  musicStep++;
}

function startMusic() {
  if (musicInterval) return;
  const settings = getSettings();
  if (!settings.backgroundMusic) return;
  musicStep = 0;
  playMusicStep();
  musicInterval = setInterval(playMusicStep, 220);
}

function stopMusic() {
  if (musicInterval) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}

function toggleMusic(on) {
  if (on) {
    startMusic();
  } else {
    stopMusic();
  }
}

/* Wire up click sounds globally for buttons once DOM is ready */
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (e) => {
    const target = e.target.closest('button, .trip-card, .tab-btn, a.btn');
    if (target) sfxClick();
  });

  const unlock = () => {
    getAudioCtx();
    const settings = getSettings();
    if (settings.backgroundMusic) startMusic();
    document.removeEventListener('click', unlock);
  };
  document.addEventListener('click', unlock, { once: true });
});
