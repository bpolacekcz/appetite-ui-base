// Why: Chip is a compact, selectable (and optionally removable) token: a filter, a tag, a recipient.
// Type picks the leading visual (an icon, an avatar, an emoji, a country flag or a brand logo),
// Selected inverts it, and the Close Button boolean becomes the presence of `onClose`, as in the
// Figma component, so a Dev Mode selection maps to props one to one.
// Figma: Chip 171:2513 (40 variants: State x Type x Selected), read 3 Oct 2026. Each variant is a 44 pt
// tall frame (Figma stores 44, unbound; it equals spacing/11 and the iOS touch target) that holds the
// 32 pt "Input Chip" pill centered in it.
// Numbers it relies on:
// - Pill: height 32 (spacing/8), vertical padding spacing/1-5 (6), radius full, hugging width. Right
//   padding spacing/3 (12). Left padding spacing/3 (12) for Type=Default (an icon), spacing/1-5 (6) for
//   the 20 pt visuals (avatar, emoji, flag, logo). Children sit side by side with no gap.
// - Label: a wrapper with horizontal padding spacing/1-5 (6) around a HugText in text style
//   sm/default (Inter 400 14/20, tracking 0.1). Hugging text rounds its width up like Figma.
// - Icon (Type=Default) and Close Button: 16 pt, stroke 1.5 (what Figma stores on both instances), in
//   fg/soft-500. Avatar, Emoji, Flag and Brand visuals fill a 20 x 20 pt slot. The Figma nested
//   instances are Avatar 61:1451 (Size sm, Symbol, no status), Emojis 47:18929, Country Flags 47:13302
//   and Major brands 242:7793.
// - Colors (Light). Unselected: fill bg/white-0, 1 pt INSIDE stroke border/sub-200, label text/sub-700.
//   Pressed: fill bg/weak-50. Focused: fill bg/soft-100, then outward from the pill a 1 pt OUTSIDE stroke
//   brand/base, a 3 pt bg/white-0 gap and a 2 pt brand/base ring (FOCUS_GAP below). Disabled: stroke
//   border/soft-100, label text/disabled-400, icons fg/disabled-400, nested visuals at 0.4 opacity.
//   Selected: fill bg/strong-950, no stroke, label text/white-0. Pressed adds the 10 % overlay
//   state/pressed-on-strong. Focused keeps the fill. Disabled: fill bg/soft-100.
// - Figma stores the 0.4 opacity of a disabled leading visual on the instance with no variable; it is
//   DISABLED_VISUAL_OPACITY below. The emoji font size is not in Figma either (Figma places a bitmap):
//   EMOJI_FONT_SIZE below is the size at which the system emoji font fills the 20 pt slot.
// Known Figma inconsistencies, resolved the same way in every state (also in docs/components/chip.mdx):
// - Focused Emoji, Flag and Brand variants store left padding 8 where every other state stores 6; code
//   keeps 6 so the content does not move when the chip gains focus.
// - Pressed Avatar, Emoji, Flag and Brand variants have no 1 pt stroke while Pressed Default keeps it;
//   code keeps it, so pressing never changes the outline.
// Platform: iOS shows Figma's Pressed fills; Material keeps the default fill and adds press feedback of
// the label color at M3 pressed opacity (10 %): a native ripple on an Android device, a state layer on an
// iOS device that previews platform="material" (docs/platform-conventions.md P01). The ripple is clipped
// to the pill by the pill's own rounded, overflow-hidden background, which holds the body Pressable, so
// the hit area (the 44 pt frame, 48 dp through hitSlop) is declared on every View between the Pressable
// and the root: a parent only passes touches to children inside its own bounds plus its own hitSlop.
// The close button's hit area is a square of platform/min-touch-target around the x. Haptics (P02):
// pressing the body plays selection feedback (useHapticPlayer), the close button none.
// Accessibility: the body and the close button are SIBLINGS, never nested, so both are reachable by
// screen readers. The body reads `text` (or accessibilityLabel) with its selected and disabled state;
// the nested visuals and the label are hidden from the tree because the body already speaks them.
// Motion (docs/motion.md M07): fill, stroke and label color crossfade with chip.color (state.color 160 ms) on both
// conventions; the iOS pressed fill (bg/weak-50, or the state/pressed-on-strong overlay's opacity when selected)
// goes through the same hooks. (M14, iOS convention only): usePressMotion scales the pill to 0.96 on press in and
// springs it back on release (native driver, on the pill: background, ring, content and close button). Material
// keeps its ripple or state layer and no scale. A chip at rest draws exactly as before.
import { useState, type ReactElement, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import { textStyle } from '@appetite-ui/core';
import { AnimatedHugText } from '../shared/HugText';
import { Icon, renderIconSlot, type IconSlot } from '../shared/Icon';
import { FONT_SCALE_CAP, pressFeedback, touchSlop, useMotionColor, useMotionValue, usePressMotion } from '@appetite-ui/core/internal';
import { useHapticPlayer } from '@appetite-ui/core/internal';
import { Avatar, type AvatarProps } from './Avatar';

/** Figma property Type. Figma's default is Default, so code's is too. */
export type ChipType = 'default' | 'avatar' | 'emoji' | 'flag' | 'brand';

/** Omit that keeps a union a union (Avatar's props are one interface per Type). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * The Avatar a Type=Avatar chip shows: Avatar's own props without the ones the chip fixes. The chip draws
 * it at Avatar's Size sm (20 pt), with no status, and hides it from screen readers (the chip's label
 * speaks for it).
 */
export type ChipAvatar = DistributiveOmit<AvatarProps, 'size' | 'topStatus' | 'bottomStatus' | 'style' | 'testID' | 'accessibilityLabel'>;

/** Figma stores 0.4 on the disabled leading visual instances and binds no variable to it. */
const DISABLED_VISUAL_OPACITY = 0.4;
/** Font size at which the system emoji font fills the 20 pt slot (Figma places a bitmap, not text). */
const EMOJI_FONT_SIZE = 16;
/**
 * The system emoji glyph sits 2 px (0.67 pt at 3x, measured on iOS 27 against Figma's render) right of the
 * slot's center at that size, because the glyph's left side bearing is wider than its right one. The
 * emoji is nudged back by this much so the face is centered in the slot like Figma's bitmap.
 */
const EMOJI_NUDGE = 2 / 3;
/** Figma's icon and close button stroke, as stored on their instances (their size is tokens.icon.sizeSm). */
const ICON_STROKE = 1.5;
/**
 * Width of the bg/white-0 gap of the Focused ring. Figma's Focused variant has two zero-blur shadows (spread
 * 4 brand/base, spread 2 bg/white-0) on a pill with a 1 pt outside stroke, but its render shows a 3 pt gap and a
 * 2 pt ring beyond the stroke (read from a 3x export of 171:2588: stroke 3 px, gap 9 px, ring 6 px). The
 * shared FocusRing (2 pt gap) is made for Button, which has no stroke, so the chip draws its own.
 */
const FOCUS_GAP = 3;

interface ChipCommonProps {
  /** Figma Text. */
  text: string;
  /** Figma Selected. Default false. */
  selected?: boolean;
  /** Figma State=Disabled. Default false. */
  disabled?: boolean;
  /**
   * Called when the chip body is pressed (usually toggles `selected`). Without it the chip is not
   * interactive: it is announced as text and shows no pressed feedback.
   */
  onPress?: () => void;
  /**
   * Figma Close Button (boolean). Passing a handler shows the x at the trailing edge and calls the
   * handler when it is pressed; leave it out for Close Button=false.
   */
  onClose?: () => void;
  /** Screen reader label of the close button. Default "Remove <text>". */
  closeLabel?: string;
  /** Screen reader label of the chip. Defaults to text. */
  accessibilityLabel?: string;
  /** Layout only (margins, alignSelf). Colors and size come from the props. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface ChipDefaultProps extends ChipCommonProps {
  /** Figma Type=Default; leave it out for this Type. Default "default". */
  type?: 'default';
  /** Figma Icon + Icon Swap. An icon name draws the Figma icon (16 pt, stroke 1.5); leave it out for Icon=false. */
  icon?: IconSlot;
}

interface ChipAvatarProps extends ChipCommonProps {
  /** Figma Type=Avatar: the nested Avatar instance. */
  type: 'avatar';
  /** The avatar to show, as Avatar props (Figma's chip uses Type Symbol). Size is fixed to sm. */
  avatar: ChipAvatar;
}

interface ChipEmojiProps extends ChipCommonProps {
  /** Figma Type=Emoji: the nested Emojis instance. */
  type: 'emoji';
  /** One emoji character, for example "😀" (Figma's sample is Grinning Face). Drawn in the system emoji font. */
  emoji: string;
}

interface ChipFlagProps extends ChipCommonProps {
  /** Figma Type=Flag: the nested Country Flags instance. */
  type: 'flag';
  /** A 20 x 20 pt flag (an Image or a vector). The library ships no flags. */
  flag: ReactNode;
}

interface ChipBrandProps extends ChipCommonProps {
  /** Figma Type=Brand: the nested Major brands instance. */
  type: 'brand';
  /** A 20 x 20 pt brand logo (an Image or a vector). The library ships no logos. */
  logo: ReactNode;
}

export type ChipProps = ChipDefaultProps | ChipAvatarProps | ChipEmojiProps | ChipFlagProps | ChipBrandProps;

const useStyles = makeStyles(({ tokens: t }) => ({
  // The 44 pt Figma frame: the chip's layout box and its touch target. It hugs the pill's width.
  root: { alignSelf: 'flex-start', maxWidth: '100%', height: t.spacing.space11, justifyContent: 'center' },
  pill: { height: t.spacing.space8, flexDirection: 'row', alignItems: 'center', paddingVertical: t.spacing.space1_5, paddingRight: t.spacing.space3 },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: t.shapes.full, overflow: 'hidden' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  visual: { width: t.spacing.space5, height: t.spacing.space5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emoji: { fontSize: EMOJI_FONT_SIZE, lineHeight: t.spacing.space5, textAlign: 'center', transform: [{ translateX: -EMOJI_NUDGE }] },
  content: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  labelWrapper: { flexShrink: 1, paddingHorizontal: t.spacing.space1_5 },
}));

/** One band of the Focused ring: a bordered, rounded box `inset` pt outside the pill. Layout-free. */
function Ring({ inset, width, color, radius }: { inset: number; width: number; color: string; radius: number }) {
  return (
    <View
      style={{ position: 'absolute', top: -inset, left: -inset, right: -inset, bottom: -inset, borderWidth: width, borderColor: color, borderRadius: radius + inset }}
    />
  );
}

export function Chip(props: ChipProps): ReactElement {
  const theme = useAppetiteTheme();
  const { tokens: t, platform } = theme;
  const styles = useStyles();
  const playHaptic = useHapticPlayer();
  const iconSize = t.icon.sizeSm;
  const [focused, setFocused] = useState(false);
  const { text, selected = false, disabled = false, onPress, onClose, closeLabel, style, testID } = props;
  const type: ChipType = props.type ?? 'default';
  const interactive = onPress !== undefined && !disabled;
  const ios = platform === 'ios';
  const press = usePressMotion(ios && interactive);
  const live = press.pressed && interactive;
  const iosPressed = live && ios;
  const ringed = focused && !disabled;

  // Fill, stroke and content colors per state (Figma variants, see the header).
  const fill = disabled
    ? selected ? t.colors.bgSoft100 : t.colors.bgWhite0
    : selected
      ? t.colors.bgStrong950
      : iosPressed
        ? t.colors.bgWeak50
        : focused
          ? t.colors.bgSoft100
          : t.colors.bgWhite0;
  const strokeColor = selected || ringed ? undefined : disabled ? t.colors.borderSoft100 : t.colors.borderSub200;
  const labelColor = disabled ? t.colors.textDisabled400 : selected ? t.colors.textWhite0 : t.colors.textSub700;
  const iconColor = disabled ? t.colors.fgDisabled400 : t.colors.fgSoft500;
  const feedback = pressFeedback(theme, labelColor);
  // M07: every state color crossfades; 'transparent' stands for "no stroke" (Selected, Focused).
  const animatedFill = useMotionColor(fill, 'chip.color');
  const animatedStroke = useMotionColor(strokeColor ?? 'transparent', 'chip.color');
  const animatedLabel = useMotionColor(labelColor, 'chip.color');
  // The Selected Pressed overlay fades in and out with the fill (iOS only; Material shows its ripple).
  const overlayOpacity = useMotionValue(iosPressed && selected ? 1 : 0, 'chip.color');
  const visualStyle = [styles.visual, disabled ? { opacity: DISABLED_VISUAL_OPACITY } : null];
  // Figma applies the 0.4 to the whole instance (an avatar is a disc, a photo and initials): flatten the
  // group first. Android would fade each child separately (native-only prop, ignored on iOS).
  const radius = t.shapes.full;

  let leading: ReactElement | null = null;
  if (props.type === 'avatar') {
    leading = (
      <View style={visualStyle} needsOffscreenAlphaCompositing={disabled}>
        <Avatar size="sm" {...props.avatar} accessibilityLabel={text} />
      </View>
    );
  } else if (props.type === 'emoji') {
    leading = (
      <View style={visualStyle} needsOffscreenAlphaCompositing={disabled}>
        <Text style={styles.emoji} allowFontScaling={false}>
          {props.emoji}
        </Text>
      </View>
    );
  } else if (props.type === 'flag') {
    leading = <View style={visualStyle} needsOffscreenAlphaCompositing={disabled}>{props.flag}</View>;
  } else if (props.type === 'brand') {
    leading = <View style={visualStyle} needsOffscreenAlphaCompositing={disabled}>{props.logo}</View>;
  } else if (props.icon !== undefined) {
    leading = <View>{renderIconSlot(props.icon, iconSize, iconColor, ICON_STROKE)}</View>;
  }

  // Close button: a square of the platform's minimum touch target around the 16 pt x. The right side is
  // capped at the pill's right padding (so the target stays inside the 44 pt frame) and the rest goes to
  // the left, over the label's trailing padding and the last points of the label.
  const closeSlopY = Math.max(0, (t.platform.minTouchTarget - iconSize) / 2);
  const closeSlopRight = t.spacing.space3;
  const closeSlopLeft = Math.max(0, t.platform.minTouchTarget - iconSize - closeSlopRight);

  // The body's touch area is the pill (32 pt) grown to the platform minimum, on the pill, its background and
  // the Pressable alike, and the root grows by what the 44 pt frame lacks.
  const pillSlop = touchSlop(t.platform.minTouchTarget, t.spacing.space8);
  const rootSlop = touchSlop(t.platform.minTouchTarget, t.spacing.space11);
  const handlePress = onPress === undefined
    ? undefined
    : () => {
        playHaptic({ kind: 'select' });
        onPress();
      };

  return (
    <View style={[styles.root, style]} hitSlop={rootSlop}>
      <Animated.View
        pointerEvents="box-none"
        hitSlop={pillSlop}
        style={[styles.pill, { paddingLeft: type === 'default' ? t.spacing.space3 : t.spacing.space1_5 }, ios ? { transform: [{ scale: press.scale }] } : null]}
      >
        <View pointerEvents="box-none" hitSlop={pillSlop} style={styles.background}>
          <Animated.View pointerEvents="none" style={[styles.layer, { backgroundColor: animatedFill }]} />
          {ios && <Animated.View pointerEvents="none" style={[styles.layer, { backgroundColor: t.colors.statePressedOnStrong, opacity: overlayOpacity }]} />}
          <Pressable
            testID={testID}
            style={StyleSheet.absoluteFill}
            android_ripple={feedback.androidRipple}
            onPress={handlePress}
            onPressIn={interactive ? press.onPressIn : undefined}
            onPressOut={press.onPressOut}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            hitSlop={pillSlop}
            accessibilityRole={onPress ? 'button' : 'text'}
            accessibilityLabel={props.accessibilityLabel ?? text}
            accessibilityState={{ disabled, selected }}
          />
          {feedback.stateLayer(live)}
          <Animated.View pointerEvents="none" style={[styles.layer, { borderWidth: t.border.w1, borderColor: animatedStroke, borderRadius: radius }]} />
        </View>
        {ringed && (
          // Focused: from the pill outward a 1 pt brand stroke, a 3 pt bg/white-0 gap and a 2 pt brand ring, as
          // measured on Figma's render (see FOCUS_GAP). Drawn largest first so each ring paints over the last.
          <View pointerEvents="none" style={styles.layer}>
            <Ring inset={t.border.w1 + FOCUS_GAP + t.border.w2} width={t.border.w2} color={t.colors.brandBase} radius={radius} />
            <Ring inset={t.border.w1 + FOCUS_GAP} width={FOCUS_GAP} color={t.colors.bgWhite0} radius={radius} />
            <Ring inset={t.border.w1} width={t.border.w1} color={t.colors.brandBase} radius={radius} />
          </View>
        )}
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
          {leading}
          <View style={styles.labelWrapper}>
            <AnimatedHugText numberOfLines={1} maxFontSizeMultiplier={FONT_SCALE_CAP.chip} style={[textStyle(t, 'sm/default'), { color: animatedLabel }]}>
              {text}
            </AnimatedHugText>
          </View>
        </View>
        {onClose !== undefined && (
          <Pressable
            testID={testID === undefined ? undefined : `${testID}-close`}
            onPress={onClose}
            disabled={disabled}
            hitSlop={{ top: closeSlopY, bottom: closeSlopY, left: closeSlopLeft, right: closeSlopRight }}
            accessibilityRole="button"
            accessibilityLabel={closeLabel ?? `Remove ${text}`}
            accessibilityState={{ disabled }}
          >
            <Icon name="x" size={iconSize} color={iconColor} strokeWidth={ICON_STROKE} />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}
