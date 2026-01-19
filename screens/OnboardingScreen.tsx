import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Moon,
  Clock,
  Heart,
  Star,
  Sun,
  Calendar,
  CheckCircle,
  Circle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Activity,
  Zap,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  Stethoscope,
  Briefcase,
  Sparkles,
  Edit3
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PROFESSIONAL_PRESETS = [
  {
    id: 'healthcare',
    title: 'Healthcare Worker',
    subtitle: 'Doctors, nurses, medical staff',
    icon: Stethoscope,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&q=80',
    gradient: ['#8B5CF6', '#6366F1'] as [string, string],
    autoSelect: {
      sleepGoals: ['shift_work_support', 'recovery', 'reduce_stress'],
      sleepTroubles: ['shift_work', 'irregular_schedule', 'anxiety'],
      profession: 'Healthcare',
    },
  },
  {
    id: 'night_shift',
    title: 'Night Shift Worker',
    subtitle: 'Security, factories, logistics',
    icon: Moon,
    image: 'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=400&h=400&fit=crop&q=80',
    gradient: ['#3B82F6', '#2DD4BF'] as [string, string],
    autoSelect: {
      sleepGoals: ['shift_work_support', 'establish_routine', 'improve_quality'],
      sleepTroubles: ['shift_work', 'wake_too_early', 'not_refreshed'],
      profession: 'Night Shift',
    },
  },
  {
    id: 'insomnia',
    title: 'I Have Insomnia',
    subtitle: 'Chronic sleep difficulties',
    icon: AlertTriangle,
    image: 'https://img.freepik.com/free-photo/annoyed-young-man-lying-bed-covering-ears-with-pillow_171337-5158.jpg',
    gradient: ['#EC4899', '#8B5CF6'] as [string, string],
    autoSelect: {
      sleepGoals: ['fall_asleep_faster', 'sleep_longer', 'reduce_stress'],
      sleepTroubles: ['trouble_falling_asleep', 'wake_during_night', 'anxiety'],
    },
  },
  {
    id: 'custom',
    title: 'Custom Setup',
    subtitle: 'I\'ll answer all questions',
    icon: Sparkles,
    image: 'https://img.freepik.com/free-photo/young-blonde-woman-isolated-purple-wall-unhappy-suffering-from-insomnia_1368-134061.jpg',
    gradient: ['#10B981', '#14B8A6'] as [string, string],
    autoSelect: null,
  },
];

type RootStackParamList = {
  Welcome: undefined;
  Signup: undefined;
  Login: undefined;
};

interface OnboardingData {
  preset?: string;
  sleepGoals: string[];
  sleepTroubles: string[];
  sleepPattern: string;
  averageSleepHours: number;
  wakeUpFeeling: string;
  age: string;
  gender: string;
  healthConditions: string[];
  bedTime: string;
  wakeUpTime: string;
  profession?: string;
}

const SLEEP_GOALS = [
  { id: 'fall_asleep_faster', label: 'Fall asleep faster', icon: Moon, emoji: '😴' },
  { id: 'sleep_longer', label: 'Sleep longer', icon: Clock, emoji: '⏰' },
  { id: 'reduce_stress', label: 'Reduce stress', icon: Heart, emoji: '😌' },
  { id: 'improve_quality', label: 'Improve sleep quality', icon: Star, emoji: '⭐' },
  { id: 'wake_refreshed', label: 'Wake up refreshed', icon: Sun, emoji: '☀️' },
  { id: 'establish_routine', label: 'Establish routine', icon: Calendar, emoji: '📅' },
  { id: 'shift_work_support', label: 'Manage shift work', icon: Activity, emoji: '🌙' },
  { id: 'recovery', label: 'Better recovery', icon: TrendingUp, emoji: '💪' },
];

