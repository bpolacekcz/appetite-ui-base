// Why: Android's blur is drawn from a view (expo-blur's BlurTargetView), and the BlurView that draws it must
// be outside that view, usually a sibling (a Top Bar over a ScrollView, a sheet over the screen). So the
// target and the blurs that use it cannot share a parent-child relation; they share a scope instead: a
// React context that holds the ref of the scope's BlurTarget. AppetiteProvider opens one scope for the app
// (when it is not nested in another), a screen that needs its own target (a navigator keeps several
// screens mounted) wraps itself in <BlurScope>. iOS blurs without a target, so none of this matters there.
// Numbers it relies on: none.
import { createContext, useContext, useRef, type ReactElement, type ReactNode, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';

const BlurScopeContext = createContext<RefObject<ViewInstance | null> | null>(null);

/** The ref of the nearest scope's BlurTarget, or null outside any scope. */
export function useBlurScope(): RefObject<ViewInstance | null> | null {
  return useContext(BlurScopeContext);
}

/**
 * A scope for one BlurTarget. Put the BlurTarget and the things that blur it (Top Bar with `glass`) inside the same BlurScope. Renders no view.
 */
export function BlurScope({ children }: { children: ReactNode }): ReactElement {
  const ref = useRef<ViewInstance>(null);
  return <BlurScopeContext.Provider value={ref}>{children}</BlurScopeContext.Provider>;
}

/** Opens a scope only when there is none yet (AppetiteProvider uses it, so nested providers share the app's). */
export function BlurScopeIfNone({ children }: { children: ReactNode }): ReactElement {
  const parent = useBlurScope();
  return parent === null ? <BlurScope>{children}</BlurScope> : <>{children}</>;
}
