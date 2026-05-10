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
  Modal,
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
  Edit3,
  Trophy,
  FlaskConical,
  Cloud,
  LockKeyhole,
  Clock3,
  Brain,
  Users,
  Check
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import PushNotificationPrompt from '../components/PushNotificationPrompt';

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

export default function OnboardingScreen() {
  const { theme, isDark } = useAppTheme();
  const { user, completeOnboarding, reloadProfile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentStep, setCurrentStep] = useState(-1); // Start at -1 for welcome screen
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [showDropdown, setShowDropdown] = useState<'troubles' | 'pattern' | null>(null);
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
      
      // Reset and start pulse animation
      scaleAnim.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();

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
          scaleAnim.stopAnimation();
          scaleAnim.setValue(1);
        } else {
          setAnalysisProgress(currentProgress);
        }
      }, interval);

      return () => {
        clearInterval(timer);
        scaleAnim.stopAnimation();
      };
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

  const renderStep = () => {
    switch (currentStep) {
      // Welcome Screen
      case -1:
        return (
          <View style={styles(theme).welcomeContainer}>
            {/* Hero Background Image */}
            <View style={styles(theme).heroImageContainer}>
              <Image 
                source={require('../assets/onboarding_hero.png')} 
                style={styles(theme).heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['#040615', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).heroMask}
              />
            </View>
            
            {/* Background Glows for Depth */}
            <View style={styles(theme).bgGlowTopRight} />
            <View style={styles(theme).bgGlowCenter} />

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles(theme).welcomeScrollContent}
            >
              <View style={styles(theme).welcomeContentWrapper}>
                <Text style={styles(theme).mainTitle}>
                  Sleep{'\n'}
                  <Text style={styles(theme).mainTitleGradient}>Architect</Text>
                </Text>
                
                <Text style={styles(theme).mainSubtitle}>
                  Your personalized sleep coach.{'\n'}Science-backed. Built for real life.
                </Text>

                {/* Rating */}
                <View style={styles(theme).ratingBox}>
                  <View style={styles(theme).ratingStars}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={18} fill="#FFC84D" color="#FFC84D" />
                    ))}
                  </View>
                  <Text style={styles(theme).ratingTextValue}>4.9 • 12,000+ Ratings</Text>
                </View>

                {/* Cards Grid */}
                <View style={styles(theme).cardsGrid}>
                  {/* Card 1: App of the Day */}
                  <View style={styles(theme).featureCard}>
                    <LinearGradient 
                      colors={['rgba(255, 200, 77, 0.25)', 'rgba(255, 200, 77, 0.05)']} 
                      style={styles(theme).featureIconGlow}
                    >
                      <Trophy size={24} color="#FFC84D" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={styles(theme).featureCardTitle}>App of the Day</Text>
                    <Text style={styles(theme).featureCardSub}>Recognized for{'\n'}excellence</Text>
                  </View>

                  {/* Card 2: Science-Backed */}
                  <View style={styles(theme).featureCard}>
                    <LinearGradient 
                      colors={['rgba(125, 211, 252, 0.25)', 'rgba(125, 211, 252, 0.05)']} 
                      style={styles(theme).featureIconGlow}
                    >
                      <FlaskConical size={24} color="#7DD3FC" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={styles(theme).featureCardTitle}>Science–Backed</Text>
                    <Text style={styles(theme).featureCardSub}>Driven by research.{'\n'}Proven results.</Text>
                  </View>

                  {/* Card 3: 100% Private */}
                  <View style={styles(theme).featureCard}>
                    <LinearGradient 
                      colors={['rgba(110, 231, 183, 0.25)', 'rgba(110, 231, 183, 0.05)']} 
                      style={styles(theme).featureIconGlow}
                    >
                      <ShieldCheck size={24} color="#6EE7B7" strokeWidth={2.5} />
                    </LinearGradient>
                    <Text style={styles(theme).featureCardTitle}>100% Private</Text>
                    <Text style={styles(theme).featureCardSub}>Your data stays{'\n'}with you.</Text>
                  </View>
                </View>

                {/* Trusted By Card */}
                <View style={styles(theme).trustedCard}>
                  <Text style={styles(theme).trustedTitle}>Trusted by Thousands</Text>
                  <View style={styles(theme).trustedInner}>
                    <View style={styles(theme).trustedAvatars}>
                      <Image source={require('../assets/avatar1.png')} style={[styles(theme).trustedAvatarImg, { zIndex: 4 }]} />
                      <Image source={require('../assets/avatar2.png')} style={[styles(theme).trustedAvatarImg, { marginLeft: -12, zIndex: 3 }]} />
                      <Image source={require('../assets/avatar3.png')} style={[styles(theme).trustedAvatarImg, { marginLeft: -12, zIndex: 2 }]} />
                      <Image source={require('../assets/avatar4.png')} style={[styles(theme).trustedAvatarImg, { marginLeft: -12, zIndex: 1 }]} />
                    </View>
                    <View style={styles(theme).trustedTextCol}>
                      <Text style={styles(theme).trustedCount}>50,000+</Text>
                      <Text style={styles(theme).trustedLabel}>people sleeping better</Text>
                    </View>
                    <View style={styles(theme).trustedDeco}>
                      <Moon size={22} fill="#8B5CF6" color="#8B5CF6" />
                      <Text style={styles(theme).trustedZz}>zZᶻ</Text>
                      <Sparkles size={18} color="#A78BFA" />
                      <Cloud size={22} fill="#6366F1" color="#6366F1" opacity={0.8} />
                    </View>
                  </View>
                </View>

                {/* CTA Button */}
                <TouchableOpacity 
                  style={styles(theme).newCtaBtn} 
                  onPress={handleNext} 
                  activeOpacity={0.9}
                >
                  <LinearGradient 
                    colors={['#7C3AED', '#4F46E5']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 0}} 
                    style={styles(theme).newCtaGradient}
                  >
                    <Text style={styles(theme).newCtaText}>Get Started</Text>
                    <ArrowRight size={22} strokeWidth={3} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles(theme).setupTimeSmallText}>Setup takes only 2 minutes</Text>

                {/* Footer Security */}
                <View style={styles(theme).footerLockRow}>
                  <LockKeyhole size={14} color="rgba(148, 163, 184, 0.6)" />
                  <Text style={styles(theme).footerLockText}>Trusted by 100,000+ users worldwide</Text>
                </View>

                {/* Awards */}
                <View style={styles(theme).footerAwardsRow}>
                  <View style={styles(theme).awardItem}>
                    <View style={styles(theme).laurelContainer}>
                      <Text style={styles(theme).laurel}>🌿</Text>
                      <Text style={styles(theme).footerAwardText}>Top Rated{'\n'}Sleep App</Text>
                      <Text style={[styles(theme).laurel, styles(theme).laurelRight]}>🌿</Text>
                    </View>
                  </View>
                  
                  <View style={styles(theme).footerAwardDiv} />
                  
                  <View style={styles(theme).awardItem}>
                    <View style={styles(theme).laurelContainer}>
                      <Text style={styles(theme).laurel}>🌿</Text>
                      <Text style={styles(theme).footerAwardText}>Editor's{'\n'}Choice</Text>
                      <Text style={[styles(theme).laurel, styles(theme).laurelRight]}>🌿</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        );


      // Professional Preset Screen
      case 0:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={{ uri: PROFESSIONAL_PRESETS[0].image }}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <Sparkles size={14} color="#A78BFA" />
                <Text style={styles(theme).stepHeroBadgeText}>Tap to select</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>Choose your{'\n'}<Text style={{ color: '#A78BFA' }}>sleep profile</Text></Text>
            <Text style={styles(theme).stepSubtitle}>We'll customize your plan based on your needs</Text>
            <View style={styles(theme).optionsStack}>
              {PROFESSIONAL_PRESETS.map((preset) => {
                const PresetIcon = preset.icon;
                const selected = onboardingData.preset === preset.id;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles(theme).optionRow, selected && styles(theme).optionRowSelected]}
                    onPress={() => handlePresetSelect(preset.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles(theme).presetRowIcon, { backgroundColor: preset.gradient[0] + '33' }]}>
                      <PresetIcon size={20} color={preset.gradient[0]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles(theme).optionRowText, selected && styles(theme).optionTextSelected]}>
                        {preset.title}
                      </Text>
                      <Text style={styles(theme).presetRowSub}>{preset.subtitle}</Text>
                    </View>
                    <View style={[styles(theme).optionRowRadio, selected && styles(theme).optionRowRadioSelected]}>
                      {selected && <View style={styles(theme).optionRowRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={require('../assets/onboarding/step1_sleep_goals.png')}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <Moon size={14} color="#A78BFA" />
                <Text style={styles(theme).stepHeroBadgeText}>Select all that apply</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>What are your{'\n'}sleep goals?</Text>
            <Text style={styles(theme).stepSubtitle}>Choose everything you want to achieve</Text>
            <View style={styles(theme).optionsGrid}>
              {SLEEP_GOALS.map((goal) => {
                const selected = onboardingData.sleepGoals.includes(goal.id);
                return (
                  <TouchableOpacity
                    key={goal.id}
                    style={[styles(theme).optionCard, selected && styles(theme).optionCardSelected]}
                    onPress={() => toggleSelection('sleepGoals', goal.id)}
                    activeOpacity={0.8}
                  >
                    {selected && (
                      <View style={styles(theme).optionCheckBadge}>
                        <Check size={10} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={styles(theme).optionEmoji}>{goal.emoji}</Text>
                    <Text style={[styles(theme).optionText, selected && styles(theme).optionTextSelected]}>
                      {goal.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={require('../assets/onboarding/step2_sleep_troubles.png')}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <AlertTriangle size={14} color="#F59E0B" />
                <Text style={styles(theme).stepHeroBadgeText}>Select all that apply</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>What sleep challenges{'\n'}do you face?</Text>
            <Text style={styles(theme).stepSubtitle}>We'll tailor your plan to solve these</Text>

            {/* Dropdown trigger */}
            <TouchableOpacity
              style={styles(theme).dropdownTrigger}
              onPress={() => setShowDropdown('troubles')}
              activeOpacity={0.85}
            >
              <Text style={styles(theme).dropdownTriggerText}>
                {onboardingData.sleepTroubles.length === 0
                  ? 'Tap to select challenges...'
                  : `${onboardingData.sleepTroubles.length} challenge${onboardingData.sleepTroubles.length > 1 ? 's' : ''} selected`}
              </Text>
              <ChevronRight size={18} color="rgba(148,163,184,0.6)" />
            </TouchableOpacity>

            {/* Selected chips preview */}
            {onboardingData.sleepTroubles.length > 0 && (
              <View style={styles(theme).selectedChipsRow}>
                {onboardingData.sleepTroubles.map((id) => {
                  const item = SLEEP_TROUBLES.find(t => t.id === id);
                  if (!item) return null;
                  return (
                    <View key={id} style={styles(theme).selectedChip}>
                      <Text style={styles(theme).selectedChipText}>{item.emoji} {item.label}</Text>
                      <TouchableOpacity onPress={() => toggleSelection('sleepTroubles', id)}>
                        <Text style={styles(theme).selectedChipRemove}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Dropdown Modal */}
            <Modal
              visible={showDropdown === 'troubles'}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDropdown(null)}
            >
              <TouchableOpacity
                style={styles(theme).dropdownBackdrop}
                activeOpacity={1}
                onPress={() => setShowDropdown(null)}
              />
              <View style={styles(theme).dropdownSheet}>
                <View style={styles(theme).dropdownHandle} />
                <Text style={styles(theme).dropdownSheetTitle}>Select sleep challenges</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {SLEEP_TROUBLES.map((trouble) => {
                    const selected = onboardingData.sleepTroubles.includes(trouble.id);
                    return (
                      <TouchableOpacity
                        key={trouble.id}
                        style={[styles(theme).dropdownItem, selected && styles(theme).dropdownItemSelected]}
                        onPress={() => toggleSelection('sleepTroubles', trouble.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles(theme).dropdownItemEmoji}>{trouble.emoji}</Text>
                        <Text style={[styles(theme).dropdownItemText, selected && styles(theme).dropdownItemTextSelected]}>
                          {trouble.label}
                        </Text>
                        {selected && <Check size={18} color="#A78BFA" />}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={styles(theme).dropdownDone}
                  onPress={() => setShowDropdown(null)}
                >
                  <LinearGradient colors={['#7C3AED', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles(theme).dropdownDoneGradient}>
                    <Text style={styles(theme).dropdownDoneText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Modal>
          </View>
        );

      case 3:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={require('../assets/onboarding/step3_sleep_pattern.png')}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <Calendar size={14} color="#34D399" />
                <Text style={styles(theme).stepHeroBadgeText}>Pick one</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>How consistent is your{'\n'}sleep schedule?</Text>
            <Text style={styles(theme).stepSubtitle}>Be honest — we'll work with your reality</Text>

            {/* Dropdown trigger */}
            <TouchableOpacity
              style={styles(theme).dropdownTrigger}
              onPress={() => setShowDropdown('pattern')}
              activeOpacity={0.85}
            >
              <Text style={styles(theme).dropdownTriggerText}>
                {onboardingData.sleepPattern
                  ? (() => { const p = SLEEP_PATTERNS.find(p => p.id === onboardingData.sleepPattern); return p ? `${p.emoji} ${p.label}` : 'Select pattern...'; })()
                  : 'Tap to select schedule type...'}
              </Text>
              <ChevronRight size={18} color="rgba(148,163,184,0.6)" />
            </TouchableOpacity>

            {/* Dropdown Modal */}
            <Modal
              visible={showDropdown === 'pattern'}
              transparent
              animationType="slide"
              onRequestClose={() => setShowDropdown(null)}
            >
              <TouchableOpacity
                style={styles(theme).dropdownBackdrop}
                activeOpacity={1}
                onPress={() => setShowDropdown(null)}
              />
              <View style={styles(theme).dropdownSheet}>
                <View style={styles(theme).dropdownHandle} />
                <Text style={styles(theme).dropdownSheetTitle}>Your sleep schedule</Text>
                {SLEEP_PATTERNS.map((pattern) => {
                  const selected = onboardingData.sleepPattern === pattern.id;
                  return (
                    <TouchableOpacity
                      key={pattern.id}
                      style={[styles(theme).dropdownItem, selected && styles(theme).dropdownItemSelected]}
                      onPress={() => {
                        setOnboardingData({ ...onboardingData, sleepPattern: pattern.id });
                        setShowDropdown(null);
                        setTimeout(handleNext, 350);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles(theme).dropdownItemEmoji}>{pattern.emoji}</Text>
                      <Text style={[styles(theme).dropdownItemText, selected && styles(theme).dropdownItemTextSelected]}>
                        {pattern.label}
                      </Text>
                      {selected && <Check size={18} color="#A78BFA" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Modal>
          </View>
        );

      case 4:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={require('../assets/onboarding/step4_sleep_duration.png')}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <Clock size={14} color="#60A5FA" />
                <Text style={styles(theme).stepHeroBadgeText}>Average per night</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>How many hours do{'\n'}you typically sleep?</Text>
            <View style={styles(theme).durationDisplay}>
              <Text style={styles(theme).durationNumber}>{onboardingData.averageSleepHours}</Text>
              <Text style={styles(theme).durationUnit}>hours</Text>
            </View>
            <View style={styles(theme).hourButtonsRow}>
              {[4, 5, 6, 7, 8, 9, 10].map((hours) => {
                const selected = onboardingData.averageSleepHours === hours;
                return (
                  <TouchableOpacity
                    key={hours}
                    style={[styles(theme).hourButton, selected && styles(theme).hourButtonSelected]}
                    onPress={() => setOnboardingData({ ...onboardingData, averageSleepHours: hours })}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles(theme).hourButtonText, selected && styles(theme).hourButtonTextSelected]}>
                      {hours}h
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles(theme).durationHint}>
              {onboardingData.averageSleepHours < 6
                ? '⚠️ Below recommended — we\'ll help you get more'
                : onboardingData.averageSleepHours < 7
                ? '😴 Slightly low — let\'s improve this'
                : onboardingData.averageSleepHours <= 9
                ? '✅ Healthy range — great start!'
                : '😴 More than average — quality matters too'}
            </Text>
          </View>
        );

      case 5:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={require('../assets/onboarding/step5_wake_feeling.png')}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <Sun size={14} color="#FCD34D" />
                <Text style={styles(theme).stepHeroBadgeText}>Pick one</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>How do you feel{'\n'}when you wake up?</Text>
            <Text style={styles(theme).stepSubtitle}>Most mornings, you feel...</Text>
            <View style={styles(theme).optionsStack}>
              {WAKE_FEELINGS.map((feeling) => {
                const selected = onboardingData.wakeUpFeeling === feeling.id;
                return (
                  <TouchableOpacity
                    key={feeling.id}
                    style={[styles(theme).optionRow, selected && styles(theme).optionRowSelected]}
                    onPress={() => {
                      setOnboardingData({ ...onboardingData, wakeUpFeeling: feeling.id });
                      setTimeout(handleNext, 350);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles(theme).optionRowEmoji}>{feeling.emoji}</Text>
                    <Text style={[styles(theme).optionRowText, selected && styles(theme).optionTextSelected]}>
                      {feeling.label}
                    </Text>
                    <View style={[styles(theme).optionRowRadio, selected && styles(theme).optionRowRadioSelected]}>
                      {selected && <View style={styles(theme).optionRowRadioDot} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={require('../assets/onboarding/step6_personal_info.png')}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <ShieldCheck size={14} color="#6EE7B7" />
                <Text style={styles(theme).stepHeroBadgeText}>Private & secure</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>Tell us a little{'\n'}about yourself</Text>
            <Text style={styles(theme).stepSubtitle}>Helps us personalize sleep advice for your age</Text>
            <View style={styles(theme).formContainer}>
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Your Age</Text>
                <TextInput
                  style={styles(theme).input}
                  placeholder="e.g. 28"
                  placeholderTextColor="rgba(148,163,184,0.4)"
                  value={onboardingData.age}
                  onChangeText={(text) => setOnboardingData({ ...onboardingData, age: text })}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                  maxLength={3}
                />
              </View>
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Gender <Text style={styles(theme).optionalLabel}>(Optional)</Text></Text>
                <View style={styles(theme).genderGrid}>
                  {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map((gender) => {
                    const selected = onboardingData.gender === gender;
                    return (
                      <TouchableOpacity
                        key={gender}
                        style={[styles(theme).genderChip, selected && styles(theme).genderChipSelected]}
                        onPress={() => setOnboardingData({ ...onboardingData, gender })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles(theme).genderChipText, selected && styles(theme).genderChipTextSelected]}>
                          {gender}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles(theme).stepContainer}>
            <View style={styles(theme).stepHeroContainer}>
              <Image
                source={require('../assets/onboarding/step7_health.png')}
                style={styles(theme).stepHeroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', '#0A0B14']}
                style={styles(theme).stepHeroFade}
              />
              <LinearGradient
                colors={['#0A0B14', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).stepHeroFadeLeft}
              />
              <View style={styles(theme).stepHeroBadge}>
                <Heart size={14} color="#F87171" />
                <Text style={styles(theme).stepHeroBadgeText}>Select all that apply</Text>
              </View>
            </View>
            <Text style={styles(theme).stepTitle}>Any health conditions{'\n'}we should know?</Text>
            <Text style={styles(theme).stepSubtitle}>Helps us give you safer, smarter recommendations</Text>
            <View style={styles(theme).optionsGrid}>
              {HEALTH_CONDITIONS.map((condition) => {
                const selected = onboardingData.healthConditions.includes(condition.id);
                return (
                  <TouchableOpacity
                    key={condition.id}
                    style={[styles(theme).optionCard, selected && styles(theme).optionCardSelected]}
                    onPress={() => toggleSelection('healthConditions', condition.id)}
                    activeOpacity={0.8}
                  >
                    {selected && (
                      <View style={styles(theme).optionCheckBadge}>
                        <Check size={10} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={styles(theme).optionEmoji}>{condition.emoji}</Text>
                    <Text style={[styles(theme).optionText, selected && styles(theme).optionTextSelected]}>
                      {condition.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 8:
        return (
          <View style={styles(theme).analysisScreenContainer}>
            {/* Background glow orbs — same as other steps */}
            <View style={styles(theme).bgGlowTopRight} />
            <View style={styles(theme).bgGlowCenter} />

            {/* Top Sparkle Badge */}
            <View style={styles(theme).topIconCircle}>
              <Sparkles size={18} color="#A78BFA" />
            </View>

            {/* Header Text */}
            <Text style={styles(theme).analysisTitle}>
              Building your{'\n'}personalized <Text style={styles(theme).purpleText}>sleep plan</Text>
            </Text>
            <Text style={styles(theme).analysisSubtitle}>This will only take a few moments...</Text>

            {/* Central Brain & Progress Section */}
            <View style={styles(theme).brainSection}>
              {/* % Badge floating above ring */}
              <Animated.View style={[styles(theme).progressBadge, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles(theme).progressBigPercent}>{Math.round(analysisProgress)}%</Text>
                <Text style={styles(theme).progressCalculatingLabel}>Calculating...</Text>
              </Animated.View>

              {/* Outer glow ring */}
              <View style={styles(theme).progressRingGlow}>
                {/* Inner crisp ring */}
                <View style={styles(theme).progressRingOuter}>
                  <Image
                    source={require('../assets/onboarding/step8_summary.png')}
                    style={styles(theme).brainImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>

            {/* Status Pill */}
            <View style={styles(theme).statusPill}>
              <Activity size={16} color="#8B5CF6" />
              <Text style={styles(theme).statusPillText}>
                {analysisProgress < 40 ? 'Analyzing sleep goals...' :
                 analysisProgress < 70 ? 'Understanding schedule...' :
                 analysisProgress < 95 ? 'Mapping sleep health...' : 'Finalizing plan...'}
              </Text>
            </View>

            {/* Analysis Tasks List */}
            <View style={styles(theme).analysisTasksList}>
              {[
                { id: 1, label: 'Analyzing your sleep goals', icon: Moon, progress: 25 },
                { id: 2, label: 'Understanding your schedule', icon: Clock, progress: 50 },
                { id: 3, label: 'Mapping your sleep health', icon: Heart, progress: 75 },
                { id: 4, label: 'Creating your personalized plan', icon: Brain, progress: 100 },
              ].map((task) => {
                const isComplete = analysisProgress >= task.progress;
                const isInProgress = !isComplete && analysisProgress > task.progress - 25;
                return (
                  <View
                    key={task.id}
                    style={[
                      styles(theme).analysisTaskCard,
                      isComplete && styles(theme).analysisTaskCardDone,
                    ]}
                  >
                    {/* Left accent bar */}
                    <View style={[styles(theme).taskAccentBar, isComplete && styles(theme).taskAccentBarDone]} />
                    <View style={[styles(theme).taskIconCircle, isComplete && styles(theme).taskIconCircleComplete]}>
                      <task.icon size={16} color={isComplete ? '#FFFFFF' : '#94A3B8'} />
                    </View>
                    <View style={styles(theme).taskTextCol}>
                      <Text style={[styles(theme).taskLabel, isComplete && styles(theme).taskLabelDone]}>
                        {task.label}
                      </Text>
                      <Text style={[styles(theme).taskStatusText, isComplete && styles(theme).taskStatusComplete]}>
                        {isComplete ? 'Complete ✓' : isInProgress ? 'In progress...' : 'Waiting...'}
                      </Text>
                    </View>
                    <View style={[styles(theme).taskStatusCheck, isComplete && styles(theme).taskStatusCheckActive]}>
                      {isComplete ? <Check size={13} color="#FFFFFF" /> : <View style={styles(theme).taskDots} />}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Privacy Shield */}
            <View style={styles(theme).privacyRow}>
              <ShieldCheck size={13} color="#94A3B8" />
              <Text style={styles(theme).privacyLabel}>Your data is private & secure</Text>
            </View>

            {/* Complete Setup Button */}
            <TouchableOpacity
              style={[styles(theme).completeBtn, analysisProgress < 100 && { opacity: 0.5 }]}
              onPress={handleNext}
              disabled={analysisProgress < 100}
            >
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).completeBtnGradient}
              >
                <Sparkles size={18} color="#FFFFFF" />
                <Text style={styles(theme).completeBtnText}>Complete Setup</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles(theme).analysisFooter}>
              <Text style={styles(theme).laurelSmall}>🌿</Text>
              <View style={styles(theme).footerSocialProof}>
                <Users size={13} color="#94A3B8" />
                <Text style={styles(theme).footerProofText}>Trusted by 100,000+ people worldwide</Text>
              </View>
              <Text style={styles(theme).laurelSmall}>🌿</Text>
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
        {/* Step Dots — only show on actual steps, not welcome screen */}
        {currentStep >= 0 && (
          <View style={styles(theme).progressContainer}>
            <View style={styles(theme).stepDots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles(theme).stepDot,
                    i === currentStep + 1 && styles(theme).stepDotActive,
                    i < currentStep + 1 && styles(theme).stepDotDone,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles(theme).scrollContent,
            currentStep === -1 && { paddingHorizontal: 0 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderStep()}
          </Animated.View>
        </ScrollView>

        {/* Skip Button - inline in progress row, handled above */}
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

        {/* Navigation Buttons — hidden on welcome screen and analysis screen (they have their own CTAs) */}
        {currentStep !== -1 && currentStep !== 8 && (
        <View style={styles(theme).navigationContainer}>
          {currentStep > -1 && (
            <TouchableOpacity style={styles(theme).backButton} onPress={handleBack}>
              <ArrowLeft size={22} color={theme.colors.textPrimary} />
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
                  ? 'Get Started  →'
                  : currentStep === totalSteps - 1
                  ? showCompleteButton
                    ? 'Complete Setup'
                    : 'Analyzing...'
                  : 'Continue'}
              </Text>
              {currentStep !== -1 && (
                currentStep === totalSteps - 1 ? (
                  <CheckCircle size={18} color="#FFFFFF" />
                ) : (
                  <ArrowRight size={18} color="#FFFFFF" />
                )
              )}
            </LinearGradient>
          </TouchableOpacity>
          {/* Step counter in bottom right */}
          {currentStep >= 0 && (
            <View style={styles(theme).stepCounterBadge}>
              <Text style={styles(theme).stepCounterText}>{currentStep + 2}/{totalSteps}</Text>
            </View>
          )}
        </View>
        )}
      </LinearGradient>

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
    backgroundColor: '#0A0B14',
  },
  gradient: {
    flex: 1,
  },
  progressContainer: {
    paddingTop: 14,
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 6,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  stepDotActive: {
    width: 20,
    backgroundColor: '#8B5CF6',
    borderRadius: 3,
  },
  stepDotDone: {
    backgroundColor: 'rgba(139,92,246,0.45)',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100, // Space for navigation buttons (reduced for welcome screen via inline override)
  },

  // === STEP SHARED STYLES ===
  stepContainer: {
    paddingBottom: 24,
  },
  stepHeroContainer: {
    width: '100%',
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    marginTop: 4,
    position: 'relative',
  },
  stepHeroImage: {
    width: '100%',
    height: '100%',
  },
  stepHeroFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  stepHeroFadeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '45%',
  },
  stepHeroBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,11,20,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepHeroBadgeText: {
    fontSize: 11,
    color: 'rgba(226,232,240,0.85)',
    fontWeight: '600',
    marginLeft: 5,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 13,
    color: 'rgba(148,163,184,0.75)',
    marginBottom: 14,
    lineHeight: 18,
  },
  // Grid layout for multi-select (goals, troubles, health)
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48.5%',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,35,60,0.6)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(100,120,255,0.12)',
    minHeight: 80,
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 1.5,
  },
  optionCheckBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 11,
    color: 'rgba(226,232,240,0.75)',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // Stack layout for single-select (pattern, wake feeling)
  optionsStack: {
    marginTop: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30,35,60,0.6)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(100,120,255,0.12)',
  },
  optionRowSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.12)',
  },
  optionRowEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  optionRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.8)',
  },
  optionRowRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRowRadioSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  optionRowRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
  },
  presetRowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  presetRowSub: {
    fontSize: 11,
    color: 'rgba(148,163,184,0.6)',
    marginTop: 2,
  },

  // === DROPDOWN STYLES ===
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(30,35,60,0.7)',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.25)',
    marginBottom: 12,
  },
  dropdownTriggerText: {
    fontSize: 15,
    color: 'rgba(226,232,240,0.7)',
    fontWeight: '500',
    flex: 1,
  },
  selectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139,92,246,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.35)',
  },
  selectedChipText: {
    fontSize: 12,
    color: '#C4B5FD',
    fontWeight: '600',
    marginRight: 6,
  },
  selectedChipRemove: {
    fontSize: 11,
    color: 'rgba(196,181,253,0.6)',
    fontWeight: '700',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  dropdownSheet: {
    backgroundColor: '#13152A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  dropdownHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  dropdownSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(30,35,60,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(100,120,255,0.1)',
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: '#8B5CF6',
  },
  dropdownItemEmoji: {
    fontSize: 22,
    marginRight: 14,
  },
  dropdownItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.75)',
  },
  dropdownItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dropdownDone: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropdownDoneGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // Duration step
  durationDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  durationNumber: {
    fontSize: 56,
    fontWeight: '900',
    color: '#A78BFA',
    lineHeight: 60,
    letterSpacing: -2,
  },
  durationUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(167,139,250,0.7)',
    marginLeft: 8,
  },
  hourButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  hourButton: {
    flex: 1,
    marginHorizontal: 3,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(30,35,60,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(100,120,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourButtonSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  hourButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(226,232,240,0.6)',
  },
  hourButtonTextSelected: {
    color: '#A78BFA',
    fontWeight: '800',
  },
  durationHint: {
    fontSize: 13,
    color: 'rgba(148,163,184,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Personal info step
  formContainer: {
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: 'rgba(226,232,240,0.8)',
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  optionalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(148,163,184,0.5)',
  },
  input: {
    backgroundColor: 'rgba(20,22,40,0.8)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  genderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(30,35,60,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(100,120,255,0.12)',
    marginRight: 8,
    marginBottom: 8,
  },
  genderChipSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  genderChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(226,232,240,0.7)',
  },
  genderChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  analysisScreenContainer: {
    paddingHorizontal: 24,
    paddingTop: 10, // Compact top
    alignItems: 'center',
    flex: 1,
  },
  topIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  analysisTitle: {
    fontSize: 24, // Smaller as requested
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    lineHeight: 30,
  },
  purpleText: {
    color: '#A78BFA',
  },
  analysisSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(148, 163, 184, 0.7)',
    fontFamily: 'Poppins-Medium',
    textAlign: 'center',
  },
  brainSection: {
    marginVertical: 20, // Reduced from 40
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingOuter: {
    width: 190, // Slightly smaller ring
    height: 190,
    borderRadius: 95,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brainImage: {
    width: 170, // Fits more snugly in the 190px ring
    height: 170,
    borderRadius: 85, // Perfect circle
    backgroundColor: 'transparent',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  progressBigPercent: {
    fontSize: 32, // More compact
    fontWeight: '900',
    color: '#A78BFA',
    fontFamily: 'Poppins-Bold',
  },
  progressCalculatingLabel: {
    fontSize: 11,
    color: 'rgba(148, 163, 184, 0.6)',
    fontFamily: 'Poppins-Medium',
    marginTop: -4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
    marginBottom: 20, // Reduced
    columnGap: 10,
  },
  statusPillText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  analysisTasksList: {
    width: '100%',
    rowGap: 10, // Tighter gap
  },
  analysisTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)', // More subtle
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskIconCircleComplete: {
    backgroundColor: '#8B5CF6',
  },
  taskTextCol: {
    flex: 1,
  },
  taskLabel: {
    fontSize: 13, // Smaller
    fontWeight: '700',
    color: '#F1F5F9',
    fontFamily: 'Poppins-Bold',
  },
  taskStatusText: {
    fontSize: 10, // Smaller
    color: '#94A3B8',
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  taskStatusComplete: {
    color: '#8B5CF6',
  },
  taskStatusCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskStatusCheckActive: {
    backgroundColor: '#8B5CF6',
  },
  taskDots: {
    width: 10,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#475569',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16, // Reduced from 24
    columnGap: 6,
  },
  privacyLabel: {
    fontSize: 10,
    color: 'rgba(148, 163, 184, 0.6)',
    fontFamily: 'Poppins-Medium',
  },
  completeBtn: {
    marginTop: 20, // Reduced from 32
    width: '100%',
    height: 58, // Slightly shorter
    borderRadius: 29,
    overflow: 'hidden',
  },
  completeBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 16, // Smaller
    fontWeight: '800',
    fontFamily: 'Poppins-Bold',
  },
  analysisFooter: {
    marginTop: 16, // Reduced from 24
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    paddingBottom: 20,
  },
  footerSocialProof: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  footerProofText: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.6)',
    fontFamily: 'Poppins-Medium',
  },
  laurelSmall: {
    fontSize: 20,
    opacity: 0.4,
  },

  // === ANALYSIS SCREEN NEW STYLES ===
  progressBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(10,11,20,0.9)',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
    zIndex: 10,
    marginBottom: -14,
  },
  progressRingGlow: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: 'rgba(139,92,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 0,
  },
  taskAccentBar: {
    width: 3,
    height: '70%',
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 10,
  },
  taskAccentBarDone: {
    backgroundColor: '#8B5CF6',
  },
  taskLabelDone: {
    color: '#FFFFFF',
  },
  analysisTaskCardDone: {
    borderColor: 'rgba(139,92,246,0.25)',
    backgroundColor: 'rgba(139,92,246,0.06)',
  },

  skipButtonTopRight: {
    position: 'absolute',
    top: 14,
    right: 24,
    paddingVertical: 6,
    paddingHorizontal: 14,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
  },
  skipButtonText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  
  // === WELCOME SCREEN STYLES ===
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#040615',
  },
  heroImageContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: SCREEN_HEIGHT * 0.58,
    backgroundColor: '#040615',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    right: 0,
    opacity: 0.9,
  },
  heroMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '70%', // Mask covers more than half to ensure text area is dark
    height: '100%',
  },
  bgGlowTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#4F46E5',
    opacity: 0.15,
  },
  bgGlowCenter: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.4,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#7C3AED',
    opacity: 0.1,
  },
  welcomeScrollContent: {
    paddingBottom: 40,
  },
  welcomeContentWrapper: {
    paddingHorizontal: 24,
    paddingTop: SCREEN_HEIGHT * 0.12,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    letterSpacing: -1.5,
    lineHeight: 52,
    maxWidth: '65%', // Keep text on the left
  },
  mainTitleGradient: {
    color: '#A78BFA',
    fontFamily: 'Poppins-Bold',
  },
  mainSubtitle: {
    marginTop: 20,
    fontSize: 18,
    lineHeight: 28,
    color: 'rgba(203, 213, 225, 0.85)',
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
    maxWidth: '75%', // Keep text on the left
  },
  ratingBox: {
    marginTop: 32,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    backgroundColor: 'rgba(18, 21, 45, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  ratingStars: {
    flexDirection: 'row',
    marginRight: 10,
    columnGap: 2,
  },
  ratingTextValue: {
    color: '#FFC84D',
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  cardsGrid: {
    flexDirection: 'row',
    marginTop: 32,
    columnGap: 10,
  },
  featureCard: {
    flex: 1,
    borderRadius: 20,
    minHeight: 130,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureIconGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  featureCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F1F5F9',
    textAlign: 'center',
    lineHeight: 17,
    fontFamily: 'Poppins-Bold',
  },
  featureCardSub: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: 'rgba(203, 213, 225, 0.65)',
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
  trustedCard: {
    marginTop: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 18,
  },
  trustedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(226, 232, 240, 0.9)',
    marginBottom: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  trustedInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustedAvatars: {
    flexDirection: 'row',
    marginRight: 12,
  },
  trustedAvatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#040615',
  },
  trustedTextCol: {
    flex: 1,
  },
  trustedCount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F1F5F9',
    fontFamily: 'Poppins-Bold',
  },
  trustedLabel: {
    fontSize: 11,
    color: 'rgba(203, 213, 225, 0.6)',
    fontWeight: '500',
    fontFamily: 'Poppins-Regular',
  },
  trustedDeco: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  trustedZz: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8B5CF6',
    fontFamily: 'Poppins-Bold',
    transform: [{ rotate: '-10deg' }],
  },
  setupTimeSmallText: {
    color: 'rgba(148, 163, 184, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  newCtaBtn: {
    marginTop: 32,
    width: '100%',
    height: 64,
    borderRadius: 32,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  newCtaGradient: {
    flex: 1,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 12,
  },
  newCtaText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  footerLockRow: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  footerLockText: {
    color: 'rgba(148, 163, 184, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  footerAwardsRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 16,
    paddingBottom: 20,
  },
  awardItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  laurelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  laurel: {
    fontSize: 24,
    opacity: 0.6,
  },
  laurelRight: {
    transform: [{ scaleX: -1 }],
  },
  footerAwardText: {
    color: 'rgba(148, 163, 184, 0.6)',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  footerAwardDiv: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  // Removed: logoWrapper, logoImage, welcomeIconWrapper, socialProofRow, socialProofTextCol,
  //          avatarEmoji, timeEstimate, trustBadge, trustBadgeText (replaced with new styles)
  // Step counter badge in nav bar
  stepCounterBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    fontFamily: 'Poppins-Bold',
  },
  

  navigationContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    rowGap: 12, columnGap: 12,
    backgroundColor: 'rgba(10,11,20,0.97)',
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
    rowGap: 8, columnGap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },



  // Celebration overlay
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,11,20,0.82)',
    zIndex: 100,
  },
  celebrationCard: {
    backgroundColor: 'rgba(30,35,60,0.97)',
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 48,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(139,92,246,0.4)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  celebrationEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  celebrationTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  celebrationSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
});
