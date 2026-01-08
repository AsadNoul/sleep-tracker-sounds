import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
};

export default function WelcomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { completeOnboarding } = useAuth();

  const handleSkip = async () => {
    await completeOnboarding();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F111A', '#1B1D2A', '#0F111A']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo and Icon */}
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="moon" size={80} color="#00FFD1" />
            </View>
            <Text style={styles.appName}>SleepTracker</Text>
            <Text style={styles.tagline}>Your Personal Sleep Companion</Text>
          </View>

          {/* Features Preview */}
          <View style={styles.featuresPreview}>
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={24} color="#00FFD1" />
              <Text style={styles.featureText}>Track Sleep Quality</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="musical-notes" size={24} color="#33C6FF" />
              <Text style={styles.featureText}>Relaxing Sounds</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="bulb" size={24} color="#FFD700" />
              <Text style={styles.featureText}>Smart Recommendations</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#00FFD1', '#33C6FF']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Continue as Guest (Free)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F111A',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 50,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 209, 0.3)',
  },
  appName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#A0AEC0',
    fontWeight: '500',
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
    color: '#FFFFFF',
    marginLeft: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 16,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00FFD1',
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
    color: '#0F111A',
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
    color: '#00FFD1',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#A0AEC0',
  },
});
