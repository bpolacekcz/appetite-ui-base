// Why: the interaction pieces every pressable component shares, so iOS and Material conventions, focus
// rings and hit areas look and behave the same across the library.
// - StateLayer: Material shows pressed state as a layer of the content color over the container at
//   M3/sys/state/pressed-opacity (tokens.m3.opacity.statePressedOpacity, 10 = 10 %). iOS uses the
//   Figma State=Pressed colors instead, so components render StateLayer only when platform is material.
// - pressFeedback: Android's answer to the same state (docs/platform-conventions.md P01): on an Android
//   device with convention material the state layer is replaced by a native ripple (`android_ripple`) of
//   the same color at the same 10 %; everywhere else StateLayer stays. React Native does not clip a ripple
//   to border-radius (CompositeBackgroundDrawable draws it as a rectangle in the view's bounds, only the
//   children are clipped), so a rounded control puts its Pressable INSIDE a View with the radius and
//   overflow hidden and gives the Pressable the fill; the ripple then draws over the fill and under the
//   content, inside the shape.
// - FocusRing: Figma's State=Focused draws two zero-blur drop shadows, spread 4 in the ring color and
//   spread 2 in bg/white-0 on top of it: a 2 pt ring outside a 2 pt gap (read from Button 15851:38321).
// - InsideBorder: Figma INSIDE strokes take no layout space, React Native borders do (a 1 pt border
//   makes a hugging box 2 pt wider). Components draw Figma strokes with this overlay instead.
// - OutsideBorder: Figma OUTSIDE strokes sit just beyond the box and take no layout space either; the
//   overlay is one stroke width larger on every side, with the outer radius = the box radius + the width
//   (Horizontal, Icon and Vertical Card, Navigation's pill).
// - touchSlop: grows the hit area to platform/min-touch-target (44 pt iOS, 48 dp Android) without
//   changing the visual size (CLAUDE.md gate 5).
// - Motion (docs/motion.md, session 14): components name a motion ('checkbox.box') and these hooks play it with
//   the Motion tokens, recipes and Reduce Motion rule of shared/motionMap.ts. useMotionValue moves a number to each
//   new target, useMotionEntrance plays a value in from a start point when something turns on, useMotionColor
//   crossfades a color, useMotionIndicator moves one selection indicator's x and width, usePressMotion is the
//   press scale (M14) and pressed state of a pressable, motionAnimation builds one animation for code that drives
//   its own values (overlays). Nothing moves on mount: the first render is the resting state, so static parity is
//   unchanged. Colors run on the JS driver (the native driver cannot animate colors); keep them on a different
//   view from a native-driven transform. setMotionObserver is the test seam the showcase motion probe reads.
// - Interruption (docs/motion.md rule 7): a new target starts from the current value. A spring started on a value
//   whose running animation is a spring takes over its velocity on the JS driver (RN SpringAnimation reads the
//   previous animation's state); motion that can be retargeted mid-flight (indicators, Toggle handle) therefore
//   runs on the JS driver (measured in docs/log/14.md, task 2b). A crossfade interrupted half way restarts from
//   the color on screen (mixColor), not from the previous target. A spring after a drag takes `velocity` in
//   units per second (PanResponder's vy is per millisecond: x 1000).
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type Insets, type PressableAndroidRippleConfig } from 'react-native';
import { useAppetiteTheme, type AppetiteTheme } from '../theme/AppetiteProvider';
import { MOTION_SCALE, motionFor, motionRow, type Motion, type MotionName } from './motionMap';
import { useReduceMotion } from './useReduceMotion';

/** Material pressed state layer. Place it as the last child of a container with overflow hidden. */
export function StateLayer({ color, visible }: { color: string; visible: boolean }) {
  const { tokens: t, platform } = useAppetiteTheme();
  if (!visible || platform !== 'material') return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color, opacity: t.m3.opacity.statePressedOpacity / 100 }]}
    />
  );
}

