/**
 * Recovery Status Calculator
 * Determine readiness for workouts and activities based on sleep
 */

import { SleepSession } from '../contexts/SleepContext';

export type RecoveryLevel = 'excellent' | 'good' | 'moderate' | 'low' | 'critical';

export interface RecoveryStatus {
  level: RecoveryLevel;
  score: number; // 0-100
  readinessFactor: number; // 0-1, for workout readiness
  recommendations: string[];
  icon: string;
  color: string;
}

/**
 * Calculate recovery status from recent sleep
 */
export function calculateRecoveryStatus(sleepHistory: SleepSession[]): RecoveryStatus {
  if (sleepHistory.length === 0) {
    return {
      level: 'low',
      score: 30,
      readinessFactor: 0.3,
      recommendations: ['No recent sleep data. Log a sleep session to calculate recovery status.'],
      icon: '😴',
      color: '#EF4444',
    };
  }

  const lastNight = sleepHistory[0];
  const lastWeek = sleepHistory.slice(0, 7);

  // Calculate factors
  const durationFactor = calculateDurationFactor(lastNight.duration);
  const qualityFactor = lastNight.quality;
  const deepSleepFactor = calculateDeepSleepFactor(lastNight);
  const streakFactor = calculateStreakFactor(lastWeek);
  const sleepDebtFactor = calculateSleepDebtFactor(lastWeek);

  // Weighted recovery score
  const recoveryScore = Math.round(
    durationFactor * 0.25 +
    qualityFactor * 100 * 0.30 +
    deepSleepFactor * 0.20 +
    streakFactor * 0.15 +
    sleepDebtFactor * 0.10
  );

  const level = getRecoveryLevel(recoveryScore);
  const readinessFactor = recoveryScore / 100;

  const recommendations = generateRecoveryRecommendations(level, lastNight, lastWeek);

  const statusConfig: Record<RecoveryLevel, { icon: string; color: string }> = {
    excellent: { icon: '💪', color: '#10B981' },
    good: { icon: '✨', color: '#F59E0B' },
    moderate: { icon: '⚖️', color: '#F97316' },
    low: { icon: '😴', color: '#EF4444' },
    critical: { icon: '⚠️', color: '#DC2626' },
  };

  return {
    level,
    score: recoveryScore,
    readinessFactor,
    recommendations,
    ...statusConfig[level],
  };
}

function calculateDurationFactor(minutes: number): number {
  const hours = minutes / 60;
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6 && hours < 7) return 70;
  if (hours >= 9 && hours <= 10) return 80;
  if (hours >= 5 && hours < 6) return 50;
  return Math.max(0, 30 - (6 - hours) * 10);
}

function calculateDeepSleepFactor(session: SleepSession): number {
  if (!session.sleepStages || session.sleepStages.length === 0) return 50;
  const deepStages = session.sleepStages.filter(s => s.stage === 'deep');
  const deepDuration = deepStages.reduce((sum, s) => sum + (s.endTime - s.startTime), 0);
  const deepPercent = deepDuration / (session.duration * 60 * 1000);
  return Math.min(100, (deepPercent / 0.25) * 100);
}

function calculateStreakFactor(lastWeek: SleepSession[]): number {
  // Bonus for consistent sleep
  return Math.min(100, lastWeek.length * 14); // Each night adds points
}

function calculateSleepDebtFactor(lastWeek: SleepSession[]): number {
  const totalMinutes = lastWeek.reduce((sum, s) => sum + s.duration, 0);
  const avgPerNight = totalMinutes / Math.max(1, lastWeek.length);
  const target = 7.5 * 60; // 7.5 hours ideal
  const debtHours = Math.max(0, target - avgPerNight) / 60;

  // Debt reduces readiness
  return Math.max(0, 100 - debtHours * 15);
}

function getRecoveryLevel(score: number): RecoveryLevel {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'moderate';
  if (score >= 45) return 'low';
  return 'critical';
}

function generateRecoveryRecommendations(
  level: RecoveryLevel,
  lastNight: SleepSession,
  lastWeek: SleepSession[]
): string[] {
  const recommendations: string[] = [];

  switch (level) {
    case 'excellent':
      recommendations.push('You\'re fully recovered! Perfect day for intense workouts.');
      recommendations.push('Energy levels should be optimal for challenging activities.');
      break;
    case 'good':
      recommendations.push('Good recovery. Moderate to intense exercise is recommended.');
      recommendations.push('Consider lighter activities if the previous night was short.');
      break;
    case 'moderate':
      recommendations.push('Moderate recovery. Stick to light to moderate exercise.');
      recommendations.push('Avoid pushing too hard - your body needs recovery time.');
      break;
    case 'low':
      recommendations.push('Limited recovery. Rest is recommended today.');
      recommendations.push('Do light activity or stretching instead of hard workouts.');
      break;
    case 'critical':
      recommendations.push('Your body needs rest - avoid intense exercise.');
      recommendations.push('Focus on recovery activities: yoga, walking, or rest.');
      recommendations.push('Sleep is a priority - aim for 8+ hours tonight.');
      break;
  }

  // Add specific suggestions
  if (lastNight.duration < 360) {
    recommendations.push(`You only got ${Math.round(lastNight.duration / 60)}h last night - consider another recovery day.`);
  }

  return recommendations.slice(0, 3); // Return top 3
}