const SLEEP_TROUBLES = [
  { id: 'trouble_falling_asleep', label: 'Trouble falling asleep', emoji: '😴' },
  { id: 'wake_during_night', label: 'Wake up during night', emoji: '🌙' },
  { id: 'wake_too_early', label: 'Wake up too early', emoji: '⏰' },
  { id: 'not_refreshed', label: 'Don\'t feel refreshed', emoji: '😫' },
  { id: 'snoring', label: 'Snoring', emoji: '💤' },
  { id: 'anxiety', label: 'Anxiety/Racing thoughts', emoji: '😰' },
  { id: 'shift_work', label: 'Shift work sleep issues', emoji: '🌗' },
  { id: 'irregular_schedule', label: 'Irregular work schedule', emoji: '📅' },
];

const SLEEP_PATTERNS = [
  { id: 'consistent', label: 'Very consistent', icon: CheckCircle },
  { id: 'somewhat_consistent', label: 'Somewhat consistent', icon: Circle },
  { id: 'irregular', label: 'Irregular schedule', icon: AlertTriangle },
];

const WAKE_FEELINGS = [
  { id: 'refreshed', label: 'Refreshed & energized', emoji: '😊' },
  { id: 'okay', label: 'Okay, but not great', emoji: '😐' },
  { id: 'tired', label: 'Tired & groggy', emoji: '😴' },
  { id: 'exhausted', label: 'Exhausted', emoji: '😩' },
];

const HEALTH_CONDITIONS = [
  { id: 'none', label: 'None' },
  { id: 'sleep_apnea', label: 'Sleep apnea' },
  { id: 'insomnia', label: 'Insomnia' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'depression', label: 'Depression' },
  { id: 'chronic_pain', label: 'Chronic pain' },
  { id: 'other', label: 'Other' },
];

