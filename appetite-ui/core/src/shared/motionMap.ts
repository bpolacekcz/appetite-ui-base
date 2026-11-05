// Why: the React Native rows of docs/motion.md as pure data, with no runtime import, so the table can be run and
// checked on its own (scripts/motion-check.mjs loads this file with Node's type stripping) and read without a
// device. shared/interaction.tsx plays what this returns; components only name the motion ('tabs.indicator.x').
// Each name is one animated property of one map row: it says which Motion token or recipe drives it and what
// Reduce Motion does to it (docs/motion.md rule 3: travel and scale stop, a crossfade or a cut stays).
// This is the one motion table of the stack (docs/motion.md "One table per stack"): no component has numbers.
// Numbers it relies on:
// - Every duration, curve and spring token is a Motion token (packages/tokens, collection Motion), passed in as `m`.
// - MOTION_RECIPES: Bob's decisions of 29 Oct 2026 as docs/motion.md "Motion recipes" writes them for React Native:
//   spring.indicator { stiffness 260, damping 23.542, mass 1 } (damping ratio 0.73); spring.toast { 380, 34, 1 };
//   exit.ease-in 220 ms (0.4, 0, 1, 1); press.scale to 0.96 in 160 ms (0.22, 1, 0.36, 1); state.color 160 ms
//   motion/easing/standard; reveal.text 160 ms after a 160 ms delay, motion/easing/decelerate (P14 picks).
// - Figma values with no variable, from the Motion / sets named in docs/motion.md: Checkbox box from 0.8 (M02),
//   Radio dot from 0.4 (M03), Dialog enter from 0.92 and exit to 0.96 (M23, M24), Toast enter travel 24 pt and exit
//   lift 12 pt (M25, M26). Press 0.96 is the press.scale recipe (M14).
// - Spring tokens are SwiftUI's (response, dampingFraction, mass). React Native's Animated.spring takes
//   stiffness = (2 pi / response)^2 x mass and damping = 4 pi x dampingFraction x mass / response (subtle 438.65 /
//   37.699, default 246.74 / 25.133, as docs/motion.md "Springs in every stack" lists them).
// - SPRING_REST 0.001 is Animated.spring's own restDisplacementThreshold and restSpeedThreshold default.
// - FAB rows' rise 8 pt (P6, approved 30 Oct 2026): the row's own figure, as the Chart / Donut legend rows rise 8 pt.
// Approved 30 Oct 2026 and played here: P5 (tooltip bubble fade) and P6 (FAB rows rise and fade). P1, P2, P7, P8, P13,
// P15 and P16 are approved as written and add no motion to this table (a tab switch and the Stepper value stay
// instant, native transitions stay, the loading arc keeps turning, progress keeps its tween, Material has no scale).
// Not here, on purpose: P9 (chart entrances), which Bob has not decided.
import type { AppetiteFoundation } from '@appetite-ui/tokens';

/** The Motion tokens, as the theme carries them (`theme.tokens.motion`). */
export type MotionTokens = AppetiteFoundation['motion'];
type Bezier = readonly [number, number, number, number];

