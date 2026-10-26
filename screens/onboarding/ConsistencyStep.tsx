import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta, CheckBadge } from './stepShared';

// Step 4 of 9 — "How regular is your bedtime?"
//
// Canvas (`Ob-Consistency.dc.html`): single-select cards (min-height 76px, 20px
// radius) each with a bold label, a description line, and a circular check
// badge; plus a static lightbulb info callout below the list.
//
// The canvas shows four options but `sleepPattern` only has three valid ids
// (`consistent` / `somewhat_consistent` / `irregular`), and that string goes
// straight through to Supabase's `sleep_pattern` column — so we render the real
// three and keep the callout (static copy, not data-driven). Descriptions below
// are presentational and keyed off the real ids.

export interface PatternOption {
  id: string;
  label: string;
}

// Canvas-style description lines, mapped onto the three real pattern ids.
const PATTERN_DESCRIPTIONS: Record<string, string> = {
  consistent: 'Within 30 minutes most nights',
  somewhat_consistent: 'Changes by up to an hour',
  irregular: "It's different every night",
};

interface ConsistencyStepProps {
  theme: any;
  patterns: readonly PatternOption[];
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function ConsistencyStep({
  theme,
  patterns,
  selected,
  onSelect,
  onNext,
  onBack,
  onSkip,
}: ConsistencyStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={4} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 4 of 9</Text>
        <Text style={sh.heading}>How regular is your bedtime?</Text>
      </View>

      <View style={s.list} accessibilityRole="radiogroup">
        {patterns.map((pattern) => {
          const isSelected = selected === pattern.id;
          return (
            <TouchableOpacity
              key={pattern.id}
              style={[s.card, isSelected && s.cardSelected]}
              onPress={() => onSelect(pattern.id)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <View style={s.cardText}>
                <Text style={s.cardTitle}>{pattern.label}</Text>
                <Text style={[s.cardSub, isSelected && s.cardSubSelected]}>
                  {PATTERN_DESCRIPTIONS[pattern.id] ?? ''}
                </Text>
              </View>
              <CheckBadge theme={theme} checked={isSelected} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={sh.callout}>
        <Lightbulb size={18} color={theme.colors.accent} strokeWidth={2} style={s.calloutIcon} />
        <Text style={sh.calloutText}>
          A steady bedtime is one of the simplest ways to sleep better. We'll help you keep
          it.
        </Text>
      </View>

      <PrimaryCta theme={theme} label="Continue" onPress={onNext} />
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    list: {
      paddingTop: 4,
      rowGap: 10,
    },
    card: {
      minHeight: 76,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 14,
    },
    cardSelected: {
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.selectedBackground,
    },
    cardText: {
      flex: 1,
      rowGap: 2,
    },
    cardTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    cardSub: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 19,
      color: theme.colors.textTertiary,
    },
    cardSubSelected: {
      color: theme.colors.textSecondary,
    },
    calloutIcon: {
      marginTop: 1,
    },
  });
