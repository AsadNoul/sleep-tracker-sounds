import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
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
  RotateCcw,
  Bell,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';

// Canvas reference: Rlx-Routine.dc.html (+ D-Rlx-Routine.dc.html day variant).
// Numbered step rows inside one card, duration pill + bell glyph per row,
// big "Start routine now" CTA. All data/logic below (steps, completion,
// timer, AsyncStorage persistence) is unchanged from the previous build —
// only JSX/styling was rebuilt to match the canvas.

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
    icon: <Smartphone size={20} color="#FF6B6B" />,
    description: 'Put away all electronic devices to reduce blue light exposure.'
  },
  {
    id: '2',
    title: 'Light Stretching',
    duration: 10,
    icon: <Wind size={20} color="#4ECDC4" />,
    description: 'Gentle movements to release physical tension from the day.'
  },
  {
    id: '3',
    title: 'Reading',
    duration: 15,
    icon: <BookOpen size={20} color="#FFE66D" />,
    description: 'Read a physical book to calm your mind.'
  },
  {
    id: '4',
    title: 'Herbal Tea',
    duration: 5,
    icon: <Coffee size={20} color="#95A5A6" />,
    description: 'Enjoy a warm, caffeine-free beverage.'
  },
  {
    id: '5',
    title: 'Meditation',
    duration: 10,
    icon: <Moon size={20} color="#8B5CF6" />,
    description: 'Focus on your breath and clear your thoughts.'
  }
];

const TOTAL_MINUTES = DEFAULT_STEPS.reduce((sum, step) => sum + step.duration, 0);

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

  const s = styles(theme);
  const activeStepData = activeStep ? DEFAULT_STEPS.find(st => st.id === activeStep) : null;
  const allDone = completedSteps.length === DEFAULT_STEPS.length;

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={[s.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.headerTitleBlock}>
          <Text style={[s.headerTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            Bedtime routine
          </Text>
          <Text style={[s.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {TOTAL_MINUTES} min total · {completedSteps.length}/{DEFAULT_STEPS.length} done
          </Text>
        </View>
        <TouchableOpacity
          onPress={resetRoutine}
          style={[s.resetButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        >
          <RotateCcw size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Active Timer Card */}
        {activeStepData && (
          <View style={[s.timerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.accentBorder }]}>
            <View pointerEvents="none" style={[s.timerGlow, { backgroundColor: theme.colors.accentLight }]} />
            <Text style={[s.timerLabel, { color: theme.colors.textSecondary }]}>
              {activeStepData.title}
            </Text>
            <Text style={[s.timerValue, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
              {formatTime(timeLeft)}
            </Text>
            <View style={s.timerControls}>
              <TouchableOpacity
                style={[s.controlButton, { backgroundColor: theme.colors.ctaBackground }]}
                onPress={() => setIsActive(!isActive)}
              >
                {isActive ? (
                  <Pause size={22} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
                ) : (
                  <Play size={22} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.controlButton, { backgroundColor: theme.colors.backgroundTertiary, borderWidth: 1, borderColor: theme.colors.cardBorder }]}
                onPress={() => {
                  setIsActive(false);
                  setActiveStep(null);
                }}
              >
                <RotateCcw size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Steps card — canvas: numbered rows with duration pill + bell glyph */}
        <View style={[s.stepsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          {DEFAULT_STEPS.map((step, index) => {
            const isDone = completedSteps.includes(step.id);
            const isLast = index === DEFAULT_STEPS.length - 1;
            return (
              <TouchableOpacity
                key={step.id}
                style={[s.stepRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder }]}
                onPress={() => handleToggleStep(step.id)}
                activeOpacity={0.8}
              >
                <View style={[s.stepNumber, { backgroundColor: theme.colors.backgroundTertiary, borderColor: theme.colors.cardBorder }]}>
                  {isDone ? (
                    <CheckCircle2 size={16} color={theme.colors.accent} />
                  ) : (
                    <Text style={[s.stepNumberText, { color: theme.colors.textPrimary }]}>{index + 1}</Text>
                  )}
                </View>
                <View style={s.stepIconWrap}>{step.icon}</View>
                <View style={s.stepTextCol}>
                  <Text
                    style={[
                      s.stepTitle,
                      { color: theme.colors.textPrimary },
                      isDone && { color: theme.colors.textTertiary, textDecorationLine: 'line-through' },
                    ]}
                  >
                    {step.title}
                  </Text>
                  <Text style={[s.stepDescription, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {step.description}
                  </Text>
                </View>
                <View style={[s.durationPill, { backgroundColor: theme.colors.backgroundTertiary, borderColor: theme.colors.cardBorder }]}>
                  <Text style={[s.durationPillText, { color: theme.colors.textPrimary }]}>{step.duration} min</Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    startTimer(step);
                  }}
                  style={[s.playButton, { backgroundColor: theme.colors.accentLight }]}
                >
                  <Play size={15} color={theme.colors.accent} fill={theme.colors.accent} />
                </TouchableOpacity>
                {isDone ? (
                  <CheckCircle2 size={22} color={theme.colors.accent} />
                ) : (
                  <Circle size={22} color={theme.colors.cardBorder} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Reminder note — static bell row, mirrors canvas's reminder card tone */}
        <View style={[s.reminderCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={[s.reminderIconWrap, { backgroundColor: theme.colors.accentLight }]}>
            <Bell size={16} color={theme.colors.accent} />
          </View>
          <Text style={[s.reminderText, { color: theme.colors.textSecondary }]}>
            Complete each step to prepare your mind and body for deep sleep.
          </Text>
        </View>

        <Text style={[s.footerHint, { color: theme.colors.textTertiary }]}>
          {allDone ? 'Routine complete tonight 🌙' : `${DEFAULT_STEPS.length - completedSteps.length} steps left`}
        </Text>

        <View style={s.bottomSpacing} />
      </ScrollView>

      {/* Complete Button */}
      <View style={[s.footer, { paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 20) }]}>
        <TouchableOpacity
          style={[
            s.completeButton,
            { backgroundColor: allDone ? theme.colors.ctaBackground : theme.colors.backgroundTertiary },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Text style={[s.completeText, { color: allDone ? theme.colors.ctaText : theme.colors.textSecondary }]}>
            {allDone ? 'Routine Complete' : `${completedSteps.length}/${DEFAULT_STEPS.length} Steps Done`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    marginTop: 2,
  },
  resetButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  timerCard: {
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  timerGlow: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 999,
  },
  timerLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    marginBottom: 6,
  },
  timerValue: {
    fontSize: 44,
    letterSpacing: -0.5,
  },
  timerControls: {
    flexDirection: 'row',
    columnGap: 14,
    marginTop: 18,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepsCard: {
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepTextCol: {
    flex: 1,
    rowGap: 2,
  },
  stepTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
  },
  stepDescription: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
  },
  durationPill: {
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 99,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  durationPillText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  reminderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  reminderText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    lineHeight: 19,
  },
  footerHint: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  completeButton: {
    height: 58,
    borderRadius: theme.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
  },
});
