import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DreamEntry, analyzeDreamPatterns, DreamAnalysis } from '../utils/dreamJournal';

interface DreamContextType {
  dreams: DreamEntry[];
  analysis: DreamAnalysis;
  addDream: (dream: DreamEntry) => Promise<void>;
  updateDream: (dream: DreamEntry) => Promise<void>;
  deleteDream: (id: string) => Promise<void>;
  getDreamsByDate: (date: Date) => DreamEntry[];
  getDreamsByTheme: (theme: string) => DreamEntry[];
  isLoading: boolean;
}

const DreamContext = createContext<DreamContextType | undefined>(undefined);

export const DreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load dreams from local storage on mount
  useEffect(() => {
    const loadDreams = async () => {
      setIsLoading(true);
      try {
        // In a real app, fetch from Supabase
        const stored = localStorage.getItem('dream_entries');
        if (stored) {
          const parsed = JSON.parse(stored);
          setDreams(parsed);
        }
      } catch (error) {
        console.error('Failed to load dreams:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDreams();
  }, []);

  const analysis = React.useMemo(() => {
    return analyzeDreamPatterns(dreams);
  }, [dreams]);

  const addDream = useCallback(async (dream: DreamEntry) => {
    try {
      setIsLoading(true);
      const updated = [dream, ...dreams];
      setDreams(updated);
      localStorage.setItem('dream_entries', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to add dream:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [dreams]);

  const updateDream = useCallback(async (dream: DreamEntry) => {
    try {
      setIsLoading(true);
      const updated = dreams.map(d => (d.id === dream.id ? dream : d));
      setDreams(updated);
      localStorage.setItem('dream_entries', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update dream:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [dreams]);

  const deleteDream = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      const updated = dreams.filter(d => d.id !== id);
      setDreams(updated);
      localStorage.setItem('dream_entries', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete dream:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [dreams]);

  const getDreamsByDate = useCallback((date: Date) => {
    const dateStr = date.toDateString();
    return dreams.filter(d => new Date(d.date).toDateString() === dateStr);
  }, [dreams]);

  const getDreamsByTheme = useCallback((theme: string) => {
    return dreams.filter(d => d.themes.includes(theme));
  }, [dreams]);

  return (
    <DreamContext.Provider
      value={{
        dreams,
        analysis,
        addDream,
        updateDream,
        deleteDream,
        getDreamsByDate,
        getDreamsByTheme,
        isLoading,
      }}
    >
      {children}
    </DreamContext.Provider>
  );
};

export const useDream = (): DreamContextType => {
  const context = useContext(DreamContext);
  if (!context) {
    throw new Error('useDream must be used within a DreamProvider');
  }
  return context;
};
