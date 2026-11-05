// Why: Avatar shows who did what (profiles, chats, activity). Type picks photo, symbol or initials, Size
// one of nine steps, and the two Status booleans pin a small badge to a corner, as in the Figma
// component, so a Dev Mode selection maps to props one to one.
// Figma: Avatar 61:1218 (324 variants: Avatar{12 sample people} x Type x Size, plus the Top Status and
// Bottom Status booleans), read 3 Oct 2026. The status badges are Figma's private sets
// "_Avatar Status - Top" 61:5668 and "_Avatar Status - Bottom" 61:5652.
// Numbers it relies on:
// - Diameter per Size (Figma stores them fixed, bound to no variable, and 72 has no spacing token):
//   6xl 80, 5xl 72, 4xl 64, 3xl 56, 2xl 48, xl 40, lg 32, base 24, sm 20. Radius shapes/full.
// - Photo: an image filling the circle (Figma scale mode FILL = resizeMode cover). The 12 sample people
//   are content, not a property: code takes `source`.
// - Symbol and Acronym fill with the tone's 200 step; the glyph and the initials use its 900 step. Figma
//   gives each sample person one of six tones (gray, yellow, blue, sky, purple, red); `tone` picks it,
//   default blue (the Figma default person, Maren Lindqvist, is blue).
// - Symbol: a head (0.4 of the diameter) and a body (0.8 x 0.6), both true ellipses, in static-white-0 at
//   90 % and 60 %, clipped by the circle; the per-size offsets are Figma's own rounded numbers (SIZES below).
// - Acronym: initials centered, in the text style Figma binds per size (SIZES below): 3xl/default at 6xl,
//   2xl/default at 5xl and 4xl, lg/default at 3xl, base/default at 2xl and xl, sm/default at lg,
//   xs/default at base and sm. Figma shows two letters from xl up and one letter at lg, base and sm.
// - Status badges scale with the avatar: box 32, 28, 28, 24, 20, 18, 16, 12, 12 at the nine sizes,
//   at the per-size corner offsets in SIZES (Top sits above the top-right corner, Bottom below it).
//   Inside a 32 box: Top add / check / delete = white disc 28 at (2, 2), colored disc 24 at (4, 4), icon 12
//   (stroke 1.25); Top verified = the scalloped seal drawn from Figma's own SVG export of 61:5669;
//   Bottom online / offline / busy / away = white disc 20 at (6, 6), colored disc 12 at (10, 10);
//   Bottom comment ... add = white ring 32, colored disc 27 at (2.5, 2.5), icon 16 (stroke 1.33).
//   Figma stores the check stroke per avatar size (1.25, 1, 0.75, 0.8152, 0.7337, 0.6522, 0.4891);
//   other icons are scaled by the same ratio, which is UNVERIFIED (only the check is read per size).
// - The disc statuses and the seal carry Figma's two drop shadows (0 1 blur 2 at 4 %, 0 4 blur 4 at 1 %
//   black); the seal's are not drawn (see the comment at the seal). Only Size=6xl links the effect style
//   dropShadow/xs on its status instances; the other sizes store the same two shadows scaled by the avatar
//   size as literals (5xl 0.91 / 1.83 and 3.65, ... 0.37 / 0.75 and 1.5), so the code keeps one local
//   literal (the 6xl value) for every size instead of the shared style.
// Platform: none. Avatar is not interactive, so it has no pressed state and no hit area; a List row or a
// Chip that wraps it owns the touch target.
import type { ReactElement } from 'react';
import { Image, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import type { AppetiteTokens } from '@appetite-ui/tokens';
import { useAppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import { textStyle, type TextStyleName } from '@appetite-ui/core';
import { Icon, type IconName } from '../shared/Icon';

/** Figma property Type. */
export type AvatarType = 'photo' | 'symbol' | 'acronym';
/** Figma property Size. Figma's default is 6xl, so code's is too. */
export type AvatarSize = '6xl' | '5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'base' | 'sm';
/** The six color pairs the Figma sample people use for Symbol and Acronym (tokens colors/<tone>/200 and 900). */
export type AvatarTone = 'gray' | 'yellow' | 'blue' | 'sky' | 'purple' | 'red';
/** Figma "_Avatar Status - Top" property Type. */
export type AvatarTopStatus = 'verified' | 'add' | 'delete' | 'check';
/** Figma "_Avatar Status - Bottom" property Type. */
export type AvatarBottomStatus = 'online' | 'offline' | 'busy' | 'away' | 'comment' | 'mention' | 'assigned' | 'completed' | 'due' | 'add';

interface AvatarCommonProps {
  /** Figma Size. Default "6xl" (the Figma default). */
  size?: AvatarSize;
  /**
   * Figma Top Status (boolean) with the nested "_Avatar Status - Top" Type. Leave it out for
   * Top Status=false. A status is drawn, not announced: say it in accessibilityLabel when it matters.
   */
  topStatus?: AvatarTopStatus;
  /**
   * Figma Bottom Status (boolean) with the nested "_Avatar Status - Bottom" Type. Leave it out for
   * Bottom Status=false. A status is drawn, not announced: say it in accessibilityLabel when it matters.
   */
  bottomStatus?: AvatarBottomStatus;
  /** Layout only (margins, alignSelf). The avatar's size comes from `size`. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface AvatarPhotoProps extends AvatarCommonProps {
  /** Figma Type=Photo (the default). */
  type?: 'photo';
  /** The picture. Figma's twelve sample people are content, so code takes any image source. */
  source: ImageSourcePropType;
  /** Required: a photo has no visible text. Usually the person's name. */
  accessibilityLabel: string;
}

interface AvatarSymbolProps extends AvatarCommonProps {
  /** Figma Type=Symbol: the generic person glyph. */
  type: 'symbol';
  /** Color pair of the sample person. Default "blue". */
  tone?: AvatarTone;
  /** Required: the symbol has no visible text. */
  accessibilityLabel: string;
}

interface AvatarAcronymProps extends AvatarCommonProps {
  /** Figma Type=Acronym: the person's initials. */
  type: 'acronym';
  /**
   * The person's full name. Initials are the first letter of the first word and of the last word
   * ("Maren Lindqvist" gives "ML"); lg, base and sm show the first letter only, as Figma does. A
   * one-word name gives one letter.
   */
  name: string;
  /** Color pair of the sample person. Default "blue". */
  tone?: AvatarTone;
  /** Defaults to name. */
  accessibilityLabel?: string;
}

export type AvatarProps = AvatarPhotoProps | AvatarSymbolProps | AvatarAcronymProps;

type ColorToken = keyof AppetiteTokens['colors'];

// Tone -> fill (200) and content (900) tokens, read from the 6xl Acronym variants of the twelve people.
const TONES: Record<AvatarTone, { fill: ColorToken; content: ColorToken }> = {
  gray: { fill: 'gray200', content: 'gray900' },
  yellow: { fill: 'yellow200', content: 'yellow900' },
  blue: { fill: 'blue200', content: 'blue900' },
  sky: { fill: 'sky200', content: 'sky900' },
  purple: { fill: 'purple200', content: 'purple900' },
  red: { fill: 'red200', content: 'red900' },
};

interface SizeSpec {
  diameter: number;
  /** Text style of the initials, as bound in Figma. */
  text: TextStyleName;
  /** Figma shows two letters from xl up, one at lg, base and sm. */
  letters: 1 | 2;
  /** Side of the status badge box (a 32 box at 6xl, scaled with the avatar). */
  box: number;
  /** Top-left corner of the Top status box, relative to the avatar. */
  top: { x: number; y: number };
  /** Top-left corner of the Bottom status box, relative to the avatar. */
  bottom: { x: number; y: number };
  /** Stroke of the check inside the Top status as Figma stores it at this size, in points. */
  checkStroke: number;
  /** Symbol: top-left corners of the body and the head, in Figma's own rounded numbers. */
  body: { x: number; y: number };
  head: { x: number; y: number };
  /** Acronym: y of the Initials text frame inside the avatar. 0 everywhere except sm, where Figma places it 1 pt low (61:3973, read 4 Oct 2026). */
  initialsY: number;
}

// Figma stores all of these as fixed numbers on the variants and instances; none is bound to a variable.
const SIZES: Record<AvatarSize, SizeSpec> = {
  '6xl': { diameter: 80, text: '3xl/default', letters: 2, box: 32, top: { x: 54, y: -6 }, bottom: { x: 54, y: 54 }, checkStroke: 1.25, body: { x: 8, y: 54 }, head: { x: 24, y: 16 }, initialsY: 0 },
  '5xl': { diameter: 72, text: '2xl/default', letters: 2, box: 28, top: { x: 50, y: -6 }, bottom: { x: 50, y: 49 }, checkStroke: 1, body: { x: 7, y: 49 }, head: { x: 22, y: 14 }, initialsY: 0 },
  '4xl': { diameter: 64, text: '2xl/default', letters: 2, box: 28, top: { x: 44, y: -7 }, bottom: { x: 44, y: 42 }, checkStroke: 1, body: { x: 6, y: 43 }, head: { x: 19, y: 13 }, initialsY: 0 },
  '3xl': { diameter: 56, text: 'lg/default', letters: 2, box: 24, top: { x: 38, y: -6 }, bottom: { x: 38, y: 37 }, checkStroke: 0.75, body: { x: 6, y: 38 }, head: { x: 17, y: 11 }, initialsY: 0 },
  '2xl': { diameter: 48, text: 'base/default', letters: 2, box: 20, top: { x: 32, y: -4 }, bottom: { x: 32, y: 32 }, checkStroke: 0.8152, body: { x: 5, y: 32 }, head: { x: 14, y: 10 }, initialsY: 0 },
  xl: { diameter: 40, text: 'base/default', letters: 2, box: 18, top: { x: 26, y: -4 }, bottom: { x: 26, y: 26 }, checkStroke: 0.7337, body: { x: 4, y: 27 }, head: { x: 12, y: 8 }, initialsY: 0 },
  lg: { diameter: 32, text: 'sm/default', letters: 1, box: 16, top: { x: 22, y: -5 }, bottom: { x: 22, y: 20 }, checkStroke: 0.6522, body: { x: 3, y: 22 }, head: { x: 10, y: 6 }, initialsY: 0 },
  base: { diameter: 24, text: 'xs/default', letters: 1, box: 12, top: { x: 15, y: -3 }, bottom: { x: 15, y: 16 }, checkStroke: 0.4891, body: { x: 2, y: 16 }, head: { x: 7, y: 5 }, initialsY: 0 },
  sm: { diameter: 20, text: 'xs/default', letters: 1, box: 12, top: { x: 11, y: -3 }, bottom: { x: 11, y: 11 }, checkStroke: 0.4891, body: { x: 2, y: 13 }, head: { x: 6, y: 4 }, initialsY: 1 },
};

/** The two Figma drop shadows every status carries: 0 1 blur 2 at 4 % black and 0 4 blur 4 at 1 % black. */
const STATUS_SHADOW = '0px 1px 2px 0px rgba(0, 0, 0, 0.04), 0px 4px 4px 0px rgba(0, 0, 0, 0.01)';
/** Opacities of the symbol's body and head, from the Figma ellipses. */
const SYMBOL_BODY_OPACITY = 0.6;
const SYMBOL_HEAD_OPACITY = 0.9;
/** The checks, plus and x inside Top statuses have a 1.25 stroke in a 32 box; the Bottom icons 1.33. */
const TOP_ICON_STROKE = 1.25;
const BOTTOM_ICON_STROKE = 1.33;

interface TopSpec {
  fill: ColorToken;
  icon: IconName | null;
}
const TOP: Record<AvatarTopStatus, TopSpec> = {
  verified: { fill: 'stateVerifiedBase500', icon: null },
  add: { fill: 'stateFadedBase500', icon: 'plus' },
  delete: { fill: 'stateErrorBase500', icon: 'x' },
  check: { fill: 'stateSuccessBase500', icon: 'check' },
};

interface BottomSpec {
  fill: ColorToken;
  /** null: the plain dot of the presence statuses. */
  icon: IconName | null;
}
const BOTTOM: Record<AvatarBottomStatus, BottomSpec> = {
  online: { fill: 'stateSuccessBase500', icon: null },
  offline: { fill: 'stateFadedBase500', icon: null },
  busy: { fill: 'stateErrorBase500', icon: null },
  away: { fill: 'stateAwayBase500', icon: null },
  comment: { fill: 'stateInformationBase500', icon: 'message-circle' },
  mention: { fill: 'stateFeatureBase500', icon: 'at-sign' },
  assigned: { fill: 'stateAwayBase500', icon: 'user-check' },
  completed: { fill: 'stateSuccessBase500', icon: 'check' },
  due: { fill: 'stateHighlightedBase500', icon: 'calendar-clock' },
  add: { fill: 'brandBase', icon: 'plus' },
};

// The Verified seal, from Figma's SVG export of "_Avatar Status - Top" Type=Verified (61:5669). The export
// frames the 32 box at x = 2, so the viewBox starts at 2. The white ring is the outer silhouette with the
// colored shape cut out (evenodd).
const SEAL_RING =
  'M22.4176 5.21417L20.1463 2.94283C18.9486 1.74515 17.0068 1.74515 15.8091 2.94283L13.5378 5.21417H10.3256C8.63182 5.21417 7.25874 6.58725 7.25874 8.28102V11.4932L4.9874 13.7645C3.78972 14.9622 3.78972 16.904 4.9874 18.1017L7.25874 20.3731V23.5852C7.25874 25.279 8.63182 26.6521 10.3256 26.6521H13.5378L15.8091 28.9234C17.0068 30.1211 18.9486 30.1211 20.1463 28.9234L22.4176 26.6521H25.6298C27.3236 26.6521 28.6966 25.279 28.6966 23.5852V20.3731L30.968 18.1017C32.1657 16.904 32.1657 14.9622 30.968 13.7645L28.6966 11.4932V8.28102C28.6966 6.58725 27.3236 5.21417 25.6298 5.21417H22.4176ZM21.2713 6.95932C21.463 7.15104 21.723 7.25874 21.9942 7.25874H25.6298C26.1944 7.25874 26.6521 7.71643 26.6521 8.28102V11.9166C26.6521 12.1878 26.7598 12.4478 26.9515 12.6395L29.5222 15.2103C29.9215 15.6095 29.9215 16.2568 29.5222 16.656L26.9515 19.2267C26.7598 19.4185 26.6521 19.6785 26.6521 19.9496V23.5852C26.6521 24.1498 26.1944 24.6075 25.6298 24.6075H21.9942C21.723 24.6075 21.463 24.7152 21.2713 24.9069L18.7006 27.4777C18.3013 27.8769 17.654 27.8769 17.2548 27.4777L14.6841 24.9069C14.4923 24.7152 14.2323 24.6075 13.9612 24.6075H10.3256C9.761 24.6075 9.30331 24.1498 9.30331 23.5852V19.9496C9.30331 19.6785 9.19561 19.4185 9.00389 19.2267L6.43313 16.656C6.0339 16.2568 6.0339 15.6095 6.43313 15.2103L9.00389 12.6395C9.19561 12.4478 9.30331 12.1878 9.30331 11.9166V8.28102C9.30331 7.71643 9.761 7.25874 10.3256 7.25874H13.9612C14.2323 7.25874 14.4923 7.15104 14.6841 6.95932L17.2548 4.38856C17.654 3.98933 18.3013 3.98933 18.7006 4.38856L21.2713 6.95932Z';
const SEAL_BODY =
  'M21.9942 7.25874C21.723 7.25874 21.463 7.15104 21.2713 6.95932L18.7006 4.38856C18.3013 3.98933 17.654 3.98933 17.2548 4.38856L14.6841 6.95932C14.4923 7.15104 14.2323 7.25874 13.9612 7.25874H10.3256C9.761 7.25874 9.30331 7.71643 9.30331 8.28102V11.9166C9.30331 12.1878 9.19561 12.4478 9.00389 12.6395L6.43313 15.2103C6.0339 15.6095 6.0339 16.2568 6.43313 16.656L9.00389 19.2267C9.19561 19.4185 9.30331 19.6785 9.30331 19.9496V23.5852C9.30331 24.1498 9.761 24.6075 10.3256 24.6075H13.9612C14.2323 24.6075 14.4923 24.7152 14.6841 24.9069L17.2548 27.4777C17.654 27.8769 18.3013 27.8769 18.7006 27.4777L21.2713 24.9069C21.463 24.7152 21.723 24.6075 21.9942 24.6075H25.6298C26.1944 24.6075 26.6521 24.1498 26.6521 23.5852V19.9496C26.6521 19.6785 26.7598 19.4185 26.9515 19.2267L29.5222 16.656C29.9215 16.2568 29.9215 15.6095 29.5222 15.2103L26.9515 12.6395C26.7598 12.4478 26.6521 12.1878 26.6521 11.9166V8.28102C26.6521 7.71643 26.1944 7.25874 25.6298 7.25874H21.9942Z';
const SEAL_CHECK = 'M22.4903 13.2897L16.8677 18.9123L14.312 16.3566';
/** The seal's check stroke in the SVG export, in a 32 box (a 1.25 stroke after Figma's own scaling). */
const SEAL_CHECK_STROKE = 1.27786;
/** The export frames the 32 box at x = 2, y = 0. */
const SEAL_VIEWBOX = '2 0 32 32';

const useStyles = makeStyles(({ tokens: t }) => ({
  root: { alignSelf: 'flex-start' },
  circle: { borderRadius: t.shapes.full, overflow: 'hidden' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  initials: { textAlign: 'center' },
}));

/** Initials as Figma shows them: first letter of the first and the last word, one or two letters. */
function initialsOf(name: string, letters: 1 | 2): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  const first = Array.from(words[0] ?? '')[0] ?? '';
  const last = words.length > 1 ? (Array.from(words[words.length - 1] ?? '')[0] ?? '') : '';
  return (letters === 2 ? first + last : first).toLocaleUpperCase();
}

function Disc({ diameter, x, y, color, shadow }: { diameter: number; x: number; y: number; color: string; shadow?: boolean }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: diameter,
        height: diameter,
        borderRadius: diameter / 2,
        backgroundColor: color,
        boxShadow: shadow ? STATUS_SHADOW : undefined,
      }}
    />
  );
}

