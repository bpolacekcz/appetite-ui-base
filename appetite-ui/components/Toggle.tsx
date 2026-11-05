// Why: an on/off switch that looks like the Figma Toggle on both platforms, so List rows and settings
// screens match the design. Controlled: `checked` + `onCheckedChange`.
// Figma: Toggle 216:449 (State x Active, 8 variants), read 3 Oct 2026.
// Numbers it relies on:
// - Root 52 x 44 (height spacing/11); the track "_Toggle-control" is 44 x 28, centered, radius full.
//   The track size is not bound to a variable in Figma; platform/switch/track-* (64 x 28 iOS,
//   52 x 32 Android since 3 Oct) is not used by this component (open question in docs/log/01.md).
// - Disabled On is Figma node opacity 0.4 on the track together with its white handle: the group is
//   flattened first (needsOffscreenAlphaCompositing; Android would otherwise fade the track and the handle
//   separately and show the track through the handle).
// - Track: off bg/soft-100, on brand/base; Pressed off bg/sub-200, Pressed on brand/pressed; Disabled off bg/soft-100, Disabled on brand/base at node opacity 0.4.
// - Handle 22 pt, static/static-white-0, 3 pt from the track edge; two drop shadows Figma stores as
//   literals (#0000000a 0 1.375 blur 2.75, #00000003 0 5.5 blur 5.5: dropShadow/xs scaled by 1.375, no style
//   is linked on the Handle ellipse), none when Disabled.
// - Focused: FocusRing around the track (2 pt bg/white-0 gap, 2 pt brand/base ring).
// - Motion (docs/motion.md M01): toggle.handle springs (spring/subtle) on the JS driver, so a flip mid-flight
//   retargets with the velocity kept (the native driver restarted from rest: measured, docs/log/14.md task 2b);
//   it jumps under Reduce Motion. toggle.track (the track fill, pressed colors included) crossfades over 120 ms.
// Platform: the same visuals on iOS and Material (the Figma component has no platform values); hit
// area grows to platform/min-touch-target (48 dp on Android). Flipping it plays toggle feedback
// (docs/platform-conventions.md P02: iOS selection, Android Toggle_On / Toggle_Off from API 34).
import { useState, type ReactElement } from 'react';
import { Animated, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import { FocusRing, touchSlop, useMotionColor, useMotionValue } from '@appetite-ui/core/internal';
import { useHapticPlayer } from '@appetite-ui/core/internal';

export interface ToggleProps {
  /** Figma Active. Controlled. */
  checked: boolean;
  /** Called with the new value when the user flips the switch. */
  onCheckedChange: (checked: boolean) => void;
  /** Figma State=Disabled. Default false. */
  disabled?: boolean;
  /** Required: the switch has no visible text of its own (a List row passes its label). */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Values Figma stores on the component without a variable.
const TRACK = { width: 44, height: 28 } as const;
const HANDLE = 22;
const HANDLE_INSET = (TRACK.height - HANDLE) / 2;
const DISABLED_ON_OPACITY = 0.4;
const HANDLE_SHADOW = '0px 1.375px 2.75px 0px rgba(0, 0, 0, 0.04), 0px 5.5px 5.5px 0px rgba(0, 0, 0, 0.01)';

const useStyles = makeStyles(({ tokens: t }) => ({
  root: { width: TRACK.width + 2 * t.spacing.space1, height: t.spacing.space11, alignItems: 'center', justifyContent: 'center' },
  track: { width: TRACK.width, height: TRACK.height, borderRadius: t.shapes.full },
  handle: {
    position: 'absolute',
    top: HANDLE_INSET,
    left: HANDLE_INSET,
    width: HANDLE,
    height: HANDLE,
    borderRadius: t.shapes.full,
    backgroundColor: t.colors.staticWhite0,
  },
}));

export function Toggle({ checked, onCheckedChange, disabled = false, accessibilityLabel, style, testID }: ToggleProps): ReactElement {
  const theme = useAppetiteTheme();
  const { tokens: t } = theme;
  const styles = useStyles();
  const playHaptic = useHapticPlayer();
  const [focused, setFocused] = useState(false);
  // Pressed is tracked here, not in Pressable's render callback, because the track color is a hook.
  const [pressed, setPressed] = useState(false);
  const position = useMotionValue(checked ? 1 : 0, 'toggle.handle', { native: false });
  const fill = disabled
    ? checked ? t.colors.brandBase : t.colors.bgSoft100
    : pressed
      ? checked ? t.colors.brandPressed : t.colors.bgSub200
      : checked ? t.colors.brandBase : t.colors.bgSoft100;
  const trackColor = useMotionColor(fill, 'toggle.track');
  const travel = TRACK.width - HANDLE - 2 * HANDLE_INSET;

  return (
    <Pressable
      testID={testID}
      style={[styles.root, style]}
      onPress={() => {
        playHaptic({ kind: 'toggle', on: !checked });
        onCheckedChange(!checked);
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={touchSlop(t.platform.minTouchTarget, t.spacing.space11)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked, disabled }}
    >
      <View>
        <FocusRing visible={focused && !disabled} color={t.colors.brandBase} radius={TRACK.height / 2} />
        {/* native-only prop: Android applies a View's opacity to each child separately (the track would show
            through the white handle); Figma and iOS apply node opacity to the flattened group. The track color
            is JS-driven, the handle's transform native-driven, so they are separate Animated.Views. */}
        <Animated.View
          needsOffscreenAlphaCompositing
          style={[styles.track, { backgroundColor: trackColor, opacity: disabled && checked ? DISABLED_ON_OPACITY : 1 }]}
        >
          <Animated.View
            style={[
              styles.handle,
              disabled ? null : { boxShadow: HANDLE_SHADOW },
              { transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, travel] }) }] },
            ]}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}
