// Why: a tick box drawn like the Figma Checkbox, so forms and List rows match the design. Like Figma,
// the control has no label of its own: your own text or a List row labels it, so `accessibilityLabel`
// is required. Controlled: `checked` (true, false or 'mixed') + `onCheckedChange`.
// Figma: Checkbox 169:6573 (State x Active, 15 variants), read 3 Oct 2026.
// Numbers it relies on:
// - Root 44 x 44 (height spacing/11); a 24 x 24 box "bg" in the center, radius 8 (shapes/md).
// - Fills and strokes (State, Active): Default off = fill bg/white-0 + 2 pt INSIDE stroke bg/sub-200;
//   Default on or mixed = fill brand/base, no stroke. Pressed off = fill bg/white-0 + stroke brand/base;
//   Pressed on or mixed = fill brand/pressed. Disabled = fill bg/soft-100, no stroke,
//   mark fg/disabled-400. Error off = fill bg/white-0 + stroke state/error-base-500; Error on or mixed =
//   fill state/error-base-500. Every other mark is icon/on-color.
// - Marks are Figma vectors, not icon instances, stroke 2.5 pt, round cap and join, no variable for the
//   width (typed MARK points below). Check "M 0 4.5 L 3.5 8 L 11 0" in an 11 x 8 box at (16.5, 18) of the
//   root; Mixed "M 0 0 L 10 0" in a 10 x 0 box at (17, 22). In the 24 pt box that is an offset of
//   (6.5, 8) and (7, 12): both marks are centered.
// - Focused: FocusRing around the 24 pt box (2 pt bg/white-0 gap, 2 pt brand/base ring), radius 8.
// - Figma has no Pressed + Error and no Focused + Error variant: Error keeps its colors while pressed,
//   and a focused Error box gets the same brand/base ring as every other focused box.
// - Motion (docs/motion.md M02): checkbox.box (on check the box springs in from MOTION_SCALE.checkboxFrom 0.8),
//   checkbox.fade (fill and INSIDE stroke colors crossfade, 'transparent' where Figma draws no stroke; the mark
//   fades in and out and stays mounted while it fades out) and checkbox.draw (on check the mark draws: its
//   dash offset runs from the mark's length, summed from the MARK points, to 0). Uncheck only fades. Under
//   Reduce Motion the box does not scale and the mark is drawn at once; the fades stay. The mark's color
//   (only Disabled changes it) switches at once.
// Accessibility: role checkbox with the checked state (true, false or 'mixed'); the box is remounted when it
// leaves 'mixed' because React Native on Android keeps ", mixed" in the spoken label otherwise.
// Platform: the same on iOS and Material (no platform values in Figma); the hit area grows to
// platform/min-touch-target (44 pt iOS, 48 dp Android). Changing it plays toggle feedback
// (docs/platform-conventions.md P02: iOS selection, Android Toggle_On / Toggle_Off from API 34).
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppetiteTheme, type AppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import {
  FocusRing,
  MOTION_SCALE,
  motionAnimation,
  touchSlop,
  useMotion,
  useMotionColor,
  useMotionEntrance,
  useMotionValue,
} from '@appetite-ui/core/internal';
import { useHapticPlayer } from '@appetite-ui/core/internal';

