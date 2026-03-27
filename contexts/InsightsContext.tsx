import React, { createContext, useContext, useMemo } from 'react';
import { SleepSession } from './SleepContext';
import { generateSleepInsights, SleepInsight, getPersonalizedRecommendation } from '../utils/aiInsightsGenerator';
import { calculateScoreBreakdown, ScoreBreakdown } from '../utils/scoreBreakdown';
import { calculateRecoveryStatus, RecoveryStatus } from '../utils/recoveryStatus';
import { calculateSleepDebt, SleepDebtMetrics } from '../utils/sleepDebt';
import { getComparisonData, ComparisonData } from '../utils/sleepComparison';

interface InsightsContextType {
  insights: SleepInsight[];
  recommendation: string;
  scoreBreakdown: ScoreBreakdown | null;
  recoveryStatus: RecoveryStatus | null;
  sleepDebt: SleepDebtMetrics | null;
  comparisonData: ComparisonData | null;
}

const InsightsContext = createContext<InsightsContextType | undefined>(undefined);

interface InsightsProviderProps {
  children: React.ReactNode;
  sleepHistory: SleepSession[];
}

export const InsightsProvider: React.FC<InsightsProviderProps> = ({ children, sleepHistory }) => {
  // Generate all insights based on sleep history
  const insights = useMemo(() => {
    return generateSleepInsights(sleepHistory);
  }, [sleepHistory]);

  const recommendation = useMemo(() => {
    return getPersonalizedRecommendation(sleepHistory);
  }, [sleepHistory]);

  const scoreBreakdown = useMemo(() => {
    return sleepHistory.length > 0 ? calculateScoreBreakdown(sleepHistory[0]) : null;
  }, [sleepHistory]);

  const recoveryStatus = useMemo(() => {
    return calculateRecoveryStatus(sleepHistory);
  }, [sleepHistory]);

  const sleepDebt = useMemo(() => {
    return calculateSleepDebt(sleepHistory, 7);
  }, [sleepHistory]);

  const comparisonData = useMemo(() => {
    return getComparisonData(sleepHistory);
  }, [sleepHistory]);

  return (
    <InsightsContext.Provider
      value={{
        insights,
        recommendation,
        scoreBreakdown,
        recoveryStatus,
        sleepDebt,
        comparisonData,
      }}
    >
      {children}
    </InsightsContext.Provider>
  );
};

export const useInsights = (): InsightsContextType => {
  const context = useContext(InsightsContext);
  if (!context) {
    throw new Error('useInsights must be used within an InsightsProvider');
  }
  return context;
};
