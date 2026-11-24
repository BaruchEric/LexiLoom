const HAPTICS_STORAGE_KEY = 'lexiloom_haptics_enabled_v1';
const HAPTICS_EVENT = 'lexiloom-haptics-changed';

export function loadHapticsEnabled(): boolean {
  try {
    const val = localStorage.getItem(HAPTICS_STORAGE_KEY);
    if (val === '0') return false;
    if (val === '1') return true;
  } catch {
    // Ignore storage errors
  }
  return true;
}

export function saveHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore storage errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<boolean>(HAPTICS_EVENT, { detail: enabled })
    );
  }
}

export function subscribeHapticsEnabled(
  listener: (enabled: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const onChange = (e: Event) => {
    const custom = e as CustomEvent<boolean>;
    if (typeof custom.detail === 'boolean') {
      listener(custom.detail);
    } else {
      listener(loadHapticsEnabled());
    }
  };
  window.addEventListener(HAPTICS_EVENT, onChange);
  return () => window.removeEventListener(HAPTICS_EVENT, onChange);
}

export function supportsVibration(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

function triggerVibrate(enabled: boolean, pattern: number | number[]): void {
  if (!enabled || !supportsVibration()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Silently ignore if blocked by browser autoplay/gesture policy
  }
}

/** Crisp short pulse when selecting or tapping a letter tile */
export function vibrateTileTap(enabled: boolean): void {
  triggerVibrate(enabled, 10);
}

/** Ultra-light tactile tick as a drag or keyboard selection crosses a new tile */
export function vibrateTileSweep(enabled: boolean): void {
  triggerVibrate(enabled, 6);
}

/** Distinct upbeat double-pulse when a valid hidden word is completed */
export function vibrateWordSuccess(enabled: boolean): void {
  triggerVibrate(enabled, [18, 40, 28]);
}

/** Firm double-thud feedback when an attempted word is not valid */
export function vibrateWordError(enabled: boolean): void {
  triggerVibrate(enabled, [35, 35, 35]);
}

/** Gentle confirmation pulse when revealing a Smart Hint */
export function vibrateHintReveal(enabled: boolean): void {
  triggerVibrate(enabled, [12, 30, 12]);
}

/** Celebratory haptic cadence upon completing the entire puzzle */
export function vibrateVictory(enabled: boolean): void {
  triggerVibrate(enabled, [20, 45, 25, 45, 55]);
}
