// Why: Metro turns a font file import into an asset reference (a number on native), which expo-font's
// useFonts accepts. TypeScript needs to know that shape.
declare module '*.ttf' {
  const asset: number;
  export default asset;
}
declare module '*.otf' {
  const asset: number;
  export default asset;
}
