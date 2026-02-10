import { SleepStageSegment } from '../services/sleepTrackingService';

export interface SleepScoreResult {
  score: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  breakdown: {
    duration: number;
    efficiency: number;
    deepSleep: number;
    remSleep: number;
    consistency: number;
  };
  insights: string[];
}

/**
 * Advanced Sleep Score Intelligence
 * Calculated based on duration, cycles, efficiency, and stage ratios.
 */
export const calculateSleepScore = (
  startTime: Date,
  endTime: Date,
  stages: SleepStageSegment[],
  wakeUps: number
): SleepScoreResult => {
  const totalDurationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  const insights: string[] = [];

  if (totalDurationMinutes < 30) {
    return {
      score: 0,
      quality: 'poor',
      breakdown: { duration: 0, efficiency: 0, deepSleep: 0, remSleep: 0, consistency: 0 },
      insights: ['Session too short for analysis.']
    };
  }

  // 1. Duration Intelligence (max 30 points)
  // Optimal: 7.5 to 8.5 hours (centered around 5 cycles of 90m)
  let durationScore = 0;
  if (totalDurationMinutes >= 450 && totalDurationMinutes <= 510) {
    durationScore = 30;
  } else {
    // Gradual curve using distance from 480 mins (8 hours)
    const distance = Math.abs(totalDurationMinutes - 480);
    durationScore = Math.max(0, 30 - (distance / 420) * 30);
  }
  if (totalDurationMinutes < 360) insights.push('Short duration detected. Try aiming for 7+ hours.');

  // 2. Efficiency Intelligence (max 25 points)
  const awakeTime = stages
    .filter(s => s.stage === 'awake' || (s.stage as any) === 'waso')
    .reduce((acc, s) => acc + (s.endTime - s.startTime) / (1000 * 60), 0);

  const efficiencyPercent = ((totalDurationMinutes - awakeTime) / totalDurationMinutes) * 100;
  // Threshold: >90% is top-tier. <70% is poor.
  let efficiencyScore = Math.max(0, (efficiencyPercent - 65) / 25) * 25;
  if (efficiencyPercent >= 90) insights.push('Excellent sleep efficiency!');

  // 3. Deep Sleep Intelligence (max 25 points) - The most "Restorative" metric
  // Scientific target: 15-22%
  const deepTime = stages
    .filter(s => s.stage === 'deep')
    .reduce((acc, s) => acc + (s.endTime - s.startTime) / (1000 * 60), 0);
  const deepRatio = (deepTime / totalDurationMinutes) * 100;

  let deepScore = 0;
  if (deepRatio >= 15 && deepRatio <= 22) deepScore = 25;
  else if (deepRatio > 22) deepScore = 22; // Slight drop for too much deep sleep (rare)
  else deepScore = (deepRatio / 15) * 25;

  if (deepRatio >= 18) insights.push('Optimal physical recovery achieved.');

  // 4. REM Intelligence (max 20 points) - "Mental" recovery
  // Scientific target: 20-25%
  const remTime = stages
    .filter(s => s.stage === 'rem')
    .reduce((acc, s) => acc + (s.endTime - s.startTime) / (1000 * 60), 0);
  const remRatio = (remTime / totalDurationMinutes) * 100;

  let remScore = 0;
  if (remRatio >= 20 && remRatio <= 25) remScore = 20;
  else remScore = (remRatio / 20) * 20;

  if (remRatio >= 20) insights.push('Strong REM cycles for mental clarity.');

  // 5. Deductions & Bonuses
  let consistencyScore = Math.max(0, 10 - (wakeUps * 2));

  // Quality Bonus: If efficiency is high AND deep sleep is good, add a multiplier
  let finalScore = durationScore + efficiencyScore + deepScore + remScore + consistencyScore;

  if (efficiencyPercent > 92 && deepRatio > 18) {
    finalScore += 5; // Elite Bonus
    insights.push('Diamond Quality Sleep! Low disturbances.');
  }

  const roundedScore = Math.min(100, Math.round(finalScore));

  let quality: 'poor' | 'fair' | 'good' | 'excellent' = 'poor';
  if (roundedScore >= 88) quality = 'excellent';
  else if (roundedScore >= 75) quality = 'good';
  else if (roundedScore >= 60) quality = 'fair';

  return {
    score: roundedScore,
    quality,
    breakdown: {
      duration: Math.round(durationScore),
      efficiency: Math.round(efficiencyScore),
      deepSleep: Math.round(deepScore),
      remSleep: Math.round(remScore),
      consistency: Math.round(consistencyScore)
    },
    insights
  };
};
