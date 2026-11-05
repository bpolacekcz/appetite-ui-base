// Why: the single-line field, with the label, help text and the six field types of the Figma
// component, so a form built in Figma maps to props one to one. The name shadows React Native's
// TextInput on purpose (Figma names 1:1); import React Native's as RNTextInput where both are needed.
// Figma: Text Input 179:3415 (Type x State, 30 variants), read 3 Oct 2026.
// Numbers it relies on:
// - Stack: label row 20 pt, gap spacing/1-5 (6), field 56 pt, gap 6, help row 16 pt (340 x 104).
// - Label row and help row: shared/field.tsx (the same rows as Text Area).
// - Field (Type=Default is the underline field): height spacing/14 (56), content centered, padding
//   spacing/3 (12) top and bottom, none at the
//   sides, gap spacing/3 (12), 1 pt bottom stroke INSIDE: border/sub-200, Focused brand/base, Error
//   state/error/base-500. Value base/default: placeholder text/soft-500, value text/strong-950,
//   Disabled text/disabled-400. Icons 20 pt, stroke 1.75, fg/soft-500 (Disabled fg/disabled-400).
//   Focused with a value shows the clear button (circle-x, 24 pt, stroke 2).
// - Left and Right Selection: a wrapper (gap spacing/2 = 8 left, spacing/1-5 = 6 right) with the
//   flag, the selection text (base/default, text/strong-950) and the type's icon, and a 1 x 24 pt
//   divider in border/soft-100. Disabled dims the flag to opacity 0.5 (a node opacity, no variable).
// - Prefix: prefix text (text/soft-500) then the value, gap spacing/0-5 (2). Suffix: value then
//   suffix text (text/soft-500), gap spacing/2 (8).
// - Password: the eye-off button (20 pt, stroke 1.75) after the value toggles visibility.
// Code defaults differ from Figma's showcase defaults on purpose: Figma shows every optional part
// (label, "(Optional)", tooltip, icons, help); code shows a part only when its prop is passed
// (docs/log/01.md, decision 10).
// Platform conventions (docs/platform-conventions.md P07, no visual change): Type=Password defaults to
// autoCapitalize "none", autoCorrect false, spellCheck false, autoComplete "current-password" and (iOS)
// textContentType "password", so password managers fill it and the keyboard does not "fix" it; every one is
// overridable (use "new-password" and textContentType "newPassword" on a sign-up field). The return key is left to
// React Native's default: set returnKeyType, onSubmitEditing and submitBehavior per field (docs form recipe).
// Motion (docs/motion.md M18, proposal P4): field.focus, the underline color crossfades (focus, blur, error); nothing
// else moves, and a field that has not changed state draws exactly as before.
import { useState, type ReactElement, type Ref, type ReactNode } from 'react';
import { Animated, Pressable, Text, TextInput as RNTextInput, View, type StyleProp, type TextInputProps as RNTextInputProps, type ViewStyle, type TextInputInstance } from 'react-native';
import { useAppetiteTheme } from '@appetite-ui/core';
import { makeStyles } from '@appetite-ui/core';
import { inputTextStyle, textStyle } from '@appetite-ui/core';
import { Icon, renderIconSlot, type IconSlot } from '../shared/Icon';
import { FONT_SCALE_CAP, touchSlop, useMotionColor } from '@appetite-ui/core/internal';
import { FieldHelp, FieldLabel } from '../shared/field';

/** Figma property Type. */
export type TextInputType = 'default' | 'leftSelection' | 'rightSelection' | 'password' | 'prefix' | 'suffix';

/** The selection part of Type=Left Selection and Right Selection (country code, currency). */
export interface TextInputSelection {
  /** Text in the selection, for example "+358" or "USD". */
  text: string;
  /** The flag (Figma: Country Flags instance, 20 pt). Any element, for example an Image. */
  flag?: ReactNode;
  /** Opens your picker. */
  onPress?: () => void;
  /** Screen reader label for the selection button. Defaults to text. */
  accessibilityLabel?: string;
}

