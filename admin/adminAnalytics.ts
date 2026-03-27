/**
 * Admin Analytics Engine
 * Calculate metrics from user sleep data
 */

import { SleepSession } from '../contexts/SleepContext';
import { MoodEntry } from '../utils/moodTracking';
import { DreamEntry } from '../utils/dreamJournal';

export interface UserAnalytics {
  totalUsers: number;
  activeThisWeek: number;
  averageSleepDuration: number;
  averageSleepQuality: number;
  totalSessions: number;
  loggingStreak: number;
}

export interface FeatureMetrics {
  moodEntriesCount: number;
  dreamEntriesCount: number;
  averageMoodScore: number;
  lucidDreamRate: number;
  routineCompletionRate: number;
}

export interface EngagementMetric {
  metric: string;
  value: number;
  target: number;
  percentage: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface SystemHealth {
  uptime: number;
  errorRate: number;
  apiResponseTime: number;
  dbHealth: 'healthy' | 'degraded' | 'critical';
  activeUsers: number;
}

/**
 * Calculate overall user analytics
 */
export function calculateUserAnalytics(
  sleepHistory: SleepSession[],
  allUsers: number = 1000 // Mock total users
): UserAnalytics {
  if (sleepHistory.length === 0) {
    return {
      totalUsers: allUsers,
      activeThisWeek: 0,
      averageSleepDuration: 0,
      averageSleepQuality: 0,
      totalSessions: 0,
      loggingStreak: 0,
    };
  }

  // Calculate active users this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const activeThisWeek = sleepHistory.filter(
    s => new Date(s.startTime) >= weekAgo
  ).length > 0 ? 1 : 0; // Simplified for single user analytics

  // Average duration and quality
  const avgDuration = sleepHistory.reduce((sum, s) => sum + s.duration, 0) / sleepHistory.length / 60;
  const avgQuality = sleepHistory.reduce((sum, s) => sum + s.quality, 0) / sleepHistory.length;

  // Calculate streak
  let streak = 0;
  const today = new Date();
  const sortedSessions = sleepHistory.sort((a, b) => 
    new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  for (let i = 0; i < sortedSessions.length; i++) {
    const sessionDate = new Date(sortedSessions[i].startTime);
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    
    if (sessionDate.toDateString() === expectedDate.toDateString()) {
      streak++;
    } else {
      break;
    }
  }

  return {
    totalUsers: allUsers,
    activeThisWeek,
    averageSleepDuration: Math.round(avgDuration * 100) / 100,
    averageSleepQuality: Math.round(avgQuality * 100) / 100,
    totalSessions: sleepHistory.length,
    loggingStreak: streak,
  };
}

/**
 * Calculate feature adoption metrics
 */
export function calculateFeatureMetrics(
  moods: MoodEntry[],
  dreams: DreamEntry[]
): FeatureMetrics {
  const moodEntriesCount = moods.length;
  const dreamEntriesCount = dreams.length;

  const avgMoodScore = moods.length > 0
    ? moods.reduce((sum, m) => {
        const scores: Record<string, number> = {
          excellent: 5,
          good: 4,
          neutral: 3,
          poor: 2,
          terrible: 1,
        };
        return sum + (scores[m.mood] || 3);
      }, 0) / moods.length
    : 0;

  const lucidDreams = dreams.filter(d => d.lucid).length;
  const lucidDreamRate = dreams.length > 0 ? (lucidDreams / dreams.length) * 100 : 0;

  return {
    moodEntriesCount,
    dreamEntriesCount,
    averageMoodScore: Math.round(avgMoodScore * 100) / 100,
    lucidDreamRate: Math.round(lucidDreamRate),
    routineCompletionRate: 75, // Mock for now
  };
}

/**
 * Get engagement metrics with targets
 */
export function getEngagementMetrics(
  sleepHistory: SleepSession[],
  metrics: FeatureMetrics
): EngagementMetric[] {
  const analytics = calculateUserAnalytics(sleepHistory);

  return [
    {
      metric: 'Logging Streak',
      value: analytics.loggingStreak,
      target: 30,
      percentage: (analytics.loggingStreak / 30) * 100,
      status: analytics.loggingStreak >= 20 ? 'excellent' : analytics.loggingStreak >= 10 ? 'good' : 'fair',
    },
    {
      metric: 'Average Sleep Quality',
      value: analytics.averageSleepQuality,
      target: 0.75,
      percentage: (analytics.averageSleepQuality / 0.75) * 100,
      status: analytics.averageSleepQuality >= 0.75 ? 'excellent' : analytics.averageSleepQuality >= 0.6 ? 'good' : 'fair',
    },
    {
      metric: 'Sleep Duration (hours)',
      value: analytics.averageSleepDuration,
      target: 8,
      percentage: (analytics.averageSleepDuration / 8) * 100,
      status: analytics.averageSleepDuration >= 7 ? 'excellent' : analytics.averageSleepDuration >= 6 ? 'good' : 'fair',
    },
    {
      metric: 'Mood Entries',
      value: metrics.moodEntriesCount,
      target: 30,
      percentage: (metrics.moodEntriesCount / 30) * 100,
      status: metrics.moodEntriesCount >= 20 ? 'excellent' : metrics.moodEntriesCount >= 10 ? 'good' : 'fair',
    },
    {
      metric: 'Dream Entries',
      value: metrics.dreamEntriesCount,
      target: 20,
      percentage: (metrics.dreamEntriesCount / 20) * 100,
      status: metrics.dreamEntriesCount >= 15 ? 'excellent' : metrics.dreamEntriesCount >= 8 ? 'good' : 'fair',
    },
  ];
}

/**
 * Get system health status
 */
export function getSystemHealth(): SystemHealth {
  // Mock system health data
  const uptime = 99.95; // percentage
  const errorRate = 0.02; // percentage
  const apiResponseTime = 145; // milliseconds
  const dbHealth = errorRate > 1 ? 'critical' : errorRate > 0.5 ? 'degraded' : 'healthy';
  const activeUsers = Math.floor(Math.random() * 500 + 100);

  return {
    uptime,
    errorRate,
    apiResponseTime,
    dbHealth,
    activeUsers,
  };
}

/**
 * Get usage report
 */
export function generateUsageReport(
  sleepHistory: SleepSession[],
  moods: MoodEntry[],
  dreams: DreamEntry[]
) {
  const analytics = calculateUserAnalytics(sleepHistory);
  const features = calculateFeatureMetrics(moods, dreams);
  const engagement = getEngagementMetrics(sleepHistory, features);
  const health = getSystemHealth();

  return {
    timestamp: new Date(),
    analytics,
    features,
    engagement,
    health,
    reportType: 'daily',
  };
}
