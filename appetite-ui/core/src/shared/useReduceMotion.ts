// Why: one implementation of "is the system's Reduce Motion setting on", so every animated component
// answers it the same way (Skeleton, Progress Ring and Typing Indicator used or lacked local copies).
// One store for the whole app (session 14): the first hook asks AccessibilityInfo.isReduceMotionEnabled and
// subscribes to `reduceMotionChanged`; every later hook reads the stored answer at once, so a Checkbox mounted
// after the OS answered never plays its first change with the wrong setting. Until the OS answers it returns
// false (motion is assumed fine), so the first frame of an animated component is the animated one.
// What each component does with it: shared/motionMap.ts (docs/motion.md rule 3). Skeleton stops on Pulse=1,
// Typing Indicator parks on Frame 1. The Button loading arc (LoadingArc) deliberately ignores it: system
// activity indicators keep spinning under Reduce Motion on iOS and Android (P8, see LoadingArc's header).
// Test seam: setReduceMotionOverride forces the answer (the showcase motion probe), null follows the OS again.
// Numbers it relies on: none.
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

let system = false;
let override: boolean | null = null;
let subscribed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function connect(): void {
  if (subscribed) return;
  subscribed = true;
  void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
    system = enabled;
    notify();
  });
  AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
    system = enabled;
    notify();
  });
}

function subscribe(listener: () => void): () => void {
  connect();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const snapshot = (): boolean => override ?? system;

/** Test seam, not public API: forces Reduce Motion on or off for every component; null follows the OS. */
export function setReduceMotionOverride(next: boolean | null): void {
  override = next;
  notify();
}

/** True while the system's Reduce Motion setting is on. Assumes motion is fine until the OS answers. */
export function useReduceMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
