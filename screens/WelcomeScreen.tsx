import { useAppTheme } from '../hooks/useAppTheme';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Moon, BarChart3, Music, Lightbulb } from 'lucide-react-native';
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
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary, theme.colors.background]}
        style={styles(theme).gradient}
      >
        <View style={styles(theme).content}>
          {/* Logo and Icon */}
          <View style={styles(theme).logoContainer}>
            <View style={styles(theme).iconCircle}>
              <Image 
                source={require('../assets/app_logo.png')} 
                style={{ width: 100, height: 100, borderRadius: 25 }} 
                resizeMode="contain"
              />
            </View>
            <Text style={styles(theme).appName}>Sleep Architect</Text>
            <Text style={styles(theme).tagline}>Your VIP Personalized Sleep Intelligence</Text>
          </View>

          {/* Features Preview */}
          <View style={styles(theme).featuresPreview}>
            <View style={styles(theme).featureItem}>
              <BarChart3 size={24} color={theme.colors.accent} />
              <Text style={styles(theme).featureText}>Track Sleep Quality</Text>
            </View>
            <View style={styles(theme).featureItem}>
              <Music size={24} color="#33C6FF" />
              <Text style={styles(theme).featureText}>Relaxing Sounds</Text>
            </View>
            <View style={styles(theme).featureItem}>
              <Lightbulb size={24} color="#FFD700" />
              <Text style={styles(theme).featureText}>Smart Recommendations</Text>
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
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 100,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  featuresPreview: {
    marginVertical: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    rowGap: 16, columnGap: 16,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.background,
  },
  secondaryButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
