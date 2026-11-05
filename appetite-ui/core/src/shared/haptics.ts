// Why: the one place the library touches expo-haptics (a peer dependency, like expo-blur), so every
// component asks for feedback by what happened ("a toggle flipped") and the platform decides what it
// feels like (docs/platform-conventions.md P02): iOS gets selection, impact and notification feedback,
// Android gets View.performHapticFeedback through performAndroidHapticsAsync, which needs no VIBRATE
// permission and honours the user's touch-feedback setting. The table itself is shared/hapticMap.ts.
// Rules: feedback is on by default and AppetiteProvider haptics={false} switches it off (Apple: let
// people turn haptics off); it never throws (the native module can be missing, expo-haptics rejects a
// constant the Android API level lacks), and at most one haptic plays per HAPTIC_MIN_GAP_MS (40 ms, a
// tuning constant), so a Slider dragged across a dense range cannot buzz.
// Numbers it relies on: hapticMap.ts. Simulators and emulators play nothing, so tests read the calls
// through setHapticsObserver; the physical feel is UNVERIFIED.
import { createContext, useCallback, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  AndroidHaptics,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
  impactAsync,
  notificationAsync,
  performAndroidHapticsAsync,
  selectionAsync,
} from 'expo-haptics';
import { HAPTIC_MIN_GAP_MS, hapticCall, type HapticCall, type HapticEvent, type HapticOutcome } from './hapticMap';

export type { HapticCall, HapticEvent, HapticOutcome } from './hapticMap';

/** Whether haptics are on for this subtree (AppetiteProvider haptics). Default true. */
export const HapticsContext = createContext<boolean>(true);

const NOTIFICATION: Readonly<Record<HapticOutcome, NotificationFeedbackType>> = {
  success: NotificationFeedbackType.Success,
  warning: NotificationFeedbackType.Warning,
  error: NotificationFeedbackType.Error,
};

let lastPlayedAt = Number.NEGATIVE_INFINITY;
let observer: ((call: HapticCall, event: HapticEvent) => void) | null = null;

/**
 * Test seam, not public API: called with every haptic that is about to play (after the throttle), so a
 * screen on a simulator can show what a physical device would feel. Pass null to stop.
 */
export function setHapticsObserver(next: ((call: HapticCall, event: HapticEvent) => void) | null): void {
  observer = next;
}

async function dispatch(call: HapticCall): Promise<void> {
  switch (call.api) {
    case 'selectionAsync':
      return selectionAsync();
    case 'impactAsync':
      return impactAsync(ImpactFeedbackStyle.Light);
    case 'notificationAsync':
      return notificationAsync(NOTIFICATION[call.type]);
    case 'performAndroidHapticsAsync':
      return performAndroidHapticsAsync(AndroidHaptics[call.type]);
  }
}

/** Plays the platform's feedback for an event. Ignores the provider switch: components go through useHapticPlayer. */
export function playHaptic(event: HapticEvent): void {
  // native-only: the haptic engines differ (UIKit feedback generators on iOS, View.performHapticFeedback on Android) and Android's constants depend on the API level.
  const call = hapticCall(event, Platform.OS, typeof Platform.Version === 'number' ? Platform.Version : 0);
  if (call === null) return;
  const now = Date.now();
  if (now - lastPlayedAt < HAPTIC_MIN_GAP_MS) return;
  lastPlayedAt = now;
  observer?.(call, event);
  // Feedback is a nicety: a missing native module or an unsupported constant must never reach the screen.
  dispatch(call).catch(() => undefined);
}

/** Whether haptics are on here (the nearest AppetiteProvider's `haptics`, default true). */
export function useHapticsEnabled(): boolean {
  return useContext(HapticsContext);
}

/** What components call: a function that plays an event when haptics are on. */
export function useHapticPlayer(): (event: HapticEvent) => void {
  const enabled = useContext(HapticsContext);
  return useCallback(
    (event: HapticEvent) => {
      if (enabled) playHaptic(event);
    },
    [enabled],
  );
}

/** What useHaptics() returns. */
export interface UseHaptics {
  /** False when AppetiteProvider haptics={false}: notify then does nothing. */
  readonly enabled: boolean;
  /**
   * Reports the outcome of a task with the platform's own feedback: iOS success, warning and error
   * notifications, Android Confirm (success) and Reject (warning, error) on Android 11 and up, nothing
   * below. Use it for results the user waits for (a payment went through, a form was refused), not for
   * taps: the library already gives selection feedback on its own switches and choices.
   */
  readonly notify: (outcome: HapticOutcome) => void;
}

/** App-level haptics for outcomes. Respects AppetiteProvider haptics={false}. */
export function useHaptics(): UseHaptics {
  const enabled = useContext(HapticsContext);
  return useMemo<UseHaptics>(
    () => ({
      enabled,
      notify: (outcome) => {
        if (enabled) playHaptic({ kind: 'outcome', outcome });
      },
    }),
    [enabled],
  );
}
