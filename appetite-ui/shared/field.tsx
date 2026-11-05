// Why: the label row and the help row are the same in every Figma field component (Text Input
// 179:3415, Text Area 12892:639), so they are drawn once here and fields stay identical.
// Numbers it relies on (read 3 Oct 2026):
// - Label row: label sm/default text/soft-500, gap spacing/1 (4), "(Optional)" sm/default
//   text/disabled-400; the Tooltip instance (info icon 16 pt, stroke 1.5, fg/soft-500) at the right
//   end (Figma: space-between); 20 pt tall (line height sm).
// - Help row: info icon 16 pt stroke 1.5, gap spacing/1 (4), xs/default text/sub-700; Error turns icon
//   and text state/error/base-500, Disabled turns them disabled-400. Text Area adds its counter at the
//   end of the row in the same style.
import { Pressable, Text, View } from 'react-native';
import { useAppetiteTheme } from '@appetite-ui/core';
import { textStyle } from '@appetite-ui/core';
import { Icon } from './Icon';
import { touchSlop } from '@appetite-ui/core/internal';

const SMALL_ICON = { size: 16, stroke: 1.5 } as const;

export function FieldLabel({ label, optional, tooltip, onTooltipPress }: {
  label?: string;
  optional: boolean;
  tooltip?: string;
  onTooltipPress?: () => void;
}) {
  const { tokens: t } = useAppetiteTheme();
  if (label === undefined && tooltip === undefined) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.type.lineHeight.sm }}>
      <View style={{ flexDirection: 'row', gap: t.spacing.space1, flexShrink: 1 }}>
        {label !== undefined && <Text style={[textStyle(t, 'sm/default'), { color: t.colors.textSoft500 }]}>{label}</Text>}
        {optional && <Text style={[textStyle(t, 'sm/default'), { color: t.colors.textDisabled400 }]}>(Optional)</Text>}
      </View>
      {tooltip !== undefined && (
        <Pressable
          onPress={onTooltipPress}
          accessibilityRole="button"
          accessibilityLabel={tooltip}
          hitSlop={touchSlop(t.platform.minTouchTarget, SMALL_ICON.size, SMALL_ICON.size)}
        >
          <Icon name="info" size={SMALL_ICON.size} color={t.colors.fgSoft500} strokeWidth={SMALL_ICON.stroke} />
        </Pressable>
      )}
    </View>
  );
}

export function FieldHelp({ help, error, disabled, trailing }: {
  help?: string;
  error: boolean;
  disabled: boolean;
  /** Text at the end of the row (Text Area's counter, "0/500"). */
  trailing?: string;
}) {
  const { tokens: t } = useAppetiteTheme();
  if (help === undefined && trailing === undefined) return null;
  const color = disabled ? t.colors.textDisabled400 : error ? t.colors.stateErrorBase500 : t.colors.textSub700;
  const iconColor = disabled ? t.colors.fgDisabled400 : error ? t.colors.stateErrorBase500 : t.colors.fgSoft500;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.space1 }}>
      {help !== undefined && <Icon name="info" size={SMALL_ICON.size} color={iconColor} strokeWidth={SMALL_ICON.stroke} />}
      <Text style={[textStyle(t, 'xs/default'), { flex: 1, color }]}>{help ?? ''}</Text>
      {trailing !== undefined && <Text style={[textStyle(t, 'xs/default'), { color }]}>{trailing}</Text>}
    </View>
  );
}
