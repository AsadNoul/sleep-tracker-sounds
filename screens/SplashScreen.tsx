import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import NightprintWordmark from '../components/brand/NightprintWordmark';

const { height } = Dimensions.get('window');

type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Main: undefined;
  Login: undefined;
};

interface SplashScreenProps {
  onFinish?: () => void;
  splashDuration?: number;
}

export default function SplashScreen({ onFinish, splashDuration = 2000 }: SplashScreenProps) {
  const { theme } = useAppTheme();
  const { user, isLoading } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      } else if (!isLoading) {
        if (user) {
          navigation.replace('Main');
        } else {
          navigation.replace('Welcome');
        }
      }
    }, splashDuration);

    return () => clearTimeout(timer);
  }, [user, isLoading, navigation, onFinish, splashDuration]);

  return (
    <View style={[styles(theme).container, { backgroundColor: theme.colors.background }]}>
      <View
        pointerEvents="none"
        style={[
          styles(theme).glow,
          { top: height * 0.24, backgroundColor: theme.colors.accentLight },
        ]}
      />

      <Animated.View
        style={[
          styles(theme).content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <NightprintWordmark size={140} layout="stacked" />

        <View style={styles(theme).textBlock}>
          <Text style={styles(theme).subtitle}>Every night leaves a print.</Text>
        </View>
      </Animated.View>

      <Text style={styles(theme).footerText}>Warm colors only after sunset</Text>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      rowGap: 28,
    },
    glow: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 360,
      borderRadius: 999,
    },
    content: {
      alignItems: 'center',
      justifyContent: 'center',
      rowGap: 28,
    },
    textBlock: {
      alignItems: 'center',
      rowGap: 8,
    },
    title: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 34,
      letterSpacing: -0.4,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    footerText: {
      position: 'absolute',
      bottom: 48,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
  });
