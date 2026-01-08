import React, { useState, useEffect } from 'react';
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
import { useAudio } from '../contexts/AudioContext';
import Slider from '@react-native-community/slider';

const { width, height } = Dimensions.get('window');

interface SessionStep {
  id: string;
  instruction: string;
  duration: number; // in seconds
  icon: string;
}

export default function SessionPlayerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = route.params as { session: any };

  const { isPlaying, volume, playSound, pauseSound, resumeSound, stopSound, setVolume } = useAudio();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Session steps/instructions
  const sessionSteps: SessionStep[] = [
    {
      id: 'step1',
      instruction: 'Find a comfortable position, either sitting or lying down. Close your eyes gently.',
      duration: 60,
      icon: 'bed-outline',
    },
    {
      id: 'step2',
      instruction: 'Take a deep breath in through your nose for 4 counts. Hold for 2 counts.',
      duration: 90,
      icon: 'heart-circle-outline',
    },
    {
      id: 'step3',
      instruction: 'Slowly exhale through your mouth for 6 counts. Feel the tension leaving your body.',
      duration: 90,
      icon: 'water-outline',
    },
    {
      id: 'step4',
      instruction: 'Continue breathing naturally. Focus on the sensation of each breath entering and leaving.',
      duration: 120,
      icon: 'pulse-outline',
    },
    {
      id: 'step5',
      instruction: 'If your mind wanders, gently bring your attention back to your breath. This is normal.',
      duration: 120,
      icon: 'leaf-outline',
    },
    {
      id: 'step6',
      instruction: 'Allow yourself to relax deeper with each breath. Let go of any remaining tension.',
      duration: 180,
      icon: 'sparkles-outline',
    },
    {
      id: 'step7',
      instruction: 'When you\'re ready, slowly open your eyes. Take a moment before moving.',
      duration: 60,
      icon: 'eye-outline',
    },
  ];

  useEffect(() => {
    // Calculate total duration from steps
    const total = sessionSteps.reduce((acc, step) => acc + step.duration, 0);
    setTotalDuration(total);
  }, []);

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

  const handleStartSession = async () => {
    try {
      if (session?.uri) {
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
      setIsSessionActive(false);
      setElapsedTime(0);
      setCurrentStepIndex(0);
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  const handleSessionComplete = async () => {
    await stopSound();
    setIsSessionActive(false);
  };

  const handleClose = async () => {
    if (isPlaying) {
      await stopSound();
    }
    navigation.goBack();
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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F111A', '#1B1D2A', '#2A1D3A']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{session?.title}</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Session Image/Visualization */}
          <View style={styles.visualizationContainer}>
            <BlurView intensity={60} tint="dark" style={styles.visualizationBlur}>
              <LinearGradient
                colors={['rgba(157, 78, 221, 0.3)', 'rgba(0, 255, 209, 0.3)', 'rgba(51, 198, 255, 0.3)']}
                style={styles.visualizationGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: session?.image }}
                    style={styles.sessionImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(15, 17, 26, 0.8)']}
                    style={styles.imageOverlay}
                  />
                </View>

                {/* Breathing Circle Animation */}
                {isPlaying && (
                  <View style={styles.breathingCircle}>
                    <LinearGradient
                      colors={['#00FFD1', '#33C6FF', '#9D4EDD']}
                      style={styles.circleGradient}
                    >
                      <View style={styles.circleInner}>
                        <Ionicons name="pulse" size={40} color="#FFFFFF" />
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </LinearGradient>
            </BlurView>
          </View>

          {/* Session Info */}
          <View style={styles.sessionInfo}>
            <View style={styles.infoRow}>
              <View style={styles.infoBadge}>
                <Ionicons name="time-outline" size={16} color="#00FFD1" />
                <Text style={styles.infoBadgeText}>{session?.duration}</Text>
              </View>
              <View style={styles.infoBadge}>
                <Ionicons name="speedometer-outline" size={16} color="#FFD700" />
                <Text style={styles.infoBadgeText}>{session?.difficulty}</Text>
              </View>
            </View>
            <Text style={styles.sessionDescription}>{session?.description}</Text>
          </View>

          {/* Current Step Card */}
          {isSessionActive && (
            <BlurView intensity={20} tint="dark" style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Ionicons name={currentStep?.icon as any} size={24} color="#00FFD1" />
                <Text style={styles.stepNumber}>
                  Step {currentStepIndex + 1} of {sessionSteps.length}
                </Text>
              </View>

              <Text style={styles.stepInstruction}>{currentStep?.instruction}</Text>

              {/* Step Progress */}
              <View style={styles.stepProgressContainer}>
                <View style={styles.stepProgressBar}>
                  <View
                    style={[
                      styles.stepProgressFill,
                      { width: `${getCurrentStepProgress() * 100}%` }
                    ]}
                  />
                </View>
              </View>
            </BlurView>
          )}

          {/* All Steps List */}
          {!isSessionActive && (
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>Session Steps</Text>
              {sessionSteps.map((step, index) => (
                <BlurView key={step.id} intensity={15} tint="dark" style={styles.stepItem}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons name={step.icon as any} size={20} color="#00FFD1" />
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepItemTitle}>Step {index + 1}</Text>
                    <Text style={styles.stepItemText}>{step.instruction}</Text>
                  </View>
                </BlurView>
              ))}
            </View>
          )}

          {/* Progress Bar */}
          {isSessionActive && (
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTime}>{formatTime(elapsedTime)}</Text>
                <Text style={styles.progressTime}>{formatTime(totalDuration)}</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
              </View>
            </View>
          )}

          {/* Volume Control */}
          {isSessionActive && (
            <BlurView intensity={20} tint="dark" style={styles.volumeCard}>
              <Text style={styles.volumeLabel}>Volume</Text>
              <View style={styles.volumeContainer}>
                <Ionicons name="volume-low" size={20} color="#A0AEC0" />
                <Slider
                  style={styles.volumeSlider}
                  value={volume}
                  onValueChange={setVolume}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor="#00FFD1"
                  maximumTrackTintColor="#2A2D3A"
                  thumbTintColor="#00FFD1"
                />
                <Ionicons name="volume-high" size={20} color="#A0AEC0" />
                <Text style={styles.volumePercent}>{Math.round(volume * 100)}%</Text>
              </View>
            </BlurView>
          )}

          {/* Control Buttons */}
          <View style={styles.controls}>
            {!isSessionActive ? (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartSession}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#00FFD1', '#33C6FF']}
                  style={styles.startGradient}
                >
                  <Ionicons name="play" size={32} color="#0F111A" />
                  <Text style={styles.startButtonText}>Begin Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View style={styles.playbackControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleStop}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E8E']}
                    style={styles.controlButtonGradient}
                  >
                    <Ionicons name="stop" size={28} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={handlePauseResume}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#00FFD1', '#33C6FF']}
                    style={styles.playPauseGradient}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={40}
                      color="#0F111A"
                    />
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <BlurView intensity={20} tint="dark" style={styles.controlButtonGradient}>
                    <Ionicons name="close" size={28} color="#FFFFFF" />
                  </BlurView>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sessionDescription: {
    fontSize: 15,
    color: '#A0AEC0',
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
    color: '#00FFD1',
    fontWeight: '600',
  },
  stepInstruction: {
    fontSize: 16,
    color: '#FFFFFF',
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
    backgroundColor: '#00FFD1',
  },
  stepsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
    color: '#00FFD1',
    marginBottom: 4,
  },
  stepItemText: {
    fontSize: 14,
    color: '#A0AEC0',
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
    color: '#A0AEC0',
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
    backgroundColor: '#00FFD1',
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
  volumeLabel: {
    fontSize: 14,
    color: '#FFFFFF',
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
    color: '#A0AEC0',
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
    color: '#0F111A',
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
