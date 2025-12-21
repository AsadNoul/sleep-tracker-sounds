import { useTheme } from '../contexts/ThemeContext';
import { darkTheme, lightTheme } from '../constants/theme';

/**
 * Custom hook that provides the current theme based on user's theme mode selection
 *
 * @returns {Object} theme - The current theme object (dark or light)
 * @returns {boolean} isDark - Whether dark mode is active
 * @returns {string} themeMode - Current theme mode ('dark' | 'light' | 'auto')
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
  const { isDark, themeMode, setThemeMode } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  return {
    theme,
    isDark,
    themeMode,
    setThemeMode,
  };
};
