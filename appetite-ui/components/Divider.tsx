// Why: a hairline rule that separates content, drawn exactly like the Figma Divider: horizontal, with a
// centered label ("or"), or vertical. It is decorative, so it has no state, no press and no hit area.
// Figma: Divider 4120:203 (Style x 3 variants, Text property), read 3 Oct 2026.
// Numbers it relies on:
// - Every line is 1 pt wide (strokeWeight 1, not bound to a variable; border/w1 has the same value and is
//   what the other components use) in border/soft-100. Figma does not use 0.5 or 0.75 here.
// - Horizontal 4120:190: 342 x 4, vertical padding spacing/0-5 (2) around a zero-height line. Code fills
//   its parent's width (alignSelf stretch); 342 is a layout choice of the screen, not of the component.
// - With Label 4120:195: 342 x 16, gap spacing/3 (12): line, text, line. The text "or" hugs (12 wide in
//   Figma) and is text style xs/default (3:3: Inter 400 12/16, spacing 0.1) in text/soft-500; both lines
//   fill the rest (153 each in 342).
// - Vertical 4120:199: 1 x 24, the height is bound to spacing/6 (24).
// - Where the 1 pt stroke lands: Figma strokes a zero-height line, and the 3x export (read pixel by
//   pixel, 3 Oct 2026) puts the stroke on the point ABOVE the line's y, for Horizontal (rows 1 to 2 of 4)
//   and for With Label (rows 7 to 8 of 16, not 7.5 to 8.5). The code reproduces that with a line that is
//   w1 high and has marginTop -w1, so its margin box has no height, exactly like Figma's line.
// Platform: the same visuals on iOS and Material (the Figma component has no platform values).
// Accessibility: a plain rule carries no information, so it is hidden from screen readers; the With Label
// text is content and stays readable as text.
import type { ReactElement } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import { textStyle } from '@appetite-ui/core';
import { HugText } from '../shared/HugText';

interface DividerCommonProps {
  /** Layout only (margins, width, height). Colors come from the theme. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface DividerLineProps extends DividerCommonProps {
  /** Figma Style: Horizontal (a line across the width of the parent) or Vertical (a 24 pt line for a row). Default 'horizontal'. */
  variant?: 'horizontal' | 'vertical';
  /** Only the With Label style has text: set variant="withLabel". */
  text?: undefined;
}

interface DividerLabelProps extends DividerCommonProps {
  /** Figma Style=With Label: a line, the text, a line across the width of the parent. */
  variant: 'withLabel';
  /** Figma Text. Default "or". */
  text?: string;
}

export type DividerProps = DividerLineProps | DividerLabelProps;

/** Figma Style options, for code that needs the type. */
export type DividerVariant = NonNullable<DividerProps['variant']>;

const useStyles = makeStyles(({ tokens: t }) => ({
  horizontal: { alignSelf: 'stretch', paddingVertical: t.spacing.space0_5 },
  // A zero-height line with its 1 pt stroke above it (see the header): w1 high, margin box 0 high.
  line: { height: t.border.w1, marginTop: -t.border.w1, backgroundColor: t.colors.borderSoft100 },
  withLabel: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: t.spacing.space3 },
  fill: { flex: 1 },
  // flexShrink lets a long text wrap instead of pushing the lines out of the row; Figma's "or" never needs it.
  label: { ...textStyle(t, 'xs/default'), color: t.colors.textSoft500, flexShrink: 1 },
  vertical: { width: t.border.w1, height: t.spacing.space6, backgroundColor: t.colors.borderSoft100 },
}));

export function Divider(props: DividerProps): ReactElement {
  const styles = useStyles();
  const { style, testID } = props;

  if (props.variant === 'withLabel') {
    return (
      <View testID={testID} style={[styles.withLabel, style]} accessible={false} accessibilityRole="none">
        <View style={[styles.line, styles.fill]} importantForAccessibility="no" accessibilityElementsHidden />
        <HugText style={styles.label}>{props.text ?? 'or'}</HugText>
        <View style={[styles.line, styles.fill]} importantForAccessibility="no" accessibilityElementsHidden />
      </View>
    );
  }

  if (props.variant === 'vertical') {
    return (
      <View
        testID={testID}
        style={[styles.vertical, style]}
        accessible={false}
        accessibilityRole="none"
        importantForAccessibility="no"
        accessibilityElementsHidden
      />
    );
  }

  return (
    <View
      testID={testID}
      style={[styles.horizontal, style]}
      accessible={false}
      accessibilityRole="none"
      importantForAccessibility="no"
      accessibilityElementsHidden
    >
      <View style={styles.line} />
    </View>
  );
}