/** A token color ("#rrggbb" or "#rrggbbaa") with its alpha multiplied by `opacity` (0 to 1), as "#rrggbbaa". */
function withOpacity(hex: string, opacity: number): string {
  const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex);
  if (m === null) return hex;
  const alpha = Math.round((m[2] === undefined ? 255 : parseInt(m[2], 16)) * opacity);
  return `#${m[1]}${alpha.toString(16).padStart(2, '0')}`;
}

export interface PressFeedback {
  /** Spread on the Pressable as `android_ripple`: set on an Android device with convention material, undefined elsewhere. */
  readonly androidRipple: PressableAndroidRippleConfig | undefined;
  /** True when the ripple draws, so the component clips its Pressable inside the shape (see the header). */
  readonly rippleActive: boolean;
  /** The Material state layer for the cases the ripple does not cover (material on an iOS device); null while the ripple draws. */
  readonly stateLayer: (visible: boolean) => ReactElement | null;
}

/**
 * Press feedback for Material (P01). `color` is the content color the state layer used (label or icon);
 * the ripple is that color at M3's pressed opacity. `borderless` and `radius` are for small round buttons
 * with no clipping parent: a borderless ripple of radius half the button's size is the button's circle.
 */
export function pressFeedback(theme: AppetiteTheme, color: string, options: { borderless?: boolean; radius?: number } = {}): PressFeedback {
  // native-only: android_ripple exists only on Android; the convention (material) decides whether to use it.
  const rippleActive = theme.platform === 'material' && Platform.OS === 'android';
  return {
    rippleActive,
    androidRipple: rippleActive
      ? { color: withOpacity(color, theme.tokens.m3.opacity.statePressedOpacity / 100), borderless: options.borderless ?? false, radius: options.radius }
      : undefined,
    stateLayer: (visible) => (rippleActive ? null : <StateLayer color={color} visible={visible} />),
  };
}

/** Figma State=Focused ring: 2 pt gap in bg/white-0, then a 2 pt ring. Render inside a non-clipping wrapper. */
export function FocusRing({ visible, color, radius }: { visible: boolean; color: string; radius: number }) {
  const { tokens: t } = useAppetiteTheme();
  if (!visible) return null;
  const gap = t.border.w2;
  const ring = t.border.w2;
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -(gap + ring),
          left: -(gap + ring),
          right: -(gap + ring),
          bottom: -(gap + ring),
          borderRadius: radius + gap + ring,
          borderWidth: ring,
          borderColor: color,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -gap,
          left: -gap,
          right: -gap,
          bottom: -gap,
          borderRadius: radius + gap,
          borderWidth: gap,
          borderColor: t.colors.bgWhite0,
        }}
      />
    </>
  );
}

/** A Figma INSIDE stroke: an overlay that does not change layout. Render as the last child. */
export function InsideBorder({ color, width, radius }: { color: string | undefined; width: number; radius: number }) {
  if (color === undefined) return null;
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderWidth: width, borderColor: color, borderRadius: radius }]}
    />
  );
}

/**
 * A Figma OUTSIDE stroke: an overlay one stroke width outside the box, so it takes no layout space and
 * its outer radius is the box radius plus the width. Render as the last child of the (non-clipping) box.
 * A radius of `shapes.full` works: React Native clamps it to half the shorter side either way.
 */
export function OutsideBorder({ color, width, radius }: { color: string | undefined; width: number; radius: number }) {
  if (color === undefined) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -width, left: -width, right: -width, bottom: -width, borderWidth: width, borderColor: color, borderRadius: radius + width }}
    />
  );
}

/**
 * hitSlop that grows a control to the platform minimum touch target.
 * Pass the visual height, and the width when it is known (icon-only controls); a width of
 * undefined means the control is already wider than the target.
 */
export function touchSlop(minTarget: number, height: number, width?: number): Insets {
  const v = Math.max(0, (minTarget - height) / 2);
  const h = width === undefined ? 0 : Math.max(0, (minTarget - width) / 2);
  return { top: v, bottom: v, left: h, right: h };
}

