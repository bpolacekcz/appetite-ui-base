// Why: the loading indicator inside controls (Figma component "_Loading" 53:4466, used by Button
// State=Loading). It draws Figma's two arc ellipses and spins the way Figma's Spinner (10056:156)
// prototype does.
// Numbers it relies on (read 3 Oct 2026): 24 pt frame; two 20 pt ellipses with innerRadius 0.8, so a
// ring from radius 8 to 10 (2 pt thick, centerline radius 9); Track is the full ring, Arc runs from
// -90 deg (12 o'clock) to 0.3292 rad (18.86 deg), a 108.86 deg sweep with flat ends. Spinner timing:
// 8 frames, each AFTER_TIMEOUT 80 ms plus an 80 ms linear SMART_ANIMATE, so one turn is 8 x 160 =
// 1280 ms, linear.
// Reduce Motion: the arc keeps spinning on purpose and does not read useReduceMotion. System activity
// indicators (UIActivityIndicatorView on iOS, ProgressBar on Android) keep spinning under Reduce Motion
// because the spinner is the only sign that work is in progress; a frozen arc would look like a hung
// button. Skeleton, Progress Ring and Typing Indicator, which are decoration or a value change, do stop.
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const FRAME = 24;
const CENTER = 12;
const RADIUS = 9;
const THICKNESS = 2;
const END = 0.32920366525650024;
const TURN_MS = 1280;

const endX = CENTER + RADIUS * Math.cos(END);
const endY = CENTER + RADIUS * Math.sin(END);
const ARC = `M ${CENTER} ${CENTER - RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${endX} ${endY}`;

export function LoadingArc({ color, trackColor }: { color: string; trackColor: string }) {
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(turn, { toValue: 1, duration: TURN_MS, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ width: FRAME, height: FRAME, transform: [{ rotate }] }}>
      <Svg width={FRAME} height={FRAME} viewBox={`0 0 ${FRAME} ${FRAME}`}>
        <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={trackColor} strokeWidth={THICKNESS} fill="none" />
        <Path d={ARC} stroke={color} strokeWidth={THICKNESS} fill="none" strokeLinecap="butt" />
      </Svg>
    </Animated.View>
  );
}
