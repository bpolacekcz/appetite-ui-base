// Why: the platform layer is what sets Appetite UI apart from gluestack and React Native Reusables.
// A component asks "ios or material?" instead of reading Platform.OS, so one app can render Material
// conventions on iOS (or the reverse) for a brand that wants one look everywhere, and the showcase can
// show both side by side on one device.
// Numbers it relies on: Figma Platform collection modes ios-md (default) and android; ios-lg differs
// only in safe-area-top (62 vs 59) which apps read from the OS, so it is not selected here.
import { Platform } from 'react-native';
import type { PlatformMode } from '@appetite-ui/tokens';

export type AppetitePlatform = 'ios' | 'material';

/** Platform.OS -> platform conventions. Android is Material; iOS, and web previews, are iOS. */
export function defaultPlatform(os: typeof Platform.OS = Platform.OS): AppetitePlatform {
  return os === 'android' ? 'material' : 'ios';
}

/** Which Figma Platform mode supplies the tokens for a platform convention. */
export const platformMode: Record<AppetitePlatform, PlatformMode> = {
  ios: 'ios-md',
  material: 'android',
};
