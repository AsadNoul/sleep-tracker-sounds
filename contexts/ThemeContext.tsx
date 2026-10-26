import React, { createContext, useState, useContext, useEffect, useRef, ReactNode, useMemo, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nightTheme, dayTheme, Theme as ThemeType } from '../constants/theme';
import { getSunTimes } from '../utils/sunCalc';

export type ThemeMode = 'sunset' | 'night' | 'day';

const THEME_MODE_KEY = '@theme_mode_v2';
const OLD_THEME_MODE_KEY = '@theme_mode';
const LAST_LOCATION_KEY = '@theme_last_location';

// Fixed local-time heuristic used when location is denied/unavailable for
// 'sunset' mode: 7:00 PM–7:00 AM counts as night. No permission required,
// degrades gracefully.
const FALLBACK_NIGHT_START_HOUR = 19; // 7:00 PM
const FALLBACK_NIGHT_END_HOUR = 7; // 7:00 AM

interface StoredLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface ThemeContextType {
  theme: ThemeType;
  themeMode: ThemeMode;
  isNight: boolean;
  /** @deprecated use isNight instead. Kept so existing screens destructuring isDark don't break. */
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  /** Human-readable label describing when the next automatic mode flip happens (sunset mode only). */
  nextSwitchLabel: string | null;
  /** Date of the next automatic mode flip (sunset mode only). */
  nextSwitchAt: Date | null;
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

/** Formats a Date as a short local time label, e.g. "7:04 PM". */
function formatTimeLabel(date: Date): string {
  try {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    const h = date.getHours();
    const m = date.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
  }
}

/** Fixed local-time fallback: is it "night" right now by a simple clock heuristic? */
function isNightByFixedHeuristic(now: Date): boolean {
  const hour = now.getHours();
  return hour >= FALLBACK_NIGHT_START_HOUR || hour < FALLBACK_NIGHT_END_HOUR;
}

/** Next flip time for the fixed local-time heuristic, given current local time. */
function nextSwitchForFixedHeuristic(now: Date): Date {
  const next = new Date(now);
  if (isNightByFixedHeuristic(now)) {
    // Next flip is today/tomorrow at FALLBACK_NIGHT_END_HOUR (7 AM)
    next.setHours(FALLBACK_NIGHT_END_HOUR, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  } else {
    // Next flip is today at FALLBACK_NIGHT_START_HOUR (7 PM)
    next.setHours(FALLBACK_NIGHT_START_HOUR, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  }
  return next;
}

/** Returns the next local midnight after `now` (for scheduling a recompute). */
function nextMidnight(now: Date): Date {
  const next = new Date(now);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('sunset');
  const [isNight, setIsNight] = useState<boolean>(true);
  const [nextSwitchAt, setNextSwitchAt] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Migration + initial load ---
  useEffect(() => {
    loadThemeMode();
    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
  }, []);

  const loadThemeMode = async () => {
    try {
      // One-time migration from the old 2-way key/values.
      const newSaved = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (newSaved && (newSaved === 'sunset' || newSaved === 'night' || newSaved === 'day')) {
        setThemeModeState(newSaved as ThemeMode);
        setHydrated(true);
        return;
      }

      const oldSaved = await AsyncStorage.getItem(OLD_THEME_MODE_KEY);
      if (oldSaved === 'dark' || oldSaved === 'light' || oldSaved === 'auto') {
        const migrated: ThemeMode = oldSaved === 'dark' ? 'night' : oldSaved === 'light' ? 'day' : 'sunset';
        setThemeModeState(migrated);
        await AsyncStorage.setItem(THEME_MODE_KEY, migrated);
      }
      // No saved value at all → keep default 'sunset'.
      setHydrated(true);
    } catch (error) {
      console.error('Error loading theme mode:', error);
      setHydrated(true);
    }
  };

  // --- Resolve 'sunset' mode to an actual isNight boolean ---
  const resolveSunsetMode = useCallback(async () => {
    const now = new Date();

    // Try to use a cached/last-known location first (fast path).
    let coords: { latitude: number; longitude: number } | null = null;

    try {
      const cachedRaw = await AsyncStorage.getItem(LAST_LOCATION_KEY);
      if (cachedRaw) {
        const cached: StoredLocation = JSON.parse(cachedRaw);
        // Reuse a cached fix for up to 24h; sun times for a given lat/long
        // barely move day to day, so this is plenty fresh for theme purposes.
        if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          coords = { latitude: cached.latitude, longitude: cached.longitude };
        }
      }
    } catch {
      // ignore cache read errors, fall through to permission/heuristic path
    }

    if (!coords) {
      coords = await tryGetLocation();
    }

    if (coords) {
      const { sunrise, sunset } = getSunTimes(coords.latitude, coords.longitude, now);
      if (sunrise && sunset) {
        const night = now < sunrise || now >= sunset;
        setIsNight(night);
        setNextSwitchAt(night ? sunrise > now ? sunrise : sunset : sunset);
        return;
      }
      // Polar day/night edge case: sun doesn't rise or set today — fall
      // through to the fixed heuristic rather than guessing.
    }

    // No location permission/fix available, or polar edge case — degrade
    // gracefully to the fixed local-time heuristic (no permission needed).
    setIsNight(isNightByFixedHeuristic(now));
    setNextSwitchAt(nextSwitchForFixedHeuristic(now));
  }, []);

  /**
   * Lazily requests location permission (only called when the user is
   * actually in 'sunset' mode / just selected it — never on app launch).
   * Tries last-known position first (fast), falls back to a fresh
   * low-accuracy fetch if nothing cached by the OS either.
   */
  const tryGetLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      // Lazy require so expo-location's permission machinery never touches
      // app startup for users who aren't using sunset mode.
      const Location = await import('expo-location');

      const { status } = await Location.getForegroundPermissionsAsync();
      let finalStatus = status;
      if (finalStatus !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        finalStatus = req.status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      // Fast path: last-known position (no GPS fix wait).
      const lastKnown = await Location.getLastKnownPositionAsync({});
      let position = lastKnown;

      if (!position) {
        // Fall back to a fresh low-accuracy fetch (fast + battery-friendly;
        // we only need city-level precision for sunrise/sunset).
        position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
      }

      if (!position) return null;

      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      await AsyncStorage.setItem(
        LAST_LOCATION_KEY,
        JSON.stringify({ ...coords, timestamp: Date.now() } as StoredLocation)
      );

      return coords;
    } catch (error) {
      console.error('Error getting location for sunset theme mode:', error);
      return null;
    }
  };

  // --- Recompute whenever mode changes (after hydration) ---
  useEffect(() => {
    if (!hydrated) return;

    if (themeMode === 'sunset') {
      resolveSunsetMode();
    } else {
      setIsNight(themeMode === 'night');
      setNextSwitchAt(null);
    }
  }, [themeMode, hydrated]);

  // --- Recompute on app foreground ---
  useEffect(() => {
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active' && themeMode === 'sunset') {
        resolveSunsetMode();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [themeMode, resolveSunsetMode]);

  // --- Recompute at local midnight rollover (scheduled timer, not polling) ---
  useEffect(() => {
    if (themeMode !== 'sunset') return;

    const scheduleMidnightRecompute = () => {
      const now = new Date();
      const msUntilMidnight = nextMidnight(now).getTime() - now.getTime();
      midnightTimerRef.current = setTimeout(() => {
        resolveSunsetMode();
        scheduleMidnightRecompute(); // reschedule for the following midnight
      }, msUntilMidnight);
    };

    scheduleMidnightRecompute();

    return () => {
      if (midnightTimerRef.current) {
        clearTimeout(midnightTimerRef.current);
        midnightTimerRef.current = null;
      }
    };
  }, [themeMode, resolveSunsetMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
      throw error;
    }
  };

  const theme = isNight ? nightTheme : dayTheme;

  const nextSwitchLabel = useMemo(() => {
    if (themeMode !== 'sunset' || !nextSwitchAt) return null;
    const verb = isNight ? 'Day view' : 'Sleep mode';
    return `${verb} at ${formatTimeLabel(nextSwitchAt)}`;
  }, [themeMode, nextSwitchAt, isNight]);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      isNight,
      isDark: isNight, // deprecated alias, kept for existing screens
      setThemeMode,
      nextSwitchLabel,
      nextSwitchAt,
    }),
    [theme, themeMode, isNight, nextSwitchLabel, nextSwitchAt]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
