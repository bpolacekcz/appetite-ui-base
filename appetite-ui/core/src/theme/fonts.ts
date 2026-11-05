// Why: the only way components choose a font face. Figma uses exactly 5 faces (measured 2 Oct 2026 over
// 20 text styles and every TEXT node in published components): Inter Regular 400 and Semi Bold 600;
// Inter Display Regular 400, Medium 500, SemiBold 600. Inter comes from the official 3.19 release and
// Inter Display from 4.1, because that is what Figma lays out with (measured 3 Oct 2026,
// assets/fonts/README.md). fontFace() maps a token family + weight to a registered face and throws for
// anything not bundled, so a missing face cannot silently fall back to the system font.
// This copy is the free base: the brand is fixed to Appetite UI's (Figma 2.5). A rebrand in one theme file is part
// of Appetite UI Code (appetiteui.com/code). Rewritten by scripts/public/build.mjs from the Code source.
// The font file modules are declared next to this package's sources, so a project that installs the package needs no declaration of its own.
/// <reference path="../assets.d.ts" />
import InterRegular from '../../assets/fonts/Inter-Regular.otf';
import InterSemiBold from '../../assets/fonts/Inter-SemiBold.otf';
import InterDisplayRegular from '../../assets/fonts/InterDisplay-Regular.ttf';
import InterDisplayMedium from '../../assets/fonts/InterDisplay-Medium.ttf';
import InterDisplaySemiBold from '../../assets/fonts/InterDisplay-SemiBold.ttf';

/** Pass to expo-font: `const [loaded] = useFonts(appetiteFonts)`. Keys are the registered family names. */
export const appetiteFonts = {
  'Inter-Regular': InterRegular,
  'Inter-SemiBold': InterSemiBold,
  'InterDisplay-Regular': InterDisplayRegular,
  'InterDisplay-Medium': InterDisplayMedium,
  'InterDisplay-SemiBold': InterDisplaySemiBold,
} as const;

export type AppetiteFontFace = keyof typeof appetiteFonts;

// Family names as the Typography tokens store them (typography/fontFamily: "Inter", "Inter Display").
const FACES: Record<string, Partial<Record<number, string>>> = {
  Inter: { 400: 'Inter-Regular', 600: 'Inter-SemiBold' },
  'Inter Display': { 400: 'InterDisplay-Regular', 500: 'InterDisplay-Medium', 600: 'InterDisplay-SemiBold' },
};

/** fontFace(tokens.fontFamily.body, tokens.type.fontWeight.emphasized) -> 'Inter-SemiBold' */
export function fontFace(family: string, weight: number): string {
  const face = FACES[family]?.[weight];
  if (!face) {
    const known = Object.entries(FACES).flatMap(([f, w]) => Object.keys(w).map((n) => `${f} ${n}`));
    throw new Error(`Appetite UI has no ${family} ${weight}. Known faces: ${known.join(', ')}.`);
  }
  return face;
}

/**
 * Vertical metrics of the bundled families (hhea ascender and descender over units per em, read from the
 * font files; typo metrics are equal and USE_TYPO_METRICS is set). Figma and the platforms' text engines
 * place the baseline from these, so the text baseline correction in shared/text.ts needs them.
 * Inter 3.19: 2728 / 680 of 2816. Inter Display 4.1: 1984 / 494 of 2048.
 */
export const FONT_METRICS: Record<string, { readonly ascender: number; readonly descender: number }> = {
  Inter: { ascender: 2728 / 2816, descender: 680 / 2816 },
  'Inter Display': { ascender: 1984 / 2048, descender: 494 / 2048 },
};
