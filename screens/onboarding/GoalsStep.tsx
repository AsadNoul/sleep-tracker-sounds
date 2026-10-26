import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta, CheckBadge } from './stepShared';

// Step 2 of 9 — "What do you want from your sleep?"
//
// Canvas (`App-Goal.dc.html`): a vertical list of 64px toggle rows, each a
// label plus a circular check badge on the right; multi-select. The CTA label
// is dynamic — "Continue · N selected" once anything is picked.
//
// The items are the real 8-entry `SLEEP_GOALS` from the container (the canvas's
// six example labels are presentational inspiration only — these ids are
// written to Supabase as `sleep_goals`).

export interface GoalOption {
  id: string;
  label: string;
}

interface GoalsStepProps {
  theme: any;
  goals: readonly GoalOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function GoalsStep({
  theme,
  goals,
  selected,
  onToggle,
  onNext,
  onBack,
  onSkip,
}: GoalsStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);
  const count = selected.length;

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={2} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 2 of 9</Text>
        <Text style={sh.heading}>What do you want from your sleep?</Text>
        <Text style={sh.subtitle}>Pick as many as you like.</Text>
      </View>

      <ScrollView
        style={s.list}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {goals.map((goal) => {
          const isSelected = selected.includes(goal.id);
          return (
            <TouchableOpacity
              key={goal.id}
              style={[s.row, isSelected && s.rowSelected]}
              onPress={() => onToggle(goal.id)}
              activeOpacity={0.85}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={s.rowLabel}>{goal.label}</Text>
              <CheckBadge theme={theme} checked={isSelected} />
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
    list: {
      flex: 1,
    },
    listContent: {
      paddingTop: 4,
      paddingBottom: 4,
      rowGap: 10,
    },
    row: {
      minHeight: 64,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 14,
    },
    rowSelected: {
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.selectedBackground,
    },
    rowLabel: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
  });
