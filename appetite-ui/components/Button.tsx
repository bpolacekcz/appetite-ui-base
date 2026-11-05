// Why: Button performs an action; Type carries the meaning and Style the weight, exactly as the Figma
// component, so a Dev Mode selection maps to props one to one.
// Figma: Button 53:4429 (360 variants: Type x Style x Size x State x Icon Only), read 3 Oct 2026.
// Numbers it relies on:
// - Height sm / md / lg = spacing/9, /11, /14 (36, 44, 56). Horizontal padding spacing/3 (12) for sm
//   and md, spacing/4 (16) for lg; the label wrapper adds spacing/1-5 (6) on each side. Radius full.
// - Label text styles sm/emphasized, base/emphasized, lg/emphasized, in a HugText (Figma rounds the
//   label box up to whole points: 46 / 52 / 59 pt).
// - Icons with a label: 16 / 18 / 20 pt, stroke 1.5 / 1.75 / 1.75. Icon only: 20 / 22 / 24 pt, stroke
//   1.75 / 2 / 2, square 36 / 44 / 56. Strokes are what Figma stores on the instances (docs/log/00.md).
// - Colors per Type x Style x State: the COLORS table below, every entry a Color Tokens variable.
//   Brand Filled Pressed binds brand/pressed (Light colors/blue/700, Dark colors/blue/500; in the
//   tokens since the 3 Oct re-export).
// - Outline strokes are 1 pt INSIDE (border/w1), drawn as an overlay so they take no layout space.
// - Loading: label and icons at opacity 0, the "_Loading" arc (53:4466) centered on top.
// - Focused: 2 pt ring in brand/base (state/error/base-500 for Error) outside a 2 pt bg/white-0 gap.
// Platform: iOS shows Figma State=Pressed colors; Material keeps the default fill and adds press feedback
// of the label color at M3 pressed opacity (10 %): a native ripple on an Android device, a state layer on an
// iOS device that previews platform="material" (docs/platform-conventions.md P01). React Native draws a
// ripple as a rectangle in the Pressable's bounds and clips only children to a rounded parent, so the
// Pressable sits INSIDE a View with the full radius and overflow hidden and carries the fill itself; the
// ripple then draws over the fill, under the label, inside the pill. The FocusRing is a sibling of that
// clip, outside it. Hit area grows to platform/min-touch-target, declared on every View between the
// Pressable and the root (a parent only passes touches to children inside its own bounds plus its hitSlop).
// Motion (docs/motion.md M14, M16, iOS convention only): usePressMotion scales the button to MOTION_SCALE.pressed
// (0.96, press.scale recipe: 160 ms (0.22, 1, 0.36, 1)) on press in and springs it back to 1 on press out
// (spring/subtle; native driver, on the view that holds the ring and the pill), press.color crossfades the fill
// (state.color 160 ms, JS driver, on a fill layer inside the Pressable, because the Pressable is not an Animated
// view). Reduce Motion: no scale, the
// color still crossfades. Loading and disabled never scale. Material: no scale and no fade; the fill stays on the
// Pressable so the ripple draws over it. A button that is not pressed draws exactly as before.
import { useState, type ReactElement } from 'react';
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { AppetiteTokens } from '@appetite-ui/tokens';
import { useAppetiteTheme, type AppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import { textStyle, type TextStyleName } from '@appetite-ui/core';
import { HugText } from '../shared/HugText';
import { renderIconSlot, type IconSlot } from '../shared/Icon';
import {
  FONT_SCALE_CAP,
  FocusRing,
  InsideBorder,
  pressFeedback,
  touchSlop,
  useMotionColor,
  usePressMotion,
} from '@appetite-ui/core/internal';
import { LoadingArc } from '../shared/LoadingArc';

/** Figma property Type. */
export type ButtonType = 'brand' | 'neutral' | 'error';
/** Figma property Style (React Native reserves `style`). */
export type ButtonVariant = 'filled' | 'outline' | 'weak' | 'link';
/** Figma property Size. Figma's default is sm, so code's is too. */
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonCommonProps {
  /** Figma Type. Default "brand". */
  type?: ButtonType;
  /** Figma Style. Default "filled". */
  variant?: ButtonVariant;
  /** Figma Size. Default "sm" (the Figma default). */
  size?: ButtonSize;
  /** Figma State=Loading: hides the label and icons, shows the loading arc, ignores presses. Default false. */
  loading?: boolean;
  /** Figma State=Disabled. Default false. */
  disabled?: boolean;
  onPress?: () => void;
  /** Not in Figma: the screen reader state of a button that opens or closes something (FloatingActionButton). Leave out otherwise. */
  expanded?: boolean;
  /** Layout only (margins, alignSelf: 'stretch' for a full-width button). Colors come from the props. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface ButtonWithLabelProps extends ButtonCommonProps {
  /** Figma Icon Only=False. */
  iconOnly?: false;
  /** Figma Text. */
  text: string;
  /** Figma Icon Left + Icon Left Swap. An icon name draws the Figma icon at the size's size and stroke. */
  iconLeft?: IconSlot;
  /** Figma Icon Right + Icon Right Swap. */
  iconRight?: IconSlot;
  /** Defaults to text. */
  accessibilityLabel?: string;
}

interface ButtonIconOnlyProps extends ButtonCommonProps {
  /** Figma Icon Only=True: a circle at the same height, no label. */
  iconOnly: true;
  /** Figma Icon Swap. */
  icon: IconSlot;
  /** Required: an icon-only button has no visible text. */
  accessibilityLabel: string;
}

export type ButtonProps = ButtonWithLabelProps | ButtonIconOnlyProps;

type ColorToken = keyof AppetiteTokens['colors'];
type FillToken = ColorToken | null;

interface StyleColors {
  fill: { default: FillToken; pressed: FillToken; focused: FillToken; disabled: FillToken };
  border: { default: ColorToken | null; disabled: ColorToken | null };
  label: { default: ColorToken; pressed: ColorToken };
  icon: { default: ColorToken; pressed: ColorToken };
  arc: ColorToken;
  track: ColorToken;
}

// Read from the md variants of every Type x Style x State; sm and lg use the same colors.
const COLORS: Record<ButtonType, Record<ButtonVariant, StyleColors>> = {
  brand: {
    filled: {
      fill: { default: 'brandBase', pressed: 'brandPressed', focused: 'brandBase', disabled: 'bgSoft100' },
      border: { default: null, disabled: null },
      label: { default: 'staticWhite0', pressed: 'staticWhite0' },
      icon: { default: 'staticWhite0', pressed: 'staticWhite0' },
      arc: 'bgWhite0',
      track: 'alphaWhiteAlpha24',
    },
    outline: {
      fill: { default: 'bgWhite0', pressed: 'brandAlpha10', focused: 'bgWhite0', disabled: 'bgWhite0' },
      border: { default: 'brandBase', disabled: 'borderSoft100' },
      label: { default: 'brandBase', pressed: 'brandBase' },
      icon: { default: 'brandBase', pressed: 'brandBase' },
      arc: 'brandBase',
      track: 'brandAlpha24',
    },
    weak: {
      fill: { default: 'brandAlpha10', pressed: 'brandAlpha16', focused: 'brandAlpha10', disabled: 'bgSoft100' },
      border: { default: null, disabled: null },
      label: { default: 'brandBase', pressed: 'brandBase' },
      icon: { default: 'brandBase', pressed: 'brandBase' },
      arc: 'brandBase',
      track: 'brandAlpha24',
    },
    link: {
      fill: { default: null, pressed: 'brandAlpha10', focused: 'brandAlpha10', disabled: null },
      border: { default: null, disabled: null },
      label: { default: 'brandBase', pressed: 'brandBase' },
      icon: { default: 'brandBase', pressed: 'brandBase' },
      arc: 'brandBase',
      track: 'brandAlpha24',
    },
  },
  neutral: {
    filled: {
      fill: { default: 'bgStrong950', pressed: 'bgSurface800', focused: 'bgStrong950', disabled: 'bgSoft100' },
      border: { default: null, disabled: null },
      label: { default: 'textWhite0', pressed: 'textWhite0' },
      icon: { default: 'fgWhite0', pressed: 'fgWhite0' },
      arc: 'bgWhite0',
      track: 'alphaWhiteAlpha24',
    },
    outline: {
      fill: { default: 'bgWhite0', pressed: 'bgWeak50', focused: 'bgWhite0', disabled: 'bgWhite0' },
      border: { default: 'borderSoft100', disabled: 'borderSoft100' },
      label: { default: 'textSub700', pressed: 'textStrong950' },
      icon: { default: 'fgSub700', pressed: 'fgStrong950' },
      arc: 'fgStrong950',
      track: 'alphaBlackAlpha24',
    },
    weak: {
      fill: { default: 'bgWeak50', pressed: 'bgSoft100', focused: 'bgWeak50', disabled: 'bgSoft100' },
      border: { default: null, disabled: null },
      label: { default: 'textSub700', pressed: 'textStrong950' },
      icon: { default: 'fgSub700', pressed: 'fgStrong950' },
      arc: 'fgStrong950',
      track: 'alphaBlackAlpha24',
    },
    link: {
      fill: { default: null, pressed: 'bgWeak50', focused: 'bgWeak50', disabled: null },
      border: { default: null, disabled: null },
      label: { default: 'textSub700', pressed: 'textStrong950' },
      icon: { default: 'fgSub700', pressed: 'fgStrong950' },
      arc: 'fgStrong950',
      track: 'alphaBlackAlpha24',
    },
  },
  error: {
    filled: {
      fill: { default: 'stateErrorBase500', pressed: 'stateErrorDark700', focused: 'stateErrorBase500', disabled: 'bgSoft100' },
      border: { default: null, disabled: null },
      label: { default: 'staticWhite0', pressed: 'staticWhite0' },
      icon: { default: 'staticWhite0', pressed: 'staticWhite0' },
      arc: 'bgWhite0',
      track: 'alphaWhiteAlpha24',
    },
    outline: {
      fill: { default: 'bgWhite0', pressed: 'alphaRedAlpha10', focused: 'bgWhite0', disabled: 'bgWhite0' },
      border: { default: 'stateErrorBase500', disabled: 'borderSoft100' },
      label: { default: 'stateErrorBase500', pressed: 'stateErrorBase500' },
      icon: { default: 'stateErrorBase500', pressed: 'stateErrorBase500' },
      arc: 'stateErrorBase500',
      track: 'alphaRedAlpha24',
    },
    weak: {
      fill: { default: 'alphaRedAlpha10', pressed: 'alphaRedAlpha16', focused: 'alphaRedAlpha10', disabled: 'bgSoft100' },
      border: { default: null, disabled: null },
      label: { default: 'stateErrorBase500', pressed: 'stateErrorBase500' },
      icon: { default: 'stateErrorBase500', pressed: 'stateErrorBase500' },
      arc: 'stateErrorBase500',
      track: 'alphaRedAlpha24',
    },
    link: {
      fill: { default: null, pressed: 'alphaRedAlpha10', focused: 'alphaRedAlpha10', disabled: null },
      border: { default: null, disabled: null },
      label: { default: 'stateErrorBase500', pressed: 'stateErrorBase500' },
      icon: { default: 'stateErrorBase500', pressed: 'stateErrorBase500' },
      arc: 'stateErrorBase500',
      track: 'alphaRedAlpha24',
    },
  },
};

interface SizeSpec {
  height: number;
  paddingHorizontal: number;
  label: TextStyleName;
  icon: number;
  iconStroke: number;
  iconOnlyIcon: number;
  iconOnlyStroke: number;
}

function sizeSpec(t: AppetiteTokens, size: ButtonSize): SizeSpec {
  switch (size) {
    case 'sm':
      return { height: t.spacing.space9, paddingHorizontal: t.spacing.space3, label: 'sm/emphasized', icon: 16, iconStroke: 1.5, iconOnlyIcon: 20, iconOnlyStroke: 1.75 };
    case 'md':
      return { height: t.spacing.space11, paddingHorizontal: t.spacing.space3, label: 'base/emphasized', icon: 18, iconStroke: 1.75, iconOnlyIcon: 22, iconOnlyStroke: 2 };
    case 'lg':
      return { height: t.spacing.space14, paddingHorizontal: t.spacing.space4, label: 'lg/emphasized', icon: 20, iconStroke: 1.75, iconOnlyIcon: 24, iconOnlyStroke: 2 };
  }
}

function fillColor(theme: AppetiteTheme, token: FillToken): string | undefined {
  if (token === null) return undefined;
  return theme.tokens.colors[token];
}

const useStyles = makeStyles(({ tokens: t }) => ({
  root: { alignSelf: 'flex-start' },
  // The clip: the pill's outline. The Pressable (container) inside it carries the fill, the ripple and the content.
  clip: { borderRadius: t.shapes.full, overflow: 'hidden' },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: { paddingHorizontal: t.spacing.space1_5 },
  hidden: { opacity: 0 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
}));

export function Button(props: ButtonProps): ReactElement {
  const theme = useAppetiteTheme();
  const { tokens: t, platform } = theme;
  const styles = useStyles();
  const [focused, setFocused] = useState(false);
  const { type = 'brand', variant = 'filled', size = 'sm', loading = false, disabled = false, onPress, style, testID } = props;
  const colors = COLORS[type][variant];
  const spec = sizeSpec(t, size);
  const label = props.iconOnly ? undefined : props.text;
  const borderToken = disabled ? colors.border.disabled : colors.border.default;
  const ringColor = type === 'error' ? t.colors.stateErrorBase500 : t.colors.brandBase;

  const slop = touchSlop(t.platform.minTouchTarget, spec.height, props.iconOnly ? spec.height : undefined);
  // The ripple's color is the label color at rest (Material has no pressed colors).
  const feedback = pressFeedback(theme, disabled ? t.colors.textDisabled400 : t.colors[colors.label.default]);

  // iOS shows Figma's Pressed colors; Material keeps the default fill under press feedback.
  const look = (pressed: boolean) => {
    const iosPressed = pressed && platform === 'ios';
    const fillToken = disabled
      ? colors.fill.disabled
      : iosPressed
        ? colors.fill.pressed
        : focused
          ? colors.fill.focused
          : colors.fill.default;
    return {
      fill: fillColor(theme, fillToken),
      label: disabled ? t.colors.textDisabled400 : t.colors[iosPressed ? colors.label.pressed : colors.label.default],
      icon: disabled ? t.colors.fgDisabled400 : t.colors[iosPressed ? colors.icon.pressed : colors.icon.default],
    };
  };

  // iOS: the fill crossfades on a layer under the content; 'transparent' stands for "no fill" (Link at rest).
  const ios = platform === 'ios';
  // Turning disabled or loading (or Material) mid-press puts the button back at rest.
  const press = usePressMotion(ios && !disabled && !loading);
  const { scale, onPressIn: pressIn, onPressOut: pressOut } = press;
  const animatedFill = useMotionColor(look(press.pressed).fill ?? 'transparent', 'press.color');

  return (
    <View hitSlop={slop} style={[styles.root, style]}>
      <Animated.View hitSlop={slop} style={ios ? { transform: [{ scale }] } : undefined}>
        <FocusRing visible={focused && !disabled} color={ringColor} radius={spec.height / 2} />
        <View hitSlop={slop} style={styles.clip}>
          <Pressable
            testID={testID}
            onPress={onPress}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={disabled || loading}
            android_ripple={feedback.androidRipple}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            hitSlop={slop}
            accessibilityRole="button"
            accessibilityLabel={props.accessibilityLabel ?? label}
            accessibilityState={{ disabled, busy: loading, expanded: props.expanded }}
            // iOS Large Content Viewer (docs/platform-conventions.md P22): an icon-only button has no text that grows,
            // so a long press at a larger text size shows its label large (Toolbar, Top Bar and Compact bars use it).
            accessibilityShowsLargeContentViewer={props.iconOnly}
            accessibilityLargeContentTitle={props.iconOnly ? props.accessibilityLabel : undefined}
            style={({ pressed }) => [
              styles.container,
              {
                height: spec.height,
                backgroundColor: ios ? undefined : look(pressed).fill,
                ...(props.iconOnly ? { width: spec.height } : { paddingHorizontal: spec.paddingHorizontal }),
              },
            ]}
          >
            {({ pressed }) => {
              const { label: labelColor, icon: iconColor } = look(pressed);
              return (
                <>
                  {ios && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: animatedFill }]} />}
                  {props.iconOnly ? (
                    <View style={loading ? styles.hidden : undefined}>
                      {renderIconSlot(props.icon, spec.iconOnlyIcon, iconColor, spec.iconOnlyStroke)}
                    </View>
                  ) : (
                    <>
                      {props.iconLeft !== undefined && (
                        <View style={loading ? styles.hidden : undefined}>
                          {renderIconSlot(props.iconLeft, spec.icon, iconColor, spec.iconStroke)}
                        </View>
                      )}
                      <View style={[styles.labelWrapper, loading ? styles.hidden : undefined]}>
                        <HugText numberOfLines={1} maxFontSizeMultiplier={FONT_SCALE_CAP.button} style={[textStyle(t, spec.label), { color: labelColor }]}>
                          {props.text}
                        </HugText>
                      </View>
                      {props.iconRight !== undefined && (
                        <View style={loading ? styles.hidden : undefined}>
                          {renderIconSlot(props.iconRight, spec.icon, iconColor, spec.iconStroke)}
                        </View>
                      )}
                    </>
                  )}
                  {loading && (
                    <View style={styles.loading} pointerEvents="none">
                      <LoadingArc color={t.colors[colors.arc]} trackColor={t.colors[colors.track]} />
                    </View>
                  )}
                  {feedback.stateLayer(pressed && !disabled && !loading)}
                  <InsideBorder color={borderToken ? t.colors[borderToken] : undefined} width={t.border.w1} radius={spec.height / 2} />
                </>
              );
            }}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
