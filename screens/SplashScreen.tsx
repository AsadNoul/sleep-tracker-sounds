import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';

const { width, height } = Dimensions.get('window');

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

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const textAnim = React.useRef(new Animated.Value(15)).current;
  const glowPulse = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Glow ring pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.6, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

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
      Animated.timing(textAnim, {
        toValue: 0,
        duration: 400,
        delay: 150,
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
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary || '#1B1D2A', theme.colors.background]}
        style={styles(theme).gradient}
      >

        <Animated.View
          style={[
            styles(theme).content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles(theme).logoContainer}>
            {/* Outer glow ring */}
            <Animated.View style={[styles(theme).glowRingOuter, { opacity: glowPulse, transform: [{ scale: glowPulse }] }]} />
            {/* Inner glow ring */}
            <Animated.View style={[styles(theme).glowRingInner, { opacity: glowPulse }]} />
            <View style={styles(theme).logoWrapper}>
              <Image
                source={require('../assets/app_logo.png')}
                style={styles(theme).logoImage}
                resizeMode="contain"
              />
            </View>

            <Animated.View style={{ transform: [{ translateY: textAnim }], alignItems: 'center' }}>
              <Text style={styles(theme).title}>Sleep Architect</Text>
              <View style={styles(theme).subtitleContainer}>
                <View style={styles(theme).line} />
                <Text style={styles(theme).subtitle}>VIP SLEEP SUITE</Text>
                <View style={styles(theme).line} />
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        <View style={styles(theme).footer}>
          <Text style={styles(theme).footerText}>EST. 2025  VERSION 2.1.0</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRingOuter: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    top: -40,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
  },
  glowRingInner: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(139, 92, 246, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.2)',
    top: -15,
  },
  logoWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 15,
  },
  logoImage: {
    width: 180,
    height: 180,
    borderRadius: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(139, 92, 246, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  line: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(201, 162, 39, 0.5)',
  },
  subtitle: {
    fontSize: 13,
    color: '#C9A227',
    letterSpacing: 5,
    fontWeight: '800',
    opacity: 0.95,
    marginHorizontal: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 60,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    letterSpacing: 3,
    fontWeight: '600',
  },
});