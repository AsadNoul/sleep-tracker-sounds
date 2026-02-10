import { Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Custom hook to calculate safe bottom margin for content above tab bar
 * Ensures content doesn't get hidden behind Android navigation bar or iOS safe area
 */
export const useSafeBottomMargin = (): number => {
  const insets = useSafeAreaInsets();

  // Base tab bar height (matches App.tsx)
  const baseTabBarHeight = 65;

  if (Platform.OS === 'android') {
    // Modern Android with gesture navigation (has insets)
    if (insets.bottom > 0) {
      return baseTabBarHeight + insets.bottom + 15; // 15px buffer
    }

    // Older Android or where insets are 0
    return baseTabBarHeight + 58; // 48dp (nav bar) + 10px buffer
  }

  // iOS - always use insets
  return baseTabBarHeight + Math.max(insets.bottom, 15) + 10;
};

/**
 * Get just the tab bar height (for absolute positioning)
 */
export const useTabBarHeight = (): number => {
  const insets = useSafeAreaInsets();

  const baseTabBarHeight = 65;

  if (Platform.OS === 'android') {
    if (insets.bottom > 0) {
      return baseTabBarHeight + insets.bottom;
    }
    return baseTabBarHeight + 48; // Standard Android nav bar
  }

  return baseTabBarHeight + Math.max(insets.bottom, 15);
};

/**
 * Get safe padding for bottom of content
 */
export const useSafeBottomPadding = (): number => {
  const bottomMargin = useSafeBottomMargin();
  return bottomMargin + 10; // Extra padding for comfort
};
