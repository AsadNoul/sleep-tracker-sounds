import { useAppTheme } from '../hooks/useAppTheme';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, Music, Lightbulb, Moon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
};

export default function WelcomeScreen() {
  const { theme, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { completeOnboarding } = useAuth();

  const handleSkip = async () => {
    await completeOnboarding();
  };

  return (
    <View style={styles(theme).container}>
      {/* Hero image — right side, top half, with fade gradients */}
      <View style={styles(theme).heroImageContainer}>
        <Image
          source={require('../assets/onboarding_hero.png')}
          style={styles(theme).heroImage}
          resizeMode="cover"
        />
        {/* Fade left edge so image blends into dark background */}
        <LinearGradient
          colors={['#0A0D1A', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles(theme).heroFadeLeft}
        />
        {/* Fade bottom edge */}
        <LinearGradient
          colors={['transparent', '#0A0D1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles(theme).heroFadeBottom}
        />
      </View>

      {/* Moon icon floating top-right */}
      <View style={styles(theme).moonBadge}>
        <Moon size={28} color="#A78BFA" fill="#A78BFA" />
      </View>

      {/* Main content — sits on top of dark bg */}
      <View style={styles(theme).content}>
        {/* Top text section — left aligned, clear dark bg */}
        <View style={styles(theme).topSection}>
          <Text style={styles(theme).appName}>Sleep Tracker</Text>
          <Text style={styles(theme).tagline}>Your VIP Personalized{'\n'}Sleep Intelligence</Text>
        </View>

        {/* Features Preview */}
        <View style={styles(theme).featuresPreview}>
          <View style={styles(theme).featureItem}>
            <View style={[styles(theme).featureIconBox, { backgroundColor: 'rgba(0, 255, 209, 0.12)' }]}>
              <BarChart3 size={22} color={theme.colors.accent} />
            </View>
            <View style={styles(theme).featureTextGroup}>
              <Text style={styles(theme).featureText}>Track Sleep Quality</Text>
              <Text style={styles(theme).featureSubText}>AI-powered insights nightly</Text>
            </View>
          </View>
          <View style={styles(theme).featureItem}>
            <View style={[styles(theme).featureIconBox, { backgroundColor: 'rgba(51, 198, 255, 0.12)' }]}>
              <Music size={22} color="#33C6FF" />
            </View>
            <View style={styles(theme).featureTextGroup}>
              <Text style={styles(theme).featureText}>Relaxing Sounds</Text>
              <Text style={styles(theme).featureSubText}>Nature, white noise & more</Text>
            </View>
          </View>
          <View style={styles(theme).featureItem}>
            <View style={[styles(theme).featureIconBox, { backgroundColor: 'rgba(255, 215, 0, 0.12)' }]}>
              <Lightbulb size={22} color="#FFD700" />
            </View>
            <View style={styles(theme).featureTextGroup}>
              <Text style={styles(theme).featureText}>Smart Recommendations</Text>
              <Text style={styles(theme).featureSubText}>Personalized to your sleep profile</Text>
            </View>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles(theme).buttonContainer}>
          <TouchableOpacity
            style={styles(theme).primaryButton}
            onPress={() => navigation.navigate('Signup')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.highlight]}
              style={styles(theme).buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles(theme).primaryButtonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(theme).secondaryButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles(theme).secondaryButtonText}>I Already Have an Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles(theme).skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles(theme).skipButtonText}>Continue as Guest (Free)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0D1A',
  },
  // Hero image: right half of screen, top 55%
  heroImageContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: '58%',
    height: '52%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '55%',
  },
  heroFadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  moonBadge: {
    position: 'absolute',
    top: 52,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A78BFA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 48,
  },
  topSection: {
    marginTop: 0,
    // text lives in the top-left, image is top-right — no overlap
    maxWidth: '60%',
  },
  appName: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 10,
    lineHeight: 44,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
    letterSpacing: 0.2,
    lineHeight: 22,
  },
  featuresPreview: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  featureIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextGroup: {
    marginLeft: 14,
    flex: 1,
  },
  featureText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  featureSubText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  buttonContainer: {
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A0D1A',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.35)',
  },
});
