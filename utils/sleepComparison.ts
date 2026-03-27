/**
 * Sleep Comparison and Trends
 * Compare sleep data across different time periods and identify trends
 */

import { SleepSession } from '../contexts/SleepContext';

export interface TimePeriodStats {
  period: string;
  sessionCount: number;
  avgDuration: number; // hours
  avgQuality: number; // 0-1
  avgDeepSleep: number; // percentage
  totalHours: number;
  bestNight: number; // quality score
  worstNight: number; // quality score
  trend: 'improving' | 'declining' | 'stable';
}

export interface ComparisonData {
  thisWeek: TimePeriodStats;
  lastWeek: TimePeriodStats;
  lastMonth: TimePeriodStats;
  allTime: TimePeriodStats;
  comparison: {
    weekOverWeekChange: number; // percentage
    monthOverMonthChange: number; // percentage
  };
}

/**
 * Get sleep stats for a time period
 */
function getStatsForPeriod(sessions: SleepSession[], label: string): TimePeriodStats {
  if (sessions.length === 0) {
    return {
      period: label,
      sessionCount: 0,
      avgDuration: 0,
      avgQuality: 0,
      avgDeepSleep: 0,
      totalHours: 0,
      bestNight: 0,
      worstNight: 0,
      trend: 'stable',
    };
  }

  const qualities = sessions.map(s => s.quality);
  const durations = sessions.map(s => s.duration);

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length / 60;
  const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
  const totalHours = Math.round(durations.reduce((a, b) => a + b, 0) / 60 * 100) / 100;
  const bestNight = Math.max(...qualities);
  const worstNight = Math.min(...qualities);

  // Calculate deep sleep average
  let avgDeepSleep = 0;
  const sessionsWithStages = sessions.filter(s => s.sleepStages && s.sleepStages.length > 0);
  if (sessionsWithStages.length > 0) {
    const deepSleepValues = sessionsWithStages.map(s => {
      const deepStages = s.sleepStages?.filter(st => st.stage === 'deep') || [];
      const deepDuration = deepStages.reduce((sum, st) => sum + (st.endTime - st.startTime), 0);
      return (deepDuration / (s.duration * 60 * 1000)) * 100;
    });
    avgDeepSleep = deepSleepValues.reduce((a, b) => a + b, 0) / deepSleepValues.length;
  }

  // Determine trend: compare first 50% with last 50%
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (sessions.length >= 2) {
    const mid = Math.floor(sessions.length / 2);
    const firstHalf = qualities.slice(0, mid).reduce((a, b) => a + b, 0) / Math.ceil(mid);
    const secondHalf = qualities.slice(mid).reduce((a, b) => a + b, 0) / qualities.slice(mid).length;

    if (secondHalf > firstHalf + 0.05) trend = 'improving';
    else if (secondHalf < firstHalf - 0.05) trend = 'declining';
  }

  return {
    period: label,
    sessionCount: sessions.length,
    avgDuration: Math.round(avgDuration * 100) / 100,
    avgQuality: Math.round(avgQuality * 100) / 100,
    avgDeepSleep: Math.round(avgDeepSleep),
    totalHours,
    bestNight: Math.round(bestNight * 100) / 100,
    worstNight: Math.round(worstNight * 100) / 100,
    trend,
  };
}

/**
 * Compare sleep across different time periods
 */
export function getComparisonData(sleepHistory: SleepSession[]): ComparisonData {
  const thisWeek = sleepHistory.slice(0, 7);
  const lastWeek = sleepHistory.slice(7, 14);
  const lastMonth = sleepHistory.slice(0, 30);

  const thisWeekStats = getStatsForPeriod(thisWeek, 'This Week');
  const lastWeekStats = getStatsForPeriod(lastWeek, 'Last Week');
  const lastMonthStats = getStatsForPeriod(lastMonth, 'Last Month');
  const allTimeStats = getStatsForPeriod(sleepHistory, 'All Time');

  const weekOverWeekChange = lastWeekStats.avgQuality > 0
    ? ((thisWeekStats.avgQuality - lastWeekStats.avgQuality) / lastWeekStats.avgQuality) * 100
    : 0;

  const monthOverMonthChange = sleepHistory.length > 30
    ? ((thisWeekStats.avgQuality - getStatsForPeriod(sleepHistory.slice(30, 37), 'Comparison').avgQuality) / getStatsForPeriod(sleepHistory.slice(30, 37), 'Comparison').avgQuality) * 100
    : 0;

  return {
    thisWeek: thisWeekStats,
    lastWeek: lastWeekStats,
    lastMonth: lastMonthStats,
    allTime: allTimeStats,
    comparison: {
      weekOverWeekChange: Math.round(weekOverWeekChange * 100) / 100,
      monthOverMonthChange: Math.round(monthOverMonthChange * 100) / 100,
    },
  };
}

/**
 * Get trend insights
 */
export function getTrendInsights(data: ComparisonData): string[] {
  const insights: string[] = [];

  // Week-over-week comparison
  if (data.comparison.weekOverWeekChange > 5) {
    insights.push(`Great progress! Your sleep quality improved ${Math.round(data.comparison.weekOverWeekChange)}% this week.`);
  } else if (data.comparison.weekOverWeekChange < -5) {
    insights.push(`Sleep quality declined by ${Math.round(Math.abs(data.comparison.weekOverWeekChange))}% this week.`);
  }

  // Trend analysis
  if (data.thisWeek.trend === 'improving') {
    insights.push('🎯 Your sleep quality is trending upward - keep it up!');
  } else if (data.thisWeek.trend === 'declining') {
    insights.push('⚠️ Your sleep quality is declining. Review your bedtime routine.');
  }

  // Duration comparison
  if (data.thisWeek.avgDuration > data.lastWeek.avgDuration) {
    const diff = Math.round((data.thisWeek.avgDuration - data.lastWeek.avgDuration) * 60);
    insights.push(`You're sleeping ${diff} min more per night this week. Great!`);
  }

  // Best/worst comparison
  if (data.thisWeek.avgQuality > data.allTime.avgQuality) {
    insights.push('This week is above your all-time average - excellent consistency!');
  }

  return insights.slice(0, 4);
}

/**
 * Predict future trend
 */
export function predictTrend(sleepHistory: SleepSession[], days: number = 7): { trend: number; label: string } {
  if (sleepHistory.length < 3) {
    return { trend: 0, label: 'Insufficient data for prediction' };
  }

  const recentQualities = sleepHistory.slice(0, Math.min(14, sleepHistory.length)).map(s => s.quality);
  
  // Simple linear regression
  const n = recentQualities.length;
  const sumX = (n * (n + 1)) / 2;
  const sumY = recentQualities.reduce((a, b) => a + b, 0);
  const sumXY = recentQualities.reduce((sum, quality, i) => sum + (n - i) * quality, 0);
  const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const predictedChange = slope * days;

  const label = predictedChange > 0.05
    ? '📈 Trending up'
    : predictedChange < -0.05
    ? '📉 Trending down'
    : '➡️ Stable';

  return { trend: predictedChange, label };
}
