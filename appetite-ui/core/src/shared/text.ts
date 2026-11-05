// Why: components set text the way Figma does, by text style name ("base/emphasized"), so a Figma
// text node maps to code by the style it shows in Dev Mode. Every style resolves through the
// typography tokens, never through literal sizes, so restyling the provider restyles every label.
// Numbers it relies on: the 20 local text styles of Figma file LLtujjM0lpAtPXA7MxJOin (read 3 Oct
// 2026, node ids 3:3 to 3:66). Each style binds font family, weight, size, line height and letter
// spacing to Typography variables; the table below copies those bindings. lg/* binds line height
// typography/lineHeight/xl (28), not lg, and that is kept.

import { PixelRatio, Platform, type TextStyle } from 'react-native';
import type { AppetiteTokens } from '@appetite-ui/tokens';
import { FONT_METRICS, fontFace } from '../theme/fonts';

type Size = keyof AppetiteTokens['type']['fontSize'];
type LineHeight = keyof AppetiteTokens['type']['lineHeight'];
type Weight = keyof AppetiteTokens['type']['fontWeight'];
type Tracking = keyof AppetiteTokens['type']['letterSpacing'];
type Family = keyof AppetiteTokens['fontFamily'];

interface TextStyleSpec {
  /** Figma style node id, so a style can be found in the file. */
  readonly node: string;
  readonly family: Family;
  readonly weight: Weight;
  readonly size: Size;
  readonly lineHeight: LineHeight;
  readonly tracking: Tracking;
}

const SPECS = {
  'xs/default': { node: '3:3', family: 'body', weight: 'default', size: 'xs', lineHeight: 'xs', tracking: 'wide' },
  'xs/emphasized': { node: '3:6', family: 'body', weight: 'emphasized', size: 'xs', lineHeight: 'xs', tracking: 'wide' },
  'sm/default': { node: '3:36', family: 'body', weight: 'default', size: 'sm', lineHeight: 'sm', tracking: 'wide' },
  'sm/emphasized': { node: '3:38', family: 'body', weight: 'emphasized', size: 'sm', lineHeight: 'sm', tracking: 'wide' },
  'base/default': { node: '3:40', family: 'body', weight: 'default', size: 'base', lineHeight: 'base', tracking: 'normal' },
  'base/emphasized': { node: '3:42', family: 'body', weight: 'emphasized', size: 'base', lineHeight: 'base', tracking: 'normal' },
  'lg/default': { node: '3:44', family: 'body', weight: 'default', size: 'lg', lineHeight: 'xl', tracking: 'normal' },
  'lg/emphasized': { node: '3:46', family: 'body', weight: 'emphasized', size: 'lg', lineHeight: 'xl', tracking: 'normal' },
  'xl/default': { node: '3:48', family: 'body', weight: 'default', size: 'xl', lineHeight: 'xl', tracking: 'normal' },
  'xl/emphasized': { node: '3:50', family: 'body', weight: 'emphasized', size: 'xl', lineHeight: 'xl', tracking: 'normal' },
  '2xl/default': { node: '3:52', family: 'heading', weight: 'default', size: 'xl2', lineHeight: 'xl2', tracking: 'xl2' },
  '2xl/emphasized': { node: '3:54', family: 'heading', weight: 'emphasized', size: 'xl2', lineHeight: 'xl2', tracking: 'xl2' },
  '3xl/default': { node: '3:56', family: 'heading', weight: 'default', size: 'xl3', lineHeight: 'xl3', tracking: 'xl3' },
  '3xl/emphasized': { node: '3:58', family: 'heading', weight: 'heading', size: 'xl3', lineHeight: 'xl3', tracking: 'xl3' },
  '4xl/default': { node: '3:60', family: 'heading', weight: 'default', size: 'xl4', lineHeight: 'xl4', tracking: 'xl4' },
  '4xl/emphasized': { node: '3:62', family: 'heading', weight: 'heading', size: 'xl4', lineHeight: 'xl4', tracking: 'xl4' },
  '5xl/default': { node: '3:64', family: 'heading', weight: 'default', size: 'xl5', lineHeight: 'xl5', tracking: 'xl5' },
  '5xl/emphasized': { node: '3:66', family: 'heading', weight: 'heading', size: 'xl5', lineHeight: 'xl5', tracking: 'xl5' },
  '6xl/default': { node: '3:11', family: 'heading', weight: 'default', size: 'xl6', lineHeight: 'xl6', tracking: 'tight' },
  '6xl/emphasized': { node: '3:13', family: 'heading', weight: 'heading', size: 'xl6', lineHeight: 'xl6', tracking: 'tight' },
} as const satisfies Record<string, TextStyleSpec>;

