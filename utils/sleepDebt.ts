/**
 * Sleep Debt Tracking
 * Tracks cumulative sleep deficit and provides clear actionable insights
 */

import { SleepSession } from '../contexts/SleepContext';

export interface SleepDebtMetrics {
  totalDebt: number; // in hours
  dailyDeficit: number; // hours per day on average
  daysToPayOff: number; // estimated days to recover
  debtLevel: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  targetHours: number;
  achievedHours: number;
  progress: number; // 0-100
}

/**
 * Calculate sleep debt for a period
 */
export function calculateSleepDebt(sleepHistory: SleepSession[], daysPeriod: 7 | 14 | 30 = 7): SleepDebtMetrics {
  const target = 7.5; // 7.5 hours recommended
  const relevantSessions = sleepHistory.slice(0, daysPeriod);

  if (relevantSessions.length === 0) {
    return {
      totalDebt: 0,
      dailyDeficit: 0,
      daysToPayOff: 0,
      debtLevel: 'none',
      targetHours: target * daysPeriod,
      achievedHours: 0,
      progress: 0,
    };
  }

  const totalMinutes = relevantSessions.reduce((sum, s) => sum + s.duration, 0);
  const achievedHours = totalMinutes / 60;
  const targetHours = target * relevantSessions.length;
  const debtHours = Math.max(0, targetHours - achievedHours);
  const dailyDeficit = debtHours / Math.max(1, relevantSessions.length);
  const daysToPayOff = dailyDeficit > 0 ? Math.ceil(debtHours / 1) : 0; // 1 hour per night to catch up

  const debtLevel = getDebtLevel(debtHours);
  const progress = Math.round((achievedHours / targetHours) * 100);

  return {
    totalDebt: Math.round(debtHours * 100) / 100,
    dailyDeficit: Math.round(dailyDeficit * 100) / 100,
    daysToPayOff,
    debtLevel,
    targetHours: Math.round(targetHours * 100) / 100,
    achievedHours: Math.round(achievedHours * 100) / 100,
    progress: Math.min(100, progress),
  };
}

function getDebtLevel(debtHours: number): 'none' | 'low' | 'moderate' | 'high' | 'critical' {
  if (debtHours <= 0) return 'none';
  if (debtHours <= 3) return 'low';
  if (debtHours <= 7) return 'moderate';
  if (debtHours <= 14) return 'high';
  return 'critical';
}

/**
 * Get recommendations for paying off debt
 */
export function getDebtPayoffRecommendations(metrics: SleepDebtMetrics): string[] {
  const recommendations: string[] = [];

  if (metrics.debtLevel === 'none') {
    recommendations.push('You\'re well-rested! Maintain your current sleep schedule.');
    return recommendations;
  }

  // Base recommendation
  if (metrics.dailyDeficit > 0) {
    recommendations.push(`Add ${Math.ceil(metrics.dailyDeficit * 60)} minutes of sleep per night to catch up.`);
  }

  // Specific actions based on debt level
  switch (metrics.debtLevel) {
    case 'low':
      recommendations.push('A few early nights or extended weekends should clear your debt.');
      break;
    case 'moderate':
      recommendations.push('Prioritize sleep this week - aim for consistent 8-hour nights.');
      break;
    case 'high':
      recommendations.push('This is significant sleep debt. Make sleep your priority for the next 2 weeks.');
      recommendations.push('Consider a recovery weekend with plenty of rest and light activity.');
      break;
    case 'critical':
      recommendations.push('Critical sleep debt - this affects your health. Sleep must be your top priority.');
      recommendations.push('Aim for 9+ hours nightly until debt is cleared.');
      break;
  }

  return recommendations;
}

/**
 * Visualize sleep debt as a percentage
 */
export function getDebtVisualization(metrics: SleepDebtMetrics): { filled: number; label: string } {
  const filled = metrics.progress;
  const label = `${filled}% of target (${metrics.achievedHours}h / ${metrics.targetHours}h)`;
  return { filled, label };
}
