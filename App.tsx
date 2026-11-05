// Why: the example app of the free Appetite UI base (scripts/public/build.mjs copies it to App.tsx). One screen
// with every component in the base, a dark mode switch and a platform switch (iOS or Material conventions), so
// the components can be seen in Expo Go before anything else is read.
// Numbers it relies on: none of its own. Colors, spacing and type come from the tokens through makeStyles and
// textStyle; the screen holds no raw value except layout flex.
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppetiteProvider,
  Avatar,
  Badge,
  Button,
  Checkbox,
  Chip,
  Divider,
  ProgressBar,
  Radio,
  TextInput,
  Toggle,
  appetiteFonts,
  makeStyles,
  textStyle,
  useAppetiteTheme,
  type AppetitePlatform,
} from './appetite-ui';

export default function App() {
  const [loaded] = useFonts(appetiteFonts);
  const [dark, setDark] = useState(false);
  const [platform, setPlatform] = useState<AppetitePlatform>('ios');
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <AppetiteProvider colorScheme={dark ? 'dark' : 'light'} platform={platform}>
        <Gallery dark={dark} onDark={setDark} platform={platform} onPlatform={setPlatform} />
      </AppetiteProvider>
    </SafeAreaProvider>
  );
}

interface GalleryProps {
  dark: boolean;
  onDark: (dark: boolean) => void;
  platform: AppetitePlatform;
  onPlatform: (platform: AppetitePlatform) => void;
}

function Gallery({ dark, onDark, platform, onPlatform }: GalleryProps) {
  const s = useStyles();
  const { scheme } = useAppetiteTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(true);
  const [plan, setPlan] = useState<'solo' | 'team'>('solo');
  const [tags, setTags] = useState<string[]>(['Design']);
  const toggleTag = (tag: string) => setTags((t) => (t.includes(tag) ? t.filter((x) => x !== tag) : [...t, tag]));

  return (
    <View style={s.screen}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={[s.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={s.title} accessibilityRole="header">Appetite UI base</Text>
        <Text style={s.body}>Ten components from Appetite UI Code, the tokens they read and this screen.</Text>

        <View style={s.row}>
          <Text style={s.label}>Dark mode</Text>
          <Toggle checked={dark} onCheckedChange={onDark} accessibilityLabel="Dark mode" />
        </View>
        <View style={s.chips}>
          <Chip text="iOS" selected={platform === 'ios'} onPress={() => onPlatform('ios')} />
          <Chip text="Material" selected={platform === 'material'} onPress={() => onPlatform('material')} />
        </View>

        <Divider variant="withLabel" text="Buttons" />
        <Button text="Create account" size="lg" expanded />
        <View style={s.chips}>
          <Button text="Outline" variant="outline" />
          <Button text="Weak" variant="weak" />
          <Button text="Delete" type="error" iconLeft="trash-2" />
        </View>

        <Divider variant="withLabel" text="Form" />
        <TextInput label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} help="We never share it." />
        <View style={s.row}>
          <Text style={s.label}>Accept the terms</Text>
          <Checkbox checked={terms} onCheckedChange={setTerms} accessibilityLabel="Accept the terms" />
        </View>
        <View style={s.row}>
          <Text style={s.label}>Solo</Text>
          <Radio checked={plan === 'solo'} onCheckedChange={() => setPlan('solo')} accessibilityLabel="Solo" />
        </View>
        <View style={s.row}>
          <Text style={s.label}>Team</Text>
          <Radio checked={plan === 'team'} onCheckedChange={() => setPlan('team')} accessibilityLabel="Team" />
        </View>

        <Divider variant="withLabel" text="Status" />
        <View style={s.chips}>
          {['Design', 'Code', 'Research'].map((tag) => (
            <Chip key={tag} text={tag} selected={tags.includes(tag)} onPress={() => toggleTag(tag)} />
          ))}
        </View>
        <View style={s.chips}>
          <Badge label="New" state="information" />
          <Badge label="Done" state="success" variant="color" />
          <Badge label="Late" state="error" />
        </View>
        <View style={s.chips}>
          <Avatar type="acronym" name="Bob Polacek" size="lg" tone="blue" bottomStatus="online" accessibilityLabel="Bob Polacek, online" />
          <Avatar type="symbol" size="lg" tone="purple" accessibilityLabel="Guest" />
        </View>
        <ProgressBar value={0.6} accessibilityLabel="Profile 60 percent complete" />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ tokens }) => ({
  screen: { flex: 1, backgroundColor: tokens.colors.bgWhite0 },
  content: { paddingHorizontal: tokens.spacing.space4, gap: tokens.spacing.space4 },
  title: { ...textStyle(tokens, '2xl/emphasized'), color: tokens.colors.textStrong950 },
  body: { ...textStyle(tokens, 'base/default'), color: tokens.colors.textSub700 },
  label: { ...textStyle(tokens, 'base/default'), color: tokens.colors.textStrong950, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.space3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.space2 },
}));
