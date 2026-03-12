import React, { useEffect } from 'react';
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
  },
  logoWrapper: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
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
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  line: {
    width: 40,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  subtitle: {
    fontSize: 14,
    color: '#00FFD1',
    letterSpacing: 4,
    fontWeight: '700',
    opacity: 0.9,
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