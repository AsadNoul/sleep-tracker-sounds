import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  Moon,
  BookOpen,
  Wind,
  Coffee,
  Smartphone,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';

const { width } = Dimensions.get('window');

interface RoutineStep {
  id: string;
  title: string;
  duration: number; // in minutes
  icon: React.ReactNode;
  description: string;
}

const DEFAULT_STEPS: RoutineStep[] = [
  {
    id: '1',
    title: 'Digital Detox',
    duration: 5,
    icon: <Smartphone size={24} color="#FF6B6B" />,
    description: 'Put away all electronic devices to reduce blue light exposure.'
  },
  {
    id: '2',
    title: 'Light Stretching',
    duration: 10,
    icon: <Wind size={24} color="#4ECDC4" />,
    description: 'Gentle movements to release physical tension from the day.'
  },
  {
    id: '3',
    title: 'Reading',
    duration: 15,
    icon: <BookOpen size={24} color="#FFE66D" />,
    description: 'Read a physical book to calm your mind.'
  },
  {
    id: '4',
    title: 'Herbal Tea',
    duration: 5,
    icon: <Coffee size={24} color="#95A5A6" />,
    description: 'Enjoy a warm, caffeine-free beverage.'
  },
  {
    id: '5',
    title: 'Meditation',
    duration: 10,
    icon: <Moon size={24} color="#8B5CF6" />,
    description: 'Focus on your breath and clear your thoughts.'
  }
];