/**
 * One status badge in a `spec.box` square at the given corner. Everything inside is Figma's 32 box
 * geometry times k = box / 32, so the badge scales with the avatar the way the nested instance does.
 */
function StatusBadge({ side, status, spec }: { side: 'top' | 'bottom'; status: AvatarTopStatus | AvatarBottomStatus; spec: SizeSpec }) {
  const { tokens: t } = useAppetiteTheme();
  const k = spec.box / 32;
  const corner = side === 'top' ? spec.top : spec.bottom;
  // Icon strokes are in points as drawn; Figma's check stroke at this size over 1.25 scales the others.
  const strokeRatio = spec.checkStroke / TOP_ICON_STROKE;
  let content: ReactElement;
  if (side === 'top') {
    const s = TOP[status as AvatarTopStatus];
    if (s.icon === null) {
      // Verified: the seal. react-native-svg has no filters and boxShadow follows the box, so the seal's
      // two drop shadows (4 % and 1 % black) are not drawn; parity measures what that costs.
      content = (
        <Svg width={spec.box} height={spec.box} viewBox={SEAL_VIEWBOX}>
          <Path d={SEAL_RING} fill={t.colors.bgWhite0} fillRule="evenodd" />
          <Path d={SEAL_BODY} fill={t.colors[s.fill]} />
          <Path
            d={SEAL_CHECK}
            fill="none"
            stroke={t.colors.staticWhite0}
            strokeWidth={(SEAL_CHECK_STROKE * strokeRatio) / k}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    } else {
      content = (
        <>
          <Disc diameter={28 * k} x={2 * k} y={2 * k} color={t.colors.bgWhite0} shadow />
          <Disc diameter={24 * k} x={4 * k} y={4 * k} color={t.colors[s.fill]} />
          <View style={{ position: 'absolute', left: 10 * k, top: 10 * k }}>
            <Icon name={s.icon} size={12 * k} color={t.colors.staticWhite0} strokeWidth={TOP_ICON_STROKE * strokeRatio} />
          </View>
        </>
      );
    }
  } else {
    const s = BOTTOM[status as AvatarBottomStatus];
    content =
      s.icon === null ? (
        <>
          <Disc diameter={20 * k} x={6 * k} y={6 * k} color={t.colors.bgWhite0} shadow />
          <Disc diameter={12 * k} x={10 * k} y={10 * k} color={t.colors[s.fill]} />
        </>
      ) : (
        <>
          <Disc diameter={32 * k} x={0} y={0} color={t.colors.bgWhite0} />
          <Disc diameter={27 * k} x={2.5 * k} y={2.5 * k} color={t.colors[s.fill]} />
          <View style={{ position: 'absolute', left: 8 * k, top: 8 * k }}>
            <Icon name={s.icon} size={16 * k} color={t.colors.textOnColorStrong} strokeWidth={BOTTOM_ICON_STROKE * strokeRatio} />
          </View>
        </>
      );
  }
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: corner.x, top: corner.y, width: spec.box, height: spec.box }}>
      {content}
    </View>
  );
}

