import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../hooks/useAppTheme';
import { getSleepScoreColor } from '../utils/sleepQualityColors';

interface CircularProgressProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
  color?: string;
}

export default React.memo(function CircularProgress({
  score,
  size = 140,
  strokeWidth = 12,
  showText = true,
  color
}: CircularProgressProps) {
  const { theme } = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  const scoreQuality = getSleepScoreColor(score);

  // Use custom color or quality color
  const strokeColor = color || "url(#grad)";
  const gradientColors = scoreQuality.gradient;

  return (
    <View style={styles(theme, scoreQuality.color, size).container}>
      <Svg width={size} height={size} style={styles(theme, scoreQuality.color, size).svg}>
        {!color && (
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} />
              <Stop offset="100%" stopColor={gradientColors[1]} />
            </LinearGradient>
          </Defs>
        )}
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showText && (
        <View style={styles(theme, scoreQuality.color, size).scoreContainer}>
          <Text style={styles(theme, scoreQuality.color, size).scoreText}>{Math.round(score)}</Text>
          <Text style={styles(theme, scoreQuality.color, size).scoreLabel}>{scoreQuality.label}</Text>
        </View>
      )}
    </View>
  );
});

const styles = (theme: any, activeColor: string, size: number) => StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: activeColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  scoreContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: Math.round(size * 0.3),
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: activeColor + '80',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  scoreLabel: {
    fontSize: Math.max(6, Math.round(size * 0.08)),
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: -2,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