/**
 * Figma puts a line's baseline at round((LH + A - D) / 2) pt below the top of the line box (A and D the
 * font's ascender and descender at that size; matched on 2,284 Figma text nodes). React Native on iOS
 * centres the same way but snaps up to the next device pixel, and does not centre at all when the line
 * height is smaller than A + D (36/40 and up): it then puts the baseline at LH - D. Measured on the iPhone
 * 18 Pro with parity/scripts/baseline-probe.mjs, device minus Figma: 12/16 +0.67, 14/20 +0.33, 16/24 0,
 * 18/28 -0.33, 20/28 +0.33, 24/32 0, 30/36 0, 36/40 -1.67, 48/52 -2.33, 60/64 -4.33 pt, exactly this
 * formula. The returned shift moves the glyphs back to Figma's baseline without changing layout.
 * Android measured within 1 device pixel (0.33 pt) of Figma for every style and is left alone.
 */
function iosBaselineShift(size: number, lineHeight: number, family: string): number {
  const m = FONT_METRICS[family];
  if (!m) return 0;
  const a = m.ascender * size;
  const d = m.descender * size;
  const scale = PixelRatio.get();
  const ceilToPixel = (v: number) => Math.ceil(v * scale - 1e-6) / scale;
  const figma = Math.round((lineHeight + a - d) / 2);
  const ios = lineHeight >= a + d ? ceilToPixel((lineHeight + a - d) / 2) : ceilToPixel(lineHeight - d);
  return figma - ios;
}

/**
 * P14: the largest system font scale (React Native's `maxFontSizeMultiplier`) at which the label of a fixed-size
 * control still fits, measured on the iPhone 18 Pro on 14 Oct 2026 (docs/platform-conventions.md P14 has the
 * table and the evidence). The values are iOS Dynamic Type stops (React Native's table: xl 1.118, xxl 1.235,
 * xxxl 1.353, accessibility-medium 1.786, accessibility-large 2.143, accessibility-extra-large 2.643), not Figma
 * values, and nothing changes at the default size (1.0). Android numbers are UNVERIFIED (final session).
 * Reading text (messages, list rows, sheet bodies) is not capped.
 */
export const FONT_SCALE_CAP = {
  /** Button label: clips at 2.643, fits at 2.143. */
  button: 2.143,
  /** Chip label (pill 32 pt): clips at 1.353, fits at 1.235. */
  chip: 1.235,
  /** Badge label (pill 20 pt): clips at 1.786, fits at 1.353. */
  badge: 1.353,
  /** Tabs label: 3 options of Figma's placeholder text fit to 1.353 (4 and 5 options truncate from 1.235 and 1.118). */
  tabs: 1.353,
  /** Segmented Control label: same measurement as Tabs; the track clips at 2.643 (default) and 2.143 (small). */
  segmentedControl: 1.353,
  /** Navigation tab label: fits to 1.786, clips at 2.143. */
  navigation: 1.786,
  /** Top Bar title and caption: fit to 1.235, touch the 64 pt bar's edge at 1.353. */
  topBar: 1.235,
  /** Text Input value, prefix, suffix and selection text (56 pt field): descenders clip from 2.143, fit at 1.786 (14 Oct 2026, Bob's yes). */
  textInput: 1.786,
  /** Toast title and description (one-line pill): text overlaps the pill from 1.786, fits at 1.353 (14 Oct 2026, Bob's yes). */
  toast: 1.353,
} as const;

