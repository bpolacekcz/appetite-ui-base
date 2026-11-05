// Why: the single way components read tokens. The provider resolves one token tree for the current
// color scheme, platform convention and bridge mode; components call useAppetiteTheme() and never
// import raw token files, so a customer can restyle everything from the provider.
// Rules: dark mode follows the system (useColorScheme) unless colorScheme="light" | "dark" is passed.
// Platform follows Platform.OS unless platform="ios" | "material" is passed. Providers nest, so a
// subtree can override either. Numbers: 2 schemes x 2 platforms x 2 bridge modes = 8 token trees,
// each resolved once and cached. It also opens the app's BlurScope (shared/blurScope.tsx) unless it is
// nested in one, so Top Bar glass and the sheets find the BlurTarget on Android. `haptics` (default true, then
// the parent's) switches the selection feedback of Toggle, Checkbox, Radio, Segmented Control, Chip, Slider and
// the Vertical Card favorite, and useHaptics().notify, on or off for the subtree (docs/platform-conventions.md P02).
// This copy is the free base: the brand is fixed to Appetite UI's (Figma 2.5). A rebrand in one theme file is part
// of Appetite UI Code (appetiteui.com/code). Rewritten by scripts/public/build.mjs from the Code source.
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { resolveTokens, type AppetiteTokens, type BridgeMode, type SchemeName } from '@appetite-ui/tokens';
import { defaultPlatform, platformMode, type AppetitePlatform } from './platform';
import { BlurScopeIfNone } from '../shared/blurScope';
import { HapticsContext } from '../shared/haptics';
import { InsetsContext, useInsetsOverride, type SafeAreaInsets } from './insets';

export type ColorSchemePreference = 'system' | SchemeName;

export interface AppetiteTheme {
  /** Every token, resolved for this scheme, platform and bridge. theme.tokens.colors.brandBase */
  readonly tokens: AppetiteTokens;
  readonly scheme: SchemeName;
  readonly platform: AppetitePlatform;
  readonly bridge: BridgeMode;
}

const cache = new Map<string, AppetiteTokens>();
function tokensFor(scheme: SchemeName, platform: AppetitePlatform, bridge: BridgeMode): AppetiteTokens {
  const key = `${scheme}/${platform}/${bridge}`;
  let t = cache.get(key);
  if (!t) {
    t = resolveTokens(scheme, platformMode[platform], bridge);
    cache.set(key, t);
  }
  return t;
}

const ThemeContext = createContext<AppetiteTheme | null>(null);

export interface AppetiteProviderProps {
  /** "system" (default) follows the device setting. */
  colorScheme?: ColorSchemePreference;
  /** Defaults to the parent provider, then to Platform.OS (android -> material, else ios). */
  platform?: AppetitePlatform;
  /** Platform Bridge mode: "brand" (default) or "system" stock platform colors. */
  bridge?: BridgeMode;
  /**
   * The device's safe-area insets (for example from react-native-safe-area-context's useSafeAreaInsets()).
   * Sheets and the dialog keep their actions clear of the navigation or gesture bar with them. Defaults to
   * the parent provider's, then to Figma's grid/safe-area values for the platform convention.
   */
  safeAreaInsets?: SafeAreaInsets;
  /**
   * Haptic feedback on the library's switches and choices (Toggle, Checkbox, Radio, Segmented Control, Chip,
   * Slider steps, Vertical Card favorite) and from useHaptics(). Default: the parent provider's, then true.
   * Offer your users a setting that sets it to false (Apple: make haptics optional).
   */
  haptics?: boolean;
  children: ReactNode;
}

export function AppetiteProvider({ colorScheme, platform, bridge, safeAreaInsets, haptics, children }: AppetiteProviderProps) {
  const parent = useContext(ThemeContext);
  const parentHaptics = useContext(HapticsContext);
  const parentInsets = useInsetsOverride();
  const system = useColorScheme();
  const pref = colorScheme ?? (parent ? parent.scheme : 'system');
  const scheme: SchemeName = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const plat = platform ?? parent?.platform ?? defaultPlatform();
  const br = bridge ?? parent?.bridge ?? 'brand';
  const value = useMemo<AppetiteTheme>(
    () => ({ tokens: tokensFor(scheme, plat, br), scheme, platform: plat, bridge: br }),
    [scheme, plat, br],
  );
  const top = safeAreaInsets?.top;
  const bottom = safeAreaInsets?.bottom;
  const insets = useMemo<SafeAreaInsets | null>(
    () => (top === undefined && bottom === undefined ? parentInsets : { top, bottom }),
    [top, bottom, parentInsets],
  );
  return (
    <ThemeContext.Provider value={value}>
      <HapticsContext.Provider value={haptics ?? parentHaptics}>
        <InsetsContext.Provider value={insets}>
          <BlurScopeIfNone>{children}</BlurScopeIfNone>
        </InsetsContext.Provider>
      </HapticsContext.Provider>
    </ThemeContext.Provider>
  );
}

/** The current theme. Outside a provider it falls back to system scheme and Platform.OS. */
export function useAppetiteTheme(): AppetiteTheme {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme();
  return useMemo<AppetiteTheme>(() => {
    if (ctx) return ctx;
    const scheme: SchemeName = system === 'dark' ? 'dark' : 'light';
    const platform = defaultPlatform();
    return { tokens: tokensFor(scheme, platform, 'brand'), scheme, platform, bridge: 'brand' };
  }, [ctx, system]);
}
