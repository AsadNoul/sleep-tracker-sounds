import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta } from './stepShared';

// Step 7 of 9 — "A little about you"
//
// Canvas (`Ob-About.dc.html`): two cards, each with a bold label and a grid of
// 48px pill buttons — a 3-column age grid and a 2-column gender grid, both
// single-select. Gender is marked optional (no validation depends on it, which
// matches the original `handleNext` switch).
//
// AGE: the old UI was a free-text numeric input and `onboardingData.age` is a
// string that `handleComplete` runs through `parseInt(...) || null`. The canvas
// uses buckets, which don't parseInt meaningfully ('25-34' would yield 25), so
// each bucket stores a representative numeric string instead — see
// AGE_BUCKETS below. The stored shape (a string) and the Supabase column are
// unchanged.

/** Bucket label -> the numeric string stored in `onboardingData.age`. */
export const AGE_BUCKETS: ReadonlyArray<{ label: string; value: string }> = [
  { label: '18–24', value: '21' }, // midpoint
  { label: '25–34', value: '30' }, // midpoint
  { label: '35–44', value: '40' }, // midpoint
  { label: '45–54', value: '50' }, // midpoint
  { label: '55–64', value: '60' }, // midpoint
  { label: '65+', value: '65' },   // lower bound (open-ended bucket)
];

export const GENDER_OPTIONS: ReadonlyArray<string> = [
  'Woman',
  'Man',
  'Non-binary',
  'Prefer not to say',
];

interface AboutStepProps {
  theme: any;
  /** The stored numeric age string, e.g. '30'. */
  age: string;
  gender: string;
  onChangeAge: (value: string) => void;
  onChangeGender: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function AboutStep({
  theme,
  age,
  gender,
  onChangeAge,
  onChangeGender,
  onNext,
  onBack,
  onSkip,
}: AboutStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={7} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 7 of 9</Text>
        <Text style={sh.heading}>A little about you</Text>
        <Text style={sh.subtitle}>
          Sleep needs change with age. This helps us compare your nights fairly.
        </Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>Age</Text>
        <View style={s.pillGrid} accessibilityRole="radiogroup">
          {AGE_BUCKETS.map((bucket) => {
            const isSelected = age === bucket.value;
            return (
              <TouchableOpacity
                key={bucket.value}
                style={[s.pillThird, isSelected && s.pillSelected]}
                onPress={() => onChangeAge(bucket.value)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={[s.pillText, isSelected && s.pillTextSelected]}>
                  {bucket.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardLabel}>
          Gender <Text style={s.optionalLabel}>· optional</Text>
        </Text>
        <View style={s.pillGrid} accessibilityRole="radiogroup">
          {GENDER_OPTIONS.map((option) => {
            const isSelected = gender === option;
            return (
              <TouchableOpacity
                key={option}
                style={[s.pillHalf, isSelected && s.pillSelected]}
                onPress={() => onChangeGender(option)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text style={[s.pillText, isSelected && s.pillTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <PrimaryCta theme={theme} label="Continue" onPress={onNext} />
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: 24,
      padding: 18,
      rowGap: 12,
    },
    cardLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    optionalLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    pillGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 8,
      columnGap: 8,
    },
    // 3 columns, allowing for two 8px column gaps.
    pillThird: {
      width: '31%',
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    // 2 columns, allowing for one 8px column gap.
    pillHalf: {
      width: '48%',
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    pillSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    pillText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    pillTextSelected: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.background,
    },
  });
