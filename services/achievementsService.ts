import AsyncStorage from '@react-native-async-storage/async-storage';
import { SleepSession } from '../contexts/SleepContext';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'streak' | 'milestone' | 'quality' | 'special';
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Streak Achievements
  {
    id: 'first_track',
    name: 'Sleep Pioneer',
    description: 'Track your first sleep session',
    icon: '🌟',
    category: 'milestone',
    target: 1,
  },
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: 'Track sleep for 3 consecutive days',
    icon: '🔥',
    category: 'streak',
    target: 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Track sleep for 7 consecutive days',
    icon: '🏆',
    category: 'streak',
    target: 7,
  },
  {
    id: 'streak_14',
    name: 'Sleep Devotee',
    description: 'Track sleep for 14 consecutive days',
    icon: '💪',
    category: 'streak',
    target: 14,
  },
  {
    id: 'streak_30',
    name: 'Sleep Master',
    description: 'Track sleep for 30 consecutive days',
    icon: '👑',
    category: 'streak',
    target: 30,
  },

  // Good Night Streak Achievements
  {
    id: 'good_night_3',
    name: 'Sweet Dreams',
    description: '3 consecutive good nights (rating 3+ stars)',
    icon: '😴',
    category: 'quality',
    target: 3,
  },
  {
    id: 'good_night_7',
    name: 'Dream Weaver',
    description: '7 consecutive good nights',
    icon: '🌙',
    category: 'quality',
    target: 7,
  },
  {
    id: 'good_night_14',
    name: 'Night Owl',
    description: '14 consecutive good nights',
    icon: '🦉',
    category: 'quality',
    target: 14,
  },

  // Milestone Achievements
  {
    id: 'sessions_10',
    name: 'Dedicated Sleeper',
    description: 'Complete 10 sleep sessions',
    icon: '📊',
    category: 'milestone',
    target: 10,
  },
  {
    id: 'sessions_25',
    name: 'Sleep Enthusiast',
    description: 'Complete 25 sleep sessions',
    icon: '🎯',
    category: 'milestone',
    target: 25,
  },
  {
    id: 'sessions_50',
    name: 'Sleep Champion',
    description: 'Complete 50 sleep sessions',
    icon: '🏅',
    category: 'milestone',
    target: 50,
  },
  {
    id: 'sessions_100',
    name: 'Sleep Legend',
    description: 'Complete 100 sleep sessions',
    icon: '🌟',
    category: 'milestone',
    target: 100,
  },

  // Quality Achievements
  {
    id: 'perfect_night',
    name: 'Perfect Night',
    description: 'Achieve a 5-star sleep rating',
    icon: '⭐',
    category: 'quality',
    target: 1,
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Get 5-star ratings for 7 nights',
    icon: '✨',
    category: 'quality',
    target: 7,
  },
  {
    id: 'score_90',
    name: 'Elite Sleeper',
    description: 'Achieve a sleep score of 90+',
    icon: '💎',
    category: 'quality',
    target: 90,
  },

  // Special Achievements
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Wake up before 6 AM 5 times',
    icon: '🐦',
    category: 'special',
    target: 5,
  },
  {
    id: 'consistent_bedtime',
    name: 'Consistency King',
    description: 'Go to bed at the same time (±30 min) for 7 days',
    icon: '⏰',
    category: 'special',
    target: 7,
  },
  {
    id: 'no_wakeups',
    name: 'Deep Sleeper',
    description: 'Sleep through the night without waking up',
    icon: '💤',
    category: 'special',
    target: 1,
  },
  {
    id: 'long_sleep',
    name: 'Well Rested',
    description: 'Get 8+ hours of sleep 5 times',
    icon: '😊',
    category: 'special',
    target: 5,
  },
];

const STORAGE_KEY = '@unlocked_achievements';

