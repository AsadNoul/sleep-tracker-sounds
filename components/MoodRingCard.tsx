/**
 * MoodRingCard
 * Single-glance sleep quality indicator in a "mood ring" style.
 * Shows: animated pulsing ring + icon + colour + short label.
 *  - Great night  →  teal / crescent moon
 *  - Good         →  green / star
 *  - Fair         →  amber / activity
 *  - Poor         →  red / alert
 *  - No data      →  indigo / moon
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Moon, Star, Zap, Activity, AlertCircle } from 'lucide-react-native';

// ─── Mood Config ──────────────────────────────────────────────────────────
interface MoodConfig {
  label: string;
  sublabel: string;
  color: string;
  gradientColors: [string, string];
  ringColor: string;
  renderIcon: (color: string) => React.ReactNode;
}

function getMoodConfig(score: number): MoodConfig {
  if (score >= 85) {
    return {
      label: 'Great Night',
      sublabel: 'You slept like a pro',
      color: '#14B8A6',
      gradientColors: ['rgba(20,184,166,0.18)', 'rgba(20,184,166,0.04)'],
      ringColor: '#14B8A6',
      renderIcon: (c) => <Moon size={26} color={c} fill={c} strokeWidth={1.5} />,
    };
  }
  if (score >= 70) {
    return {
      label: 'Good Rest',
      sublabel: 'Solid recovery',
      color: '#10B981',
      gradientColors: ['rgba(16,185,129,0.18)', 'rgba(16,185,129,0.04)'],
      ringColor: '#10B981',
      renderIcon: (c) => <Star size={26} color={c} fill={c} strokeWidth={1.5} />,
    };
  }
  if (score >= 55) {
    return {
      label: 'Decent Sleep',
      sublabel: 'Room to improve',
      color: '#F59E0B',
      gradientColors: ['rgba(245,158,11,0.18)', 'rgba(245,158,11,0.04)'],
      ringColor: '#F59E0B',
      renderIcon: (c) => <Zap size={26} color={c} fill={c} strokeWidth={1.5} />,
    };
  }
  if (score >= 40) {
    return {
      label: 'Light Sleep',
      sublabel: 'Recovery pending',
      color: '#F97316',
      gradientColors: ['rgba(249,115,22,0.18)', 'rgba(249,115,22,0.04)'],
      ringColor: '#F97316',
      renderIcon: (c) => <Activity size={26} color={c} strokeWidth={2} />,
    };
  }
  if (score > 0) {
    return {
      label: 'Rough Night',
      sublabel: 'Rest up tonight',
      color: '#EF4444',
      gradientColors: ['rgba(239,68,68,0.18)', 'rgba(239,68,68,0.04)'],
      ringColor: '#EF4444',
      renderIcon: (c) => <AlertCircle size={26} color={c} strokeWidth={2} />,
    };
  }
  // No data
  return {
    label: 'No Data Yet',
    sublabel: 'Track your first sleep',
    color: '#8B5CF6',
    gradientColors: ['rgba(139,92,246,0.18)', 'rgba(139,92,246,0.04)'],
    ringColor: '#8B5CF6',
    renderIcon: (c) => <Moon size={26} color={c} strokeWidth={2} />,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────
interface MoodRingCardProps {
  score: number;
  style?: ViewStyle;
  /** Override automatic label */
  customLabel?: string;
  /** Override automatic sublabel */
  customSublabel?: string;
  onPress?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function MoodRingCard({
  score,
  style,
  customLabel,
  customSublabel,
}: MoodRingCardProps) {
  const mood = getMoodConfig(score);

  // Pulsing ring scale animation
  const ringScale   = useSharedValue(1);
  const ringOpacity = useSharedValue(0.6);

  useEffect(() => {
    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1400, easing: Easing.out(Easing.sin) }),
        withTiming(1,    { duration: 1400, easing: Easing.in(Easing.sin) }),
      ),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0,    { duration: 1400, easing: Easing.out(Easing.sin) }),
        withTiming(0.55, { duration: 1400, easing: Easing.in(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [score]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <LinearGradient
      colors={mood.gradientColors}
      style={[styles.card, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Icon with pulse ring */}
      <View style={styles.iconWrapper}>
        {/* Pulsing backdrop ring */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              borderColor: mood.ringColor,
              width: 64,
              height: 64,
              borderRadius: 32,
            },
            pulseStyle,
          ]}
        />
        {/* Solid icon circle */}
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: mood.color + '22', borderColor: mood.color + '55' },
          ]}
        >
          {mood.renderIcon(mood.color)}
        </View>
      </View>

      {/* Text content */}
      <View style={styles.textContent}>
        <Text style={[styles.label, { color: mood.color }]}>
          {customLabel ?? mood.label}
        </Text>
        <Text style={styles.sublabel}>
          {customSublabel ?? mood.sublabel}
        </Text>
      </View>

      {/* Score pill */}
      {score > 0 && (
        <View style={[styles.scorePill, { backgroundColor: mood.color + '22', borderColor: mood.color + '55' }]}>
          <Text style={[styles.scoreText, { color: mood.color }]}>{score}</Text>
          <Text style={[styles.scoreUnit, { color: mood.color + 'AA' }]}>pts</Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    rowGap: 14, columnGap: 14,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  textContent: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sublabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    rowGap: 2, columnGap: 2,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
  },
  scoreUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
});
