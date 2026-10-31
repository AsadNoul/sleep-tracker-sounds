import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CoachAction {
  id: string;
  title: string;
  description: string;
  category: 'consistency' | 'environment' | 'habit' | 'wind-down' | 'activity';
  priority: number; // lower = more impactful, shown first
}

export interface CoachPlan {
  programTitle: string;
  summary: string;
  actions: CoachAction[];
  generatedAt: number;
}

const STORAGE_KEY = '@sleep_coach_progress';

interface DailyProgress {
  [dateKey: string]: string[]; // date (YYYY-MM-DD) -> completed action ids
}

class SleepCoachService {
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    const squareDiffs = numbers.map((n) => Math.pow(n - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / numbers.length);
  }

  /**
   * Builds a prioritized coaching program from recent sleep history.
   * Falls back to a generic starter program when history is too thin to
   * detect real patterns (ranked lower-priority actions get dropped first).
   */
  generatePlan(history: any[]): CoachPlan {
    if (!history || history.length < 3) {
      return {
        programTitle: 'Getting Started',
        summary: 'Track a few more nights so your coach can personalize your plan. Here are the fundamentals to build on in the meantime.',
        actions: [
          {
            id: 'starter-consistency',
            title: 'Pick a fixed bedtime window',
            description: 'Go to bed within the same 30-minute window every night this week, even on weekends.',
            category: 'consistency',
            priority: 1,
          },
          {
            id: 'starter-screens',
            title: 'Dim screens 30 minutes before bed',
            description: 'Blue light delays melatonin release. Switch to night mode or reading instead.',
            category: 'wind-down',
            priority: 2,
          },
          {
            id: 'starter-track',
            title: 'Log tonight\'s sleep session',
            description: 'The more nights you track, the sharper your personalized recommendations get.',
            category: 'habit',
            priority: 3,
          },
        ],
        generatedAt: Date.now(),
      };
    }

    const actions: CoachAction[] = [];
    const recent = history.slice(0, 14);

    // 1. Bedtime consistency
    const bedtimeHours = recent.map((s) => {
      const d = new Date(s.startTime);
      return d.getHours() + d.getMinutes() / 60;
    });
    const bedtimeVariance = this.calculateVariance(bedtimeHours);
    if (bedtimeVariance > 1.5) {
      actions.push({
        id: 'consistency-bedtime',
        title: 'Lock in a consistent bedtime',
        description: `Your bedtime has swung by about ${Math.round(bedtimeVariance * 60)} minutes recently. Aim for the same 30-minute window every night — consistency improves sleep quality more than total hours.`,
        category: 'consistency',
        priority: 1,
      });
    }

    // 2. Sleep debt
    const avgDuration = recent.reduce((sum, s) => sum + (s.duration || 0), 0) / recent.length;
    if (avgDuration < 420) {
      const shortfall = Math.round((480 - avgDuration) / 6) / 10;
      actions.push({
        id: 'habit-duration',
        title: 'Close your sleep debt',
        description: `You're averaging ${Math.round(avgDuration / 60 * 10) / 10}h a night, about ${shortfall}h short of the recommended 8h. Move your bedtime 20 minutes earlier this week.`,
        category: 'habit',
        priority: 1,
      });
    }

    // 3. Wake-ups / fragmentation
    const avgWakeUps = recent.reduce((sum, s) => sum + (s.wakeUps || 0), 0) / recent.length;
    if (avgWakeUps > 2) {
      actions.push({
        id: 'environment-wakeups',
        title: 'Reduce nighttime disruptions',
        description: `You're waking up roughly ${Math.round(avgWakeUps)} times a night on average. Check your room for light, noise or temperature issues, and avoid liquids within 2 hours of bed.`,
        category: 'environment',
        priority: 2,
      });
    }

    // 4. Snoring intensity
    const snoringNights = recent.filter((s) => s.snoringIntensity && s.snoringIntensity !== 'None');
    if (snoringNights.length / recent.length > 0.3) {
      actions.push({
        id: 'environment-snoring',
        title: 'Address recurring snoring',
        description: 'Snoring was detected on several recent nights. Try sleeping on your side, and consider elevating your head slightly with an extra pillow.',
        category: 'environment',
        priority: 2,
      });
    }

    // 5. Low sleep score trend
    const scores = recent.map((s) => s.sleepScore || Math.round((s.quality || 0) * 10));
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgScore < 65) {
      actions.push({
        id: 'wind-down-routine',
        title: 'Add a wind-down routine',
        description: `Your average sleep score is ${Math.round(avgScore)}/100. A consistent 15-20 minute wind-down (dim lights, light stretching, no screens) before bed can meaningfully raise sleep quality.`,
        category: 'wind-down',
        priority: 1,
      });
    }