class AchievementsService {
  private unlockedAchievements: Map<string, Date> = new Map();

  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.unlockedAchievements = new Map(
          Object.entries(parsed).map(([k, v]) => [k, new Date(v as string)])
        );
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  }

  async checkAchievements(
    sleepHistory: SleepSession[],
    currentStreak: number,
    goodNightStreak: number
  ): Promise<Achievement[]> {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of ACHIEVEMENTS) {
      if (this.unlockedAchievements.has(achievement.id)) continue;

      let unlocked = false;

      switch (achievement.id) {
        // First session
        case 'first_track':
          unlocked = sleepHistory.length >= 1;
          break;

        // Streak achievements
        case 'streak_3':
          unlocked = currentStreak >= 3;
          break;
        case 'streak_7':
          unlocked = currentStreak >= 7;
          break;
        case 'streak_14':
          unlocked = currentStreak >= 14;
          break;
        case 'streak_30':
          unlocked = currentStreak >= 30;
          break;

        // Good night streaks
        case 'good_night_3':
          unlocked = goodNightStreak >= 3;
          break;
        case 'good_night_7':
          unlocked = goodNightStreak >= 7;
          break;
        case 'good_night_14':
          unlocked = goodNightStreak >= 14;
          break;

        // Session milestones
        case 'sessions_10':
          unlocked = sleepHistory.length >= 10;
          break;
        case 'sessions_25':
          unlocked = sleepHistory.length >= 25;
          break;
        case 'sessions_50':
          unlocked = sleepHistory.length >= 50;
          break;
        case 'sessions_100':
          unlocked = sleepHistory.length >= 100;
          break;

        // Quality achievements
        case 'perfect_night':
          unlocked = sleepHistory.some(s => s.userRating === 5);
          break;
        case 'perfect_week':
          unlocked = sleepHistory.filter(s => s.userRating === 5).length >= 7;
          break;
        case 'score_90':
          unlocked = sleepHistory.some(s => (s.sleepScore || 0) >= 90);
          break;

        // Special achievements
        case 'early_bird':
          const earlyWakeups = sleepHistory.filter(s => {
            if (!s.endTime) return false;
            const endHour = new Date(s.endTime).getHours();
            return endHour < 6;
          });
          unlocked = earlyWakeups.length >= 5;
          break;

        case 'no_wakeups':
          unlocked = sleepHistory.some(s => s.wakeUps === 0);
          break;

        case 'long_sleep':
          const longSleeps = sleepHistory.filter(s => s.duration >= 480);
          unlocked = longSleeps.length >= 5;
          break;

        case 'consistent_bedtime':
          unlocked = this.checkConsistentBedtime(sleepHistory);
          break;
      }

      if (unlocked) {
        this.unlockedAchievements.set(achievement.id, new Date());
        newlyUnlocked.push({ ...achievement, unlockedAt: new Date() });
      }
    }

    if (newlyUnlocked.length > 0) {
      await this.saveAchievements();
    }

    return newlyUnlocked;
  }

  private checkConsistentBedtime(sleepHistory: SleepSession[]): boolean {
    if (sleepHistory.length < 7) return false;

    const last7 = sleepHistory.slice(0, 7);
    const bedtimeMinutes = last7.map(s => {
      const date = new Date(s.startTime);
      return date.getHours() * 60 + date.getMinutes();
    });

    // Check if all bedtimes are within 30 minutes of the average
    const avgBedtime = bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length;
    return bedtimeMinutes.every(bt => Math.abs(bt - avgBedtime) <= 30);
  }

  getUnlockedAchievements(): Achievement[] {
    return ACHIEVEMENTS.filter(a => this.unlockedAchievements.has(a.id)).map(a => ({
      ...a,
      unlockedAt: this.unlockedAchievements.get(a.id),
    }));
  }

  getAllAchievements(): Achievement[] {
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlockedAt: this.unlockedAchievements.get(a.id),
    }));
  }

  getAchievementProgress(
    achievement: Achievement,
    sleepHistory: SleepSession[],
    currentStreak: number,
    goodNightStreak: number
  ): { progress: number; target: number } {
    const target = achievement.target || 1;
    let progress = 0;

    switch (achievement.id) {
      case 'first_track':
        progress = Math.min(sleepHistory.length, 1);
        break;
      case 'streak_3':
      case 'streak_7':
      case 'streak_14':
      case 'streak_30':
        progress = currentStreak;
        break;
      case 'good_night_3':
      case 'good_night_7':
      case 'good_night_14':
        progress = goodNightStreak;
        break;
      case 'sessions_10':
      case 'sessions_25':
      case 'sessions_50':
      case 'sessions_100':
        progress = sleepHistory.length;
        break;
      case 'perfect_night':
        progress = sleepHistory.some(s => s.userRating === 5) ? 1 : 0;
        break;
      case 'perfect_week':
        progress = sleepHistory.filter(s => s.userRating === 5).length;
        break;
      case 'score_90':
        const maxScore = Math.max(...sleepHistory.map(s => s.sleepScore || 0), 0);
        progress = maxScore >= 90 ? 90 : maxScore;
        break;
      case 'early_bird':
        progress = sleepHistory.filter(s => {
          if (!s.endTime) return false;
          return new Date(s.endTime).getHours() < 6;
        }).length;
        break;
      case 'no_wakeups':
        progress = sleepHistory.some(s => s.wakeUps === 0) ? 1 : 0;
        break;
      case 'long_sleep':
        progress = sleepHistory.filter(s => s.duration >= 480).length;
        break;
      default:
        progress = 0;
    }

    return { progress: Math.min(progress, target), target };
  }

  private async saveAchievements(): Promise<void> {
    try {
      const obj: Record<string, string> = {};
      this.unlockedAchievements.forEach((date, id) => {
        obj[id] = date.toISOString();
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.error('Error saving achievements:', error);
    }
  }

  async resetAchievements(): Promise<void> {
    this.unlockedAchievements.clear();
    await AsyncStorage.removeItem(STORAGE_KEY);
  }
}

export const achievementsService = new AchievementsService();
export default achievementsService;
