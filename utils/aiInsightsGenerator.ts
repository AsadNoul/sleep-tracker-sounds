/**
 * AI Sleep Insights Generator
 * Creates personalized sleep insights from session data
 */

import { SleepSession } from '../contexts/SleepContext';

export interface SleepInsight {
  id: string;
  title: string;
  description: string;
  category: 'pattern' | 'recommendation' | 'achievement' | 'warning';
  icon: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  actionText?: string;
}

/**
 * Generate AI insights from sleep history
 */
export function generateSleepInsights(sleepHistory: SleepSession[]): SleepInsight[] {
  const insights: SleepInsight[] = [];

  if (sleepHistory.length === 0) return insights;

  const lastWeek = sleepHistory.slice(0, 7);
  const lastMonth = sleepHistory.slice(0, 30);

  // 1. Optimal sleep duration pattern
  const avgDuration = lastWeek.reduce((sum, s) => sum + s.duration, 0) / lastWeek.length;
  if (avgDuration >= 420 && avgDuration <= 480) {
    insights.push({
      id: 'optimal-duration',
      title: 'You\'re in your sweet spot',
      description: `Your average sleep of ${Math.round(avgDuration / 60)}h is ideal for peak recovery. Keep this up!`,
      category: 'achievement',
      icon: '🎯',
      impact: 'high',
      actionable: false,
    });
  } else if (avgDuration < 360) {
    insights.push({
      id: 'low-duration',
      title: 'Sleep duration is critical',
      description: `You\'re averaging ${Math.round(avgDuration / 60)}h. Aim for 7-8h to avoid sleep debt.`,
      category: 'warning',
      icon: '⏰',
      impact: 'high',
      actionable: true,
      actionText: 'See bedtime routine tips',
    });
  }

  // 2. Deep sleep quality
  const deepSleepRatio = lastWeek
    .filter(s => s.sleepStages && s.sleepStages.length > 0)
    .reduce((sum, s) => {
      const deepStages = s.sleepStages?.filter(st => st.stage === 'deep') || [];
      const deepDuration = deepStages.reduce((t, st) => t + (st.endTime - st.startTime), 0);
      return sum + (deepDuration / (s.duration * 60 * 1000));
    }, 0) / Math.max(1, lastWeek.filter(s => s.sleepStages).length);

  if (deepSleepRatio > 0.25) {
    insights.push({
      id: 'deep-sleep-good',
      title: 'Excellent deep sleep quality',
      description: `${Math.round(deepSleepRatio * 100)}% deep sleep is above average. Your recovery is strong.`,
      category: 'achievement',
      icon: '🌙',
      impact: 'high',
      actionable: false,
    });
  } else if (deepSleepRatio < 0.15) {
    insights.push({
      id: 'deep-sleep-low',
      title: 'Boost your deep sleep',
      description: `Only ${Math.round(deepSleepRatio * 100)}% deep sleep. Try cooler room temp or consistent bedtimes.`,
      category: 'recommendation',
      icon: '❄️',
      impact: 'high',
      actionable: true,
      actionText: 'Learn deep sleep tips',
    });
  }

  // 3. Consistency pattern
  const dates = lastWeek.map(s => new Date(s.startTime).toDateString());
  const uniqueDates = new Set(dates).size;
  if (uniqueDates >= 6) {
    insights.push({
      id: 'consistency-streak',
      title: 'Consistency champion',
      description: `You logged sleep ${uniqueDates} nights this week. This routine builds better sleep habits.`,
      category: 'achievement',
      icon: '🔥',
      impact: 'medium',
      actionable: false,
    });
  }

  // 4. Best sleep time
  const sessionsByHour = new Map<number, number[]>();
  lastMonth.forEach(s => {
    const hour = new Date(s.startTime).getHours();
    if (!sessionsByHour.has(hour)) sessionsByHour.set(hour, []);
    sessionsByHour.get(hour)!.push(s.quality);
  });

  let bestHour = 22;
  let bestQuality = 0;
  sessionsByHour.forEach((qualities, hour) => {
    const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    if (avgQuality > bestQuality) {
      bestQuality = avgQuality;
      bestHour = hour;
    }
  });

  if (bestQuality > 0) {
    const ampm = bestHour >= 12 ? 'PM' : 'AM';
    const hour12 = bestHour === 0 ? 12 : bestHour > 12 ? bestHour - 12 : bestHour;
    insights.push({
      id: 'best-sleep-time',
      title: `Your best sleep is at ${hour12}${ampm}`,
      description: `Data shows you sleep best when falling asleep around ${hour12}${ampm}. Try to maintain this schedule.`,
      category: 'pattern',
      icon: '✨',
      impact: 'medium',
      actionable: false,
    });
  }

  // 5. Sleep quality trend
  if (lastWeek.length >= 3) {
    const qualities = lastWeek.map(s => s.quality);
    const trend = qualities[0] - qualities[qualities.length - 1];
    if (trend > 0.2) {
      insights.push({
        id: 'quality-improving',
        title: 'Your sleep quality is improving',
        description: 'Recent nights show better sleep. Whatever changes you made are working!',
        category: 'achievement',
        icon: '📈',
        impact: 'medium',
        actionable: false,
      });
    } else if (trend < -0.2) {
      insights.push({
        id: 'quality-declining',
        title: 'Sleep quality declining',
        description: 'Recent nights have been lower quality. Check your sleep environment and stress levels.',
        category: 'warning',
        icon: '⚠️',
        impact: 'medium',
        actionable: true,
        actionText: 'See improvement tips',
      });
    }
  }

  return insights.slice(0, 5); // Return top 5 insights
}

/**
 * Generate personalized recommendation
 */
export function getPersonalizedRecommendation(sleepHistory: SleepSession[]): string {
  if (sleepHistory.length === 0) return 'Start tracking your sleep to get personalized recommendations.';

  const lastWeek = sleepHistory.slice(0, 7);
  const avgQuality = lastWeek.reduce((sum, s) => sum + s.quality, 0) / lastWeek.length;

  if (avgQuality < 0.5) {
    return 'Try a consistent bedtime routine: set a fixed sleep time, dim lights 1 hour before bed.';
  } else if (avgQuality < 0.7) {
    return 'Your sleep could improve by keeping your bedroom cool (around 65-68°F) and very dark.';
  } else {
    return 'Your sleep is excellent! Keep up your current habits and try meditation for deeper rest.';
  }
}
