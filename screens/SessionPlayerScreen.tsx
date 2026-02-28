import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { X, Activity, Clock, Gauge, Volume2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ICON_MAP: Record<string, any> = {
  'bed-outline': 'bed',
  'heart-circle-outline': 'heart',
  'water-outline': 'water',
  'pulse-outline': 'pulse',
  'leaf-outline': 'leaf',
  'sparkles-outline': 'sparkles',
  'eye-outline': 'eye',
};
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import Slider from '@react-native-community/slider';
import { saveMindfulnessSession } from '../utils/mindfulnessTracking';

const { width, height } = Dimensions.get('window');

interface SessionStep {
  id: string;
  instruction: string;
  duration: number; // in seconds
  icon: string;
}

interface SessionStepTemplate {
  id: string;
  icon: string;
  weight: number;
  instruction: (title: string) => string;
}

interface MindfulnessCompletionTracking {
  sessionId: string;
  sessionTitle: string;
  category: string;
  duration: number;
  userId?: string;
}

const parseSessionDurationSeconds = (durationValue: unknown): number => {
  if (typeof durationValue !== 'string') return 12 * 60;

  const match = durationValue.match(/\d+/);
  const minutes = match ? Number.parseInt(match[0], 10) : 12;
  if (Number.isNaN(minutes) || minutes <= 0) return 12 * 60;

  return minutes * 60;
};

const getSessionKind = (session: any): 'story' | 'music' | 'morning' | 'power-nap' | 'quick-relief' | 'breathing' | 'meditation' => {
  const id = String(session?.id || '').toLowerCase();

  if (id.includes('story')) return 'story';
  if (id.includes('nap')) return 'power-nap';
  if (id.includes('morning')) return 'morning';
  if (id.includes('music') || id.includes('waves') || id.includes('ambient')) return 'music';
  if (id.includes('breath')) return 'breathing';
  if (id.includes('anxiety') || id.includes('panic') || id.includes('stress') || id.includes('worry')) return 'quick-relief';
  return 'meditation';
};

const SESSION_TEMPLATES: Record<string, SessionStepTemplate[]> = {
  meditation: [
    { id: 'arrive', icon: 'bed-outline', weight: 2, instruction: (title) => `Welcome to ${title}. Settle your body and let your shoulders soften.` },
    { id: 'breath', icon: 'heart-circle-outline', weight: 3, instruction: () => 'Take slow breaths in and out. Let each exhale release tension.' },
    { id: 'focus', icon: 'pulse-outline', weight: 4, instruction: () => 'Rest your attention on one anchor: breath, body, or sound.' },
    { id: 'release', icon: 'leaf-outline', weight: 3, instruction: () => 'When thoughts appear, notice them kindly and return to the present moment.' },
    { id: 'close', icon: 'eye-outline', weight: 2, instruction: () => 'Gently close the practice and carry this calm into the next part of your day.' },
  ],
  'quick-relief': [
    { id: 'ground', icon: 'bed-outline', weight: 2, instruction: () => 'Ground yourself. Feel your feet, seat, and one stable point in the room.' },
    { id: 'pace', icon: 'heart-circle-outline', weight: 3, instruction: () => 'Inhale for 4, exhale for 6. Keep the exhale longer than the inhale.' },
    { id: 'name', icon: 'pulse-outline', weight: 3, instruction: () => 'Name what you feel without judgment. You are safe in this moment.' },
    { id: 'reset', icon: 'leaf-outline', weight: 2, instruction: () => 'Relax your jaw, shoulders, and hands. Let your nervous system downshift.' },
    { id: 'finish', icon: 'eye-outline', weight: 2, instruction: () => 'Take one final deep breath and continue with more steadiness.' },
  ],
  breathing: [
    { id: 'prepare', icon: 'bed-outline', weight: 2, instruction: () => 'Sit tall and soften your belly. Prepare for paced breathing.' },
    { id: 'inhale', icon: 'heart-circle-outline', weight: 3, instruction: () => 'Inhale gently through the nose, smooth and controlled.' },
    { id: 'hold', icon: 'pulse-outline', weight: 2, instruction: () => 'Hold softly without strain. Keep your neck and face relaxed.' },
    { id: 'exhale', icon: 'water-outline', weight: 4, instruction: () => 'Exhale slowly and fully, longer than the inhale when possible.' },
    { id: 'integrate', icon: 'eye-outline', weight: 2, instruction: () => 'Return to natural breathing and notice the calmer baseline.' },
  ],
  morning: [
    { id: 'wake', icon: 'sparkles-outline', weight: 2, instruction: () => 'Wake gently. Notice one thing you appreciate this morning.' },
    { id: 'activate', icon: 'heart-circle-outline', weight: 3, instruction: () => 'Breathe deeply and lengthen your spine to boost alertness.' },
    { id: 'intention', icon: 'leaf-outline', weight: 3, instruction: () => 'Set one clear intention for your day.' },
    { id: 'focus', icon: 'pulse-outline', weight: 3, instruction: () => 'Hold steady attention for a few breaths with calm confidence.' },
    { id: 'launch', icon: 'eye-outline', weight: 2, instruction: () => 'Open your eyes and start your day with purpose.' },
  ],
  'power-nap': [
    { id: 'settle', icon: 'bed-outline', weight: 2, instruction: () => 'Get comfortable and allow your body to become heavy.' },
    { id: 'drift', icon: 'heart-circle-outline', weight: 4, instruction: () => 'Slow your breath and drift into a light restorative state.' },
    { id: 'restore', icon: 'leaf-outline', weight: 4, instruction: () => 'Stay passive and let recovery happen naturally.' },
    { id: 'wake', icon: 'sparkles-outline', weight: 2, instruction: () => 'Begin waking slowly with deeper breaths and gentle movement.' },
  ],
  story: [
    { id: 'settle', icon: 'bed-outline', weight: 2, instruction: (title) => `Settle in for ${title}. Let the story carry your attention.` },
    { id: 'listen', icon: 'heart-circle-outline', weight: 4, instruction: () => 'Listen softly. If thoughts appear, return to the narrator’s voice.' },
    { id: 'imagine', icon: 'sparkles-outline', weight: 4, instruction: () => 'Visualize the scene gently and keep your breathing unforced.' },
    { id: 'drift', icon: 'leaf-outline', weight: 3, instruction: () => 'Allow the story to fade into rest as your body unwinds.' },
  ],
  music: [
    { id: 'arrive', icon: 'bed-outline', weight: 2, instruction: () => 'Lie back and let the soundscape fill the space around you.' },
    { id: 'breathe', icon: 'heart-circle-outline', weight: 3, instruction: () => 'Sync your breathing to the rhythm: steady and calm.' },
    { id: 'release', icon: 'leaf-outline', weight: 4, instruction: () => 'Drop effort and let your body melt into the music.' },
    { id: 'rest', icon: 'sparkles-outline', weight: 3, instruction: () => 'Remain still and absorb the calm for the rest of the session.' },
  ],
};

const buildSessionSteps = (session: any): SessionStep[] => {
  const sessionKind = getSessionKind(session);
  const templates = SESSION_TEMPLATES[sessionKind] ?? SESSION_TEMPLATES.meditation;
  const totalSeconds = parseSessionDurationSeconds(session?.duration);
  const totalWeight = templates.reduce((sum, step) => sum + step.weight, 0);
  const minStepSeconds = 20;

  const scaledSteps = templates.map((template) => ({
    id: template.id,
    icon: template.icon,
    instruction: template.instruction(session?.title || 'this session'),
    duration: Math.max(minStepSeconds, Math.round((totalSeconds * template.weight) / totalWeight)),
  }));

  const scaledTotal = scaledSteps.reduce((sum, step) => sum + step.duration, 0);
  const delta = totalSeconds - scaledTotal;
  if (delta !== 0 && scaledSteps.length > 0) {
    scaledSteps[scaledSteps.length - 1].duration = Math.max(
      minStepSeconds,
      scaledSteps[scaledSteps.length - 1].duration + delta,
    );
  }

  return scaledSteps;
};

export default function SessionPlayerScreen() {
  const { theme, isDark } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { session, mindfulnessCompletionTracking } = route.params as {
    session: any;
    mindfulnessCompletionTracking?: MindfulnessCompletionTracking;
  };
  const { user } = useAuth();

  const { isPlaying, volume, playSound, pauseSound, resumeSound, stopSound, setVolume } = useAudio();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sleepSafeMinutes, setSleepSafeMinutes] = useState(0);
  const [sleepSafeRemainingSeconds, setSleepSafeRemainingSeconds] = useState<number | null>(null);
  const originalVolumeRef = useRef<number | null>(null);
  const completionLoggedRef = useRef(false);
  const sleepSafeStorageKey = `@sleep_safe_mode_minutes_${user?.id || 'guest'}`;

  useEffect(() => {
    const loadSleepSafePreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(sleepSafeStorageKey);
        if (!stored) return;

        const parsed = Number.parseInt(stored, 10);
        if (!Number.isNaN(parsed) && [0, 15, 30, 45].includes(parsed)) {
          setSleepSafeMinutes(parsed);
          setSleepSafeRemainingSeconds(parsed > 0 ? parsed * 60 : null);
        }
      } catch (_) {}
    };

    loadSleepSafePreference();
  }, [sleepSafeStorageKey]);

  const sessionSteps = useMemo(() => buildSessionSteps(session), [
    session?.id,
    session?.title,
    session?.duration,
    session?.description,
  ]);

  useEffect(() => {
    // Calculate total duration from steps
    const total = sessionSteps.reduce((acc, step) => acc + step.duration, 0);
    setTotalDuration(total);
  }, [sessionSteps]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isSessionActive && isPlaying) {
      interval = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;

          // Check if we should move to next step
          let cumulativeTime = 0;
          for (let i = 0; i < sessionSteps.length; i++) {
            cumulativeTime += sessionSteps[i].duration;
            if (newTime < cumulativeTime) {
              if (i !== currentStepIndex) {
                setCurrentStepIndex(i);
              }
              break;
            }
          }

          // Check if session completed
          if (newTime >= totalDuration) {
            handleSessionComplete();
            return totalDuration;
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSessionActive, isPlaying, currentStepIndex, totalDuration]);

  const restoreVolume = useCallback(async () => {
    if (originalVolumeRef.current !== null) {
      try {
        await setVolume(originalVolumeRef.current);
      } catch (_) {}
      originalVolumeRef.current = null;
    }
  }, [setVolume]);

  const resetSessionState = useCallback(() => {
    setIsSessionActive(false);
    setElapsedTime(0);
    setCurrentStepIndex(0);
    setSleepSafeRemainingSeconds(sleepSafeMinutes > 0 ? sleepSafeMinutes * 60 : null);
  }, [sleepSafeMinutes]);

  useEffect(() => {
    if (!isSessionActive || !isPlaying || sleepSafeMinutes <= 0) return;

    if (sleepSafeRemainingSeconds === null) {
      setSleepSafeRemainingSeconds(sleepSafeMinutes * 60);
      if (originalVolumeRef.current === null) {
        originalVolumeRef.current = volume;
      }
      return;
    }

    const timer = setInterval(() => {
      setSleepSafeRemainingSeconds((prev) => (prev === null ? null : Math.max(prev - 1, 0)));
    }, 1000);

    return () => clearInterval(timer);
  }, [isSessionActive, isPlaying, sleepSafeMinutes, sleepSafeRemainingSeconds, volume]);

  useEffect(() => {
    if (!isSessionActive || sleepSafeRemainingSeconds === null || sleepSafeMinutes <= 0) return;

    const fadeWindowSeconds = 20;
    if (sleepSafeRemainingSeconds > 0 && sleepSafeRemainingSeconds <= fadeWindowSeconds) {
      const baseVolume = originalVolumeRef.current ?? volume;
      const ratio = sleepSafeRemainingSeconds / fadeWindowSeconds;
      const targetVolume = Math.max(0.03, Math.min(baseVolume, baseVolume * ratio));
      setVolume(targetVolume).catch(() => {});
    }

    if (sleepSafeRemainingSeconds === 0) {
      const stopWithFade = async () => {
        await stopSound();
        await restoreVolume();
        resetSessionState();
      };
      stopWithFade();
    }
  }, [sleepSafeRemainingSeconds, isSessionActive, sleepSafeMinutes, volume, setVolume, stopSound, restoreVolume, resetSessionState]);

  const handleStartSession = async () => {
    try {
      if (session?.uri) {
        if (sleepSafeMinutes > 0) {
          originalVolumeRef.current = volume;
          setSleepSafeRemainingSeconds(sleepSafeMinutes * 60);
        } else {
          setSleepSafeRemainingSeconds(null);
        }
        await playSound(session.id, session.uri, session.title);
        setIsSessionActive(true);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const handlePauseResume = async () => {
    try {
      if (isPlaying) {
        await pauseSound();
      } else {
        if (isSessionActive) {
          await resumeSound();
        } else {
          await handleStartSession();
        }
      }
    } catch (error) {
      console.error('Error pausing/resuming:', error);
    }
  };

  const handleStop = async () => {
    try {
      await stopSound();
      await restoreVolume();
      resetSessionState();
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  const handleSessionComplete = async () => {
    await stopSound();
    await restoreVolume();
    setIsSessionActive(false);

    if (!completionLoggedRef.current && mindfulnessCompletionTracking) {
      completionLoggedRef.current = true;
      try {
        await saveMindfulnessSession(mindfulnessCompletionTracking);
      } catch (_) {}
    }
  };

  const handleClose = async () => {
    if (isPlaying) {
      await stopSound();
    }
    await restoreVolume();
    navigation.goBack();
  };

  const handleSleepSafeSelect = (minutes: number) => {
    setSleepSafeMinutes(minutes);
    AsyncStorage.setItem(sleepSafeStorageKey, String(minutes)).catch(() => {});
    if (!isSessionActive) {
      setSleepSafeRemainingSeconds(minutes > 0 ? minutes * 60 : null);
      return;
    }

    if (minutes > 0) {
      if (originalVolumeRef.current === null) {
        originalVolumeRef.current = volume;
      }
      setSleepSafeRemainingSeconds(minutes * 60);
    } else {
      setSleepSafeRemainingSeconds(null);
      restoreVolume();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (totalDuration === 0) return 0;
    return elapsedTime / totalDuration;
  };

  const getCurrentStepProgress = () => {
    let cumulativeTime = 0;
    for (let i = 0; i < currentStepIndex; i++) {
      cumulativeTime += sessionSteps[i].duration;
    }
    const currentStepElapsed = elapsedTime - cumulativeTime;
    const currentStepDuration = sessionSteps[currentStepIndex]?.duration || 1;
    return currentStepElapsed / currentStepDuration;
  };

  const currentStep = sessionSteps[currentStepIndex];
  const sleepSafeTimerText = sleepSafeRemainingSeconds === null
    ? 'Off'
    : formatTime(sleepSafeRemainingSeconds);

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary, '#2A1D3A']}
        style={styles(theme).gradient}
      >
        {/* Header */}
        <View style={styles(theme).header}>
          <TouchableOpacity onPress={handleClose} style={styles(theme).closeButton}>
            <X size={28} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme).headerTitle}>{session?.title}</Text>
          <View style={styles(theme).closeButton} />
        </View>

        <ScrollView
          style={styles(theme).content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles(theme).scrollContent}
        >
          {/* Session Image/Visualization */}
          <View style={styles(theme).visualizationContainer}>
            <BlurView intensity={60} tint="dark" style={styles(theme).visualizationBlur}>
              <LinearGradient
                colors={['rgba(157, 78, 221, 0.3)', 'rgba(0, 255, 209, 0.3)', 'rgba(51, 198, 255, 0.3)']}
                style={styles(theme).visualizationGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles(theme).imageWrapper}>
                  <Image
                    source={{ uri: session?.image }}
                    style={styles(theme).sessionImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(15, 17, 26, 0.8)']}
                    style={styles(theme).imageOverlay}
                  />
                </View>

                {/* Breathing Circle Animation */}
                {isPlaying && (
                  <View style={styles(theme).breathingCircle}>
                    <LinearGradient
                      colors={[theme.colors.accent, theme.colors.highlight, '#9D4EDD']}
                      style={styles(theme).circleGradient}
                    >
                      <View style={styles(theme).circleInner}>
                        <Activity size={40} color={theme.colors.textPrimary} />
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </LinearGradient>
            </BlurView>
          </View>

          {/* Session Info */}
          <View style={styles(theme).sessionInfo}>
            <View style={styles(theme).infoRow}>
              <View style={styles(theme).infoBadge}>
                <Clock size={16} color={theme.colors.accent} />
                <Text style={styles(theme).infoBadgeText}>{session?.duration}</Text>
              </View>
              <View style={styles(theme).infoBadge}>
                <Gauge size={16} color={theme.colors.premium} />
                <Text style={styles(theme).infoBadgeText}>{session?.difficulty}</Text>
              </View>
            </View>
            <Text style={styles(theme).sessionDescription}>{session?.description}</Text>
          </View>

          {/* Current Step Card */}
          {isSessionActive && (
            <BlurView intensity={20} tint="dark" style={styles(theme).stepCard}>
              <View style={styles(theme).stepHeader}>
                <Ionicons 
                  name={ICON_MAP[currentStep?.icon] || 'pulse'} 
                  size={24} 
                  color={theme.colors.accent} 
                />
                <Text style={styles(theme).stepNumber}>
                  Step {currentStepIndex + 1} of {sessionSteps.length}
                </Text>
              </View>

              <Text style={styles(theme).stepInstruction}>{currentStep?.instruction}</Text>

              {/* Step Progress */}
              <View style={styles(theme).stepProgressContainer}>
                <View style={styles(theme).stepProgressBar}>
                  <View
                    style={[
                      styles(theme).stepProgressFill,
                      { width: `${getCurrentStepProgress() * 100}%` }
                    ]}
                  />
                </View>
              </View>
            </BlurView>
          )}

          {/* All Steps List */}
          {!isSessionActive && (
            <View style={styles(theme).stepsContainer}>
              <Text style={styles(theme).stepsTitle}>Session Steps</Text>
              {sessionSteps.map((step, index) => (
                <BlurView key={step.id} intensity={15} tint="dark" style={styles(theme).stepItem}>
                  <View style={styles(theme).stepIconContainer}>
                    <Ionicons 
                      name={ICON_MAP[step.icon] || 'pulse'} 
                      size={20} 
                      color={theme.colors.accent} 
                    />
                  </View>
                  <View style={styles(theme).stepContent}>
                    <Text style={styles(theme).stepItemTitle}>Step {index + 1}</Text>
                    <Text style={styles(theme).stepItemText}>{step.instruction}</Text>
                  </View>
                </BlurView>
              ))}
            </View>
          )}

          {/* Progress Bar */}
          {isSessionActive && (
            <View style={styles(theme).progressContainer}>
              <View style={styles(theme).progressHeader}>
                <Text style={styles(theme).progressTime}>{formatTime(elapsedTime)}</Text>
                <Text style={styles(theme).progressTime}>{formatTime(totalDuration)}</Text>
              </View>
              <View style={styles(theme).progressBar}>
                <View style={[styles(theme).progressFill, { width: `${getProgress() * 100}%` }]} />
              </View>
            </View>
          )}

          {/* Volume Control */}
          {isSessionActive && (
            <BlurView intensity={20} tint="dark" style={styles(theme).volumeCard}>
              <Text style={styles(theme).volumeLabel}>Volume</Text>
              <View style={styles(theme).volumeContainer}>
                <Volume2 size={20} color={theme.colors.textSecondary} />
                <Slider
                  style={styles(theme).volumeSlider}
                  value={volume}
                  onValueChange={setVolume}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor="#2A2D3A"
                  thumbTintColor={theme.colors.accent}
                />
                <Volume2 size={20} color={theme.colors.textSecondary} />
                <Text style={styles(theme).volumePercent}>{Math.round(volume * 100)}%</Text>
              </View>
            </BlurView>
          )}

          {/* Sleep-safe mode */}
          <BlurView intensity={20} tint="dark" style={styles(theme).safeModeCard}>
            <View style={styles(theme).safeModeHeader}>
              <Text style={styles(theme).safeModeTitle}>Sleep-safe mode</Text>
              <Text style={styles(theme).safeModeTimer}>{sleepSafeTimerText}</Text>
            </View>
            <Text style={styles(theme).safeModeSubtitle}>Auto-stop with gentle fade-out</Text>
            <View style={styles(theme).safeModeOptions}>
              {[0, 15, 30, 45].map((minutes) => {
                const selected = sleepSafeMinutes === minutes;
                return (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles(theme).safeModeOption,
                      selected && styles(theme).safeModeOptionSelected,
                    ]}
                    onPress={() => handleSleepSafeSelect(minutes)}
                  >
                    <Text
                      style={[
                        styles(theme).safeModeOptionText,
                        selected && styles(theme).safeModeOptionTextSelected,
                      ]}
                    >
                      {minutes === 0 ? 'Off' : `${minutes}m`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </BlurView>

          {/* Control Buttons */}
          <View style={styles(theme).controls}>
            {!isSessionActive ? (
              <TouchableOpacity
                style={styles(theme).startButton}
                onPress={handleStartSession}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[theme.colors.accent, theme.colors.highlight]}
                  style={styles(theme).startGradient}
                >
                  <Ionicons name="play" size={32} color="#0F111A" />
                  <Text style={styles(theme).startButtonText}>Begin Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles(theme).playbackControls}>
                <TouchableOpacity
                  style={styles(theme).controlButton}
                  onPress={handleStop}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={[theme.colors.danger, '#FF8E8E']}
                    style={styles(theme).controlButtonGradient}
                  >
                    <Ionicons name="stop" size={28} color={theme.colors.textPrimary} />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles(theme).playPauseButton}
                  onPress={handlePauseResume}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[theme.colors.accent, theme.colors.highlight]}
                    style={styles(theme).playPauseGradient}
                  >
                    {isPlaying ? (
                      <Ionicons name="pause" size={40} color="#0F111A" />
                    ) : (
                      <Ionicons name="play" size={40} color="#0F111A" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles(theme).controlButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <BlurView intensity={20} tint="dark" style={styles(theme).controlButtonGradient}>
                    <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
                  </BlurView>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles(theme).bottomSpacing} />
        </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  visualizationContainer: {
    height: height * 0.4,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  visualizationBlur: {
    flex: 1,
  },
  visualizationGradient: {
    flex: 1,
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  sessionImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  breathingCircle: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  circleGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  infoBadgeText: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  sessionDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  stepCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(27, 29, 42, 0.8)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.2)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  stepNumber: {
    fontSize: 14,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  stepInstruction: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    lineHeight: 24,
    marginBottom: 16,
  },
  stepProgressContainer: {
    marginTop: 8,
  },
  stepProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepProgressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  stepsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  stepItemText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  progressContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTime: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  volumeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  safeModeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  safeModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  safeModeTitle: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  safeModeTimer: {
    fontSize: 13,
    color: theme.colors.accent,
    fontWeight: '700',
  },
  safeModeSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  safeModeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  safeModeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  safeModeOptionSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(0, 255, 209, 0.12)',
  },
  safeModeOptionText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  safeModeOptionTextSelected: {
    color: theme.colors.accent,
  },
  volumeLabel: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 12,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  volumeSlider: {
    flex: 1,
  },
  volumePercent: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  controls: {
    paddingHorizontal: 20,
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.background,
  },
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  controlButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  playPauseGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacing: {
    height: 40,
  },
});