/**
 * React Native 0.88 (0.88.0 and 0.88.1) on iOS rounds a Text's measured size up to the device pixel grid after adding 0.001 pt
 * (`internal_roundTextMeasurementToPixelGrid`, kEpsilon 0.001, RCTTextLayoutManager.mm; commit 5e40a1771e,
 * PR #57698, "Prevent the final line or trailing glyph of text from being clipped"). Our line heights are whole
 * points, so a Text of n lines measures exactly n x lineHeight, sits on the pixel grid, and the epsilon adds one
 * whole device pixel: 16 -> 16.33, 24 -> 24.33, 32 -> 32.33 pt on the iPhone 18 Pro (ios-tap tree, 28 Oct 2026,
 * docs/log/13.md task 2). Setting the line height 0.002 pt (twice that epsilon) lower makes the measured height
 * n x (lineHeight - 0.002) + 0.001, which rounds up to exactly n x lineHeight again for up to 166 lines at 3x;
 * the glyphs move by n x 0.002 pt, far below a pixel. Before 0.88 the same value also rounded to n x lineHeight.
 * Still needed on 0.88.1 (Expo Go 58.0.5): without the trim the same texts measured 16.3, 20.3, 28.3, 40.3 pt (29 Oct 2026).
 * Android measures text differently (StaticLayout) and keeps the token line height.
 */
const IOS_TEXT_MEASURE_EPSILON = 0.001;
const IOS_LINE_HEIGHT_TRIM = 2 * IOS_TEXT_MEASURE_EPSILON;

/** A Figma text style name, exactly as Dev Mode shows it. */
export type TextStyleName = keyof typeof SPECS;

/**
 * The React Native text style for a Figma text style, resolved through the current tokens.
 * textStyle(tokens, 'base/emphasized') -> Inter-SemiBold 16/24, no letter spacing (kerning on).
 */
export function textStyle(tokens: AppetiteTokens, name: TextStyleName): TextStyle {
  const s: TextStyleSpec = SPECS[name];
  const letterSpacing = tokens.type.letterSpacing[s.tracking];
  const family = tokens.fontFamily[s.family];
  const size = tokens.type.fontSize[s.size];
  const lineHeight = tokens.type.lineHeight[s.lineHeight];
  const shift = Platform.OS === 'ios' ? iosBaselineShift(size, lineHeight, family) : 0; // native-only: UIKit text layout snaps the baseline
  return {
    fontFamily: fontFace(family, tokens.type.fontWeight[s.weight]),
    fontSize: size,
    lineHeight: Platform.OS === 'ios' ? lineHeight - IOS_LINE_HEIGHT_TRIM : lineHeight, // native-only: RN 0.88 iOS text measurement epsilon, see IOS_LINE_HEIGHT_TRIM
    // Tracking 0 is left out: React Native on iOS sets NSKern for any letterSpacing, and NSKern 0 turns
    // CoreText's pair kerning off, while Figma kerns ("Team" in lg: 49.07 pt with letterSpacing 0, 47.84
    // without, Figma 47.84; measured 3 Oct 2026, docs/log/02.md).
    ...(letterSpacing !== 0 ? { letterSpacing } : null),
    // Android adds font padding above and below the glyphs; Figma's line box has none.
    includeFontPadding: false,
    ...(shift !== 0 ? { transform: [{ translateY: shift }] } : null),
  };
}

/**
 * The text style of a single-line React Native TextInput for a Figma text style: textStyle() without the line
 * height. iOS centres a single-line field's glyphs in the field's `height` (the token line height), and on
 * Android a lineHeight would move them, so the field sets none.
 * iOS gets lineHeight 0 (NSParagraphStyle's "no minimum, no maximum", not a size) instead of leaving it out:
 * React Native 0.88 recycles TextInput views, and a single-line field that reuses the view of a multiline one
 * (Text Area, AI Prompt Composer: lineHeight 24) keeps that line height for its placeholder when the key is
 * absent. Measured on the iPhone 18 Pro, 28 Oct 2026 (docs/log/13.md task 4): Text Input captured after Text
 * Area drew its placeholder 7 px (2.33 pt = (24 - 19.36) / 2, Inter 16's line box centred in 24) lower,
 * 0.92 % vs 0.04 % from a fresh start; with lineHeight 0 it is 0.04 % in both orders. Android is unchanged.
 */
export function inputTextStyle(tokens: AppetiteTokens, name: TextStyleName): TextStyle {
  const { lineHeight: _lineHeight, ...style } = textStyle(tokens, name);
  return Platform.OS === 'ios' ? { ...style, lineHeight: 0 } : style; // native-only: RN 0.88 iOS TextInput view recycling
}
