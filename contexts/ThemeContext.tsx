import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme as ThemeType } from '../constants/theme';

export type ThemeMode = 'dark' | 'light' | 'auto';

interface ThemeContextType {
  theme: ThemeType;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [theme, setTheme] = useState<ThemeType>(darkTheme);

  useEffect(() => {
    loadThemeMode();
  }, []);

  useEffect(() => {
    updateTheme();
  }, [themeMode]);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('@theme_mode');
      if (savedMode && (savedMode === 'dark' || savedMode === 'light' || savedMode === 'auto')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
    }
  };

  const updateTheme = () => {
    if (themeMode === 'auto') {
      // For now, default to dark in auto mode
      // You could use Appearance API to detect system theme
      setTheme(darkTheme);
    } else {
      setTheme(themeMode === 'dark' ? darkTheme : lightTheme);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('@theme_mode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
      throw error;
    }
  };

  const value = {
    theme,
    themeMode,
    isDark: themeMode === 'dark' || (themeMode === 'auto' && theme === darkTheme),
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