/** A spring as Animated.spring takes it. */
export interface SpringConfig {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

/** What one animated property does. */
export type Motion =
  /** Jumps to the new value (motion/duration/instant). */
  | { readonly kind: 'instant' }
  /** Does not move: the property stays at its resting value (Reduce Motion for travel and scale). */
  | { readonly kind: 'still' }
  | { readonly kind: 'timing'; readonly duration: number; readonly easing: Bezier; readonly delay?: number }
  | { readonly kind: 'spring'; readonly spring: SpringConfig };

/** Figma values with no Motion variable (see the header for the source of each). */
export const MOTION_SCALE = {
  checkboxFrom: 0.8,
  radioDotFrom: 0.4,
  /** press.scale (M14): the scale a pressed Button, Compact Button, Chip, card or FAB shrinks to. */
  pressed: 0.96,
  dialogEnterFrom: 0.92,
  dialogExitTo: 0.96,
} as const;
export const TOAST_ENTER_TRAVEL = 24;
export const TOAST_EXIT_LIFT = 12;
/** M29 (P6): how far below its place the speed dial's list starts and rises. */
export const FAB_ROWS_RISE = 8;
export const SPRING_REST = 0.001;

/** SwiftUI spring token to Animated.spring (see the header). */
export function springConfig(token: { readonly response: number; readonly damping: number; readonly mass: number }): SpringConfig {
  return {
    stiffness: ((2 * Math.PI) / token.response) ** 2 * token.mass,
    damping: (4 * Math.PI * token.damping * token.mass) / token.response,
    mass: token.mass,
  };
}

type Rule = (m: MotionTokens) => Motion;
const timing = (duration: number, easing: Bezier, delay?: number): Motion =>
  delay === undefined ? { kind: 'timing', duration, easing } : { kind: 'timing', duration, easing, delay };
const spring = (token: MotionTokens['springSubtle']): Motion => ({ kind: 'spring', spring: springConfig(token) });
const INSTANT: Rule = () => ({ kind: 'instant' });
const STILL: Rule = () => ({ kind: 'still' });

/** Bob's recipes of 29 Oct 2026 (docs/motion.md "Motion recipes"), the only place their numbers live. */
export const MOTION_RECIPES = {
  'spring.indicator': () => ({ kind: 'spring', spring: { stiffness: 260, damping: 23.542, mass: 1 } }),
  'spring.toast': () => ({ kind: 'spring', spring: { stiffness: 380, damping: 34, mass: 1 } }),
  'exit.ease-in': () => timing(220, [0.4, 0, 1, 1]),
  'press.scale': () => timing(160, [0.22, 1, 0.36, 1]),
  'state.color': (m) => timing(160, m.easingStandard),
  'reveal.text': (m) => timing(160, m.easingDecelerate, 160),
} as const satisfies Readonly<Record<string, Rule>>;
export type MotionRecipe = keyof typeof MOTION_RECIPES;
const recipe = (name: MotionRecipe): Rule => MOTION_RECIPES[name];

interface Row {
  /** The docs/motion.md row. */
  readonly row: string;
  readonly normal: Rule;
  /** Under Reduce Motion. Omitted = the same as normal (a crossfade or a color change). */
  readonly reduced?: Rule;
}

const toggleState: Rule = (m) => timing(m.durationToggleState, m.easingToggleState);
const slowEmphasized: Rule = (m) => timing(m.durationSlow, m.easingEmphasized);
const fastDecelerate: Rule = (m) => timing(m.durationFast, m.easingDecelerate);
const indicator = recipe('spring.indicator');
const stateColor = recipe('state.color');
const exitEaseIn = recipe('exit.ease-in');
const reveal = recipe('reveal.text');

/** Every animated property in the React Native library, by name. */
export const MOTION_MAP = {
  // M01 Toggle: the handle springs (spring/subtle) and can be retargeted mid-flight; it jumps under Reduce Motion.
  'toggle.handle': { row: 'M01', normal: (m) => spring(m.springToggleState), reduced: INSTANT },
  'toggle.track': { row: 'M01', normal: toggleState },
  // M02 Checkbox: the box springs in from 0.8 on check, fill and mark fade, the mark draws.
  'checkbox.box': { row: 'M02', normal: (m) => spring(m.springToggleState), reduced: STILL },
  'checkbox.fade': { row: 'M02', normal: toggleState },
  'checkbox.draw': { row: 'M02', normal: toggleState, reduced: STILL },
  // M03 Radio: the ring fills, the dot springs in from 0.4.
  'radio.dot': { row: 'M03', normal: (m) => spring(m.springToggleState), reduced: STILL },
  'radio.fade': { row: 'M03', normal: toggleState },
  // M04-M06: one indicator slides under the chosen item and takes its width (x and width on spring.indicator,
  // retargeted mid-flight); it jumps under Reduce Motion. Labels (and icons) crossfade with state.color.
  'segmented.pill.x': { row: 'M04', normal: indicator, reduced: INSTANT },
  'segmented.pill.width': { row: 'M04', normal: indicator, reduced: INSTANT },
  'segmented.label': { row: 'M04', normal: stateColor },
  'tabs.indicator.x': { row: 'M05', normal: indicator, reduced: INSTANT },
  'tabs.indicator.width': { row: 'M05', normal: indicator, reduced: INSTANT },
  'tabs.label': { row: 'M05', normal: stateColor },
  'navigation.pill.x': { row: 'M06', normal: indicator, reduced: INSTANT },
  'navigation.pill.width': { row: 'M06', normal: indicator, reduced: INSTANT },
  'navigation.color': { row: 'M06', normal: stateColor },
  // M07 Chip selection colors (M08 Vertical Card favorite: the kit draws no favorited heart, so nothing changes).
  'chip.color': { row: 'M07', normal: stateColor },
  // M11, M12: progress moves with slow + emphasized; it jumps under Reduce Motion (P15: no spring).
  'progressBar.fill': { row: 'M11', normal: slowEmphasized, reduced: INSTANT },
  'progressRing.arc': { row: 'M12', normal: slowEmphasized, reduced: INSTANT },
  // M13 Table sort: header label color and chevron crossfade (state.color), also under Reduce Motion.
  'table.sort': { row: 'M13', normal: stateColor },
  // M14 press (iOS convention): shrink to 0.96 with press.scale, spring back with spring/subtle from where the
  // press left it. M16: every pressed fill fades in and out with state.color.
  'press.down': { row: 'M14', normal: recipe('press.scale'), reduced: STILL },
  'press.release': { row: 'M14', normal: (m) => spring(m.springSubtle), reduced: STILL },
  'press.color': { row: 'M16', normal: stateColor },
  // M18: text field focus border crossfades.
  'field.focus': { row: 'M18', normal: stateColor },
  // M20-M22 Sheet. Enter: the sheet rises on motion/sheet/enter/spring, the scrim fades with motion/sheet/enter;
  // under Reduce Motion the sheet does not rise and fades with the scrim. Exit: motion/sheet/exit for both (R7).
  // A drag released short of the threshold springs back from the release velocity; it jumps under Reduce Motion.
  'sheet.enter': { row: 'M20', normal: (m) => spring(m.springSheetEnter), reduced: STILL },
  'sheet.scrim': { row: 'M20', normal: (m) => timing(m.durationSheetEnter, m.easingSheetEnter) },
  'sheet.exit': { row: 'M21', normal: (m) => timing(m.durationSheetExit, m.easingSheetExit) },
  'sheet.return': { row: 'M22', normal: (m) => spring(m.springSheetEnter), reduced: INSTANT },
  // M23, M24 Dialog: card scales and fades, scrim fades; the content reveals after the card (reveal.text; under
  // Reduce Motion with the card, no delay). Exit: exit.ease-in for card, content and scrim.
  'dialog.enter.scale': { row: 'M23', normal: (m) => spring(m.springDialogEnter), reduced: STILL },
  'dialog.enter.fade': { row: 'M23', normal: (m) => timing(m.durationDialogEnter, m.easingDialogEnter) },
  'dialog.reveal': { row: 'M23', normal: reveal, reduced: (m) => timing(m.durationDialogEnter, m.easingDialogEnter) },
  'dialog.exit.scale': { row: 'M24', normal: exitEaseIn, reduced: STILL },
  'dialog.exit.fade': { row: 'M24', normal: exitEaseIn },
  // M25-M27 Toast: drops in on motion/toast/enter/spring (R6), fades with motion/toast/enter, content reveals;
  // exit lifts and fades with exit.ease-in. Swipe: past the threshold it leaves with exit.ease-in from where the
  // finger let go (a fade under Reduce Motion), short of it it returns on spring.toast (jumps under Reduce Motion).
  'toast.enter.travel': { row: 'M25', normal: (m) => spring(m.springToastEnter), reduced: STILL },
  'toast.enter.fade': { row: 'M25', normal: (m) => timing(m.durationToastEnter, m.easingToastEnter) },
  'toast.reveal': { row: 'M25', normal: reveal, reduced: (m) => timing(m.durationToastEnter, m.easingToastEnter) },
  'toast.exit.travel': { row: 'M26', normal: exitEaseIn, reduced: STILL },
  'toast.exit.fade': { row: 'M26', normal: exitEaseIn },
  'toast.swipe.leave': { row: 'M27', normal: exitEaseIn, reduced: STILL },
  'toast.swipe.return': { row: 'M27', normal: recipe('spring.toast'), reduced: INSTANT },
  // M28 Tooltip: the bubble fades in (P5: fast + decelerate), its text reveals after it; both fade out together.
  'tooltip.open': { row: 'M28', normal: fastDecelerate },
  'tooltip.reveal': { row: 'M28', normal: reveal, reduced: fastDecelerate },
  'tooltip.close': { row: 'M28', normal: exitEaseIn },
  // M29 FAB speed dial: the rows rise 8 pt on spring.toast and fade in with fast + decelerate (P6); under Reduce
  // Motion they do not rise and the fade stays. The labels reveal after their rows (under Reduce Motion with them,
  // no delay: they are already inside the fading list); rows and labels leave together (exit.ease-in). The main
  // button's fill crossfades through Button's press.color (the same state.color recipe the row names for the icon).
  'fab.rows.rise': { row: 'M29', normal: recipe('spring.toast'), reduced: STILL },
  'fab.rows.fade': { row: 'M29', normal: fastDecelerate },
  'fab.label': { row: 'M29', normal: reveal, reduced: INSTANT },
  'fab.exit': { row: 'M29', normal: exitEaseIn },
} as const satisfies Readonly<Record<string, Row>>;

export type MotionName = keyof typeof MOTION_MAP;

/** The docs/motion.md row of a motion name. */
export function motionRow(name: MotionName): string {
  return MOTION_MAP[name].row;
}

/** What `name` does with these tokens, with Reduce Motion on or off. */
export function motionFor(name: MotionName, m: MotionTokens, reduceMotion: boolean): Motion {
  const entry: Row = MOTION_MAP[name];
  return reduceMotion && entry.reduced !== undefined ? entry.reduced(m) : entry.normal(m);
}

/** The value of a CSS cubic-bezier at progress x (0 to 1), as Easing.bezier computes it. */
export function bezierAt(easing: Bezier, x: number): number {
  const [x1, y1, x2, y2] = easing;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const curve = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (curve(x1, x2, mid) < x) lo = mid;
    else hi = mid;
  }
  return curve(y1, y2, (lo + hi) / 2);
}

