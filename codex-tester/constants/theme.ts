/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const commonColors = {
  textPrimary: '#F6F6FB',
  textSecondary: 'rgba(255, 255, 255, 0.68)',
  background: '#09070F',
  surface: '#15131F',
  surfaceElevated: '#1E1A29',
  border: 'rgba(255, 255, 255, 0.08)',
  accent: '#E0313A',
  accentSoft: '#F24C5C',
  accentMuted: '#3F3C48',
  positive: '#3ED598',
  negative: '#F3566A',
  warning: '#F2994A',
  neutral: '#756F82',
};

export const Colors = {
  light: {
    ...commonColors,
    text: commonColors.textPrimary,
    tint: commonColors.accent,
    icon: commonColors.textSecondary,
    tabIconDefault: '#4C485B',
    tabIconSelected: commonColors.accent,
  },
  dark: {
    ...commonColors,
    text: commonColors.textPrimary,
    tint: commonColors.accent,
    icon: commonColors.textSecondary,
    tabIconDefault: '#4C485B',
    tabIconSelected: commonColors.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