    // 6. Caffeine/exercise tag correlations (mirrors aiInsightService logic)
    const caffeineNights = recent.filter((s) => s.tags?.includes('caffeine'));
    const nonCaffeineNights = recent.filter((s) => !s.tags?.includes('caffeine'));
    if (caffeineNights.length > 0 && nonCaffeineNights.length > 0) {
      const avgCaffeine = caffeineNights.reduce((a, s) => a + (s.sleepScore || 0), 0) / caffeineNights.length;
      const avgNoCaffeine = nonCaffeineNights.reduce((a, s) => a + (s.sleepScore || 0), 0) / nonCaffeineNights.length;
      if (avgNoCaffeine - avgCaffeine > 5) {
        actions.push({
          id: 'habit-caffeine',
          title: 'Cut afternoon caffeine',
          description: `Nights you logged caffeine score about ${Math.round(avgNoCaffeine - avgCaffeine)} points lower. Try shifting your last cup to before 2pm this week.`,
          category: 'habit',
          priority: 2,
        });
      }
    }

    const exerciseNights = recent.filter((s) => s.tags?.includes('exercise'));
    if (exerciseNights.length === 0) {
      actions.push({
        id: 'activity-exercise',
        title: 'Add light daily movement',
        description: 'No exercise was logged in your recent sessions. Even a 20-minute walk earlier in the day is linked to deeper, more restorative sleep.',
        category: 'activity',
        priority: 3,
      });
    }

    // Always include a baseline habit action so the plan never feels empty
    if (actions.length === 0) {
      actions.push({
        id: 'habit-maintain',
        title: 'Keep up your routine',
        description: 'Your sleep patterns look stable. Stay consistent with your current bedtime and environment — small habits compound over time.',
        category: 'habit',
        priority: 3,
      });
    }

    actions.sort((a, b) => a.priority - b.priority);

    return {
      programTitle: 'Your Sleep Coach Plan',
      summary: `Built from your last ${recent.length} sessions. Focus on the top items first — they're ranked by expected impact.`,
      actions: actions.slice(0, 5),
      generatedAt: Date.now(),
    };
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async getTodayProgress(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const progress: DailyProgress = raw ? JSON.parse(raw) : {};
      return progress[this.todayKey()] || [];
    } catch (e) {
      console.error('Error loading coach progress:', e);
      return [];
    }
  }

  async toggleAction(actionId: string): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const progress: DailyProgress = raw ? JSON.parse(raw) : {};
      const key = this.todayKey();
      const current = progress[key] || [];

      progress[key] = current.includes(actionId)
        ? current.filter((id) => id !== actionId)
        : [...current, actionId];

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return progress[key];
    } catch (e) {
      console.error('Error saving coach progress:', e);
      return [];
    }
  }

  /** Consecutive days with at least one completed action. */
  async getStreak(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const progress: DailyProgress = raw ? JSON.parse(raw) : {};
      let streak = 0;
      const d = new Date();
      for (let i = 0; i < 365; i++) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (progress[key] && progress[key].length > 0) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    } catch (e) {
      console.error('Error calculating coach streak:', e);
      return 0;
    }
  }
}

export default new SleepCoachService();
