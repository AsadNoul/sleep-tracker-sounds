import { darkTheme } from '../constants/theme';

/**
 * UNIFIED Sleep Quality Color System
 * Single source of truth - all colors defined in constants/theme.ts
 * This file now acts as a pure utility layer
 */

export interface SleepQualityLevel {
  color: string;
  label: string;
  emoji: string;
  gradient: string[];
}

/**
 * Get color for sleep SCORE (0-100 scale)
 * Used for: Sleep score rings, badges, highlights
 * Examples: 95 = Optimal, 80 = Excellent, 65 = Good, 55 = Fair, 35 = Poor
 */
export function getSleepScoreColor(score: number): SleepQualityLevel {
  const palette = darkTheme.sleepQuality;

  if (score >= palette.optimal.minScore) {
    return {
      color: palette.optimal.color,
      label: palette.optimal.label,
      emoji: palette.optimal.emoji,
      gradient: palette.optimal.gradient,
    };
  } else if (score >= palette.excellent.minScore) {
    return {
      color: palette.excellent.color,
      label: palette.excellent.label,
      emoji: palette.excellent.emoji,
      gradient: palette.excellent.gradient,
    };
  } else if (score >= palette.good.minScore) {
    return {
      color: palette.good.color,
      label: palette.good.label,
      emoji: palette.good.emoji,
      gradient: palette.good.gradient,
    };
  } else if (score >= palette.fair.minScore) {
    return {
      color: palette.fair.color,
      label: palette.fair.label,
      emoji: palette.fair.emoji,
      gradient: palette.fair.gradient,
    };
  } else {
    return {
      color: palette.poor.color,
      label: palette.poor.label,
      emoji: palette.poor.emoji,
      gradient: palette.poor.gradient,
    };
  }
}

/**
 * Get color for sleep DURATION (in hours)
 * Used for: Duration bars, duration analysis
 * Examples: 6h = Fair, 7h = Good, 8.5h = Excellent, 5h = Poor
 */
export function getSleepQualityColor(hours: number): SleepQualityLevel {
  const palette = darkTheme.sleepQuality;

  if (hours >= 8 && hours <= 10) {
    return {
      color: palette.excellent.color,
      label: palette.excellent.label,
      emoji: palette.excellent.emoji,
      gradient: palette.excellent.gradient,
    };
  } else if (hours >= 7 && hours < 8) {
    return {
      color: palette.good.color,
      label: palette.good.label,
      emoji: palette.good.emoji,
      gradient: palette.good.gradient,
    };
  } else if (hours >= 6 && hours < 7) {
    return {
      color: palette.fair.color,
      label: palette.fair.label,
      emoji: palette.fair.emoji,
      gradient: palette.fair.gradient,
    };
  } else {
    return {
      color: palette.poor.color,
      label: palette.poor.label,
      emoji: palette.poor.emoji,
      gradient: palette.poor.gradient,
    };
  }
}

/**
 * Universal function - use for charts to ensure consistency
 * Intelligently picks correct palette based on whether you're using score or duration
 */
export function getQualityColor(metric: number, isScore: boolean = true): SleepQualityLevel {
  return isScore ? getSleepScoreColor(metric) : getSleepQualityColor(metric);
}

/**
 * Get hex color only (for simple use cases)
 */
export function getQualityHexColor(metric: number, isScore: boolean = true): string {
  return getQualityColor(metric, isScore).color;
}

/**
 * Legacy function - for rating colors (deprecated, use getSleepScoreColor instead)
 */
export function getQualityRatingColor(rating: number): string {
  // Convert 1-10 scale to 0-100 scale
  const score = rating * 10;
  return getQualityHexColor(score, true);
}
