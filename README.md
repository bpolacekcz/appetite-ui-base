# Appetite UI base

Appetite UI base is the free, MIT-licensed part of Appetite UI Code: 10 React Native components for Expo, the 178 design tokens they read, and an example app you open in Expo Go.

Appetite UI is a UI kit for iOS and Android apps, in Figma and in code, built like a design system. This repository lets you read and run a slice of the code before you buy the kit.

Built with Expo SDK 58.

## What is inside

| Component | Figma component | File |
| --- | --- | --- |
| Button | Button | `appetite-ui/components/Button.tsx` |
| Badge | Badge | `appetite-ui/components/Badge.tsx` |
| Avatar | Avatar | `appetite-ui/components/Avatar.tsx` |
| Checkbox | Checkbox | `appetite-ui/components/Checkbox.tsx` |
| Radio | Radio | `appetite-ui/components/Radio.tsx` |
| Toggle | Toggle | `appetite-ui/components/Toggle.tsx` |
| Chip | Chip | `appetite-ui/components/Chip.tsx` |
| Divider | Divider | `appetite-ui/components/Divider.tsx` |
| ProgressBar | Progress Bar | `appetite-ui/components/ProgressBar.tsx` |
| TextInput | Text Input | `appetite-ui/components/TextInput.tsx` |

- `appetite-ui/core/`: the theme provider, light and dark mode, the iOS and Material conventions behind one `platform` prop, text styles, haptics and the Inter faces (SIL Open Font License). The brand is fixed to Appetite UI's: a rebrand in one theme file is part of [Appetite UI Code](https://appetiteui.com/code).
- `appetite-ui/tokens/`: 178 of the 589 tokens of Appetite UI 2.5, the ones these components and the theme read.
- `appetite-ui/icons/`: 34 icons from the kit's Lucide set.
- `App.tsx`: one screen with every component, a dark mode switch and a platform switch.
- `AGENTS.md`: rules for Claude Code, Cursor and other coding agents working in this repository.

Component names and props follow the Figma file: a variant in Figma is a prop in code (`Button` with `type`, `variant` and `size`).

## Run it

You need Node 22.13 or newer and the Expo Go app on a phone or a simulator.

```sh
npm install
npx expo start
```

Scan the QR code with Expo Go, or press `i` for the iOS simulator and `a` for the Android emulator.

## Use the components in your app

1. Copy `appetite-ui/` into your Expo project.
2. Add the `paths` entries from this `tsconfig.json` to yours.
3. Install the dependencies: `npx expo install expo-font expo-haptics react-native-svg`.
4. Load the fonts with `useFonts(appetiteFonts)` and wrap your app in `AppetiteProvider`, as `App.tsx` does.

Components read every color, size and duration from the theme through `useAppetiteTheme()` and `makeStyles()`. Style your own screens the same way and dark mode and the platform switch follow.

## What the full kit adds

Appetite UI Code has every Appetite UI component in React Native, from lists, sheets and navigation to tables, charts and AI chat. It adds the full token set with CSS, SwiftUI, Jetpack Compose and Flutter outputs, the core components in SwiftUI, Flutter and Jetpack Compose, an App Starter on Expo Router with Tasks, Foodie and AI flows, and an agent kit for Claude Code and Cursor.

See it at [appetiteui.com/code](https://appetiteui.com/code).

## License

MIT for the code in this repository (`LICENSE`). The Inter fonts keep the SIL Open Font License 1.1. The paid Appetite UI Code license does not apply to this repository.

Questions go straight to Bob Poláček at hi@appetiteui.com.
