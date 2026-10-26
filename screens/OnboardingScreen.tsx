import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Activity,
  TrendingUp,
  Stethoscope,
  Sparkles,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PushNotificationPrompt from '../components/PushNotificationPrompt';

import WelcomeStep from './onboarding/WelcomeStep';
import PresetStep from './onboarding/PresetStep';
import GoalsStep from './onboarding/GoalsStep';
import ChallengesStep from './onboarding/ChallengesStep';
import ConsistencyStep from './onboarding/ConsistencyStep';
import ScheduleStep from './onboarding/ScheduleStep';
import FeelingStep from './onboarding/FeelingStep';
import AboutStep from './onboarding/AboutStep';
import HealthStep from './onboarding/HealthStep';
import AnalyzingStep from './onboarding/AnalyzingStep';
import PlanStep from './onboarding/PlanStep';
import { derivedSleepHours } from './onboarding/timeUtils';

// Container for the redesigned onboarding flow (redesign/ui-ux-v3).
//
// All business logic — state shape, validation rules, haptics, the Supabase
// payload, the AsyncStorage key, completeOnboarding()/reloadProfile(), the push
// prompt and the celebration overlay — is preserved from the previous version.
// Only the rendering moved out, into the presentational step components under
// `screens/onboarding/`.
//
// Step index -> canvas screen (the chain matches the canvas's own hrefs):
//   -1  WelcomeStep     (App-Welcome)      no header
//    0  PresetStep      (Ob-Preset)        Step 1 of 9
//    1  GoalsStep       (App-Goal)         Step 2 of 9
//    2  ChallengesStep  (Ob-Challenges)    Step 3 of 9
//    3  ConsistencyStep (Ob-Consistency)   Step 4 of 9
//    4  ScheduleStep    (App-Schedule)     Step 5 of 9
//    5  FeelingStep     (App-Feeling)      Step 6 of 9
//    6  AboutStep       (Ob-About)         Step 7 of 9
//    7  HealthStep      (Ob-Health)        Step 8 of 9
//    8  AnalyzingStep   (restored)         no header, auto-advances
//    9  PlanStep        (App-Plan)         no header, static
//
// AnalyzingStep restores the original onboarding's 3-second animated
// "analyzing" moment (pulse + progress fill) that this redesign had
// initially dropped in favor of an instant static Plan screen — brought
// back per explicit instruction, re-skinned to the theme system instead of
// its old hardcoded colors. It auto-advances to PlanStep; Health's Continue
// and Skip both still land here first rather than skipping straight to Plan.

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
  { id: 'consistent', label: 'Very consistent', icon: CheckCircle, emoji: '✅' },
  { id: 'somewhat_consistent', label: 'Somewhat consistent', icon: Circle, emoji: '🔄' },
  { id: 'irregular', label: 'Irregular schedule', icon: AlertTriangle, emoji: '⚡' },
];

const WAKE_FEELINGS = [
  { id: 'refreshed', label: 'Refreshed & energized', emoji: '😊' },
  { id: 'okay', label: 'Okay, but not great', emoji: '😐' },
  { id: 'tired', label: 'Tired & groggy', emoji: '😴' },
  { id: 'exhausted', label: 'Exhausted', emoji: '😩' },
];

const HEALTH_CONDITIONS = [
  { id: 'none', label: 'None', emoji: '✨' },
  { id: 'sleep_apnea', label: 'Sleep apnea', emoji: '😮‍💨' },
  { id: 'insomnia', label: 'Insomnia', emoji: '😶' },
  { id: 'anxiety', label: 'Anxiety', emoji: '😰' },
  { id: 'depression', label: 'Depression', emoji: '🌧️' },
  { id: 'chronic_pain', label: 'Chronic pain', emoji: '🩹' },
  { id: 'other', label: 'Other', emoji: '📋' },
];

/** Skip jumps straight to the Plan screen, past Health and Analyzing. */
const PLAN_STEP = 9;

