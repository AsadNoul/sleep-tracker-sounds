/**
 * Feature Flags Management
 * Control feature rollout and A/B testing
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  targetAudience: 'all' | 'beta' | 'premium' | 'custom';
  createdAt: Date;
  updatedAt: Date;
  variants: FeatureVariant[];
}

export interface FeatureVariant {
  id: string;
  name: string;
  percentage: number;
  config: Record<string, any>;
}

/**
 * Default feature flags for the 10 new features
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: 'feature-mood-ring',
    name: 'Mood Ring',
    description: 'Track mood before and after sleep',
    enabled: true,
    rolloutPercentage: 100,
    targetAudience: 'all',
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date(),
    variants: [
      {
        id: 'mood-v1',
        name: 'Mood Ring v1',
        percentage: 100,
        config: { emoji: true, colors: true },
      },
    ],
  },
  {
    id: 'feature-ai-insights',
    name: 'AI Sleep Insights',
    description: 'AI-generated sleep insights',
    enabled: true,
    rolloutPercentage: 80,
    targetAudience: 'all',
    createdAt: new Date('2026-01-20'),
    updatedAt: new Date(),
    variants: [
      {
        id: 'insights-v1',
        name: 'Insights v1',
        percentage: 100,
        config: { insightCount: 5 },
      },
    ],
  },
  {
    id: 'feature-recovery-status',
    name: 'Recovery Status',
    description: 'Physical recovery readiness indicator',
    enabled: true,
    rolloutPercentage: 90,
    targetAudience: 'all',
    createdAt: new Date('2026-01-22'),
    updatedAt: new Date(),
    variants: [
      {
        id: 'recovery-v1',
        name: 'Recovery v1',
        percentage: 100,
        config: { showWorkoutReadiness: true },
      },
    ],
  },
  {
    id: 'feature-dream-journal',
    name: 'Dream Journal',
    description: 'Advanced dream tracking with analysis',
    enabled: true,
    rolloutPercentage: 70,
    targetAudience: 'premium',
    createdAt: new Date('2026-01-25'),
    updatedAt: new Date(),
    variants: [
      {
        id: 'dreams-v1',
        name: 'Dream Journal v1',
        percentage: 100,
        config: { themeTagging: true, colorSelection: true },
      },
    ],
  },
];

/**
 * Check if feature is enabled for user
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  userId?: string,
  userTier: 'free' | 'premium' = 'free'
): boolean {
  // Check if feature is enabled globally
  if (!flag.enabled) return false;

  // Check audience restrictions
  if (flag.targetAudience === 'premium' && userTier !== 'premium') return false;
  if (flag.targetAudience === 'beta' && !isUserBeta(userId)) return false;

  // Check rollout percentage
  if (flag.rolloutPercentage < 100 && userId) {
    const userHash = hashUserId(userId);
    return (userHash % 100) < flag.rolloutPercentage;
  }

  return true;
}

/**
 * Get feature variant for user
 */
export function getFeatureVariant(
  flag: FeatureFlag,
  userId?: string
): FeatureVariant {
  if (flag.variants.length === 0) {
    return {
      id: 'default',
      name: 'Default',
      percentage: 100,
      config: {},
    };
  }

  if (flag.variants.length === 1) {
    return flag.variants[0];
  }

  // Deterministic variant selection based on user ID
  const userHash = userId ? hashUserId(userId) : 0;
  let accumulated = 0;

  for (const variant of flag.variants) {
    accumulated += variant.percentage;
    if ((userHash % 100) < accumulated) {
      return variant;
    }
  }

  return flag.variants[0];
}

/**
 * Simple hash for user ID to variant mapping
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if user is beta tester
 */
function isUserBeta(userId?: string): boolean {
  // Mock implementation - in real app, check database
  return false;
}

/**
 * Create new feature flag
 */
export function createFeatureFlag(
  name: string,
  description: string,
  rolloutPercentage: number
): FeatureFlag {
  return {
    id: `feature-${Date.now()}`,
    name,
    description,
    enabled: false,
    rolloutPercentage,
    targetAudience: 'all',
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [
      {
        id: 'default',
        name: 'Default',
        percentage: 100,
        config: {},
      },
    ],
  };
}

/**
 * Update feature flag
 */
export function updateFeatureFlag(
  flag: FeatureFlag,
  updates: Partial<FeatureFlag>
): FeatureFlag {
  return {
    ...flag,
    ...updates,
    updatedAt: new Date(),
  };
}

/**
 * A/B Test results
 */
export interface ABTestResult {
  flagId: string;
  variantA: string;
  variantB: string;
  sampleSize: number;
  conversionA: number;
  conversionB: number;
  confidence: number;
  winner: 'A' | 'B' | 'inconclusive';
  recommendation: string;
}

export function calculateABTestResults(
  conversionA: number,
  conversionB: number,
  sampleSize: number,
  flagId: string
): ABTestResult {
  const rateA = conversionA / sampleSize;
  const rateB = conversionB / sampleSize;
  const difference = Math.abs(rateA - rateB);
  const confidence = Math.min(100, (difference * Math.sqrt(sampleSize)) * 100);

  let winner: 'A' | 'B' | 'inconclusive' = 'inconclusive';
  let recommendation = 'Test more data before deciding';

  if (confidence > 95) {
    winner = rateA > rateB ? 'A' : 'B';
    recommendation = `Variant ${winner} shows ${Math.round(difference * 100)}% higher conversion`;
  }

  return {
    flagId,
    variantA: 'A',
    variantB: 'B',
    sampleSize,
    conversionA,
    conversionB,
    confidence: Math.round(confidence),
    winner,
    recommendation,
  };
}
