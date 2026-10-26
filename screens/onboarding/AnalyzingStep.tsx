import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import SleepPrintMark from '../../components/SleepPrintMark';

// Restores the original onboarding's 3-second "analyzing" animation (pulse +
// animated progress fill) that preceded the final Plan screen, re-skinned to
// the new theme system instead of the old hardcoded colors. Runs once on
// mount, then calls `onDone` — the container advances to PlanStep from there,
// so this component owns no navigation/business logic of its own.

interface AnalyzingStepProps {
  theme: any;
  onDone: () => void;
}

const ANIMATION_DURATION_MS = 3000;
const PROGRESS_TICKS = 60;

export default function AnalyzingStep({ theme, onDone }: AnalyzingStepProps) {
  const s = styles(theme);
  const [progress, setProgress] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();

    const increment = 100 / PROGRESS_TICKS;
    const interval = ANIMATION_DURATION_MS / PROGRESS_TICKS;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        setProgress(100);
        clearInterval(timer);
        pulse.stop();
        scaleAnim.setValue(1);
        onDone();
      } else {
        setProgress(current);
      }
    }, interval);

    return () => {
      clearInterval(timer);
      pulse.stop();
    };
    // Intentionally runs once per mount — onDone/scaleAnim are stable refs
    // from the container for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={s.screen}>
      <Animated.View style={[s.markWrap, { transform: [{ scale: scaleAnim }] }]}>
        <SleepPrintMark size={120} colors={theme.sleepPrintMark} />
      </Animated.View>

      <View style={s.textBlock}>
        <Text style={s.title}>Building your sleep plan</Text>
        <Text style={s.subtitle}>Matching your answers to a routine that fits.</Text>
      </View>

      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress}%` }]} />
      </View>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      rowGap: 28,
    },
    markWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: {
      alignItems: 'center',
      rowGap: 8,
    },
    title: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 24,
      textAlign: 'center',
      letterSpacing: -0.3,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    progressTrack: {
      width: '100%',
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.navBackground,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: theme.colors.accent,
    },
  });
