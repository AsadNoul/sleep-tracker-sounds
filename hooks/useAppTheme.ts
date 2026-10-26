import { useTheme } from '../contexts/ThemeContext';

/**
 * Custom hook that provides the current theme based on user's theme mode selection
 *
 * @returns {Object} theme - The current theme object (night or day), already
 *   resolved by ThemeContext (including real sunrise/sunset logic for 'sunset' mode)
 * @returns {boolean} isDark - Whether night/dark mode is active (deprecated alias of isNight)
 * @returns {string} themeMode - Current theme mode ('sunset' | 'night' | 'day')
 * @returns {Function} setThemeMode - Function to change theme mode
 *
 * @example
 * const { theme, isDark } = useAppTheme();
 *
 * <View style={{ backgroundColor: theme.colors.background }}>
 *   <Text style={{ color: theme.colors.textPrimary }}>Hello</Text>
 * </View>
 */
export const useAppTheme = () => {
  const { theme, isDark, isNight, themeMode, setThemeMode, nextSwitchLabel, nextSwitchAt } = useTheme();

  return {
    theme,
    isDark,
    isNight,
    themeMode,
    setThemeMode,
    nextSwitchLabel,
    nextSwitchAt,
  };
};

export default useAppTheme;
