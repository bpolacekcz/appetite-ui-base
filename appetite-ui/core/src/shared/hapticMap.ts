// Why: the haptics table of docs/platform-conventions.md P02 as pure data, with no import, so it can be run
// and checked on its own (scripts/haptics-check.mjs loads this file with Node's type stripping) and read
// without a device. shared/haptics.ts plays what this returns.
// Numbers it relies on (every API level from developer.android.com HapticFeedbackConstants, R21 in the
// spec; expo-haptics 57.0.3 throws on Android for a constant the running API level does not have, read in
// its HapticsRecord.kt):
// - Toggle_On, Toggle_Off, Segment_Tick, Segment_Frequent_Tick: API 34.
// - Confirm, Reject, Gesture_End: API 30.
// - Context_Click: API 23 (the fallback below the level of the real constant).
// - HAPTIC_MIN_GAP_MS 40 and DENSE_STEP_COUNT 20 are tuning constants, not Figma values: UNVERIFIED on a
//   physical device (simulators and emulators give no haptics).

/** An outcome the app reports through useHaptics().notify. */
export type HapticOutcome = 'success' | 'warning' | 'error';

/** What happened in the interface. The library turns each into the platform's own feedback. */
export type HapticEvent =
  /** A binary control flipped: Toggle, Checkbox, Radio, a List row with one of them. */
  | { readonly kind: 'toggle'; readonly on: boolean }
  /** A choice changed in a set: Segmented Control, Chip, Vertical Card favorite. */
  | { readonly kind: 'select' }
  /** A Slider crossed one step. `dense` is true when the range has many steps. */
  | { readonly kind: 'step'; readonly dense: boolean }
  /** A Slider reached its minimum or maximum. */
  | { readonly kind: 'limit' }
  /** The result of a task, reported by the app. */
  | { readonly kind: 'outcome'; readonly outcome: HapticOutcome };

/** The call made on expo-haptics, as data (the observer in shared/haptics.ts and the check script read it). */
export type HapticCall =
  | { readonly api: 'selectionAsync' }
  | { readonly api: 'impactAsync'; readonly style: 'light' }
  | { readonly api: 'notificationAsync'; readonly type: HapticOutcome }
  | { readonly api: 'performAndroidHapticsAsync'; readonly type: AndroidHapticName };

/** The AndroidHaptics members used (expo-haptics names them with underscores and capitals). */
export type AndroidHapticName =
  | 'Toggle_On'
  | 'Toggle_Off'
  | 'Segment_Tick'
  | 'Segment_Frequent_Tick'
  | 'Gesture_End'
  | 'Confirm'
  | 'Reject'
  | 'Context_Click';

/** One haptic per this many milliseconds at most. Tuning constant. */
export const HAPTIC_MIN_GAP_MS = 40;
/** A Slider with more steps than this ticks with the very soft Segment_Frequent_Tick. Tuning constant. */
export const DENSE_STEP_COUNT = 20;

/** The first Android API level that has each constant. */
const ANDROID_API: Readonly<Record<AndroidHapticName, number>> = {
  Toggle_On: 34,
  Toggle_Off: 34,
  Segment_Tick: 34,
  Segment_Frequent_Tick: 34,
  Gesture_End: 30,
  Confirm: 30,
  Reject: 30,
  Context_Click: 23,
};

/** What a Slider with `step` makes of its range: dense when it has more than DENSE_STEP_COUNT steps. */
export function isDenseRange(min: number, max: number, step: number): boolean {
  return step > 0 && (max - min) / step > DENSE_STEP_COUNT;
}

/**
 * The expo-haptics call for an event on a platform, or null for no feedback.
 * `os` is Platform.OS, `apiLevel` is Platform.Version on Android (a number there).
 * Below the API level of the constant the spec names, selection-class events fall back to Context_Click
 * (API 23), and outcomes and dense steps give nothing (a fallback for them is UNVERIFIED).
 */
export function hapticCall(event: HapticEvent, os: string, apiLevel: number): HapticCall | null {
  if (os === 'ios') {
    switch (event.kind) {
      case 'toggle':
      case 'select':
      case 'step':
        return { api: 'selectionAsync' };
      case 'limit':
        return { api: 'impactAsync', style: 'light' };
      case 'outcome':
        return { api: 'notificationAsync', type: event.outcome };
    }
  }
  if (os === 'android') {
    const android = (type: AndroidHapticName, fallback: AndroidHapticName | null): HapticCall | null => {
      if (apiLevel >= ANDROID_API[type]) return { api: 'performAndroidHapticsAsync', type };
      return fallback !== null && apiLevel >= ANDROID_API[fallback] ? { api: 'performAndroidHapticsAsync', type: fallback } : null;
    };
    switch (event.kind) {
      case 'toggle':
        return android(event.on ? 'Toggle_On' : 'Toggle_Off', 'Context_Click');
      case 'select':
        return android('Segment_Tick', 'Context_Click');
      case 'step':
        return event.dense ? android('Segment_Frequent_Tick', null) : android('Segment_Tick', 'Context_Click');
      case 'limit':
        return android('Gesture_End', 'Context_Click');
      case 'outcome':
        return android(event.outcome === 'success' ? 'Confirm' : 'Reject', null);
    }
  }
  return null;
}
