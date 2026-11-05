// Why: a single choice in a group, drawn like the Figma Radio, so List rows and forms match the
// design. Like Figma, the control has no label of its own: a List row or your own text labels it.
// Controlled: `checked` + `onCheckedChange` (a radio only turns on; the group turns the others off).
// Figma: Radio 211:4275 (State x Active, 8 variants), read 3 Oct 2026.
// Numbers it relies on:
// - Root 44 x 44 (height spacing/11); a 22 pt circle "bg" and a centered inner circle, radius full.
// - Off: bg bg/sub-200, inner 18 pt bg/white-0 (a 2 pt ring). On: bg brand/base, inner 10 pt
//   icon/on-color. Pressed off: bg brand/base, inner 18 pt. Pressed on: bg brand/pressed.
//   Disabled off: bg bg/soft-100, no inner circle. Disabled on: bg bg/soft-100, inner 10 pt fg/disabled-400.
// - Focused: FocusRing around the 22 pt circle.
// - Motion (docs/motion.md M03): radio.fade (the ring's fill crossfades; the 18 pt inner circle and the dot fade,
//   both stay mounted and are invisible at opacity 0 when not shown) and radio.dot (on select the dot springs in
//   from MOTION_SCALE.radioDotFrom 0.4; under Reduce Motion it does not scale, the fades stay). The dot's color
//   (only Disabled changes it) switches at once.
// Platform: the same on iOS and Material (no platform values in Figma); hit area grows to
// platform/min-touch-target. Selecting it plays toggle feedback (docs/platform-conventions.md P02: iOS
// selection, Android Toggle_On from API 34).
import { useState, type ReactElement } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import { FocusRing, MOTION_SCALE, touchSlop, useMotionColor, useMotionEntrance, useMotionValue } from '@appetite-ui/core/internal';
import { useHapticPlayer } from '@appetite-ui/core/internal';

export interface RadioProps {
  /** Figma Active. Controlled. */
  checked: boolean;
  /** Called with true when the user selects this radio. */
  onCheckedChange: (checked: boolean) => void;
  /** Figma State=Disabled. Default false. */
  disabled?: boolean;
  /** Required: the radio has no visible text of its own. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Circle sizes Figma stores on the component without a variable.
const OUTER = 22;
const INNER_OFF = 18;
const INNER_ON = 10;

const useStyles = makeStyles(({ tokens: t }) => ({
  root: { width: t.spacing.space11, height: t.spacing.space11, alignItems: 'center', justifyContent: 'center' },
  outer: { width: OUTER, height: OUTER, borderRadius: t.shapes.full, alignItems: 'center', justifyContent: 'center' },
}));

export function Radio({ checked, onCheckedChange, disabled = false, accessibilityLabel, style, testID }: RadioProps): ReactElement {
  const theme = useAppetiteTheme();
  const { tokens: t } = theme;
  const styles = useStyles();
  const playHaptic = useHapticPlayer();
  const [focused, setFocused] = useState(false);
  // Pressed is tracked here, not in Pressable's render callback, because the ring color is a hook.
  const [pressed, setPressed] = useState(false);
  const bg = disabled
    ? t.colors.bgSoft100
    : checked
      ? pressed ? t.colors.brandPressed : t.colors.brandBase
      : pressed ? t.colors.brandBase : t.colors.bgSub200;
  const ringColor = useMotionColor(bg, 'radio.fade');
  // The 18 pt bg/white-0 circle (off) and the 10 pt dot (on) are both kept and faded, so a fade-out is seen.
  const holeOpacity = useMotionValue(!checked && !disabled ? 1 : 0, 'radio.fade');
  const dotOpacity = useMotionValue(checked ? 1 : 0, 'radio.fade');
  const dotScale = useMotionEntrance(checked, 'radio.dot', MOTION_SCALE.radioDotFrom);
  const dotColor = disabled ? t.colors.fgDisabled400 : t.colors.iconOnColor;
  const circle = (size: number) => ({
    position: 'absolute' as const,
    top: (OUTER - size) / 2,
    left: (OUTER - size) / 2,
    width: size,
    height: size,
    borderRadius: t.shapes.full,
  });
  return (
    <Pressable
      testID={testID}
      style={[styles.root, style]}
      onPress={() => {
        if (checked) return;
        playHaptic({ kind: 'toggle', on: true });
        onCheckedChange(true);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={touchSlop(t.platform.minTouchTarget, t.spacing.space11, t.spacing.space11)}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
    >
      <View>
        <FocusRing visible={focused && !disabled} color={t.colors.brandBase} radius={OUTER / 2} />
        {/* The ring color is JS-driven; the inner circles' opacity and scale are native-driven, on their own Views. */}
        <Animated.View style={[styles.outer, { backgroundColor: ringColor }]}>
          <Animated.View style={[circle(INNER_OFF), { backgroundColor: t.colors.bgWhite0, opacity: holeOpacity }]} />
          <Animated.View style={[circle(INNER_ON), { backgroundColor: dotColor, opacity: dotOpacity, transform: [{ scale: dotScale }] }]} />
        </Animated.View>
      </View>
    </Pressable>
  );
}