export interface CheckboxProps {
  /** Figma Active: true = True, false = False, 'mixed' = Mixed. Controlled. */
  checked: boolean | 'mixed';
  /** Called with the new value when the user presses the box. A mixed box turns on (true). */
  onCheckedChange: (checked: boolean) => void;
  /** Figma State=Disabled. Default false. */
  disabled?: boolean;
  /** Figma State=Error. Default false. Ignored while disabled, as in Figma. */
  error?: boolean;
  /** Required: the checkbox has no visible text of its own (your own text or a List row labels it). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Values Figma stores on the component without a variable.
const BOX = 24;
// Marks as Figma draws them: points in the 24 pt box (the Figma vector position minus the box origin at
// (10, 10) in the 44 pt root), stroke width in points.
type MarkName = 'check' | 'mixed';
const MARK_POINTS: Readonly<Record<MarkName, readonly (readonly [number, number])[]>> = {
  check: [[6.5, 12.5], [10, 16], [17.5, 8]],
  mixed: [[7, 12], [17, 12]],
};
const MARK = { strokeWidth: 2.5 } as const;

/** The SVG path through the mark's points ("M 6.5 12.5 L 10 16 L 17.5 8" for the check). */
function markPath(name: MarkName): string {
  return MARK_POINTS[name].map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
}

/** The mark's length in points: the sum of its segments (the dash the draw motion runs along). */
function markLength(name: MarkName): number {
  const points = MARK_POINTS[name];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a !== undefined && b !== undefined) length += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return length;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * How much of the mark is drawn, 0 to 1. Rests at 1 (no motion on mount); each time `on` turns true it runs
 * from 0 with checkbox.draw (JS driver: an SVG dash offset). Under Reduce Motion ('still') it stays at 1.
 */
function useMarkDraw(on: boolean): Animated.Value {
  const motion = useMotion('checkbox.draw');
  const value = useRef(new Animated.Value(1)).current;
  const was = useRef(on);
  const latest = useRef(motion);
  latest.current = motion;
  useEffect(() => {
    if (was.current === on) return;
    was.current = on;
    if (!on) return;
    const m = latest.current;
    if (m.kind === 'timing' || m.kind === 'spring') value.setValue(0);
    motionAnimation(value, 1, m, { name: 'checkbox.draw', native: false, from: 0, rest: 1 }).start();
  }, [on, value]);
  return value;
}

const useStyles = makeStyles(({ tokens: t }) => ({
  root: { width: t.spacing.space11, height: t.spacing.space11, alignItems: 'center', justifyContent: 'center' },
  box: { width: BOX, height: BOX, borderRadius: t.shapes.md, alignItems: 'center', justifyContent: 'center' },
}));

interface Look {
  fill: string;
  /** INSIDE stroke color, undefined when Figma draws none. */
  stroke?: string;
  mark: string;
}

/** The Figma variant colors for one State x Active. Disabled wins over Error, Error over Pressed. */
function look(theme: AppetiteTheme, on: boolean, disabled: boolean, error: boolean, pressed: boolean): Look {
  const c = theme.tokens.colors;
  if (disabled) return { fill: c.bgSoft100, mark: c.fgDisabled400 };
  if (error) return on ? { fill: c.stateErrorBase500, mark: c.iconOnColor } : { fill: c.bgWhite0, stroke: c.stateErrorBase500, mark: c.iconOnColor };
  if (pressed) return on ? { fill: c.brandPressed, mark: c.iconOnColor } : { fill: c.bgWhite0, stroke: c.brandBase, mark: c.iconOnColor };
  return on ? { fill: c.brandBase, mark: c.iconOnColor } : { fill: c.bgWhite0, stroke: c.bgSub200, mark: c.iconOnColor };
}

export function Checkbox({ checked, onCheckedChange, disabled = false, error = false, accessibilityLabel, style, testID }: CheckboxProps): ReactElement {
  const theme = useAppetiteTheme();
  const { tokens: t } = theme;
  const styles = useStyles();
  const playHaptic = useHapticPlayer();
  const [focused, setFocused] = useState(false);
  // Pressed is tracked here, not in Pressable's render callback: the colors are hooks, and the hooks must live
  // outside the Pressable that is remounted when the box leaves 'mixed' (see below), or a fade would restart.
  const [pressed, setPressed] = useState(false);
  const on = checked !== false;
  const v = look(theme, on, disabled, error, pressed);
  const fill = useMotionColor(v.fill, 'checkbox.fade');
  const stroke = useMotionColor(v.stroke ?? 'transparent', 'checkbox.fade');
  const scale = useMotionEntrance(on, 'checkbox.box', MOTION_SCALE.checkboxFrom);
  const markOpacity = useMotionValue(on ? 1 : 0, 'checkbox.fade');
  const drawn = useMarkDraw(on);
  // The mark that is shown, kept while an unchecked box fades it out (so a mixed box fades its dash).
  const shownMark = useRef<MarkName>(checked === 'mixed' ? 'mixed' : 'check');
  if (checked !== false) shownMark.current = checked === 'mixed' ? 'mixed' : 'check';
  const mark = shownMark.current;
  const length = markLength(mark);
  return (
    <Pressable
      // Android keeps the ", mixed" it appends to the label after `checked` leaves 'mixed' (React Native's
      // BaseViewManager.updateViewContentDescription only runs for the string state), so a box that was mixed
      // is mounted anew once it is not (the same fix as List's checkbox row; measured on the Pixel_9, 7 Oct 2026).
      key={checked === 'mixed' ? 'mixed' : 'settled'}
      testID={testID}
      style={[styles.root, style]}
      onPress={() => {
        playHaptic({ kind: 'toggle', on: checked !== true });
        onCheckedChange(checked !== true);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={touchSlop(t.platform.minTouchTarget, t.spacing.space11, t.spacing.space11)}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
    >
      <View>
        <FocusRing visible={focused && !disabled} color={t.colors.brandBase} radius={t.shapes.md} />
        {/* The scale is native-driven, the colors JS-driven: separate Animated.Views. */}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Animated.View style={[styles.box, { backgroundColor: fill }]}>
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { borderWidth: t.border.w2, borderColor: stroke, borderRadius: t.shapes.md }]}
            />
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: markOpacity }]}>
              <Svg width={BOX} height={BOX} viewBox={`0 0 ${BOX} ${BOX}`} style={{ position: 'absolute' }}>
                <AnimatedPath
                  d={markPath(mark)}
                  fill="none"
                  stroke={v.mark}
                  strokeWidth={MARK.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={[length, length]}
                  strokeDashoffset={drawn.interpolate({ inputRange: [0, 1], outputRange: [length, 0] })}
                />
              </Svg>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </View>
    </Pressable>
  );
}
