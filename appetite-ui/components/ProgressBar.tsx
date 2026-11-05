// Why: show how far a task has got (an upload, a step of an onboarding, a download) as a slim bar that
// looks like the Figma Progress Bar, and tell a screen reader the same number. Display only: it takes
// no touches, so it has no hit area, press state or focus ring.
// Figma: Progress Bar 10056:167 (Value x 5: 0, 25, 50, 75, 100; each 320 x 8), read 3 Oct 2026.
// Numbers it relies on:
// - Track: 8 pt high (Figma stores the height without a variable; it equals spacing/2 but is not bound
//   to it, so it is named in TRACK_HEIGHT), radius full (dimensions/radius/full = shapes.full), fill
//   bg/soft-100. It clips its children. Figma draws it 320 wide, fixed; code fills its parent's width
//   (alignSelf stretch, like Slider), so 320 is a layout choice of the screen, not of the component.
// - Indicator "Indicator": same height, radius full, fill brand/base, left aligned, width = value % of
//   the track (80, 160, 240, 320 pt at 25, 50, 75, 100 of 320). Figma draws 0.01 pt at Value=0 (a frame
//   cannot be 0 wide there); code draws the indicator 0 wide at 0 (nothing is visible either way).
// - Figma has no Disabled, Error or Loading state, no label and no value text, so code has none of them.
// - Motion (docs/motion.md M11): progressBar.fill. When `value` changes after mount the indicator's width grows
//   or shrinks to the new value (JS driver: a width in %); the first frame is the resting width. Under Reduce
//   Motion it jumps.
// Platform: the same visuals on iOS and Material (the Figma component has no platform values).
// Accessibility: role progressbar, accessibilityValue { min: 0, max: 100, now }. It needs a label
// because it has no visible text.
import type { ReactElement } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles } from '@appetite-ui/core';
import { useMotionValue } from '@appetite-ui/core/internal';

export interface ProgressBarProps {
  /** Figma Value (0, 25, 50, 75, 100), as any number from 0 to 100. Values outside the range are clamped, NaN counts as 0. */
  value: number;
  /** Required: the bar has no visible text. Say what is progressing ("Upload"), not the number. */
  accessibilityLabel: string;
  /** Layout only (margins, width). Colors come from the theme. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Values Figma stores on the component without a variable.
const TRACK_HEIGHT = 8;
// The range Figma's Value variants cover; also the accessibilityValue range.
const MIN = 0;
const MAX = 100;

/** The value kept in 0 to 100. NaN counts as 0. */
function clampValue(value: number): number {
  return Number.isNaN(value) ? MIN : Math.min(MAX, Math.max(MIN, value));
}

const useStyles = makeStyles(({ tokens: t }) => ({
  track: {
    alignSelf: 'stretch',
    height: TRACK_HEIGHT,
    borderRadius: t.shapes.full,
    backgroundColor: t.colors.bgSoft100,
    overflow: 'hidden',
  },
  indicator: {
    height: TRACK_HEIGHT,
    borderRadius: t.shapes.full,
    backgroundColor: t.colors.brandBase,
  },
}));

export function ProgressBar({ value, accessibilityLabel, style, testID }: ProgressBarProps): ReactElement {
  const styles = useStyles();
  const now = clampValue(value);
  const shown = useMotionValue(now, 'progressBar.fill', { native: false });

  return (
    <View
      testID={testID}
      style={[styles.track, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: MIN, max: MAX, now }}
    >
      <Animated.View style={[styles.indicator, { width: shown.interpolate({ inputRange: [MIN, MAX], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}