interface TextInputCommonProps extends Omit<RNTextInputProps, 'style' | 'editable' | 'placeholderTextColor' | 'secureTextEntry' | 'value' | 'onChangeText' | 'selection'> {
  /** Figma Input Label + Input Label Text. */
  label?: string;
  /** Figma Optional: shows "(Optional)" after the label. Default false. */
  optional?: boolean;
  /** Figma Tooltip: shows the info icon at the end of the label row; the string is its screen reader label. */
  tooltip?: string;
  /** Called when the tooltip icon is pressed (show a Tooltip or a sheet). */
  onTooltipPress?: () => void;
  /** Figma Input Text in State=Placeholder. */
  placeholder?: string;
  /** Figma Input Text in State=Filled. Controlled. */
  value: string;
  onChangeText: (text: string) => void;
  /** Figma Help + Help Text. */
  help?: string;
  /** Figma State=Error: red underline and help row. Default false. */
  error?: boolean;
  /** Figma State=Disabled. Default false. */
  disabled?: boolean;
  /** Figma Icon Left + Icon Left Swap. */
  iconLeft?: IconSlot;
  /** Figma Icon Right + Icon Right Swap. */
  iconRight?: IconSlot;
  /** Layout of the whole stack (margins, width). */
  style?: StyleProp<ViewStyle>;
  /** Screen reader label of the clear button shown while focused. Default "Clear text". */
  clearLabel?: string;
  /** The native input, for focus() and blur() (for example to move to the next field). */
  ref?: Ref<TextInputInstance>;
}

interface DefaultTypeProps extends TextInputCommonProps {
  /** Figma Type. Default "default" (the underline field). */
  type?: 'default' | 'password';
}
interface SelectionTypeProps extends TextInputCommonProps {
  type: 'leftSelection' | 'rightSelection';
  /** The selection part (Figma: Selection Wrapper). */
  selection: TextInputSelection;
}
interface PrefixTypeProps extends TextInputCommonProps {
  type: 'prefix';
  /** Figma Prefix Text, for example "https://". */
  prefix: string;
}
interface SuffixTypeProps extends TextInputCommonProps {
  type: 'suffix';
  /** Figma Suffix Text, for example "kg". */
  suffix: string;
}

export type TextInputProps = DefaultTypeProps | SelectionTypeProps | PrefixTypeProps | SuffixTypeProps;

// Numbers Figma stores on instances inside the component (no variable): icon sizes and strokes,
// and the disabled flag's node opacity.
const FIELD_ICON = { size: 20, stroke: 1.75 } as const;
const CLEAR_ICON = { size: 24, stroke: 2 } as const;
const DISABLED_FLAG_OPACITY = 0.5;
const PASSWORD_DEFAULTS = {
  autoCapitalize: 'none',
  autoCorrect: false,
  spellCheck: false,
  autoComplete: 'current-password',
  textContentType: 'password',
} as const satisfies RNTextInputProps;

const useStyles = makeStyles(({ tokens: t }) => ({
  root: { alignSelf: 'stretch', gap: t.spacing.space1_5 },
  field: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.space3, paddingVertical: t.spacing.space3, height: t.spacing.space14 },
  underline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: t.border.w1 },
  input: {
    flex: 1,
    height: t.type.lineHeight.base,
    padding: 0,
    margin: 0,
    ...inputTextStyle(t, 'base/default'),
  },
  value: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  selection: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: t.border.w1, height: t.type.lineHeight.base },
}));