export default function OnboardingScreen() {
  const { theme } = useAppTheme();
  const { user, completeOnboarding, reloadProfile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentStep, setCurrentStep] = useState(-1); // Start at -1 for welcome screen
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

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

  const totalSteps = 10; // Total visible steps for user (Welcome through Plan)

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
        duration: 220,
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
      case 4: // Schedule (bed/wake time) - no validation needed, has defaults
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
      // Step 8 (AnalyzingStep) is never reached through handleNext — it
      // auto-advances itself via onDone, see renderStep's case 8 below.
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

  // Skip keeps the original confirmation Alert and the '@onboarding_completed'
  // AsyncStorage write, but now lands on the Plan step instead of navigating
  // away to Welcome — that matches the canvas, where every "Skip" link points
  // at App-Plan.dc.html.
  const handleSkip = () => {
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
            animateTransition(() => setCurrentStep(PLAN_STEP));
          },
        },
      ],
      { cancelable: true }
    );
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

        // Wait for celebration, then show push notification prompt
        setTimeout(() => {
          setShowPushPrompt(true);
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

  // The new Schedule screen sets bedTime/wakeUpTime directly; averageSleepHours
  // is derived from them rather than entered separately (it used to be a 4-10h
  // button row). handleComplete still Math.round()s it for Supabase.
  const setBedTime = (bedTime: string) => {
    setOnboardingData({
      ...onboardingData,
      bedTime,
      averageSleepHours: derivedSleepHours(bedTime, onboardingData.wakeUpTime),
    });
  };

  const setWakeUpTime = (wakeUpTime: string) => {
    setOnboardingData({
      ...onboardingData,
      wakeUpTime,
      averageSleepHours: derivedSleepHours(onboardingData.bedTime, wakeUpTime),
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case -1:
        return (
          <WelcomeStep
            theme={theme}
            onNext={handleNext}
            onLogin={() => navigation.navigate('Login')}
          />
        );

      case 0:
        return (
          <PresetStep
            theme={theme}
            presets={PROFESSIONAL_PRESETS}
            selected={onboardingData.preset}
            onSelect={handlePresetSelect}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 1:
        return (
          <GoalsStep
            theme={theme}
            goals={SLEEP_GOALS}
            selected={onboardingData.sleepGoals}
            onToggle={(id) => toggleSelection('sleepGoals', id)}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 2:
        return (
          <ChallengesStep
            theme={theme}
            challenges={SLEEP_TROUBLES}
            selected={onboardingData.sleepTroubles}
            onToggle={(id) => toggleSelection('sleepTroubles', id)}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 3:
        return (
          <ConsistencyStep
            theme={theme}
            patterns={SLEEP_PATTERNS}
            selected={onboardingData.sleepPattern}
            onSelect={(id) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOnboardingData({ ...onboardingData, sleepPattern: id });
            }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 4:
        return (
          <ScheduleStep
            theme={theme}
            bedTime={onboardingData.bedTime}
            wakeUpTime={onboardingData.wakeUpTime}
            onChangeBedTime={setBedTime}
            onChangeWakeUpTime={setWakeUpTime}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 5:
        return (
          <FeelingStep
            theme={theme}
            feelings={WAKE_FEELINGS}
            selected={onboardingData.wakeUpFeeling}
            onSelect={(id) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOnboardingData({ ...onboardingData, wakeUpFeeling: id });
              // Preserved from the original: selecting a feeling auto-advances.
              setTimeout(handleNext, 350);
            }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 6:
        return (
          <AboutStep
            theme={theme}
            age={onboardingData.age}
            gender={onboardingData.gender}
            onChangeAge={(age) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOnboardingData({ ...onboardingData, age });
            }}
            onChangeGender={(gender) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOnboardingData({ ...onboardingData, gender });
            }}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 7:
        return (
          <HealthStep
            theme={theme}
            conditions={HEALTH_CONDITIONS}
            selected={onboardingData.healthConditions}
            onToggle={(id) => toggleSelection('healthConditions', id)}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        );

      case 8:
        return (
          <AnalyzingStep
            theme={theme}
            onDone={() => setCurrentStep(9)}
          />
        );

      case 9:
        return (
          <PlanStep
            theme={theme}
            bedTime={onboardingData.bedTime}
            wakeUpTime={onboardingData.wakeUpTime}
            onComplete={handleComplete}
            isSubmitting={isSubmitting}
          />
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles(theme).container} edges={['top', 'bottom']}>
      <Animated.View style={[styles(theme).stepWrapper, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>

      {/* Celebration Overlay */}
      {showCelebration && (
        <View style={styles(theme).celebrationOverlay} pointerEvents="none">
          <View style={styles(theme).celebrationCard}>
            <Text style={styles(theme).celebrationEmoji}>🎉</Text>
            <Text style={styles(theme).celebrationTitle}>You're all set!</Text>
            <Text style={styles(theme).celebrationSubtitle}>Your sleep profile is ready</Text>
          </View>
        </View>
      )}

      {/* Push Notification Prompt */}
      {showPushPrompt && user && (
        <PushNotificationPrompt
          userId={user.id}
          trigger="onboarding"
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stepWrapper: {
    flex: 1,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.cardOverlay,
  },
  celebrationCard: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    rowGap: 8,
  },
  celebrationEmoji: {
    fontSize: 56,
  },
  celebrationTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    color: theme.colors.textPrimary,
  },
  celebrationSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
});
