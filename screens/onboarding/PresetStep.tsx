import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta } from './stepShared';

// Step 1 of 9 — "What do your days look like?"
//
// Visual language comes from the canvas (`Ob-Preset.dc.html`): a 2-column grid
// of 96px pill-cards with a bold label and a smaller description.
//
// The OPTIONS, however, are the real `PROFESSIONAL_PRESETS` passed in from the
// container, NOT the canvas's six illustrative "lifestyle" labels. Those preset
// ids and their `autoSelect` prefills are what `handleComplete`'s Supabase write
// persists via `onboarding_preset` / `profession`, so they must stay intact.

export interface PresetOption {
  id: string;
  title: string;
  subtitle: string;
}

interface PresetStepProps {
  theme: any;
  presets: readonly PresetOption[];
  /** Currently selected preset id, if any. */
  selected?: string;
  /** Selecting a preset applies its prefills and advances (container decides). */
  onSelect: (presetId: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function PresetStep({
  theme,
  presets,
  selected,
  onSelect,
  onNext,
  onBack,
  onSkip,
}: PresetStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={1} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 1 of 9</Text>
        <Text style={sh.heading}>What do your days look like?</Text>
        <Text style={sh.subtitle}>We'll suggest a schedule that fits.</Text>
      </View>

      <View style={s.grid} accessibilityRole="radiogroup">
        {presets.map((preset) => {
          const isSelected = selected === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              style={[s.card, isSelected && s.cardSelected]}
              onPress={() => onSelect(preset.id)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <Text style={s.cardTitle}>{preset.title}</Text>
              <Text style={[s.cardSub, isSelected && s.cardSubSelected]}>
                {preset.subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <PrimaryCta theme={theme} label="Continue" onPress={onNext} />
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingTop: 4,
      rowGap: 10,
      columnGap: 10,
    },
    card: {
      // 2 columns: just under half-width so the 10px columnGap fits.
      width: '48.5%',
      height: 96,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      padding: 14,
      justifyContent: 'space-between',
    },
    cardSelected: {
      borderWidth: 1.5,
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.selectedBackground,
    },
    cardTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    cardSub: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 17,
      color: theme.colors.textTertiary,
    },
    cardSubSelected: {
      color: theme.colors.textSecondary,
    },
  });
