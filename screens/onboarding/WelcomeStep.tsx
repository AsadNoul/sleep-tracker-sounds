import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import NightprintLogo from '../../components/brand/NightprintLogo';
import { useAppTheme } from '../../hooks/useAppTheme';

// Onboarding step -1 — the very first screen. No header chrome (no back
// button, no progress bar), per the canvas: the brand mark carries the screen.
//
// This replaces the old marketing hero (hero image, star rating, feature
// cards, avatar row). The new design is deliberately much simpler.

interface WelcomeStepProps {
  theme: any;
  /** "Get started" — advances to the Preset step. */
  onNext: () => void;
  /** "I already have an account" — goes to Login. */
  onLogin: () => void;
}

export default function WelcomeStep({ theme, onNext, onLogin }: WelcomeStepProps) {
  const s = styles(theme);
  const { isDark } = useAppTheme();

  return (
    <View style={s.container}>
      <View pointerEvents="none" style={s.glow} />

      <View style={s.content}>
        <NightprintLogo size={200} variant={isDark ? 'dark' : 'light'} />

        <View style={s.textBlock}>
          <Text style={s.heading}>Every night{'\n'}leaves a print</Text>
          <Text style={s.body}>
            Track your sleep, wind down with sound, and wake up to a Morning Report. Warm
            colors only, so the app never keeps you up.
          </Text>
        </View>
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={s.primaryButton}
          onPress={onNext}
          activeOpacity={0.9}
          accessibilityRole="button"
        >
          <Text style={s.primaryButtonText}>Get started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryButton}
          onPress={onLogin}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={s.secondaryButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 72,
      paddingHorizontal: 24,
      paddingBottom: 48,
      alignItems: 'center',
    },
    // Canvas: a soft radial glow behind the mark. RN has no radial gradient
    // primitive, so this approximates it with the accentLight token on a
    // heavily-rounded block.
    glow: {
      position: 'absolute',
      left: -40,
      right: -40,
      top: 20,
      height: 420,
      borderRadius: 999,
      backgroundColor: theme.colors.accentLight,
    },
    content: {
      alignItems: 'center',
    },
    textBlock: {
      alignItems: 'center',
      marginTop: 40,
      rowGap: 12,
    },
    heading: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -0.68,
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    body: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      maxWidth: 300,
      color: theme.colors.textSecondary,
    },
    actions: {
      marginTop: 'auto',
      width: '100%',
      rowGap: 12,
    },
    primaryButton: {
      height: 60,
      borderRadius: 20,
      backgroundColor: theme.colors.ctaBackground,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.ctaBackground,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.24,
      shadowRadius: 18,
      elevation: 6,
    },
    primaryButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 17,
      color: theme.colors.background,
    },
    secondaryButton: {
      height: 56,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
  });
