/**
 * AnimatedScoreRing
 * Circular arc that animates in on load — score counts up,
 * arc sweeps from 0 → target, gradient shifts red → orange → green.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';

// ─── Animated SVG Circle ───────────────────────────────────────────────────
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── Helpers ──────────────────────────────────────────────────────────────
function getScoreGradient(score: number): [string, string] {
  if (score >= 75) return ['#10B981', '#34D399']; // green
  if (score >= 50) return ['#F59E0B', '#F97316']; // amber → orange
  return ['#EF4444', '#F97316'];                   // red → orange
}

function getScoreMainColor(score: number): string {
  if (score >= 75) return '#10B981';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Optimal';
  if (score >= 75) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Fair';
  if (score >= 40) return 'Mediocre';
  if (score > 0)   return 'Poor';
  return 'No Data';
}

function getScoreEmoji(score: number): string {
  if (score >= 90) return '🏆';
  if (score >= 75) return '🌟';
  if (score >= 60) return '✨';
  if (score >= 50) return '⚖️';
  if (score >= 40) return '⚠️';
  if (score > 0)   return '😴';
  return '';
}

// ─── Props ────────────────────────────────────────────────────────────────
interface AnimatedScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Override everything — shows this colour instead of the gradient */
  color?: string;
  /** Top label above the number — e.g. "SLEEP SCORE" */
  label?: string;
  /** Custom sub-label below — e.g. "In Progress". Falls back to quality label */
  sublabel?: string;
  /** Colour for the sublabel */
  sublabelColor?: string;
  /** Show the tracking spinner state instead of number */
  isTracking?: boolean;
  /** Delay before animation starts (ms) */
  delay?: number;
}

// ─── Component ────────────────────────────────────────────────────────────
export default function AnimatedScoreRing({
  score,
  size = 160,
  strokeWidth = 13,
  color,
  label = 'SLEEP SCORE',
  sublabel,
  sublabelColor,
  isTracking = false,
  delay = 300,
}: AnimatedScoreRingProps) {
  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Shared value for arc progress (0 → 1)
  const progress = useSharedValue(0);

  // JS-side count-up for displayed integer
  const [displayScore, setDisplayScore] = useState(0);
  const countIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const targetScore = isTracking ? 0 : Math.min(Math.max(score, 0), 100);

  const [gradStart, gradEnd] = color
    ? [color, color]
    : getScoreGradient(targetScore);

  const mainColor    = color || getScoreMainColor(targetScore);
  const qualityLabel = sublabel ?? (targetScore === 0 ? 'Start tracking' : getScoreLabel(targetScore));
  const qualityEmoji = isTracking ? '⏱️' : getScoreEmoji(targetScore);
  const labelColor   = sublabelColor || mainColor;

  useEffect(() => {
    // Animate the SVG arc via Reanimated (runs on UI thread)
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(targetScore / 100, {
        duration: 1600,
        easing: Easing.out(Easing.cubic),
      }),
    );

    // Count-up: JS ticker (runs on JS thread)
    setDisplayScore(0);
    if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    if (targetScore === 0) return;

    const startAt    = Date.now() + delay;
    const DURATION   = 1700;
    countIntervalRef.current = setInterval(() => {
      const elapsed  = Date.now() - startAt;
      if (elapsed < 0) return;
      const fraction = Math.min(elapsed / DURATION, 1);
      const eased    = 1 - Math.pow(1 - fraction, 3); // ease-out cubic
      setDisplayScore(Math.round(eased * targetScore));
      if (fraction >= 1 && countIntervalRef.current) {
        clearInterval(countIntervalRef.current);
      }
    }, 16);

    return () => {
      if (countIntervalRef.current) clearInterval(countIntervalRef.current);
    };
  }, [score, isTracking]);

  // Animated SVG props
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  // Inner text size helpers
  const numFontSize   = Math.round(size * 0.27);
  const labelFontSize = Math.max(8, Math.round(size * 0.08));
  const subFontSize   = Math.max(9, Math.round(size * 0.075));

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Glow backdrop */}
      <View
        style={[
          styles.glow,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
            backgroundColor: mainColor,
          },
        ]}
      />

      {/* SVG Ring */}
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgLinearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradStart} />
            <Stop offset="100%" stopColor={gradEnd} />
          </SvgLinearGradient>
        </Defs>

        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Animated progress arc */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color || 'url(#arcGrad)'}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>

      {/* Inner Content */}
      <View style={styles.innerContent} pointerEvents="none">
        {isTracking ? (
          <Text style={[styles.trackingEmoji, { fontSize: numFontSize }]}>⏱️</Text>
        ) : (
          <Text
            style={[
              styles.scoreNumber,
              {
                fontSize: numFontSize,
                color: '#FFFFFF',
                textShadowColor: mainColor + '80',
              },
            ]}
          >
            {displayScore}
          </Text>
        )}
        <Text style={[styles.topLabel, { fontSize: labelFontSize }]}>
          {isTracking ? 'TRACKING' : label}
        </Text>
        <Text
          style={[
            styles.subLabel,
            { fontSize: subFontSize, color: labelColor },
          ]}
        >
          {isTracking ? 'In Progress' : `${qualityEmoji} ${qualityLabel}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    opacity: 0.12,
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: {
    fontWeight: '900',
    letterSpacing: -1,
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  trackingEmoji: {
    textAlign: 'center',
  },
  topLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  subLabel: {
    fontWeight: '600',
    marginTop: 2,
  },
});