export function Avatar(props: AvatarProps): ReactElement {
  const { tokens: t } = useAppetiteTheme();
  const styles = useStyles();
  const spec = SIZES[props.size ?? '6xl'];
  const { diameter } = spec;
  const { topStatus, bottomStatus, style, testID } = props;

  let face: ReactElement;
  let label: string | undefined;
  if (props.type === 'symbol') {
    const tone = TONES[props.tone ?? 'blue'];
    const body = { w: diameter * 0.8, h: diameter * 0.6 };
    const head = diameter * 0.4;
    label = props.accessibilityLabel;
    face = (
      <View style={[styles.circle, { width: diameter, height: diameter, backgroundColor: t.colors[tone.fill] }]}>
        {/* Ellipses, not rounded Views: Figma's body is a true ellipse (a View's circular radius flattens its top). */}
        <Svg width={diameter} height={diameter}>
          <Ellipse
            cx={spec.body.x + body.w / 2}
            cy={spec.body.y + body.h / 2}
            rx={body.w / 2}
            ry={body.h / 2}
            fill={t.colors.staticWhite0}
            fillOpacity={SYMBOL_BODY_OPACITY}
          />
          <Ellipse
            cx={spec.head.x + head / 2}
            cy={spec.head.y + head / 2}
            rx={head / 2}
            ry={head / 2}
            fill={t.colors.staticWhite0}
            fillOpacity={SYMBOL_HEAD_OPACITY}
          />
        </Svg>
      </View>
    );
  } else if (props.type === 'acronym') {
    const tone = TONES[props.tone ?? 'blue'];
    label = props.accessibilityLabel ?? props.name;
    face = (
      <View style={[styles.circle, styles.centered, { width: diameter, height: diameter, backgroundColor: t.colors[tone.fill] }]}>
        {/* Fixed-size circle: the initials do not follow the system font size, like Figma's fixed frames. */}
        <Text allowFontScaling={false} style={[textStyle(t, spec.text), styles.initials, { color: t.colors[tone.content], top: spec.initialsY }]}>
          {initialsOf(props.name, spec.letters)}
        </Text>
      </View>
    );
  } else {
    label = props.accessibilityLabel;
    face = (
      <View style={[styles.circle, { width: diameter, height: diameter }]}>
        {/* An explicit size: a stretched absolute Image kept the bitmap's own size on iOS (measured). */}
        <Image source={props.source} resizeMode="cover" style={{ width: diameter, height: diameter }} />
      </View>
    );
  }

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.root, { width: diameter, height: diameter }, style]}
    >
      {face}
      {topStatus !== undefined && <StatusBadge side="top" status={topStatus} spec={spec} />}
      {bottomStatus !== undefined && <StatusBadge side="bottom" status={bottomStatus} spec={spec} />}
    </View>
  );
}