/** One played motion, as the test seam reports it. Samples are [ms since start, value] pairs. */
export interface MotionEvent {
  readonly name: MotionName;
  readonly row: string;
  readonly motion: Motion;
  readonly from: number;
  readonly to: number;
  readonly phase: 'start' | 'end';
  /** The start velocity passed to a spring (units per second), if any. */
  readonly velocity?: number;
  /** End only: ms from start to Animated's finish callback. */
  readonly elapsedMs?: number;
  readonly finished?: boolean;
  readonly samples?: readonly (readonly [number, number])[];
}

let motionObserver: ((event: MotionEvent) => void) | null = null;

/** Test seam, not public API: called when a named motion starts and ends, with sampled values. Pass null to stop. */
export function setMotionObserver(next: ((event: MotionEvent) => void) | null): void {
  motionObserver = next;
}

/** The Motion of `name` with the theme's tokens and the current Reduce Motion setting. */
export function useMotion(name: MotionName): Motion {
  const { tokens: t } = useAppetiteTheme();
  const reduceMotion = useReduceMotion();
  return useMemo(() => motionFor(name, t.motion, reduceMotion), [name, t.motion, reduceMotion]);
}

/**
 * One animation of `value` to `toValue` with `motion` (call start). 'still' puts the value on `rest` (default
 * `toValue`) at once; 'instant' jumps. `from` is only reported to the observer.
 */
export function motionAnimation(
  value: Animated.Value,
  toValue: number,
  motion: Motion,
  options: {
    readonly name: MotionName;
    readonly native: boolean;
    readonly from?: number;
    readonly rest?: number;
    /** Springs only: the start velocity in units per second (a drag's release velocity). */
    readonly velocity?: number;
  },
): Animated.CompositeAnimation {
  const useNativeDriver = options.native;
  const inner =
    motion.kind === 'timing'
      ? Animated.timing(value, { toValue, duration: motion.duration, delay: motion.delay ?? 0, easing: Easing.bezier(...motion.easing), useNativeDriver })
      : motion.kind === 'spring'
        ? Animated.spring(value, { toValue, ...motion.spring, ...(options.velocity === undefined ? null : { velocity: options.velocity }), useNativeDriver })
        : Animated.timing(value, { toValue: motion.kind === 'still' ? (options.rest ?? toValue) : toValue, duration: 0, useNativeDriver });
  return {
    start: (callback) => {
      const observer = motionObserver;
      if (observer === null) {
        inner.start(callback);
        return;
      }
      const base = { name: options.name, row: motionRow(options.name), motion, from: options.from ?? Number.NaN, to: toValue, velocity: options.velocity };
      const t0 = Date.now();
      const samples: [number, number][] = [];
      const id = value.addListener(({ value: v }) => samples.push([Date.now() - t0, v]));
      observer({ ...base, phase: 'start' });
      inner.start((result) => {
        value.removeListener(id);
        observer({ ...base, phase: 'end', elapsedMs: Date.now() - t0, finished: result.finished, samples });
        callback?.(result);
      });
    },
    stop: () => inner.stop(),
    reset: () => inner.reset(),
  };
}

/** A value that rests at `target` and moves to every new target with `name`. No motion on mount. */
export function useMotionValue(target: number, name: MotionName, options: { readonly native?: boolean } = {}): Animated.Value {
  const motion = useMotion(name);
  const value = useRef(new Animated.Value(target)).current;
  const shown = useRef(target);
  // The value on screen, so an interrupted move reports where it really started from.
  const now = useRef(target);
  useEffect(() => {
    const id = value.addListener(({ value: v }) => {
      now.current = v;
    });
    return () => value.removeListener(id);
  }, [value]);
  const latest = useRef({ motion, native: options.native ?? true });
  latest.current = { motion, native: options.native ?? true };
  useEffect(() => {
    if (shown.current === target) return;
    shown.current = target;
    motionAnimation(value, target, latest.current.motion, { name, native: latest.current.native, from: now.current }).start();
  }, [target, value, name]);
  return value;
}

