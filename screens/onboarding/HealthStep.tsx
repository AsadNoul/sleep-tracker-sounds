import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Lock } from 'lucide-react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta, CheckSquare } from './stepShared';

// Step 8 of 9 — "Anything that affects your sleep?"
//
// Canvas (`Ob-Health.dc.html`): 58px multi-select rows with a square checkbox
// on the right, a privacy/medical-disclaimer callout, and a "Build my plan" CTA.
//
// Items are the real 7-entry `HEALTH_CONDITIONS` (ids written to Supabase as
// `health_conditions`), not the canvas's six example labels.
//
// NOTE on the "optional" wording: the canvas labels this step optional, but the
// original `handleNext` validation REQUIRES at least one selection, and that
// rule is preserved unchanged in the container. Since "None" is itself one of
// the real options, picking it satisfies the rule — so the copy below says
// "Pick any that apply" without promising the step can be left blank.

export interface HealthOption {
  id: string;
  label: string;
}

interface HealthStepProps {
  theme: any;
  conditions: readonly HealthOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function HealthStep({
  theme,
  conditions,
  selected,
  onToggle,
  onNext,
  onBack,
  onSkip,
}: HealthStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={8} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 8 of 9</Text>
        <Text style={sh.heading}>Anything that affects your sleep?</Text>
        <Text style={sh.subtitle}>
          Pick any that apply — choose "None" if nothing does.
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      >
        {conditions.map((condition) => {
          const isSelected = selected.includes(condition.id);
          return (
            <TouchableOpacity
              key={condition.id}
              style={[s.row, isSelected && s.rowSelected]}
              onPress={() => onToggle(condition.id)}
              activeOpacity={0.85}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={s.rowLabel}>{condition.label}</Text>
              <CheckSquare theme={theme} checked={isSelected} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={sh.callout}>
        <Lock size={18} color={theme.colors.accent} strokeWidth={2} style={s.calloutIcon} />
        <Text style={sh.calloutText}>
          Private and never shared. Sleep Architect is not a medical device. Talk to a
          doctor about any sleep condition.
        </Text>
      </View>

      <PrimaryCta theme={theme} label="Build my plan" onPress={onNext} pinToBottom={false} />
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    list: {
      paddingTop: 4,
      paddingBottom: 4,
      rowGap: 10,
    },
    row: {
      minHeight: 58,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 16,
      paddingVertical: 10,
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
    calloutIcon: {
      marginTop: 1,
    },
  });
