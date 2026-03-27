/**
 * Smart Alarm Calculation
 * Calculate optimal wake-up times based on sleep cycles
 */

import { SleepSession } from '../contexts/SleepContext';

export interface SleepCycle {
  startTime: Date;
  duration: number; // in minutes
  sleepStage: 'light' | 'deep' | 'rem';
}

export interface AlarmWindow {
  startTime: Date;
  endTime: Date;
  quality: 'optimal' | 'good' | 'acceptable';
  reason: string;
  emoji: string;
}

const SLEEP_CYCLE_DURATION = 90; // minutes - typical sleep cycle length

/**
 * Calculate optimal alarm windows for a sleep session
 */
export function calculateAlarmWindows(session: SleepSession): AlarmWindow[] {
  const windows: AlarmWindow[] = [];
  const startTime = new Date(session.startTime);
  const sleepCycles = Math.floor(session.duration / SLEEP_CYCLE_DURATION);

  // Generate windows at the end of each complete sleep cycle
  for (let i = 1; i <= Math.min(sleepCycles, 6); i++) {
    const cycleEndMinutes = i * SLEEP_CYCLE_DURATION;
    const windowStart = new Date(startTime.getTime() + cycleEndMinutes * 60000);
    const windowEnd = new Date(windowStart.getTime() + 20 * 60000); // 20-minute window

    const quality = i === sleepCycles ? 'optimal' : i === sleepCycles - 1 ? 'good' : 'acceptable';

    windows.push({
      startTime: windowStart,
      endTime: windowEnd,
      quality,
      reason: i === sleepCycles 
        ? `After ${i} complete sleep cycles - most refreshing`
        : `After ${i} complete sleep cycle${i > 1 ? 's' : ''}`,
      emoji: quality === 'optimal' ? '⭐' : quality === 'good' ? '✨' : '👌',
    });
  }

  return windows;
}

/**
 * Get next optimal alarm window
 */
export function getNextOptimalAlarmTime(session: SleepSession): { time: Date; reason: string } {
  const windows = calculateAlarmWindows(session);
  const now = new Date();

  // Find the next window that hasn't passed
  const nextWindow = windows.find(w => w.startTime > now) || windows[windows.length - 1];

  return {
    time: nextWindow.startTime,
    reason: nextWindow.reason,
  };
}

/**
 * Suggest sleep time based on desired wake time
 */
export function suggestBedtime(wakeTime: Date, targetCycles: number = 5.5): { bedtime: Date; reason: string } {
  // Typical sleep cycle is 90 minutes
  const sleepMinutes = targetCycles * SLEEP_CYCLE_DURATION;
  const bedtime = new Date(wakeTime.getTime() - sleepMinutes * 60000);

  const hours = Math.floor(targetCycles);
  const minutes = Math.round((targetCycles % 1) * 60);
  const reason = `Sleep ${hours}h ${minutes}m for ${targetCycles} complete cycles`;

  return { bedtime, reason };
}

/**
 * Calculate sleep efficiency
 */
export function calculateSleepEfficiency(session: SleepSession): number {
  if (!session.sleepStages || session.sleepStages.length === 0) {
    return 85; // Default estimate
  }

  const actualSleepTime = session.sleepStages
    .filter(s => s.stage !== 'awake')
    .reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

  const totalTime = session.duration * 60 * 1000;
  const efficiency = (actualSleepTime / totalTime) * 100;

  return Math.round(efficiency);
}

/**
 * Get recommendations based on sleep cycles
 */
export function getSleepCycleRecommendations(session: SleepSession): string[] {
  const recommendations: string[] = [];
  const cycles = session.duration / SLEEP_CYCLE_DURATION;
  const efficiency = calculateSleepEfficiency(session);

  if (cycles < 4) {
    recommendations.push('You completed less than 4 sleep cycles. Try to sleep 6+ hours for better recovery.');
  } else if (cycles >= 5.5 && cycles < 6.5) {
    recommendations.push('Perfect! You got 5-6.5 cycles - ideal for most people.');
  }

  if (efficiency < 85) {
    recommendations.push(`Sleep efficiency was ${efficiency}%. Too many awakenings - check your sleep environment.`);
  } else if (efficiency >= 90) {
    recommendations.push(`Excellent sleep efficiency (${efficiency}%). Your sleep was very continuous.`);
  }

  return recommendations;
}
