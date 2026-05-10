import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, User, Mail, Lock, Eye, EyeOff, Chrome } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export default function SignupScreen() {
  const { theme, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signUp, signInWithGoogle, completeOnboarding } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleSignup = async () => {
    // Trim whitespace from inputs
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (trimmedPassword.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      await signUp(trimmedName, trimmedEmail, trimmedPassword);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create account. Please try again.';
      Alert.alert('Sign Up Failed', errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', getErrorMessage(error));
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary, theme.colors.background]}
        style={styles(theme).gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles(theme).keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles(theme).scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles(theme).header}>
              <TouchableOpacity
                style={styles(theme).backButton}
                onPress={() => navigation.goBack()}
              >
                <ChevronLeft size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Logo */}
            <View style={styles(theme).logoContainer}>
              <View style={styles(theme).iconCircle}>
                <Image
                  source={require('../assets/app_logo.png')}
                  style={{ width: 90, height: 90 }}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles(theme).title}>Create Account</Text>
              <Text style={styles(theme).subtitle}>Start your journey to better sleep</Text>
            </View>

            {/* Form */}
            <View style={styles(theme).formContainer}>
              <BlurView intensity={20} tint="dark" style={styles(theme).inputContainer}>
                <User size={20} color={theme.colors.textSecondary} style={styles(theme).inputIcon} />
                <TextInput
                  style={styles(theme).input}
                  placeholder="Full Name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </BlurView>

              <BlurView intensity={20} tint="dark" style={styles(theme).inputContainer}>
                <Mail size={20} color={theme.colors.textSecondary} style={styles(theme).inputIcon} />
                <TextInput
                  style={styles(theme).input}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </BlurView>

              <BlurView intensity={20} tint="dark" style={styles(theme).inputContainer}>
                <Lock size={20} color={theme.colors.textSecondary} style={styles(theme).inputIcon} />
                <TextInput
                  style={styles(theme).input}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles(theme).eyeIcon}
                >
                  {showPassword ? (
                    <Eye size={20} color={theme.colors.textSecondary} />
                  ) : (
                    <EyeOff size={20} color={theme.colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </BlurView>

              <View style={styles(theme).termsContainer}>
                <Text style={styles(theme).termsText}>
                  By signing up, you agree to our{' '}
                  <Text style={styles(theme).termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles(theme).termsLink}>Privacy Policy</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles(theme).signupButton}
                onPress={handleSignup}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.colors.accent, theme.colors.highlight]}
                  style={styles(theme).signupButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <Text style={styles(theme).signupButtonText}>Creating Account...</Text>
                  ) : (
                    <Text style={styles(theme).signupButtonText}>Sign Up</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Social Login Divider */}
              <View style={styles(theme).divider}>
                <View style={styles(theme).dividerLine} />
                <Text style={styles(theme).dividerText}>OR CONTINUE WITH</Text>
                <View style={styles(theme).dividerLine} />
              </View>

              {/* Google Sign-In Button */}
              <TouchableOpacity
                style={styles(theme).googleButton}
                onPress={handleGoogleSignIn}
                disabled={isGoogleLoading}
                activeOpacity={0.9}
              >
                <View style={styles(theme).googleButtonContent}>
                  <Chrome size={24} color={theme.colors.textPrimary} />
                  <Text style={styles(theme).googleButtonText}>
                    {isGoogleLoading ? 'Signing in with Google...' : 'Sign up with Google'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles(theme).loginContainer}>
                <Text style={styles(theme).loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles(theme).loginLink}>Sign In</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles(theme).skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles(theme).skipButtonText}>Continue as Guest (Free)</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
}

const getErrorMessage = (error: any) => {
  if (error?.message) return error.message;
  return 'An error occurred';
};

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    paddingTop: 60,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    overflow: 'hidden',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  eyeIcon: {
    padding: 4,
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  signupButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  signupButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.background,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginHorizontal: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    rowGap: 12, columnGap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  loginLink: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
