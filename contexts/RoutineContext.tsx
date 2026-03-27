import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { WindDownRoutine, PRESET_ROUTINES } from '../utils/bedtimeRoutine';

interface RoutineContextType {
  availableRoutines: WindDownRoutine[];
  selectedRoutine: WindDownRoutine | null;
  isActive: boolean;
  currentActivityIndex: number;
  selectRoutine: (routine: WindDownRoutine) => void;
  startRoutine: () => void;
  pauseRoutine: () => void;
  resumeRoutine: () => void;
  skipActivity: () => void;
  nextActivity: () => void;
  endRoutine: () => void;
  getTimeRemaining: () => number;
}

const RoutineContext = createContext<RoutineContextType | undefined>(undefined);

export const RoutineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedRoutine, setSelectedRoutine] = useState<WindDownRoutine | null>(PRESET_ROUTINES.standard);
  const [isActive, setIsActive] = useState(false);
  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const availableRoutines = Object.values(PRESET_ROUTINES);

  // Track elapsed time
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setElapsed(e => e + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const selectRoutine = useCallback((routine: WindDownRoutine) => {
    setSelectedRoutine(routine);
    setCurrentActivityIndex(0);
    setElapsed(0);
  }, []);

  const startRoutine = useCallback(() => {
    if (!selectedRoutine) return;
    setIsActive(true);
    setCurrentActivityIndex(0);
    setElapsed(0);
  }, [selectedRoutine]);

  const pauseRoutine = useCallback(() => {
    setIsActive(false);
  }, []);

  const resumeRoutine = useCallback(() => {
    setIsActive(true);
  }, []);

  const skipActivity = useCallback(() => {
    if (!selectedRoutine) return;
    if (currentActivityIndex < selectedRoutine.activities.length - 1) {
      setCurrentActivityIndex(curr => curr + 1);
      setElapsed(0);
    }
  }, [selectedRoutine, currentActivityIndex]);

  const nextActivity = useCallback(() => {
    if (!selectedRoutine) return;
    if (currentActivityIndex < selectedRoutine.activities.length - 1) {
      setCurrentActivityIndex(curr => curr + 1);
    } else {
      endRoutine();
    }
  }, [selectedRoutine, currentActivityIndex]);

  const endRoutine = useCallback(() => {
    setIsActive(false);
    setCurrentActivityIndex(0);
    setElapsed(0);
  }, []);

  const getTimeRemaining = useCallback(() => {
    if (!selectedRoutine) return 0;
    const totalSeconds = selectedRoutine.totalDuration * 60;
    return Math.max(0, totalSeconds - elapsed);
  }, [selectedRoutine, elapsed]);

  return (
    <RoutineContext.Provider
      value={{
        availableRoutines,
        selectedRoutine,
        isActive,
        currentActivityIndex,
        selectRoutine,
        startRoutine,
        pauseRoutine,
        resumeRoutine,
        skipActivity,
        nextActivity,
        endRoutine,
        getTimeRemaining,
      }}
    >
      {children}
    </RoutineContext.Provider>
  );
};

export const useRoutine = (): RoutineContextType => {
  const context = useContext(RoutineContext);
  if (!context) {
    throw new Error('useRoutine must be used within a RoutineProvider');
  }
  return context;
};
