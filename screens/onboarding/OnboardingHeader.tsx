import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

// Shared onboarding chrome: 44x44 circular back button, a thin progress bar,
// and a "Skip" link. Mirrors the design canvas's header row, which is
// identical across every numbered onboarding screen.
//
// Numbering follows the canvas's own convention exactly: the Welcome screen is
// unnumbered (it has no header at all), and the 8 question screens are labelled
// "Step 1 of 9" .. "Step 8 of 9". The 9th slot is the final Plan screen, which
// also has no header. The canvas's own progress-bar percentages
// (11/22/33/44/55/66/77/88) are stepNumber/9 rounded, so we compute them.

interface OnboardingHeaderProps {
  theme: any;
  /** 1-based step index as shown in the canvas's "Step N of 9" label. */
  stepNumber: number;
  /** Canvas always says "of 9". */
  totalSteps?: number;
  onBack: () => void;
  onSkip: () => void;
}

export default function OnboardingHeader({
  theme,
  stepNumber,
  totalSteps = 9,
  onBack,
  onSkip,
}: OnboardingHeaderProps) {
  const s = styles(theme);
  const percent = Math.round((stepNumber / totalSteps) * 100);

  return (
    <View style={s.row}>
      <TouchableOpacity
        style={s.backButton}
        onPress={onBack}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
      </TouchableOpacity>

      <View
        style={s.progressTrack}
        accessibilityRole="progressbar"
        accessibilityLabel="Onboarding progress"
        accessibilityValue={{ min: 1, max: totalSteps, now: stepNumber }}
      >
        <View style={[s.progressFill, { width: `${percent}%` }]} />
      </View>

      <TouchableOpacity
        style={s.skipButton}
        onPress={onSkip}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
      >
        <Text style={s.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.backgroundTertiary,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: theme.colors.accent,
    },
    skipButton: {
      height: 44,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
  });
