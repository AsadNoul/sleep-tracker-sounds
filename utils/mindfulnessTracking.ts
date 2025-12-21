import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MindfulnessSession {
  id: string;
  sessionId: string;
  sessionTitle: string;
  category: string;
  duration: number; // in minutes
  completedAt: string;
  userId?: string;
}

export interface MindfulnessStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  lastSessionDate: string | null;
  sessionHistory: MindfulnessSession[];
}

const STORAGE_KEY = '@mindfulness_sessions';

// Save a completed mindfulness session
export const saveMindfulnessSession = async (
  sessionData: Omit<MindfulnessSession, 'id' | 'completedAt'>
): Promise<void> => {
  try {
    const existingSessions = await getMindfulnessSessions();

    const newSession: MindfulnessSession = {
      ...sessionData,
      id: `mindfulness_${Date.now()}_${Math.random()}`,
      completedAt: new Date().toISOString(),
    };

    const updatedSessions = [newSession, ...existingSessions];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    console.log('✅ Mindfulness session saved:', newSession);
  } catch (error) {
    console.error('Failed to save mindfulness session:', error);
    throw error;
  }
};

// Get all mindfulness sessions
export const getMindfulnessSessions = async (): Promise<MindfulnessSession[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load mindfulness sessions:', error);
    return [];
  }
};

// Calculate current streak
const calculateStreak = (sessions: MindfulnessSession[]): number => {
  if (sessions.length === 0) return 0;

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const uniqueDates = new Set<string>();
  sortedSessions.forEach((session) => {
    const date = new Date(session.completedAt).toDateString();
    uniqueDates.add(date);
  });

  const dates = Array.from(uniqueDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  let streak = 0;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

  // Check if user completed a session today or yesterday
  if (dates[0] !== today && dates[0] !== yesterday) {
    return 0; // Streak broken
  }

  let currentDate = new Date(dates[0]);

  for (let i = 0; i < dates.length; i++) {
    const sessionDate = new Date(dates[i]);

    if (sessionDate.toDateString() === currentDate.toDateString()) {
      streak++;
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return streak;
};

// Get mindfulness statistics
export const getMindfulnessStats = async (): Promise<MindfulnessStats> => {
  try {
    const sessions = await getMindfulnessSessions();

    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);
    const currentStreak = calculateStreak(sessions);
    const lastSessionDate = sessions.length > 0 ? sessions[0].completedAt : null;

    return {
      totalSessions,
      totalMinutes,
      currentStreak,
      lastSessionDate,
      sessionHistory: sessions,
    };
  } catch (error) {
    console.error('Failed to get mindfulness stats:', error);
    return {
      totalSessions: 0,
      totalMinutes: 0,
      currentStreak: 0,
      lastSessionDate: null,
      sessionHistory: [],
    };
  }
};

// Clear all mindfulness sessions (for privacy/reset)
export const clearMindfulnessData = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('✅ Mindfulness data cleared');
  } catch (error) {
    console.error('Failed to clear mindfulness data:', error);
    throw error;
  }
};

// Format total time (e.g., "4h 30m")
export const formatMindfulnessTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};
