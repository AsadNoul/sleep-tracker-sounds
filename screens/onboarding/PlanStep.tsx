import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Waves, AlarmClock, Moon } from 'lucide-react-native';
import { toDisplayString, shiftTime } from './timeUtils';

// The final screen (old step 8) — "Your sleep plan".
//
// Canvas (`App-Plan.dc.html`): no header chrome; an "All set" eyebrow, a
// Fraunces h1, a 3-column stat row (Wind down / Bedtime / Wake up), a two-row
// feature-preview card, a highlighted Sleep-Mode callout, then two stacked
// buttons ("Save my plan" solid, "Continue as guest" text).
//
// This screen is STATIC. The old 3-second artificial progress-bar animation is
// gone: it was arbitrary padding, not tied to real latency. The real async work
// (AsyncStorage + Supabase write + reloadProfile) happens AFTER the final tap
// and is covered by `isSubmitting` on the buttons plus the container's
// celebration overlay.
//
// Both buttons call the same `onComplete` — the original `handleComplete`
// already branches internally on `user && user.id !== 'guest'` to decide
// Supabase-direct-write vs navigate-to-Welcome-for-signup. No new navigation
// logic is invented here.
//
// The canvas's heading reads "Your sleep plan, Asad", but onboarding collects
// no name field anywhere, so the name is only appended when the container can
// supply one (it currently cannot, so the heading renders as "Your sleep plan").

interface PlanStepProps {
  theme: any;
  bedTime: string;
  wakeUpTime: string;
  /** Optional display name; omitted entirely when unavailable. */
  name?: string;
  /** Both buttons call this — see note above. */
  onComplete: () => void;
  isSubmitting: boolean;
}

/** Wind-down starts 45 minutes before bedtime, matching the canvas's example
 *  (10:45 PM wind down for an 11:30 PM bedtime). */
const WIND_DOWN_OFFSET_MINUTES = -45;

export default function PlanStep({
  theme,
  bedTime,
  wakeUpTime,
  name,
  onComplete,
  isSubmitting,
}: PlanStepProps) {
  const s = styles(theme);
  const windDown = shiftTime(bedTime, WIND_DOWN_OFFSET_MINUTES);

  const stats = [
    { label: 'Wind down', value: toDisplayString(windDown) },
    { label: 'Bedtime', value: toDisplayString(bedTime) },
    { label: 'Wake up', value: toDisplayString(wakeUpTime) },
  ];

  return (
    <View style={s.screen}>
      <View style={s.titleBlock}>
        <Text style={s.eyebrow}>All set</Text>
        <Text style={s.heading}>
          {name ? `Your sleep plan, ${name}` : 'Your sleep plan'}
        </Text>
        <Text style={s.subtitle}>
          Built from your answers. You can change it any time.
        </Text>
      </View>

      <View style={s.statCard}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={[s.statColumn, index > 0 && s.statColumnDivided]}
          >
            <Text style={s.statLabel}>{stat.label}</Text>
            <Text style={s.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>

      <View style={s.featureCard}>
        <View style={[s.featureRow, s.featureRowDivided]}>
          <View style={s.featureIcon}>
            <Waves size={18} color={theme.colors.accent} strokeWidth={2} />
          </View>
          <View style={s.featureText}>
            <Text style={s.featureTitle}>Fall asleep faster</Text>
            <Text style={s.featureSub}>5-minute 4-7-8 breathing at wind-down</Text>
          </View>
        </View>

        <View style={s.featureRow}>
          <View style={s.featureIcon}>
            <AlarmClock size={18} color={theme.colors.accent} strokeWidth={2} />
          </View>
          <View style={s.featureText}>
            <Text style={s.featureTitle}>Wake up rested</Text>
            <Text style={s.featureSub}>Gentle alarm with a 20-minute window</Text>
          </View>
        </View>
      </View>

      <View style={s.highlightCard}>
        <View pointerEvents="none" style={s.highlightGlow} />
        <View style={s.highlightIcon}>
          <Moon size={18} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </View>
        <View style={s.highlightText}>
          <Text style={s.highlightTitle}>Sleep Mode turns on at sunset</Text>
          <Text style={s.highlightBody}>
            The app switches to warm amber colors with no blue light, so checking it at
            night won't wake you up.
          </Text>
        </View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.primaryButton, isSubmitting && s.primaryButtonBusy]}
          onPress={onComplete}
          activeOpacity={0.9}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text style={s.primaryButtonText}>Save my plan</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryButton}
          onPress={onComplete}
          activeOpacity={0.7}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
        >
          <Text style={[s.secondaryButtonText, isSubmitting && s.secondaryTextBusy]}>
            Continue as guest
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingTop: 40,
      paddingHorizontal: 20,
      paddingBottom: 40,
      rowGap: 16,
    },
    titleBlock: {
      rowGap: 8,
    },
    eyebrow: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
    },
    heading: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.64,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    statCard: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: 24,
      padding: 18,
    },
    statColumn: {
      flex: 1,
      rowGap: 2,
    },
    statColumnDivided: {
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.cardBorder,
      paddingLeft: 12,
    },
    statLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    statValue: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 18,
      color: theme.colors.textPrimary,
    },
    featureCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 6,
    },
    featureRow: {
      minHeight: 60,
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 14,
      paddingVertical: 10,
    },
    featureRowDivided: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    featureIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: {
      flex: 1,
    },
    featureTitle: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    featureSub: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textTertiary,
    },
    highlightCard: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: 24,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 14,
    },
    // Approximates the canvas's radial corner glow with the accentLight token.
    highlightGlow: {
      position: 'absolute',
      right: -40,
      top: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: theme.colors.accentLight,
    },
    highlightIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.colors.navActiveBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    highlightText: {
      flex: 1,
      rowGap: 4,
    },
    highlightTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    highlightBody: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    actions: {
      marginTop: 'auto',
      rowGap: 12,
    },
    primaryButton: {
      height: 60,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonBusy: {
      opacity: 0.8,
    },
    primaryButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 17,
      color: theme.colors.background,
    },
    secondaryButton: {
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    secondaryTextBusy: {
      opacity: 0.5,
    },
  });