/**
 * A value that rests at 1 and, each time `on` turns true after mount, starts at `from` and plays to 1 with
 * `name` (a scale-in). Under Reduce Motion ('still') it stays at 1.
 */
export function useMotionEntrance(on: boolean, name: MotionName, from: number): Animated.Value {
  const motion = useMotion(name);
  const value = useRef(new Animated.Value(1)).current;
  const was = useRef(on);
  const latest = useRef(motion);
  latest.current = motion;
  useEffect(() => {
    if (was.current === on) return;
    was.current = on;
    if (!on) return;
    const m = latest.current;
    if (m.kind === 'timing' || m.kind === 'spring') value.setValue(from);
    motionAnimation(value, 1, m, { name, native: true, from, rest: 1 }).start();
  }, [on, value, name, from]);
  return value;
}

/** "#rrggbb", "#rrggbbaa" or "transparent" as [r, g, b, a] (a 0 to 1), as Animated normalizes it; null otherwise. */
function parseColor(color: string): readonly [number, number, number, number] | null {
  if (color === 'transparent') return [0, 0, 0, 0];
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i.exec(color);
  if (m === null) return null;
  const n = (h: string | undefined) => parseInt(h ?? 'ff', 16);
  return [n(m[1]), n(m[2]), n(m[3]), n(m[4]) / 255];
}

/** The color Animated draws at progress `p` of a crossfade from `a` to `b` (linear in r, g, b, a); `b` if unknown. */
export function mixColor(a: string, b: string, p: number): string {
  const x = parseColor(a);
  const y = parseColor(b);
  if (x === null || y === null) return p < 0.5 ? a : b;
  const c = (i: 0 | 1 | 2 | 3) => x[i] + (y[i] - x[i]) * p;
  return `rgba(${Math.round(c(0))}, ${Math.round(c(1))}, ${Math.round(c(2))}, ${Math.round(c(3) * 1000) / 1000})`;
}

/**
 * A color that crossfades to every new `color` with `name` (JS driver). Returns the plain color until it first
 * changes. A fade interrupted half way starts the next one from the color on screen, so a quick tap never jumps.
 */
export function useMotionColor(color: string, name: MotionName): string | Animated.AnimatedInterpolation<string> {
  const motion = useMotion(name);
  const [pair, setPair] = useState<readonly [string, string]>([color, color]);
  const progress = useRef(new Animated.Value(1)).current;
  const at = useRef(1);
  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      at.current = value;
    });
    return () => progress.removeListener(id);
  }, [progress]);
  const latest = useRef(motion);
  latest.current = motion;
  useEffect(() => {
    if (pair[1] === color) return;
    const from = at.current >= 1 ? pair[1] : mixColor(pair[0], pair[1], at.current);
    setPair([from, color]);
    progress.setValue(0);
    at.current = 0;
    motionAnimation(progress, 1, latest.current, { name, native: false, from: 0 }).start();
  }, [color, pair, progress, name]);
  return useMemo(
    () => (pair[0] === pair[1] ? pair[1] : progress.interpolate({ inputRange: [0, 1], outputRange: [pair[0], pair[1]] })),
    [pair, progress],
  );
}

/**
 * One selection indicator (docs/motion.md rule 6): its x and width move to every new `target` (the chosen item's
 * frame) with `names.x` and `names.width`, both on the JS driver, so a new target mid-flight keeps the velocity and
 * both edges stay in step (width is a layout property, which the native driver cannot animate). The first measured
 * target is shown at once. Read `x` as translateX and `width` as the view's width.
 */
