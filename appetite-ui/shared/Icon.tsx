// Why: every component draws Lucide icons from the Figma Icons page (200:137), with the geometry
// Figma renders (glyphs.ts is generated from Figma's SVG export), so an icon in code matches the icon
// in the design. Components pass size, color and stroke explicitly; nothing is inherited.
// Numbers it relies on: the 24 x 24 icon frame of every Figma icon; dimensions/icon/stroke = 2
// (tokens.icon.strokeRegular) as the default stroke. Figma stores per-size strokes on the icon
// instances inside components (Button: 1.5 at 16 pt, 1.75 at 18 and 20 pt, 2 at 22 and 24 pt), so
// strokeWidth is in points as drawn, not in viewBox units: a 1.75 pt stroke at 18 pt is 1.75 * 24 / 18
// in the 24 unit viewBox.
import type { ReactElement } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useAppetiteTheme } from '@appetite-ui/core';
import { glyphs, type IconName } from '../icons/glyphs';

export type { IconName };

export interface IconProps {
  /** Lucide name as on the Figma Icons page, for example "chevron-right". */
  name: IconName;
  /** Frame size in points. Default tokens.icon.sizeBase (24). */
  size?: number;
  /** Stroke (and fill, for filled glyphs) color. Pass a token, for example tokens.colors.fgSub700. */
  color: string;
  /** Stroke width in points as drawn at this size. Default tokens.icon.strokeRegular (2). */
  strokeWidth?: number;
  /** Set when the icon carries meaning on its own. Decorative icons stay hidden from screen readers. */
  accessibilityLabel?: string;
}

export function Icon({ name, size, color, strokeWidth, accessibilityLabel }: IconProps) {
  const { tokens: t } = useAppetiteTheme();
  const frame = size ?? t.icon.sizeBase;
  const stroke = ((strokeWidth ?? t.icon.strokeRegular) * 24) / frame;
  return (
    <Svg
      width={frame}
      height={frame}
      viewBox="0 0 24 24"
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={accessibilityLabel === undefined}
      importantForAccessibility={accessibilityLabel === undefined ? 'no-hide-descendants' : 'yes'}
    >
      {glyphs[name].paths.map((p, i) =>
        'fill' in p && p.fill ? (
          <Path key={i} d={p.d} fill={color} fillRule={'evenOdd' in p && p.evenOdd ? 'evenodd' : 'nonzero'} />
        ) : (
          <Path key={i} d={p.d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        ),
      )}
    </Svg>
  );
}

/**
 * Figma's "Star/Filled": the Lucide star (200:16953) with the stroke removed and a fill, which is how the
 * Rating rows of Horizontal and Vertical Card use it. 16 pt frame in both. Decorative: the rating text next
 * to it carries the meaning.
 */
export function StarFilled({ color, size = 16 }: { color: string; size?: number }): ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {glyphs.star.paths.map((p, i) => (
        <Path key={i} d={p.d} fill={color} />
      ))}
    </Svg>
  );
}

/**
 * What a component's icon prop accepts (Figma: a Boolean that shows an icon plus its Instance Swap).
 * - An IconName: the component draws that icon at its own Figma size, color and stroke.
 * - A React element: drawn as is; the caller owns its size and color.
 */
export type IconSlot = IconName | ReactElement;

/** Renders an IconSlot with the component's size, color and stroke when it is a name. */
export function renderIconSlot(slot: IconSlot, size: number, color: string, strokeWidth: number): ReactElement {
  return typeof slot === 'string' ? <Icon name={slot} size={size} color={color} strokeWidth={strokeWidth} /> : slot;
}
