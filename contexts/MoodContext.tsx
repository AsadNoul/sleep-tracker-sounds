import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { MoodEntry, analyzeMoodTrend, MoodMetrics } from '../utils/moodTracking';

interface MoodContextType {
  moodEntries: MoodEntry[];
  currentMood: MoodEntry | null;
  metrics: MoodMetrics;
  addMood: (mood: MoodEntry) => Promise<void>;
  removeMood: (id: string) => Promise<void>;
  getMoodHistory: (days: number) => MoodEntry[];
  refreshMetrics: () => void;
  isLoading: boolean;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export const MoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [currentMood, setCurrentMood] = useState<MoodEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load moods from local storage on mount
  useEffect(() => {
    const loadMoods = async () => {
      setIsLoading(true);
      try {
        // In a real app, fetch from Supabase
        const stored = localStorage.getItem('mood_entries');
        if (stored) {
          const parsed = JSON.parse(stored);
          setMoodEntries(parsed);
          if (parsed.length > 0) {
            setCurrentMood(parsed[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load moods:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMoods();
  }, []);

  const metrics = React.useMemo(() => {
    return analyzeMoodTrend(moodEntries);
  }, [moodEntries]);

  const addMood = useCallback(async (mood: MoodEntry) => {
    try {
      setIsLoading(true);
      // In a real app, save to Supabase
      const updated = [mood, ...moodEntries];
      setMoodEntries(updated);
      setCurrentMood(mood);
      localStorage.setItem('mood_entries', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to add mood:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [moodEntries]);

  const removeMood = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const updated = moodEntries.filter(m => m.id !== id);
      setMoodEntries(updated);
      localStorage.setItem('mood_entries', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to remove mood:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [moodEntries]);

  const getMoodHistory = useCallback((days: number) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    return moodEntries.filter(m => new Date(m.timestamp) >= cutoffDate);
  }, [moodEntries]);

  const refreshMetrics = useCallback(() => {
    // Trigger re-computation of metrics
    setMoodEntries([...moodEntries]);
  }, [moodEntries]);

  return (
    <MoodContext.Provider
      value={{
        moodEntries,
        currentMood,
        metrics,
        addMood,
        removeMood,
        getMoodHistory,
        refreshMetrics,
        isLoading,
      }}
    >
      {children}
    </MoodContext.Provider>
  );
};

export const useMood = (): MoodContextType => {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
};
