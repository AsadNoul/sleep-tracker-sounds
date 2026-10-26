import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta, CheckBadge } from './stepShared';

// Step 6 of 9 — "How do you usually feel when you wake up?"
//
// Canvas (`App-Feeling.dc.html`): 68px single-select rows, each led by a
// 5-bar energy indicator, then a label + description, with a check badge on the
// selected row.
//
// The canvas shows five options; the real `WAKE_FEELINGS` has four
// (refreshed / okay / tired / exhausted), and that id goes to Supabase as
// `wake_up_feeling`. We render the real four and spread them across the 1-5 bar
// scale. Tapping a row auto-advances (the container applies the original
// 350ms setTimeout).

const TOTAL_BARS = 5;

// Energy level per real feeling id, on the canvas's 1-5 bar scale. The four
// real options are spread over the five slots: exhausted sits at the bottom,
// refreshed at the top.
const FEELING_META: Record<string, { bars: number; description: string }> = {
  exhausted: { bars: 1, description: 'I could sleep for hours more' },
  tired: { bars: 2, description: 'It takes a while to get going' },
  okay: { bars: 3, description: 'Not bad, not great' },
  refreshed: { bars: 5, description: 'Ready for the day' },
};

// Canvas orders the list weakest-to-strongest; the raw data is the reverse.
const DISPLAY_ORDER = ['exhausted', 'tired', 'okay', 'refreshed'];

export interface FeelingOption {
  id: string;
  label: string;
}

interface FeelingStepProps {
  theme: any;
  feelings: readonly FeelingOption[];
  selected: string;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function FeelingStep({
  theme,
  feelings,
  selected,
  onSelect,
  onNext,
  onBack,
  onSkip,
}: FeelingStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);

  // Sort into the canvas's weakest-first order, keeping any unknown id at the end.
  const ordered = [...feelings].sort((a, b) => {
    const ai = DISPLAY_ORDER.indexOf(a.id);
    const bi = DISPLAY_ORDER.indexOf(b.id);
    return (ai === -1 ? DISPLAY_ORDER.length : ai) - (bi === -1 ? DISPLAY_ORDER.length : bi);
  });

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={6} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 6 of 9</Text>
        <Text style={sh.heading}>How do you usually feel when you wake up?</Text>
      </View>

      <View style={s.list} accessibilityRole="radiogroup">
        {ordered.map((feeling) => {
          const isSelected = selected === feeling.id;
          const meta = FEELING_META[feeling.id];
          const litBars = meta?.bars ?? 3;

          return (
            <TouchableOpacity
              key={feeling.id}
              style={[s.row, isSelected && s.rowSelected]}
              onPress={() => onSelect(feeling.id)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
            >
              <View style={s.bars}>
                {Array.from({ length: TOTAL_BARS }).map((_, i) => (
                  <View
                    key={i}
                    style={[s.bar, i < litBars ? s.barLit : s.barDim]}
                  />
                ))}
              </View>

              <View style={s.rowText}>
                <Text style={s.rowLabel}>{feeling.label}</Text>
                {!!meta?.description && (
                  <Text style={s.rowSub}>{meta.description}</Text>
                )}
              </View>

              {isSelected && <CheckBadge theme={theme} checked />}
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
    list: {
      paddingTop: 4,
      rowGap: 10,
    },
    row: {
      minHeight: 68,
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
    bars: {
      flexDirection: 'row',
      columnGap: 3,
    },
    bar: {
      width: 8,
      height: 20,
      borderRadius: 3,
    },
    barLit: {
      backgroundColor: theme.colors.accent,
    },
    barDim: {
      backgroundColor: theme.colors.disabled,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    rowSub: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textTertiary,
    },
  });
