import React, { createContext, useContext, useMemo } from 'react';
import { SleepSession } from '../contexts/SleepContext';
import { MoodEntry } from '../utils/moodTracking';
import { DreamEntry } from '../utils/dreamJournal';
import {
  calculateUserAnalytics,
  calculateFeatureMetrics,
  getEngagementMetrics,
  getSystemHealth,
  generateUsageReport,
  UserAnalytics,
  FeatureMetrics,
  EngagementMetric,
  SystemHealth,
} from './adminAnalytics';

interface AdminContextType {
  analytics: UserAnalytics;
  features: FeatureMetrics;
  engagement: EngagementMetric[];
  health: SystemHealth;
  report: any;
  isAdmin: boolean;
  enableAdminMode: () => void;
  disableAdminMode: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: React.ReactNode;
  sleepHistory: SleepSession[];
  moods: MoodEntry[];
  dreams: DreamEntry[];
}

export const AdminProvider: React.FC<AdminProviderProps> = ({
  children,
  sleepHistory,
  moods,
  dreams,
}) => {
  const [isAdmin, setIsAdmin] = React.useState(false);

  const analytics = useMemo(
    () => calculateUserAnalytics(sleepHistory),
    [sleepHistory]
  );

  const features = useMemo(
    () => calculateFeatureMetrics(moods, dreams),
    [moods, dreams]
  );

  const engagement = useMemo(
    () => getEngagementMetrics(sleepHistory, features),
    [sleepHistory, features]
  );

  const health = useMemo(() => getSystemHealth(), []);

  const report = useMemo(
    () => generateUsageReport(sleepHistory, moods, dreams),
    [sleepHistory, moods, dreams]
  );

  return (
    <AdminContext.Provider
      value={{
        analytics,
        features,
        engagement,
        health,
        report,
        isAdmin,
        enableAdminMode: () => setIsAdmin(true),
        disableAdminMode: () => setIsAdmin(false),
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
