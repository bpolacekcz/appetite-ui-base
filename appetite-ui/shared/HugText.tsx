// Why: Figma sizes an auto-width (hugging) text box up to the next whole point: the Button label
// "Button" is 46 / 52 / 59 pt wide at sm / md / lg (read 3 Oct 2026 with the Plugin API), while
// React Native lays text out at its exact advance (measured on iOS: 0.67 to 1.33 pt narrower). Every
// hugging control is then narrower than its Figma variant. HugText rounds the laid-out width up the
// way Figma does. Use it only where the text hugs its content (labels in buttons, chips, badges);
// text that fills or wraps uses plain Text.
// Numbers it relies on: a 0.01 pt tolerance so a width that is already whole is not rounded up again.
// AnimatedHugText is the same on Animated.Text, for a hugging label whose color crossfades (Chip, M07).
import { useState, type ComponentProps } from 'react';
import { Animated, Text, type LayoutChangeEvent, type TextProps } from 'react-native';

/** Figma's rounding of a hugging width: up to the next whole point, with a 0.01 pt tolerance. */
function useHugWidth(onLayout: ((e: LayoutChangeEvent) => void) | undefined) {
  const [minWidth, setMinWidth] = useState<number | undefined>(undefined);
  return {
    minStyle: minWidth !== undefined ? { minWidth } : null,
    onLayout: (e: LayoutChangeEvent) => {
      const w = Math.ceil(e.nativeEvent.layout.width - 0.01);
      if (w !== minWidth && w > (minWidth ?? 0)) setMinWidth(w);
      onLayout?.(e);
    },
  };
}

export function HugText({ style, onLayout, ...rest }: TextProps) {
  const [minWidth, setMinWidth] = useState<number | undefined>(undefined);
  return (
    <Text
      {...rest}
      style={[style, minWidth !== undefined ? { minWidth } : null]}
      onLayout={(e) => {
        const w = Math.ceil(e.nativeEvent.layout.width - 0.01);
        if (w !== minWidth && w > (minWidth ?? 0)) setMinWidth(w);
        onLayout?.(e);
      }}
    />
  );
}

/** HugText on Animated.Text: the style may hold animated values (an animated color). */
export function AnimatedHugText({ style, onLayout, ...rest }: ComponentProps<typeof Animated.Text>) {
  const hug = useHugWidth(onLayout);
  return <Animated.Text {...rest} style={[style, hug.minStyle]} onLayout={hug.onLayout} />;
}