export default function BedtimeRoutineScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem('bedtime_routine_progress');
      if (stored) {
        setCompletedSteps(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load progress', error);
    }
  };

  const saveProgress = async (steps: string[]) => {
    try {
      await AsyncStorage.setItem('bedtime_routine_progress', JSON.stringify(steps));
    } catch (error) {
      console.error('Failed to save progress', error);
    }
  };

  const resetRoutine = async () => {
    setCompletedSteps([]);
    await AsyncStorage.removeItem('bedtime_routine_progress');
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      if (activeStep) {
        handleToggleStep(activeStep);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, activeStep]);

  const handleToggleStep = (id: string) => {
    let newSteps;
    if (completedSteps.includes(id)) {
      newSteps = completedSteps.filter(stepId => stepId !== id);
    } else {
      newSteps = [...completedSteps, id];
    }
    setCompletedSteps(newSteps);
    saveProgress(newSteps);
  };

  const startTimer = (step: RoutineStep) => {
    setActiveStep(step.id);
    setTimeLeft(step.duration * 60);
    setIsActive(true);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        style={styles(theme).gradient}
      >
        {/* Header */}
        <View style={[styles(theme).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles(theme).backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme).headerTitle}>Bedtime Routine</Text>
          <TouchableOpacity onPress={resetRoutine} style={styles(theme).resetButton}>
            <RotateCcw size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles(theme).content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles(theme).scrollContent}
        >
          {/* Active Timer Card */}
          {activeStep && (
            Platform.OS === 'ios' ? (
              <BlurView intensity={30} tint="dark" style={styles(theme).timerCard}>
                <Text style={styles(theme).timerLabel}>
                  {DEFAULT_STEPS.find(s => s.id === activeStep)?.title}
                </Text>
                <Text style={styles(theme).timerValue}>{formatTime(timeLeft)}</Text>
                <View style={styles(theme).timerControls}>
                  <TouchableOpacity
                    style={styles(theme).controlButton}
                    onPress={() => setIsActive(!isActive)}
                  >
                    {isActive ? <Pause size={24} color="#FFF" /> : <Play size={24} color="#FFF" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles(theme).controlButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={() => {
                      setIsActive(false);
                      setActiveStep(null);
                    }}
                  >
                    <RotateCcw size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </BlurView>
            ) : (
              <View style={styles(theme).timerCard}>
                <Text style={styles(theme).timerLabel}>
                  {DEFAULT_STEPS.find(s => s.id === activeStep)?.title}
                </Text>
                <Text style={styles(theme).timerValue}>{formatTime(timeLeft)}</Text>
                <View style={styles(theme).timerControls}>
                  <TouchableOpacity
                    style={styles(theme).controlButton}
                    onPress={() => setIsActive(!isActive)}
                  >
                    {isActive ? <Pause size={24} color="#FFF" /> : <Play size={24} color="#FFF" />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles(theme).controlButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={() => {
                      setIsActive(false);
                      setActiveStep(null);
                    }}
                  >
                    <RotateCcw size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}

          <Text style={styles(theme).sectionTitle}>Tonight's Routine</Text>
          <Text style={styles(theme).sectionSubtitle}>
            Complete these steps to prepare your mind and body for deep sleep.
          </Text>

          {DEFAULT_STEPS.map((step) => (
            <TouchableOpacity
              key={step.id}
              style={[
                styles(theme).stepCard,
                completedSteps.includes(step.id) && styles(theme).stepCardCompleted
              ]}
              onPress={() => handleToggleStep(step.id)}
            >
              {Platform.OS === 'ios' ? (
                <BlurView intensity={20} tint="dark" style={styles(theme).stepBlur}>
                  <View style={styles(theme).stepHeader}>
                    <View style={styles(theme).iconContainer}>
                      {step.icon}
                    </View>
                    <View style={styles(theme).stepInfo}>
                      <Text style={styles(theme).stepTitle}>{step.title}</Text>
                      <Text style={styles(theme).stepDuration}>{step.duration} mins</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        startTimer(step);
                      }}
                      style={styles(theme).playButton}
                    >
                      <Play size={20} color={theme.colors.accent} fill={theme.colors.accent} />
                    </TouchableOpacity>
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle2 size={24} color={theme.colors.accent} />
                    ) : (
                      <Circle size={24} color="rgba(255,255,255,0.3)" />
                    )}
                  </View>
                  <Text style={styles(theme).stepDescription}>{step.description}</Text>
                </BlurView>
              ) : (
                <View style={styles(theme).stepBlur}>
                  <View style={styles(theme).stepHeader}>
                    <View style={styles(theme).iconContainer}>
                      {step.icon}
                    </View>
                    <View style={styles(theme).stepInfo}>
                      <Text style={styles(theme).stepTitle}>{step.title}</Text>
                      <Text style={styles(theme).stepDuration}>{step.duration} mins</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        startTimer(step);
                      }}
                      style={styles(theme).playButton}
                    >
                      <Play size={20} color={theme.colors.accent} fill={theme.colors.accent} />
                    </TouchableOpacity>
                    {completedSteps.includes(step.id) ? (
                      <CheckCircle2 size={24} color={theme.colors.accent} />
                    ) : (
                      <Circle size={24} color="rgba(255,255,255,0.3)" />
                    )}
                  </View>
                  <Text style={styles(theme).stepDescription}>{step.description}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          <View style={styles(theme).bottomSpacing} />
        </ScrollView>

        {/* Complete Button */}
        <View style={styles(theme).footer}>
          <TouchableOpacity
            style={[
              styles(theme).completeButton,
              completedSteps.length === DEFAULT_STEPS.length && styles(theme).completeButtonActive
            ]}
            onPress={() => navigation.goBack()}
          >
            <LinearGradient
              colors={completedSteps.length === DEFAULT_STEPS.length
                ? [theme.colors.accent, theme.colors.highlight]
                : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles(theme).completeGradient}
            >
              <Text style={[
                styles(theme).completeText,
                completedSteps.length === DEFAULT_STEPS.length && { color: theme.colors.background }
              ]}>
                {completedSteps.length === DEFAULT_STEPS.length ? 'Routine Complete' : `${completedSteps.length}/${DEFAULT_STEPS.length} Steps Done`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  resetButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  timerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  timerLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  timerControls: {
    flexDirection: 'row',
    marginTop: 20,
    rowGap: 15, columnGap: 15,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  stepCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stepCardCompleted: {
    borderColor: theme.colors.accent,
    opacity: 0.8,
  },
  stepBlur: {
    padding: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  stepDuration: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginTop: 12,
    opacity: 0.8,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  completeButtonActive: {
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  completeGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  completeText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  bottomSpacing: {
    height: 40,
  },
});