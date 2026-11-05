# AGENTS.md: Appetite UI base

This is an Expo SDK 58 app with React Native and TypeScript strict. The UI comes from `appetite-ui/`.

## Build with the components

- Use the components in `appetite-ui/components/` before writing your own: Button, Badge, Avatar, Checkbox, Radio, Toggle, Chip, Divider, ProgressBar, TextInput.
- Import everything from `./appetite-ui` (or the matching relative path). Never import a token file directly.
- Props follow the Appetite UI Figma file. A Figma variant is a prop: `<Button type="neutral" variant="outline" size="md" />`.
- Icons are names from `appetite-ui/icons/glyphs.ts` (`iconLeft="trash-2"`). Add no icon library.

## Style with tokens

- Read every color, spacing value, radius and text style from the theme: `makeStyles(({ tokens }) => ({ ... }))` or `useAppetiteTheme()`.
- Text uses `textStyle(tokens, 'base/default')` and a color token such as `tokens.colors.textStrong950`.
- No hex values, no raw font sizes, no magic spacing numbers in screens.
- Dark mode and the iOS or Material conventions come from `AppetiteProvider` (`colorScheme`, `platform`). Branch on `useAppetiteTheme().platform`, never on `Platform.OS`.

## Accessibility

- Give every control without visible text an `accessibilityLabel` (Toggle, Checkbox, Radio, icon-only Button).
- Keep touch targets at 44 pt on iOS and 48 dp on Android; the components already grow their hit area.

## Check your work

- `npx tsc --noEmit` passes with no errors.
- `npx expo start`, open the screen in Expo Go in light and dark mode, no red box and no warnings in the terminal.

## Need more

Lists, sheets, navigation, tables, charts, AI chat, the App Starter, SwiftUI, Flutter and Jetpack Compose, and the full agent kit with a skill and Cursor rules are in Appetite UI Code: https://appetiteui.com/code