export default function OnboardingScreen() {
  const { theme, isDark } = useAppTheme();
  const { user, completeOnboarding, reloadProfile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentStep, setCurrentStep] = useState(-1); // Start at -1 for welcome screen
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    preset: undefined,
    sleepGoals: [],
    sleepTroubles: [],
    sleepPattern: '',
    averageSleepHours: 7.5, // Smart default
    wakeUpFeeling: '',
    age: '30', // Smart default
    gender: '',
    healthConditions: [],
    bedTime: '22:30', // Smart default
    wakeUpTime: '07:00', // Smart default
    profession: undefined,
  });

  const totalSteps = 9; // Total visible steps for user (Welcome through Analysis)
  const actualStep = currentStep + 2; // Convert -1 to 1, 0 to 2, etc.
  const progress = (actualStep / totalSteps) * 100;

  // Animate progress bar on step 8 (analysis screen)
  useEffect(() => {
    if (currentStep === 8) {
      setAnalysisProgress(0);
      setShowCompleteButton(false);

      // Animate from 0 to 100 in 3 seconds
      const duration = 3000;
      const steps = 60;
      const increment = 100 / steps;
      const interval = duration / steps;

      let currentProgress = 0;
      const timer = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= 100) {
          setAnalysisProgress(100);
          setShowCompleteButton(true);
          clearInterval(timer);
        } else {
          setAnalysisProgress(currentProgress);
        }
      }, interval);

      return () => clearInterval(timer);
    }
  }, [currentStep]);

  const toggleSelection = (field: keyof OnboardingData, value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentValues = onboardingData[field] as string[];
    if (Array.isArray(currentValues)) {
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      setOnboardingData({ ...onboardingData, [field]: newValues });
    }
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setTimeout(callback, 150);
  };

  const handlePresetSelect = (presetId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const preset = PROFESSIONAL_PRESETS.find(p => p.id === presetId);
    
    if (preset && preset.autoSelect) {
      setOnboardingData({
        ...onboardingData,
        preset: presetId,
        sleepGoals: preset.autoSelect.sleepGoals || [],
        sleepTroubles: preset.autoSelect.sleepTroubles || [],
        profession: preset.autoSelect.profession,
      });
    } else {
      setOnboardingData({ ...onboardingData, preset: presetId });
    }
    
    animateTransition(() => setCurrentStep(1));
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Welcome screen (-1) and Preset screen (0) have no validation
    if (currentStep === -1 || currentStep === 0) {
      animateTransition(() => setCurrentStep(currentStep + 1));
      return;
    }
    
    // Validation for each step
    switch (currentStep) {
      case 1: // Sleep goals
        if (onboardingData.sleepGoals.length === 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Please select at least one sleep goal');
          return;
        }
        break;
      case 2: // Sleep troubles
        if (onboardingData.sleepTroubles.length === 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Please select at least one sleep issue');
          return;
        }
        break;
      case 3: // Sleep pattern
        if (!onboardingData.sleepPattern) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Please select your sleep pattern');
          return;
        }
        break;
      case 4: // Average sleep hours - no validation needed, has default
        break;
      case 5: // Wake up feeling
        if (!onboardingData.wakeUpFeeling) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Please select how you typically feel');
          return;
        }
        break;
      case 6: // Age
        if (!onboardingData.age) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Please enter your age');
          return;
        }
        break;
      case 7: // Health conditions
        if (onboardingData.healthConditions.length === 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Please select at least one option');
          return;
        }
        break;
      case 8: // Analysis screen - no validation
        break;
    }

    if (currentStep < totalSteps - 1) {
      animateTransition(() => setCurrentStep(currentStep + 1));
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > -1) {
      animateTransition(() => setCurrentStep(currentStep - 1));
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    // Show celebration
    setShowCelebration(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    try {
      // Save onboarding data temporarily to AsyncStorage
      await AsyncStorage.setItem('@onboarding_data', JSON.stringify(onboardingData));

      if (user && user.id !== 'guest') {
        // If user is already logged in (e.g. via Google), save directly to Supabase
        const { error } = await supabase
          .from('user_profiles')
          .update({
            age: parseInt(onboardingData.age) || null,
            gender: onboardingData.gender,
            sleep_goals: onboardingData.sleepGoals,
            sleep_troubles: onboardingData.sleepTroubles,
            sleep_pattern: onboardingData.sleepPattern,
            average_sleep_hours: Math.round(onboardingData.averageSleepHours),
            wake_up_feeling: onboardingData.wakeUpFeeling,
            health_conditions: onboardingData.healthConditions,
            preferred_bed_time: onboardingData.bedTime,
            preferred_wake_time: onboardingData.wakeUpTime,
            onboarding_completed_at: new Date().toISOString(),
            // New fields for enhanced onboarding
            onboarding_preset: onboardingData.preset || null,
            profession: onboardingData.profession || null,
            onboarding_version: 2, // Version 2 includes professional presets
          })
          .eq('id', user.id);

        if (error) throw error;
        
        // Update local state
        await completeOnboarding();
        await reloadProfile();
        
        // Wait for celebration before navigating
        setTimeout(() => {
          // Navigation handled by completeOnboarding
        }, 1500);
      } else {
        // Navigate to Welcome screen for signup/login after celebration
        setTimeout(() => {
          navigation.navigate('Welcome');
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setIsSubmitting(false);
      setShowCelebration(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      // Welcome Screen
      case -1:
        return (
          <View style={styles(theme).welcomeContainer}>
            <Sparkles size={60} color={theme.colors.accent} />
            <Text style={styles(theme).welcomeTitle}>Welcome to{'\n'}Sleep Architect</Text>
            <Text style={styles(theme).welcomeSubtitle}>
              Join 50,000+ users who improved their sleep quality
            </Text>
            <View style={styles(theme).welcomeBenefits}>
              <View style={styles(theme).benefitItem}>
                <CheckCircle size={24} color={theme.colors.accent} />
                <Text style={styles(theme).benefitText}>Personalized sleep insights</Text>
              </View>
              <View style={styles(theme).benefitItem}>
                <CheckCircle size={24} color={theme.colors.accent} />
                <Text style={styles(theme).benefitText}>Science-backed techniques</Text>
              </View>
              <View style={styles(theme).benefitItem}>
                <CheckCircle size={24} color={theme.colors.accent} />
                <Text style={styles(theme).benefitText}>Built for shift workers</Text>
              </View>
            </View>
            <Text style={styles(theme).timeEstimate}>⏱️ Takes only 2 minutes</Text>
          </View>
        );

      // Professional Preset Screen
      case 0:
        return (
          <View style={styles(theme).stepContainer}>
            <Text style={styles(theme).stepTitle}>Choose Your Profile</Text>
            <Text style={styles(theme).stepSubtitle}>We'll customize your experience based on your needs</Text>
            <View style={styles(theme).presetsContainer}>
              {PROFESSIONAL_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={styles(theme).presetCard}
                  onPress={() => handlePresetSelect(preset.id)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: preset.image }}
                    style={styles(theme).presetBackgroundImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles(theme).presetBlurOverlay}
                  >
                    <View style={styles(theme).presetTextContainer}>
                      <Text style={styles(theme).presetTitle}>{preset.title}</Text>
                      <Text style={styles(theme).presetSubtitle}>{preset.subtitle}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Image
                source={require('../assets/onboarding/step1_sleep_goals.png')}
                style={styles(theme).iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles(theme).stepTitle}>What are your sleep goals?</Text>
            <Text style={styles(theme).stepSubtitle}>Perfect for shift workers, healthcare professionals, and anyone with disrupted sleep</Text>
            <View style={styles(theme).optionsContainer}>
              {SLEEP_GOALS.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles(theme).optionCard,
                    onboardingData.sleepGoals.includes(goal.id) && styles(theme).optionCardSelected,
                  ]}
                  onPress={() => toggleSelection('sleepGoals', goal.id)}
                >
                  <Text style={styles(theme).goalEmoji}>{goal.emoji}</Text>
                  <Text
                    style={[
                      styles(theme).optionText,
                      onboardingData.sleepGoals.includes(goal.id) && styles(theme).optionTextSelected,
                    ]}
                  >
                    {goal.label}
                  </Text>
                  {onboardingData.sleepGoals.includes(goal.id) && (
                    <CheckCircle size={20} color={theme.colors.accent} style={{ position: 'absolute', top: 8, right: 8 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Image
                source={require('../assets/onboarding/step2_sleep_troubles.png')}
                style={styles(theme).iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles(theme).stepTitle}>What sleep challenges do you face?</Text>
            <Text style={styles(theme).stepSubtitle}>Whether you work shifts, long hours, or have irregular schedules - we're here to help</Text>
            <View style={styles(theme).optionsContainer}>
              {SLEEP_TROUBLES.map((trouble) => (
                <TouchableOpacity
                  key={trouble.id}
                  style={[
                    styles(theme).optionCard,
                    onboardingData.sleepTroubles.includes(trouble.id) && styles(theme).optionCardSelected,
                  ]}
                  onPress={() => toggleSelection('sleepTroubles', trouble.id)}
                >
                  <Text style={styles(theme).emoji}>{trouble.emoji}</Text>
                  <Text
                    style={[
                      styles(theme).optionText,
                      onboardingData.sleepTroubles.includes(trouble.id) && styles(theme).optionTextSelected,
                    ]}
                  >
                    {trouble.label}
                  </Text>
                  {onboardingData.sleepTroubles.includes(trouble.id) && (
                    <CheckCircle size={20} color={theme.colors.accent} style={{ position: 'absolute', top: 12, right: 12 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Image
                source={require('../assets/onboarding/step3_sleep_pattern.png')}
                style={styles(theme).iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles(theme).stepTitle}>How consistent is your sleep schedule?</Text>
            <View style={styles(theme).optionsContainer}>
              {SLEEP_PATTERNS.map((pattern) => (
                <TouchableOpacity
                  key={pattern.id}
                  style={[
                    styles(theme).optionCard,
                    onboardingData.sleepPattern === pattern.id && styles(theme).optionCardSelected,
                  ]}
                  onPress={() => setOnboardingData({ ...onboardingData, sleepPattern: pattern.id })}
                >
                  <pattern.icon
                    size={24}
                    color={onboardingData.sleepPattern === pattern.id ? theme.colors.accent : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles(theme).optionText,
                      onboardingData.sleepPattern === pattern.id && styles(theme).optionTextSelected,
                    ]}
                  >
                    {pattern.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Image
                source={require('../assets/onboarding/step4_sleep_duration.png')}
                style={styles(theme).iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles(theme).stepTitle}>How many hours do you typically sleep?</Text>
            <View style={styles(theme).sliderContainer}>
              <Text style={styles(theme).sliderValue}>{onboardingData.averageSleepHours} hours</Text>
              <View style={styles(theme).hourButtons}>
                {[4, 5, 6, 7, 8, 9, 10].map((hours) => (
                  <TouchableOpacity
                    key={hours}
                    style={[
                      styles(theme).hourButton,
                      onboardingData.averageSleepHours === hours && styles(theme).hourButtonSelected,
                    ]}
                    onPress={() => setOnboardingData({ ...onboardingData, averageSleepHours: hours })}
                  >
                    <Text
                      style={[
                        styles(theme).hourButtonText,
                        onboardingData.averageSleepHours === hours && styles(theme).hourButtonTextSelected,
                      ]}
                    >
                      {hours}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Image
                source={require('../assets/onboarding/step5_wake_feeling.png')}
                style={styles(theme).iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles(theme).stepTitle}>How do you usually feel when you wake up?</Text>
            <View style={styles(theme).optionsContainer}>
              {WAKE_FEELINGS.map((feeling) => (
                <TouchableOpacity
                  key={feeling.id}
                  style={[
                    styles(theme).optionCard,
                    onboardingData.wakeUpFeeling === feeling.id && styles(theme).optionCardSelected,
                  ]}
                  onPress={() => setOnboardingData({ ...onboardingData, wakeUpFeeling: feeling.id })}
                >
                  <Text style={styles(theme).emoji}>{feeling.emoji}</Text>
                  <Text
                    style={[
                      styles(theme).optionText,
                      onboardingData.wakeUpFeeling === feeling.id && styles(theme).optionTextSelected,
                    ]}
                  >
                    {feeling.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Image
                source={require('../assets/onboarding/step6_personal_info.png')}
                style={styles(theme).iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles(theme).stepTitle}>Tell us about yourself</Text>
            <View style={styles(theme).formContainer}>
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Your Age</Text>
                <TextInput
                  style={styles(theme).input}
                  placeholder="Enter your age"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={onboardingData.age}
                  onChangeText={(text) => setOnboardingData({ ...onboardingData, age: text })}
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Gender (Optional)</Text>
                <View style={styles(theme).genderButtons}>
                  {['Male', 'Female', 'Other', 'Prefer not to say'].map((gender) => (
                    <TouchableOpacity
                      key={gender}
                      style={[
                        styles(theme).genderButton,
                        onboardingData.gender === gender && styles(theme).genderButtonSelected,
                      ]}
                      onPress={() => setOnboardingData({ ...onboardingData, gender })}
                    >
                      <Text
                        style={[
                          styles(theme).genderButtonText,
                          onboardingData.gender === gender && styles(theme).genderButtonTextSelected,
                        ]}
                      >
                        {gender}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Image
                source={require('../assets/onboarding/step7_health.png')}
                style={styles(theme).iconImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles(theme).stepTitle}>Do you have any health conditions?</Text>
            <Text style={styles(theme).stepSubtitle}>This helps us provide better recommendations</Text>
            <View style={styles(theme).optionsContainer}>
              {HEALTH_CONDITIONS.map((condition) => (
                <TouchableOpacity
                  key={condition.id}
                  style={[
                    styles(theme).optionCard,
                    onboardingData.healthConditions.includes(condition.id) && styles(theme).optionCardSelected,
                  ]}
                  onPress={() => toggleSelection('healthConditions', condition.id)}
                >
                  <Text
                    style={[
                      styles(theme).optionText,
                      onboardingData.healthConditions.includes(condition.id) && styles(theme).optionTextSelected,
                    ]}
                  >
                    {condition.label}
                  </Text>
                  {onboardingData.healthConditions.includes(condition.id) && (
                    <CheckCircle size={20} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 8:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).iconContainer}>
              <View style={styles(theme).iconGlow} />
              <Activity size={80} color={theme.colors.accent} />
            </View>
            <Text style={styles(theme).stepTitle}>
              {analysisProgress < 30 ? 'Analyzing circadian rhythm...' : 
               analysisProgress < 60 ? 'Calculating HRV baseline...' :
               analysisProgress < 90 ? 'Optimizing sleep cycles...' : 'Profile Complete!'}
            </Text>
            <Text style={styles(theme).stepSubtitle}>
              {analysisProgress < 100
                ? 'We\'re creating a personalized experience based on your preferences'
                : 'Your personalized sleep journey is ready'}
            </Text>

            {/* Beautiful Progress Bar */}
            <View style={styles(theme).progressBarContainer}>
              <View style={styles(theme).progressBarBackground}>
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={[styles(theme).progressBarFill, { width: `${analysisProgress}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles(theme).progressPercentage}>{Math.round(analysisProgress)}%</Text>
            </View>

            <View style={styles(theme).summaryContainer}>
              <View style={styles(theme).summaryItem}>
                <TrendingUp size={24} color={theme.colors.accent} />
                <Text style={styles(theme).summaryText}>Personalized HRV Tracking</Text>
              </View>
              <View style={styles(theme).summaryItem}>
                <Zap size={24} color={theme.colors.accent} />
                <Text style={styles(theme).summaryText}>Circadian Rhythm Analysis</Text>
              </View>
              <View style={styles(theme).summaryItem}>
                <ShieldCheck size={24} color={theme.colors.accent} />
                <Text style={styles(theme).summaryText}>Scientific Sleep Insights</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles(theme).container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={['#0A0B14', '#1A1D3A', '#0A0B14']}
        style={styles(theme).gradient}
      >
        {/* Progress Bar */}
        <View style={styles(theme).progressContainer}>
          <View style={styles(theme).progressBar}>
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              style={[styles(theme).progressFill, { width: `${progress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <Text style={styles(theme).progressText}>
            Step {currentStep + 2} of {totalSteps}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles(theme).scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderStep()}
          </Animated.View>
        </ScrollView>

        {/* Skip Button - Top Right */}
        {currentStep >= 0 && currentStep < 8 && (
          <TouchableOpacity
            style={styles(theme).skipButtonTopRight}
            onPress={() => {
              Alert.alert(
                'Skip Onboarding?',
                'Skipping the onboarding will make your sleep recommendations less accurate and personalized. We recommend completing these steps for the best experience.\n\nContinue anyway?',
                [
                  {
                    text: 'Go Back',
                    style: 'cancel',
                  },
                  {
                    text: 'Skip',
                    style: 'destructive',
                    onPress: async () => {
                      await AsyncStorage.setItem('@onboarding_completed', 'true');
                      navigation.navigate('Welcome');
                    },
                  },
                ],
                { cancelable: true }
              );
            }}
          >
            <Text style={styles(theme).skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Navigation Buttons */}
        <View style={styles(theme).navigationContainer}>
          {currentStep > -1 && (
            <TouchableOpacity style={styles(theme).backButton} onPress={handleBack}>
              <ArrowLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles(theme).nextButton, currentStep === -1 && styles(theme).nextButtonFull]}
            onPress={handleNext}
            disabled={isSubmitting || (currentStep === 8 && !showCompleteButton)}
          >
            <LinearGradient
              colors={
                currentStep === 8 && !showCompleteButton
                  ? ['#555', '#444']
                  : ['#8B5CF6', '#6366F1']
              }
              style={styles(theme).nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles(theme).nextButtonText}>
                {isSubmitting
                  ? 'Saving...'
                  : currentStep === -1
                  ? 'Get Started'
                  : currentStep === totalSteps - 1
                  ? showCompleteButton
                    ? 'Complete Setup'
                    : 'Analyzing...'
                  : 'Continue'}
              </Text>
              {currentStep === totalSteps - 1 ? (
                <CheckCircle size={20} color="#0F111A" />
              ) : (
                <ArrowRight size={20} color="#0F111A" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B14',
  },
  gradient: {
    flex: 1,
  },
  progressContainer: {
    paddingTop: 20,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140, // Space for navigation buttons
  },
  stepContainer: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  iconContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    marginTop: 10,
    width: 200,
    height: 200,
  },
  iconGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.accent,
    opacity: 0.12,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    // Remove elevation on Android to avoid blocky shapes
    elevation: Platform.OS === 'ios' ? 10 : 0,
  },
  iconImage: {
    width: 180,
    height: 180,
    borderRadius: 24,
    zIndex: 1,
    overflow: 'hidden',
  },
  stepIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
    paddingHorizontal: 20,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
    lineHeight: 24,
    opacity: 0.8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 4,
  },
  optionCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 35, 60, 0.5)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(100, 120, 255, 0.15)',
    gap: 10,
    shadowColor: '#6478FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: Platform.OS === 'ios' ? 3 : 0,
    minHeight: 100,
    width: '48%',
  },
  optionCardSelected: {
    borderColor: '#00FFD1',
    backgroundColor: 'rgba(0, 255, 209, 0.12)',
    borderWidth: 2.5,
    shadowColor: '#00FFD1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: Platform.OS === 'ios' ? 8 : 0,
    transform: [{ scale: 1.02 }],
  },
  optionText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
  emoji: {
    fontSize: 36,
    marginRight: 4,
  },
  goalEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  sliderContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  sliderValue: {
    fontSize: 42,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 24,
  },
  hourButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  hourButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(30, 35, 60, 0.5)',
    borderWidth: 2,
    borderColor: 'rgba(100, 120, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6478FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: Platform.OS === 'ios' ? 3 : 0,
  },
  hourButtonSelected: {
    borderColor: '#00FFD1',
    backgroundColor: 'rgba(0, 255, 209, 0.15)',
    borderWidth: 2.5,
    shadowColor: '#00FFD1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: Platform.OS === 'ios' ? 5 : 0,
    transform: [{ scale: 1.05 }],
  },
  hourButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  hourButtonTextSelected: {
    color: theme.colors.accent,
    fontWeight: '800',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  genderButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  genderButtonSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(0, 255, 209, 0.06)',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: Platform.OS === 'ios' ? 3 : 0,
  },
  genderButtonText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  genderButtonTextSelected: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  summaryContainer: {
    gap: 20,
    marginTop: 32,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  summaryText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  progressBarContainer: {
    marginVertical: 32,
    alignItems: 'center',
    gap: 16,
  },
  progressBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(27, 29, 42, 0.9)',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.2)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: Platform.OS === 'ios' ? 5 : 0,
  },
  progressPercentage: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.accent,
    textShadowColor: 'rgba(0, 255, 209, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  skipButtonTopRight: {
    position: 'absolute',
    top: 60,
    right: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  skipButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  
  // Welcome Screen Styles
  welcomeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  welcomeTitle: {
    fontSize: 38,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -1,
  },
  welcomeSubtitle: {
    fontSize: 17,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.9,
    lineHeight: 24,
  },
  welcomeBenefits: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  benefitText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  timeEstimate: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
    marginTop: 24,
  },
  
  // Preset Screen Styles
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
  },
  presetCard: {
    width: '48%',
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  presetBackgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  presetBlurOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  presetTextContainer: {
    alignItems: 'flex-start',
    gap: 4,
  },
  presetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  presetSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  
  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    gap: 12,
    backgroundColor: '#0A0B14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  nextButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: Platform.OS === 'ios' ? 8 : 0,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.background,
  },
});
