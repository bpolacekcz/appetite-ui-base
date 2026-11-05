// Why: components build StyleSheets from the theme once per theme, not on every render. A style
// factory receives the resolved theme and returns StyleSheet.create(...) input; the result is cached
// per factory per theme object (8 theme objects at most, see AppetiteProvider).
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useAppetiteTheme, type AppetiteTheme } from './AppetiteProvider';

// React Native 0.88's strict TypeScript API no longer exports StyleSheet.NamedStyles; the constraint is read
// from StyleSheet.create itself, so it follows whatever the installed React Native accepts.
type NamedStyles = Parameters<typeof StyleSheet.create>[0];

export function makeStyles<T extends NamedStyles>(factory: (theme: AppetiteTheme) => T) {
  const cache = new WeakMap<AppetiteTheme, Readonly<T>>();
  return function useStyles(): Readonly<T> {
    const theme = useAppetiteTheme();
    return useMemo(() => {
      let s = cache.get(theme);
      if (!s) {
        s = StyleSheet.create(factory(theme));
        cache.set(theme, s);
      }
      return s;
    }, [theme]);
  };
}