export function useMotionIndicator(
  target: { readonly x: number; readonly width: number } | undefined,
  names: { readonly x: MotionName; readonly width: MotionName },
): { readonly x: Animated.Value; readonly width: Animated.Value } {
  const xMotion = useMotion(names.x);
  const widthMotion = useMotion(names.width);
  const x = useRef(new Animated.Value(target?.x ?? 0)).current;
  const width = useRef(new Animated.Value(target?.width ?? 0)).current;
  const now = useRef({ x: target?.x ?? 0, width: target?.width ?? 0 });
  useEffect(() => {
    const a = x.addListener(({ value }) => {
      now.current.x = value;
    });
    const b = width.addListener(({ value }) => {
      now.current.width = value;
    });
    return () => {
      x.removeListener(a);
      width.removeListener(b);
    };
  }, [x, width]);
  const shown = useRef<{ x: number; width: number } | null>(null);
  const latest = useRef({ xMotion, widthMotion });
  latest.current = { xMotion, widthMotion };
  const tx = target?.x;
  const tw = target?.width;
  const { x: xName, width: widthName } = names;
  useEffect(() => {
    if (tx === undefined || tw === undefined) return;
    const prev = shown.current;
    shown.current = { x: tx, width: tw };
    if (prev === null) {
      x.setValue(tx);
      width.setValue(tw);
      now.current = { x: tx, width: tw };
      return;
    }
    if (prev.x !== tx) motionAnimation(x, tx, latest.current.xMotion, { name: xName, native: false, from: now.current.x }).start();
    if (prev.width !== tw) motionAnimation(width, tw, latest.current.widthMotion, { name: widthName, native: false, from: now.current.width }).start();
  }, [tx, tw, x, width, xName, widthName]);
  return { x, width };
}

const PressScaleContext = createContext(true);

/**
 * Turns the press scale off for every pressable inside (docs/motion.md rule 9: bar items highlight in place).
 * Top Bar and Toolbar wrap their buttons in it; the pressed colors still fade.
 */
export function NoPressScale({ children }: { children: ReactNode }): ReactElement {
  return <PressScaleContext.Provider value={false}>{children}</PressScaleContext.Provider>;
}

export interface PressMotion {
  /** True between touch down and release (for the pressed colors, which the component fades with 'press.color'). */
  readonly pressed: boolean;
  /** Spread on the Pressable (or call from its own handlers). */
  readonly onPressIn: () => void;
  readonly onPressOut: () => void;
  /** The press scale (1 at rest): put it on a native-driven Animated.View around the control's visual. */
  readonly scale: Animated.Value;
}

/**
 * Press feedback of docs/motion.md M14 and M16. When `enabled` (iOS convention, not disabled): touch down shrinks to
 * MOTION_SCALE.pressed with press.down (press.scale recipe), release springs back to 1 with press.release from
 * wherever the press left it; under Reduce Motion it stays at 1. Turning `enabled` off (Material, disabled,
 * loading) mid-press puts the control back at rest. Inside NoPressScale it never scales.
 */
export function usePressMotion(enabled: boolean): PressMotion {
  const inScope = useContext(PressScaleContext);
  const scale = enabled && inScope;
  const down = useMotion('press.down');
  const release = useMotion('press.release');
  const [pressed, setPressed] = useState(false);
  const value = useRef(new Animated.Value(1)).current;
  const live = useRef({ scale, down, release });
  live.current = { scale, down, release };
  useEffect(() => {
    if (!scale) value.setValue(1);
  }, [scale, value]);
  return useMemo(
    () => ({
      pressed,
      scale: value,
      onPressIn: () => {
        setPressed(true);
        if (!live.current.scale) return;
        motionAnimation(value, MOTION_SCALE.pressed, live.current.down, { name: 'press.down', native: true, from: 1, rest: 1 }).start();
      },
      onPressOut: () => {
        setPressed(false);
        if (!live.current.scale) return;
        motionAnimation(value, 1, live.current.release, { name: 'press.release', native: true, from: MOTION_SCALE.pressed, rest: 1 }).start();
      },
    }),
    [pressed, value],
  );
}
