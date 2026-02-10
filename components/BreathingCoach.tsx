import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface BreathingCoachProps {
  pattern: 'box' | '4-7-8' | 'calm';
  onComplete?: () => void;
}

const BREATHING_PATTERNS = {
  box: {
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
    name: 'Box Breathing',
    description: '4-4-4-4 pattern for focus',
  },
  '4-7-8': {
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
    name: '4-7-8 Breathing',
    description: 'Rapid relaxation technique',
  },
  calm: {
    inhale: 4,
    hold1: 4,
    exhale: 6,
    hold2: 2,
    name: 'Calm Breathing',
    description: 'Extended exhale for relaxation',
  },
};

export default function BreathingCoach({ pattern, onComplete }: BreathingCoachProps) {
  const { theme } = useTheme();
  const breathingPattern = BREATHING_PATTERNS[pattern];
  
  const [phase, setPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  const [countdown, setCountdown] = useState(breathingPattern.inhale);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    startBreathingCycle();
  }, []);

  const startBreathingCycle = () => {
    animatePhase('inhale', breathingPattern.inhale);
  };

  const animatePhase = (currentPhase: typeof phase, duration: number) => {
    if (duration === 0) {
      // Skip phase if duration is 0
      moveToNextPhase(currentPhase);
      return;
    }

    setPhase(currentPhase);
    setCountdown(duration);
    
    // Haptic feedback at phase change
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation config based on phase
    const targetScale = currentPhase === 'inhale' ? 1 : currentPhase === 'exhale' ? 0.3 : scaleAnim._value;
    const targetOpacity = currentPhase === 'inhale' ? 1 : currentPhase === 'exhale' ? 0.3 : opacityAnim._value;

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: targetScale,
        duration: duration * 1000,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: targetOpacity,
        duration: duration * 1000,
        useNativeDriver: true,
      }),
    ]).start();

    // Countdown timer
    let timeLeft = duration;
    const interval = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      
      if (timeLeft === 0) {
        clearInterval(interval);
        moveToNextPhase(currentPhase);
      }
    }, 1000);
  };

  const moveToNextPhase = (currentPhase: typeof phase) => {
    switch (currentPhase) {
      case 'inhale':
        animatePhase('hold1', breathingPattern.hold1);
        break;
      case 'hold1':
        animatePhase('exhale', breathingPattern.exhale);
        break;
      case 'exhale':
        animatePhase('hold2', breathingPattern.hold2);
        break;
      case 'hold2':
        const newCycles = cyclesCompleted + 1;
        setCyclesCompleted(newCycles);
        
        // Complete after 5 cycles (about 2-3 minutes depending on pattern)
        if (newCycles >= 5) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onComplete?.();
        } else {
          animatePhase('inhale', breathingPattern.inhale);
        }
        break;
    }
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale':
        return 'Breathe In';
      case 'hold1':
      case 'hold2':
        return 'Hold';
      case 'exhale':
        return 'Breathe Out';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale':
        return '#60A5FA'; // Blue
      case 'hold1':
      case 'hold2':
        return '#A78BFA'; // Purple
      case 'exhale':
        return '#34D399'; // Green
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.patternName, { color: theme.colors.text }]}>
          {breathingPattern.name}
        </Text>
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {breathingPattern.description}
        </Text>
        <Text style={[styles.cycles, { color: theme.colors.textSecondary }]}>
          Cycle {cyclesCompleted + 1} of 5
        </Text>
      </View>

      <View style={styles.breathingArea}>
        {/* Animated breathing circle */}
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              backgroundColor: getPhaseColor(),
              opacity: opacityAnim,
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.circleContent}>
            <Text style={styles.countdownText}>{countdown}</Text>
          </View>
        </Animated.View>

        {/* Phase instruction */}
        <View style={styles.instructionContainer}>
          <Text style={[styles.phaseText, { color: getPhaseColor() }]}>
            {getPhaseText()}
          </Text>
        </View>
      </View>

      {/* Visual breathing guide rings */}
      <View style={styles.guideRings}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.guideRing,
              {
                width: width * 0.5 + i * 40,
                height: width * 0.5 + i * 40,
                borderColor: getPhaseColor(),
                opacity: 0.1 - i * 0.03,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  patternName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
  },
  cycles: {
    fontSize: 14,
    fontWeight: '500',
  },
  breathingArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: width * 0.7,
    width: width * 0.7,
  },
  breathingCircle: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  circleContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: -60,
  },
  phaseText: {
    fontSize: 24,
    fontWeight: '600',
  },
  guideRings: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  guideRing: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 999,
  },
});
