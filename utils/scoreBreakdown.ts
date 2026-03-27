/**
 * Sleep Score Breakdown
 * Shows what factors contributed to the sleep score
 */

import { SleepSession } from '../contexts/SleepContext';

export interface ScoreBreakdown {
  duration: {
    score: number;
    weight: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  quality: {
    score: number;
    weight: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  deepSleep: {
    score: number;
    weight: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  continuity: {
    score: number;
    weight: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  recovery: {
    score: number;
    weight: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
  };
  totalScore: number;
}

/**
 * Calculate score breakdown for a session
 */
export function calculateScoreBreakdown(session: SleepSession): ScoreBreakdown {
  // Duration score (7-9 hours = 100)
  const durationHours = session.duration / 60;
  let durationScore = 0;
  if (durationHours >= 7 && durationHours <= 9) durationScore = 100;
  else if (durationHours >= 6 && durationHours < 7) durationScore = 80;
  else if (durationHours >= 9 && durationHours <= 10) durationScore = 90;
  else if (durationHours >= 5 && durationHours < 6) durationScore = 60;
  else if (durationHours < 5) durationScore = 40;
  else durationScore = 50;

  // Quality score (based on session quality rating)
  const qualityScore = Math.round(session.quality * 100);

  // Deep sleep score
  let deepSleepScore = 50;
  if (session.sleepStages && session.sleepStages.length > 0) {
    const deepStages = session.sleepStages.filter(s => s.stage === 'deep');
    const deepDuration = deepStages.reduce((sum, s) => sum + (s.endTime - s.startTime), 0) / (session.duration * 60 * 1000);
    deepSleepScore = Math.min(100, Math.round((deepDuration / 0.25) * 100)); // 25% is excellent
  }

  // Continuity score (fewer awakenings = higher score)
  let continuityScore = 80;
  if (session.sleepStages && session.sleepStages.length > 0) {
    const awakenings = session.sleepStages.filter(s => s.stage === 'awake').length;
    if (awakenings <= 2) continuityScore = 100;
    else if (awakenings <= 5) continuityScore = 80;
    else if (awakenings <= 8) continuityScore = 60;
    else continuityScore = 40;
  }

  // Recovery score (how rested you felt)
  const recoveryScore = qualityScore; // Mirror quality for now

  // Calculate weighted total
  const breakdown: ScoreBreakdown = {
    duration: { score: durationScore, weight: 0.25, status: getStatus(durationScore) },
    quality: { score: qualityScore, weight: 0.35, status: getStatus(qualityScore) },
    deepSleep: { score: deepSleepScore, weight: 0.20, status: getStatus(deepSleepScore) },
    continuity: { score: continuityScore, weight: 0.15, status: getStatus(continuityScore) },
    recovery: { score: recoveryScore, weight: 0.05, status: getStatus(recoveryScore) },
    totalScore: 0,
  };

  breakdown.totalScore = Math.round(
    durationScore * 0.25 +
    qualityScore * 0.35 +
    deepSleepScore * 0.20 +
    continuityScore * 0.15 +
    recoveryScore * 0.05
  );

  return breakdown;
}

/**
 * Get status for a score
 */
function getStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

/**
 * Get explanation for each component
 */
export function getComponentExplanation(component: keyof Omit<ScoreBreakdown, 'totalScore'>): string {
  const explanations: Record<string, string> = {
    duration: 'How close you slept to the ideal 7-9 hours',
    quality: 'Your subjective sleep quality rating',
    deepSleep: 'Percentage of deep restorative sleep (target: 20-25%)',
    continuity: 'How uninterrupted your sleep was (fewer awakenings = better)',
    recovery: 'How rested and refreshed you felt upon waking',
  };
  return explanations[component] || '';
}

/**
 * Get improvement suggestions
 */
export function getImprovementSuggestions(breakdown: ScoreBreakdown): string[] {
  const suggestions: string[] = [];

  if (breakdown.duration.status === 'poor') {
    suggestions.push('Aim for at least 7 hours of sleep tonight');
  }
  if (breakdown.deepSleep.status === 'poor') {
    suggestions.push('Keep your bedroom cool (65°F) to improve deep sleep');
  }
  if (breakdown.continuity.status === 'poor') {
    suggestions.push('Reduce caffeine after 2 PM to minimize nighttime awakenings');
  }
  if (breakdown.quality.status === 'poor') {
    suggestions.push('Try a wind-down routine 30 minutes before bed');
  }

  return suggestions;
}
