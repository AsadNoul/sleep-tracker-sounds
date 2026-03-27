/**
 * Mood Tracking System
 * Integrates mood data with sleep sessions for better insights
 */

export interface MoodEntry {
  id: string;
  sessionId: string;
  timestamp: Date;
  mood: 'excellent' | 'good' | 'neutral' | 'poor' | 'terrible';
  beforeSleep: boolean; // true = mood before sleep, false = mood after sleep
  notes?: string;
}

export interface MoodMetrics {
  preSleepMood: string;
  postSleepMood: string;
  improvement: number; // percentage change
  moodTrend: 'improving' | 'stable' | 'declining';
}

/**
 * Get emoji for mood level
 */
export function getMoodEmoji(mood: string): string {
  const emojiMap: Record<string, string> = {
    excellent: '😄',
    good: '😊',
    neutral: '😐',
    poor: '😔',
    terrible: '😞',
  };
  return emojiMap[mood] || '😐';
}

/**
 * Get color for mood (for UI)
 */
export function getMoodColor(mood: string): string {
  const colorMap: Record<string, string> = {
    excellent: '#10B981', // green
    good: '#F59E0B', // amber
    neutral: '#8B5CF6', // purple
    poor: '#F97316', // orange
    terrible: '#EF4444', // red
  };
  return colorMap[mood] || '#8B5CF6';
}

/**
 * Calculate mood impact on sleep
 */
export function calculateMoodImpact(
  preSleep: string,
  postSleep: string
): number {
  const moodScores: Record<string, number> = {
    excellent: 5,
    good: 4,
    neutral: 3,
    poor: 2,
    terrible: 1,
  };

  const before = moodScores[preSleep] || 3;
  const after = moodScores[postSleep] || 3;
  
  // Positive if mood improved after sleep
  return ((after - before) / before) * 100;
}

/**
 * Analyze mood patterns over time
 */
export function analyzeMoodTrend(moodEntries: MoodEntry[]): MoodMetrics {
  if (moodEntries.length === 0) {
    return {
      preSleepMood: 'neutral',
      postSleepMood: 'neutral',
      improvement: 0,
      moodTrend: 'stable',
    };
  }

  const preSleepMoods = moodEntries.filter(m => m.beforeSleep);
  const postSleepMoods = moodEntries.filter(m => !m.beforeSleep);

  const getLatestMood = (moods: MoodEntry[]) => {
    return moods.length > 0 ? moods[moods.length - 1].mood : 'neutral';
  };

  const preSleep = getLatestMood(preSleepMoods);
  const postSleep = getLatestMood(postSleepMoods);
  const improvement = calculateMoodImpact(preSleep, postSleep);

  // Determine trend from last 7 moods
  const recentMoods = preSleepMoods.slice(-7);
  const moodScores = recentMoods.map(m => {
    const scores: Record<string, number> = { excellent: 5, good: 4, neutral: 3, poor: 2, terrible: 1 };
    return scores[m.mood] || 3;
  });

  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (moodScores.length >= 2) {
    const firstHalf = moodScores.slice(0, Math.floor(moodScores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(moodScores.length / 2);
    const secondHalf = moodScores.slice(Math.floor(moodScores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(moodScores.length / 2);
    
    if (secondHalf > firstHalf + 0.5) trend = 'improving';
    else if (secondHalf < firstHalf - 0.5) trend = 'declining';
  }

  return {
    preSleepMood: preSleep,
    postSleepMood: postSleep,
    improvement: Math.round(improvement),
    moodTrend: trend,
  };
}
