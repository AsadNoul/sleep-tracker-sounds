import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta } from './stepShared';

// Step 3 of 9 — "What usually gets in the way?"
//
// Canvas (`Ob-Challenges.dc.html`): a flex-wrap of 50px pill chips with
// pill-radius 99 and 18px horizontal padding; multi-select, inline on the page.
//
// This replaces the old dropdown-modal interaction for sleep troubles with the
// canvas's simpler direct chip layout. Items are the real 8-entry
// `SLEEP_TROUBLES` from the container (written to Supabase as `sleep_troubles`).

export interface ChallengeOption {
  id: string;
  label: string;
}

interface ChallengesStepProps {
  theme: any;
  challenges: readonly ChallengeOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function ChallengesStep({
  theme,
  challenges,
  selected,
  onToggle,
  onNext,
  onBack,
  onSkip,
}: ChallengesStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);
  const count = selected.length;

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={3} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 3 of 9</Text>
        <Text style={sh.heading}>What usually gets in the way?</Text>
        <Text style={sh.subtitle}>Pick any that sound familiar.</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.chipWrap}
        showsVerticalScrollIndicator={false}
      >
        {challenges.map((challenge) => {
          const isSelected = selected.includes(challenge.id);
          return (
            <TouchableOpacity
              key={challenge.id}
              style={[s.chip, isSelected && s.chipSelected]}
              onPress={() => onToggle(challenge.id)}
              activeOpacity={0.85}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={s.chipText}>{challenge.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <PrimaryCta
        theme={theme}
        label={count > 0 ? `Continue · ${count} selected` : 'Continue'}
        onPress={onNext}
        pinToBottom={false}
      />
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingTop: 4,
      paddingBottom: 4,
      rowGap: 10,
      columnGap: 10,
    },
    chip: {
      height: 50,
      paddingHorizontal: 18,
      borderRadius: 99,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipSelected: {
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accentLight,
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 2,
    },
    chipText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
  });
