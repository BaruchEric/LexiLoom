let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
  delay = 0,
  endFrequency?: number
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  if (endFrequency !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, endFrequency),
      now + duration
    );
  }

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

// Gentle C-major pentatonic scale frequencies for rising drag sweeps
const SWEEP_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

/** Crisp tactile wooden pop when selecting a starting letter tile */
export function playTileTap(enabled: boolean) {
  if (!enabled) return;
  playTone(480, 0.055, 'sine', 0.06, 0, 560);
}

/** Musical ascending tick as the pointer sweeps across each letter in a word */
export function playTileSweep(enabled: boolean, stepIndex: number) {
  if (!enabled) return;
  const freq = SWEEP_SCALE[Math.min(Math.max(0, stepIndex), SWEEP_SCALE.length - 1)];
  playTone(freq, 0.065, 'triangle', 0.045);
}

/** Subtle soft drop when clearing a 2-tap tile anchor */
export function playSelectionClear(enabled: boolean) {
  if (!enabled) return;
  playTone(360, 0.07, 'sine', 0.045, 0, 260);
}

/** Warm harmonic triad chime when discovering a valid word */
export function playWordFound(enabled: boolean) {
  if (!enabled) return;
  playTone(523.25, 0.16, 'triangle', 0.09, 0);
  playTone(659.25, 0.18, 'triangle', 0.09, 0.065);
  playTone(783.99, 0.28, 'triangle', 0.1, 0.13);
  playTone(1046.5, 0.24, 'sine', 0.05, 0.16);
}

/** Gentle low muted double-thud when an attempted word is not in the puzzle */
export function playInvalidWord(enabled: boolean) {
  if (!enabled) return;
  playTone(230, 0.11, 'sine', 0.075, 0, 185);
  playTone(180, 0.14, 'triangle', 0.06, 0.085, 145);
}

/** Shimmering interval cue when revealing a Smart Hint */
export function playHintReveal(enabled: boolean) {
  if (!enabled) return;
  playTone(698.46, 0.13, 'sine', 0.07, 0);
  playTone(880.0, 0.22, 'sine', 0.075, 0.08);
  playTone(1046.5, 0.2, 'triangle', 0.045, 0.15);
}

/** Bright double chime when claiming Rewarded Ad hint credits */
export function playRewardClaimed(enabled: boolean) {
  if (!enabled) return;
  playTone(659.25, 0.14, 'triangle', 0.08, 0);
  playTone(987.77, 0.24, 'triangle', 0.085, 0.09);
}

/** Uplifting major-9th celebratory fanfare upon solving the full board */
export function playVictoryFanfare(enabled: boolean) {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
  notes.forEach((freq, i) => {
    playTone(freq, 0.34, 'triangle', 0.095, i * 0.085);
  });
  playTone(1318.51, 0.45, 'sine', 0.055, 0.36);
}
