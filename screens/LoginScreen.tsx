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
import { ChevronLeft, Moon, Mail, Lock, Eye, EyeOff, Chrome } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Signup: undefined;
  Onboarding: undefined;
  Main: undefined;
  Welcome: undefined;
  ForgotPassword: undefined;
};

export default function LoginScreen() {
  const { theme, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signIn, signInWithGoogle, completeOnboarding } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSkip = async () => {
    await completeOnboarding();
  };

  const handleLogin = async () => {
    // Trim whitespace from inputs
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(trimmedEmail, trimmedPassword);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to sign in. Please check your credentials.';
      Alert.alert('Sign In Failed', errorMessage);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      Alert.alert('Google Sign-In Failed', 'Failed to sign in with Google');
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
                  style={{ width: 80, height: 80, borderRadius: 20 }} 
                  resizeMode="contain"
                />
              </View>
              <Text style={styles(theme).title}>Welcome Back</Text>
              <Text style={styles(theme).subtitle}>Sign in to your VIP Sleep Suite</Text>
            </View>

            {/* Form */}
            <View style={styles(theme).formContainer}>
              <View style={styles(theme).inputContainer}>
                <View style={styles(theme).inputIconBox}>
                  <Mail size={18} color={theme.colors.accent} />
                </View>
                <TextInput
                  style={styles(theme).input}
                  placeholder="Email address"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles(theme).inputContainer}>
                <View style={styles(theme).inputIconBox}>
                  <Lock size={18} color={theme.colors.accent} />
                </View>
                <TextInput
                  style={styles(theme).input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
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
                    <Eye size={18} color="rgba(255,255,255,0.4)" />
                  ) : (
                    <EyeOff size={18} color="rgba(255,255,255,0.4)" />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles(theme).forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles(theme).forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).loginButton}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.colors.accent, theme.colors.highlight]}
                  style={styles(theme).loginButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <Text style={styles(theme).loginButtonText}>Signing In...</Text>
                  ) : (
                    <Text style={styles(theme).loginButtonText}>Sign In</Text>
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
                    {isGoogleLoading ? 'Signing in with Google...' : 'Sign in with Google'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles(theme).signupContainer}>
                <Text style={styles(theme).signupText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles(theme).signupLink}>Sign Up</Text>
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
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
  },
  inputIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 255, 209, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  eyeIcon: {
    padding: 6,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 22,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  loginButtonGradient: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0A0D1A',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  signupText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.4)',
  },
  signupLink: {
    fontSize: 15,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 40,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
  },
  googleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});
