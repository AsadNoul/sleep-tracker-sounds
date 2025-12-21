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
}

export const calculateSleepScore = (
  startTime: Date,
  endTime: Date,
  stages: SleepStageSegment[],
  wakeUps: number
): SleepScoreResult => {
  const totalDurationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  
  // 1. Duration Score (max 25 points)
  // Ideal: 7-9 hours (420-540 mins)
  let durationScore = 0;
  if (totalDurationMinutes >= 420 && totalDurationMinutes <= 540) {
    durationScore = 25;
  } else if (totalDurationMinutes > 540) {
    durationScore = Math.max(0, 25 - (totalDurationMinutes - 540) / 10);
  } else {
    durationScore = Math.max(0, (totalDurationMinutes / 420) * 25);
  }

  // 2. Efficiency Score (max 25 points)
  // Based on awake time vs total time
  const awakeTime = stages
    .filter(s => s.stage === 'awake')
    .reduce((acc, s) => acc + (s.endTime - s.startTime) / (1000 * 60), 0);
  
  const efficiency = ((totalDurationMinutes - awakeTime) / totalDurationMinutes) * 100;
  let efficiencyScore = Math.max(0, (efficiency - 60) / 40) * 25;

  // 3. Deep Sleep Score (max 20 points)
  // Ideal: 15-25% of total sleep
  const deepSleepTime = stages
    .filter(s => s.stage === 'deep')
    .reduce((acc, s) => acc + (s.endTime - s.startTime) / (1000 * 60), 0);
  const deepPercent = (deepSleepTime / totalDurationMinutes) * 100;
  let deepScore = 0;
  if (deepPercent >= 15 && deepPercent <= 25) deepScore = 20;
  else deepScore = Math.min(20, (deepPercent / 15) * 20);

  // 4. REM Sleep Score (max 15 points)
  // Ideal: 20-25% of total sleep
  const remSleepTime = stages
    .filter(s => s.stage === 'rem')
    .reduce((acc, s) => acc + (s.endTime - s.startTime) / (1000 * 60), 0);
  const remPercent = (remSleepTime / totalDurationMinutes) * 100;
  let remScore = 0;
  if (remPercent >= 20 && remPercent <= 25) remScore = 15;
  else remScore = Math.min(15, (remPercent / 20) * 15);

  // 5. Consistency Score (max 15 points)
  // For MVP, we'll use wake-ups as a proxy for consistency/interruptions
  let consistencyScore = Math.max(0, 15 - (wakeUps * 3));

  const totalScore = Math.round(durationScore + efficiencyScore + deepScore + remScore + consistencyScore);
  
  let quality: 'poor' | 'fair' | 'good' | 'excellent' = 'poor';
  if (totalScore >= 85) quality = 'excellent';
  else if (totalScore >= 70) quality = 'good';
  else if (totalScore >= 50) quality = 'fair';

  return {
    score: Math.min(100, totalScore),
    quality,
    breakdown: {
      duration: Math.round(durationScore),
      efficiency: Math.round(efficiencyScore),
      deepSleep: Math.round(deepScore),
      remSleep: Math.round(remScore),
      consistency: Math.round(consistencyScore)
    }
  };
};
