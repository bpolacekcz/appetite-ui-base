// Why: the app's real safe-area insets, handed to the library once at the root through
// <AppetiteProvider safeAreaInsets={...}> instead of the library importing react-native-safe-area-context
// (not a peer dependency; ToastProvider takes `insets` the same way). Sheets and the dialog read them to keep
// their actions clear of the navigation or gesture bar (docs/platform-conventions.md P13). Without the prop
// the components fall back to Figma's grid/safe-area values for the platform convention (iOS 34, Android 24
// at the bottom). Nested providers inherit the value; this context is separate from the theme so a nested
// provider that only changes the scheme does not reset it.
// Numbers it relies on: none.
import { createContext, useContext } from 'react';

export interface SafeAreaInsets {
  top?: number;
  bottom?: number;
}

export const InsetsContext = createContext<SafeAreaInsets | null>(null);

/** The insets the app passed to AppetiteProvider, or null when it passed none. */
export function useInsetsOverride(): SafeAreaInsets | null {
  return useContext(InsetsContext);
}