/**
 * Position of an Animated.spring at `ms` after it starts at `x0` from its target (target = 0) with velocity `v0`
 * (units per second, toward positive), and its velocity: the underdamped solution React Native uses
 * (Libraries/Animated/animations/SpringAnimation.js). Every spring here has a damping ratio below 1.
 */
export function springState(s: SpringConfig, x0: number, v0: number, ms: number): { position: number; velocity: number } {
  const zeta = s.damping / (2 * Math.sqrt(s.stiffness * s.mass));
  const w0 = Math.sqrt(s.stiffness / s.mass);
  const w1 = w0 * Math.sqrt(1 - zeta * zeta);
  const t = Math.max(0, ms) / 1000;
  const a = x0;
  const b = (v0 + zeta * w0 * x0) / w1;
  const e = Math.exp(-zeta * w0 * t);
  const position = e * (a * Math.cos(w1 * t) + b * Math.sin(w1 * t));
  const velocity = e * ((b * w1 - zeta * w0 * a) * Math.cos(w1 * t) - (a * w1 + zeta * w0 * b) * Math.sin(w1 * t));
  return { position, velocity };
}

/** When Animated.spring stops for a move of `distance` from rest (both thresholds SPRING_REST), in ms. */
export function springSettleMs(s: SpringConfig, distance: number): number {
  for (let ms = 1; ms < 10000; ms++) {
    const { position, velocity } = springState(s, distance, 0, ms);
    if (Math.abs(position) <= SPRING_REST && Math.abs(velocity) <= SPRING_REST) return ms;
  }
  return 10000;
}