export function TextInput(props: TextInputProps): ReactElement {
  const { tokens: t } = useAppetiteTheme();
  const styles = useStyles();
  const {
    label, optional = false, tooltip, onTooltipPress, placeholder, value, onChangeText, help, error = false,
    disabled = false, iconLeft, iconRight, style, onFocus, onBlur, accessibilityLabel, clearLabel = 'Clear text', ...inputProps
  } = props;
  // Fields that only exist on some types are read from props below, not passed to the native input.
  const { type: _type, selection: _selection, prefix: _prefix, suffix: _suffix, ...nativeProps } = inputProps as typeof inputProps & {
    type?: TextInputType; selection?: TextInputSelection; prefix?: string; suffix?: string;
  };
  const type: TextInputType = props.type ?? 'default';
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const underline = useMotionColor(
    error ? t.colors.stateErrorBase500 : focused && !disabled ? t.colors.brandBase : t.colors.borderSub200,
    'field.focus',
  );
  const iconColor = disabled ? t.colors.fgDisabled400 : t.colors.fgSoft500;
  const valueColor = disabled ? t.colors.textDisabled400 : t.colors.textStrong950;
  const affixColor = disabled ? t.colors.textDisabled400 : t.colors.textSoft500;
  const fieldIcon = (slot: IconSlot) => renderIconSlot(slot, FIELD_ICON.size, iconColor, FIELD_ICON.stroke);
  const showClear = focused && !disabled && value.length > 0 && type !== 'password';

  const input = (
    <RNTextInput
      {...(type === 'password' ? PASSWORD_DEFAULTS : undefined)}
      maxFontSizeMultiplier={FONT_SCALE_CAP.textInput}
      {...nativeProps}
      style={[styles.input, { color: valueColor }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={disabled ? t.colors.textDisabled400 : t.colors.textSoft500}
      editable={!disabled}
      secureTextEntry={type === 'password' && !revealed}
      selectionColor={t.colors.brandBase}
      accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
      accessibilityHint={help}
      accessibilityState={{ disabled }}
      onFocus={(e) => { setFocused(true); onFocus?.(e); }}
      onBlur={(e) => { setFocused(false); onBlur?.(e); }}
    />
  );

  const selectionPart = (sel: TextInputSelection, side: 'left' | 'right') => (
    <Pressable
      onPress={sel.onPress}
      disabled={disabled || !sel.onPress}
      accessibilityRole="button"
      accessibilityLabel={sel.accessibilityLabel ?? sel.text}
      accessibilityState={{ disabled }}
      hitSlop={touchSlop(t.platform.minTouchTarget, t.type.lineHeight.base)}
      style={[styles.selection, { gap: side === 'left' ? t.spacing.space2 : t.spacing.space1_5 }]}
    >
      {sel.flag !== undefined && (
        // needsOffscreenAlphaCompositing: Figma fades the whole flag group; Android would fade each part of it (native-only prop).
        <View style={disabled ? { opacity: DISABLED_FLAG_OPACITY } : undefined} needsOffscreenAlphaCompositing={disabled}>
          {sel.flag}
        </View>
      )}
      <Text maxFontSizeMultiplier={FONT_SCALE_CAP.textInput} style={[textStyle(t, 'base/default'), { color: valueColor }]}>{sel.text}</Text>
      {side === 'left' ? iconLeft !== undefined && fieldIcon(iconLeft) : iconRight !== undefined && fieldIcon(iconRight)}
    </Pressable>
  );
  const divider = <View style={[styles.divider, { backgroundColor: t.colors.borderSoft100 }]} />;

  let field: ReactNode;
  if (type === 'leftSelection' && props.type === 'leftSelection') {
    field = (
      <>
        {selectionPart(props.selection, 'left')}
        {divider}
        {input}
        {iconRight !== undefined && fieldIcon(iconRight)}
      </>
    );
  } else if (type === 'rightSelection' && props.type === 'rightSelection') {
    field = (
      <>
        {iconLeft !== undefined && fieldIcon(iconLeft)}
        {input}
        {divider}
        {selectionPart(props.selection, 'right')}
      </>
    );
  } else {
    field = (
      <>
        {iconLeft !== undefined && fieldIcon(iconLeft)}
        {props.type === 'prefix' ? (
          <View style={[styles.value, { gap: t.spacing.space0_5 }]}>
            <Text maxFontSizeMultiplier={FONT_SCALE_CAP.textInput} style={[textStyle(t, 'base/default'), { color: affixColor }]}>{props.prefix}</Text>
            {input}
          </View>
        ) : props.type === 'suffix' ? (
          <View style={[styles.value, { gap: t.spacing.space2 }]}>
            {input}
            <Text maxFontSizeMultiplier={FONT_SCALE_CAP.textInput} style={[textStyle(t, 'base/default'), { color: affixColor }]}>{props.suffix}</Text>
          </View>
        ) : (
          input
        )}
        {showClear && (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel={clearLabel}
            hitSlop={touchSlop(t.platform.minTouchTarget, CLEAR_ICON.size, CLEAR_ICON.size)}
          >
            <Icon name="circle-x" size={CLEAR_ICON.size} color={iconColor} strokeWidth={CLEAR_ICON.stroke} />
          </Pressable>
        )}
        {type === 'password' ? (
          <Pressable
            onPress={() => setRevealed((r) => !r)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            hitSlop={touchSlop(t.platform.minTouchTarget, FIELD_ICON.size, FIELD_ICON.size)}
          >
            <Icon name={revealed ? 'eye' : 'eye-off'} size={FIELD_ICON.size} color={iconColor} strokeWidth={FIELD_ICON.stroke} />
          </Pressable>
        ) : (
          iconRight !== undefined && fieldIcon(iconRight)
        )}
      </>
    );
  }

  return (
    <View style={[styles.root, style]}>
      <FieldLabel label={label} optional={optional} tooltip={tooltip} onTooltipPress={onTooltipPress} />
      <View style={styles.field}>
        {field}
        <Animated.View pointerEvents="none" style={[styles.underline, { backgroundColor: underline }]} />
      </View>
      <FieldHelp help={help} error={error} disabled={disabled} />
    </View>
  );
}
