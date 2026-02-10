/**
 * Sleep Quality Color System
 * Provides consistent color coding throughout the app
 */

export interface SleepQualityLevel {
  color: string;
  label: string;
  emoji: string;
  gradient: string[];
}

export function getSleepQualityColor(hours: number): SleepQualityLevel {
  if (hours >= 8 && hours <= 10) {
    return {
      color: '#10B981', // Green
      label: 'Excellent',
      emoji: '🌟',
      gradient: ['#10B981', '#059669']
    };
  } else if (hours >= 7 && hours < 8) {
    return {
      color: '#F59E0B', // Gold/Yellow
      label: 'Good',
      emoji: '✨',
      gradient: ['#F59E0B', '#D97706']
    };
  } else if (hours >= 6 && hours < 7) {
    return {
      color: '#F97316', // Orange
      label: 'Fair',
      emoji: '⚠️',
      gradient: ['#F97316', '#EA580C']
    };
  } else {
    return {
      color: '#EF4444', // Red
      label: 'Poor',
      emoji: '😴',
      gradient: ['#EF4444', '#DC2626']
    };
  }
}

export function getSleepScoreColor(score: number): SleepQualityLevel {
  if (score >= 90) {
    return {
      color: '#F59E0B', // Premium Gold
      label: 'Optimal',
      emoji: '🏆',
      gradient: ['#F59E0B', '#B45309']
    };
  } else if (score >= 75) {
    return {
      color: '#10B981', // Vibrant Green
      label: 'Excellent',
      emoji: '🌟',
      gradient: ['#10B981', '#059669']
    };
  } else if (score >= 60) {
    return {
      color: '#06B6D4', // Cyan/Teal (Positive but room for improvement)
      label: 'Good',
      emoji: '✨',
      gradient: ['#06B6D4', '#0891B2']
    };
  } else if (score >= 50) {
    return {
      color: '#EAB308', // Yellow
      label: 'Fair',
      emoji: '⚖️',
      gradient: ['#EAB308', '#CA8A04']
    };
  } else if (score >= 40) {
    return {
      color: '#F97316', // Orange
      label: 'Mediocre',
      emoji: '⚠️',
      gradient: ['#F97316', '#EA580C']
    };
  } else {
    return {
      color: '#EF4444', // Red
      label: 'Poor',
      emoji: '😴',
      gradient: ['#EF4444', '#DC2626']
    };
  }
}

export function getQualityRatingColor(rating: number): string {
  // For 1-10 quality ratings
  if (rating >= 8) return '#10B981';
  if (rating >= 6) return '#F59E0B';
  if (rating >= 4) return '#F97316';
  return '#EF4444';
}
