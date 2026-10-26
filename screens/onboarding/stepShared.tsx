import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Check } from 'lucide-react-native';

// Small shared primitives for the onboarding step screens. Every numbered
// canvas screen repeats the same three elements verbatim — an uppercase
// "Step N of 9" label above a Fraunces h1 (+ optional subtitle), a round
// check-badge on selectable rows, and a full-width 60px accent CTA at the
// bottom — so they live here once rather than in all nine files.

export const stepShared = (theme: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
      rowGap: 16,
    },
    titleBlock: {
      paddingTop: 12,
      rowGap: 8,
    },
    stepLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
    },
    heading: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 30,
      lineHeight: 35,
      letterSpacing: -0.6,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    // Informational callout row (lightbulb/lock icon + copy) used on the
    // Consistency and Health screens.
    callout: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 10,
      paddingHorizontal: 2,
      paddingVertical: 4,
    },
    calloutText: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textSecondary,
    },
  });

/** The 26px circular check badge on single/multi-select rows. */
export function CheckBadge({ theme, checked }: { theme: any; checked: boolean }) {
  const s = badgeStyles(theme);
  if (!checked) {
    return <View style={s.empty} />;
  }
  return (
    <View style={s.filled}>
      <Check size={14} color={theme.colors.background} strokeWidth={3} />
    </View>
  );
}

/** The 24px square checkbox used on the Health screen's rows. */
export function CheckSquare({ theme, checked }: { theme: any; checked: boolean }) {
  const s = badgeStyles(theme);
  if (!checked) {
    return <View style={s.squareEmpty} />;
  }
  return (
    <View style={s.squareFilled}>
      <Check size={14} color={theme.colors.background} strokeWidth={3} />
    </View>
  );
}

const badgeStyles = (theme: any) =>
  StyleSheet.create({
    empty: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: theme.colors.accentBorder,
    },
    filled: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    squareEmpty: {
      width: 24,
      height: 24,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: theme.colors.accentBorder,
    },
    squareFilled: {
      width: 24,
      height: 24,
      borderRadius: 7,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

interface PrimaryCtaProps {
  theme: any;
  label: string;
  onPress: () => void;
  /** Pushes the button to the bottom of a flex column. Default true. */
  pinToBottom?: boolean;
  disabled?: boolean;
  /** Renders a spinner in place of the label (used while submitting). */
  loading?: boolean;
}

/** Full-width 60px accent CTA — the canvas's bottom button on every step. */
export function PrimaryCta({
  theme,
  label,
  onPress,
  pinToBottom = true,
  disabled = false,
  loading = false,
}: PrimaryCtaProps) {
  const s = ctaStyles(theme);
  return (
    <TouchableOpacity
      style={[
        s.cta,
        pinToBottom && s.pinned,
        (disabled || loading) && s.ctaDisabled,
      ]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.background} />
      ) : (
        <Text style={s.ctaText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const ctaStyles = (theme: any) =>
  StyleSheet.create({
    cta: {
      height: 60,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinned: {
      marginTop: 'auto',
    },
    ctaDisabled: {
      opacity: 0.6,
    },
    ctaText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 17,
      color: theme.colors.background,
    },
  });
