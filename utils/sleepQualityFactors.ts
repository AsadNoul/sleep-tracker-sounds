/**
 * Sleep Quality Factors Tracking
 * Tracks environmental conditions and correlates with sleep quality
 */

import { SleepSession } from '../contexts/SleepContext';

export interface SleepEnvironment {
  temperature?: number; // Celsius
  humidity?: number; // percentage
  noiseLevel?: number; // dB
  lightLevel?: 'dark' | 'dim' | 'moderate' | 'bright';
  caffeine?: number; // mg consumed before sleep
  exerciseMinutes?: number; // minutes of exercise before sleep
}

export interface QualityFactor {
  factor: string;
  value: string;
  impact: 'positive' | 'negative' | 'neutral';
  contribution: number; // -20 to +20 percent impact
  emoji: string;
}

/**
 * Score environment factors
 */
export function scoreEnvironmentFactors(env: SleepEnvironment): QualityFactor[] {
  const factors: QualityFactor[] = [];

  if (env.temperature !== undefined) {
    const impact = env.temperature >= 15 && env.temperature <= 19 ? 'positive' : 'negative';
    const contribution = impact === 'positive' ? 10 : -10;
    factors.push({
      factor: 'Room Temperature',
      value: `${env.temperature}°C`,
      impact,
      contribution,
      emoji: '🌡️',
    });
  }

  if (env.humidity !== undefined) {
    let impact: 'positive' | 'negative' | 'neutral' = 'neutral';
    let contribution = 0;
    if (env.humidity >= 30 && env.humidity <= 50) {
      impact = 'positive';
      contribution = 8;
    } else if (env.humidity < 30 || env.humidity > 60) {
      impact = 'negative';
      contribution = -8;
    }
    factors.push({
      factor: 'Humidity Level',
      value: `${env.humidity}%`,
      impact,
      contribution,
      emoji: '💧',
    });
  }

  if (env.noiseLevel !== undefined) {
    const impact = env.noiseLevel <= 30 ? 'positive' : 'negative';
    const contribution = impact === 'positive' ? 12 : -15;
    factors.push({
      factor: 'Noise Level',
      value: `${env.noiseLevel}dB`,
      impact,
      contribution,
      emoji: '🔇',
    });
  }

  if (env.lightLevel !== undefined) {
    const impact = env.lightLevel === 'dark' ? 'positive' : 'negative';
    const contribution = impact === 'positive' ? 15 : env.lightLevel === 'bright' ? -20 : -8;
    factors.push({
      factor: 'Light Level',
      value: env.lightLevel.charAt(0).toUpperCase() + env.lightLevel.slice(1),
      impact,
      contribution,
      emoji: '💡',
    });
  }

  if (env.caffeine !== undefined && env.caffeine > 0) {
    const impact = env.caffeine <= 50 ? 'neutral' : 'negative';
    const contribution = env.caffeine <= 50 ? 0 : -Math.min(20, (env.caffeine - 50) / 25);
    factors.push({
      factor: 'Caffeine Intake',
      value: `${env.caffeine}mg`,
      impact,
      contribution,
      emoji: '☕',
    });
  }

  if (env.exerciseMinutes !== undefined && env.exerciseMinutes > 0) {
    // Exercise 4+ hours before sleep is positive
    const impact = env.exerciseMinutes >= 30 ? 'positive' : 'negative';
    const contribution = impact === 'positive' ? 12 : -5;
    factors.push({
      factor: 'Exercise',
      value: `${env.exerciseMinutes} min before sleep`,
      impact,
      contribution,
      emoji: '🏃',
    });
  }

  return factors;
}

/**
 * Correlate factors with sleep quality
 */
export function correlateFactorsWithQuality(
  sessions: SleepSession[],
  environmentHistory: Map<string, SleepEnvironment>
): string[] {
  const insights: string[] = [];

  if (sessions.length < 3) {
    return ['Log more sleep sessions with environmental data to find correlations.'];
  }

  // Find best and worst sessions
  const bestSession = sessions.reduce((best, s) => s.quality > best.quality ? s : best);
  const worstSession = sessions.reduce((worst, s) => s.quality < worst.quality ? s : worst);

  const bestEnv = environmentHistory.get(bestSession.id) || {};
  const worstEnv = environmentHistory.get(worstSession.id) || {};

  // Compare factors
  if (bestEnv.temperature && worstEnv.temperature) {
    const diff = Math.abs(bestEnv.temperature - worstEnv.temperature);
    if (diff > 2) {
      const temp = bestEnv.temperature < worstEnv.temperature ? 'cooler' : 'warmer';
      insights.push(`You sleep better in ${temp} rooms. Your best sleep was at ${bestEnv.temperature}°C.`);
    }
  }

  if (bestEnv.lightLevel && worstEnv.lightLevel && bestEnv.lightLevel !== worstEnv.lightLevel) {
    insights.push(`Your best sleep was in a ${bestEnv.lightLevel} room. Try mimicking that dimness.`);
  }

  if (bestEnv.noiseLevel && worstEnv.noiseLevel) {
    if (bestEnv.noiseLevel < (worstEnv.noiseLevel || Infinity)) {
      insights.push('You sleep better in quieter environments. Consider white noise to mask sounds.');
    }
  }

  return insights.length > 0 ? insights : ['Continue tracking environmental factors to find patterns in your sleep.'];
}

/**
 * Get recommendations based on current environment
 */
export function getEnvironmentRecommendations(env: SleepEnvironment): string[] {
  const recommendations: string[] = [];

  if (!env.temperature || env.temperature > 20) {
    recommendations.push('Cool your room to 15-19°C for optimal sleep.');
  }
  if (!env.lightLevel || env.lightLevel !== 'dark') {
    recommendations.push('Keep your bedroom very dark - use blackout curtains.');
  }
  if (!env.noiseLevel || env.noiseLevel > 30) {
    recommendations.push('Reduce noise with earplugs or white noise machine.');
  }
  if (env.humidity && (env.humidity < 30 || env.humidity > 60)) {
    recommendations.push('Use a humidifier/dehumidifier to maintain 30-50% humidity.');
  }
  if (env.caffeine && env.caffeine > 100) {
    recommendations.push('Reduce caffeine intake - avoid any after 2 PM.');
  }

  return recommendations.slice(0, 3);
}
