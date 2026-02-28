import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  CloudRain,
  Droplets,
  Leaf,
  Flower2,
  Radio,
  Music,
  X,
  AlarmClock,
  Mic,
  List,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  VolumeX,
  Volume2,
  CircleStop,
  ChevronRight,
  ChevronLeft,
  Clock,
  Info,
  Lightbulb,
  Moon,
  CheckCircle2,
  Star,
  Coffee,
  Zap
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSleep } from '../contexts/SleepContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { format12HourTime, formatDuration } from '../utils/dateFormatting';
import Slider from '@react-native-community/slider';
import SleepBackgroundAnimation from '../components/SleepBackgroundAnimation';
import DateTimePicker from '@react-native-community/datetimepicker';
import notificationService from '../services/notificationService';
import sleepRecorderService from '../services/sleepRecorderService';
import RatingPrompt from '../components/RatingPrompt';

const GlassView = ({ style, children, intensity = 20, tint = "dark" }: any) => {
  if (Platform.OS === 'android') {
    return (
      <View style={[style, { backgroundColor: 'rgba(17, 25, 40, 0.7)' }]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
};

const ICON_MAP: Record<string, any> = {
  'rainy': CloudRain,
  'water': Droplets,
  'leaf': Leaf,
  'flower': Flower2,
  'radio': Radio,
  'musical-note': Music,
  'close': X,
  'alarm-outline': AlarmClock,
  'mic': Mic,
  'list': List,
  'play-skip-back': SkipBack,
  'play-skip-forward': SkipForward,
  'play': Play,
  'pause': Pause,
  'volume-mute': VolumeX,
  'volume-high': Volume2,
  'stop-circle-outline': CircleStop,
  'stop-circle': CircleStop,
  'musical-notes': Music,
  'chevron-forward': ChevronRight,
  'alarm': AlarmClock,
  'time': Clock,
};

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

const sleepSounds = [
  { id: 'rain-light', name: 'Light Rain', uri: `${GITHUB_BASE_URL}/rain-light.mp3`, icon: 'rainy', category: 'nature' },
  { id: 'rain-heavy', name: 'Heavy Rain', uri: `${GITHUB_BASE_URL}/rain-heavy.mp3`, icon: 'rainy', category: 'nature' },
  { id: 'ocean-waves', name: 'Ocean Waves', uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`, icon: 'water', category: 'nature' },
  { id: 'forest', name: 'Forest Ambience', uri: `${GITHUB_BASE_URL}/forest-ambience.mp3`, icon: 'leaf', category: 'nature' },
  { id: 'meditation-calm', name: 'Calm Meditation', uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`, icon: 'flower', category: 'meditation' },
  { id: 'meditation-deep', name: 'Deep Meditation', uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`, icon: 'flower', category: 'meditation' },
  { id: 'white-noise', name: 'White Noise', uri: `${GITHUB_BASE_URL}/white-noise.mp3`, icon: 'radio', category: 'noise' },
];

export default function SleepSessionScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { currentSession, isTracking, startSleepSession, endSleepSession, sleepHistory } = useSleep();
  const { isPlaying, currentSound, volume, playSound, pauseSound, stopSound, setVolume, isMixing, stopMixing } = useAudio();
  const themedStyles = useMemo(() => styles(theme), [theme]);

  // Initialize states from navigation params if available
  const [sleepSoundsEnabled, setSleepSoundsEnabled] = useState(route.params?.initialSounds ?? false);
  const [smartAlarmEnabled, setSmartAlarmEnabled] = useState(route.params?.initialSmartAlarm ?? true);
  const [sleepRecorderEnabled, setSleepRecorderEnabled] = useState(route.params?.initialRecorder ?? false);
  const [isNapMode, setIsNapMode] = useState(route.params?.isNap ?? false);
  const [wakeUps, setWakeUps] = useState('0');
  const [notes, setNotes] = useState('');
  const [sleepRating, setSleepRating] = useState(0);
  const [showEndForm, setShowEndForm] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState(sleepSounds[0]);
  const [isDimmed, setIsDimmed] = useState(false);
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);

  // Alarm states
  const [alarmTime, setAlarmTime] = useState<Date | null>(() => {
    if (route.params?.initialAlarmTime) {
      return new Date(route.params.initialAlarmTime);
    }
    return null;
  });
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);
  const [tempAlarmTime, setTempAlarmTime] = useState<Date>(() => {
    // Default to 7 AM tomorrow
    const defaultTime = new Date();
    defaultTime.setDate(defaultTime.getDate() + 1);
    defaultTime.setHours(7, 0, 0, 0);
    return defaultTime;
  });

  // Update temp alarm time when picker opens
  useEffect(() => {
    if (showAlarmPicker) {
      if (alarmTime) {
        // If alarm is already set, use that time
        setTempAlarmTime(alarmTime);
      } else {
        // Otherwise, default to 7 AM tomorrow
        const defaultTime = new Date();
        defaultTime.setDate(defaultTime.getDate() + 1);
        defaultTime.setHours(7, 0, 0, 0);
        setTempAlarmTime(defaultTime);
      }
    }
  }, [showAlarmPicker, alarmTime]);

  // Recording states
  const [recordingStatus, setRecordingStatus] = useState<any>(null);
  const elapsedTimeRef = useRef('0:00:00');
  const clockRef = useRef(new Date());
  const [, forceUpdate] = useState(0);

  // Combined timer: update elapsed time + recording status every second (single interval)
  useEffect(() => {
    if (!isTracking) return;

    const timer = setInterval(() => {
      // Update clock
      clockRef.current = new Date();

      // Update elapsed time via ref to avoid full re-render
      if (currentSession) {
        const elapsed = Date.now() - new Date(currentSession.startTime).getTime();
        const hours = Math.floor(elapsed / (1000 * 60 * 60));
        const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
        elapsedTimeRef.current = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      // Update recording status
      const status = sleepRecorderService.getStatus();
      setRecordingStatus(status);

      // Trigger minimal re-render for clock display
      forceUpdate(c => c + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTracking, currentSession?.startTime]);

  // Auto-dimming logic
  useEffect(() => {
    let dimTimer: NodeJS.Timeout;

    if (isTracking && !isDimmed) {
      dimTimer = setTimeout(() => {
        setIsDimmed(true);
      }, 10000); // Dim after 10 seconds of inactivity
    }

    return () => {
      if (dimTimer) clearTimeout(dimTimer);
    };
  }, [isTracking, isDimmed]);

  const getElapsedTime = () => {
    if (!currentSession || !isTracking) return '0:00:00';
    return elapsedTimeRef.current;
  };

  const handleStartSleep = async () => {
    try {
      // Pass settings to startSleepSession
      await startSleepSession(
        sleepSoundsEnabled,
        smartAlarmEnabled,
        sleepRecorderEnabled,
        alarmTime || undefined,
        [],
        isNapMode
      );

      // Schedule notification alarm if time is set
      if (alarmTime && smartAlarmEnabled) {
        try {
          const sessionId = currentSession?.id || 'session-' + Date.now();
          await notificationService.scheduleAlarm({
            alarmTime: alarmTime,
            sessionId: sessionId,
            smartAlarm: smartAlarmEnabled,
          });
          console.log('✅ Alarm scheduled successfully');
        } catch (alarmError) {
          console.log('⚠️ Failed to schedule alarm:', alarmError);
          Alert.alert('Alarm Warning', 'Failed to set alarm, but sleep session started.');
        }
      }

      // Auto-start music if sleep sounds are enabled
      if (sleepSoundsEnabled && selectedMusic) {
        try {
          await playSound(selectedMusic.id, selectedMusic.uri);
        } catch (audioError) {
          console.log('Failed to start music, but session started:', audioError);
        }
      }

      Alert.alert('Sleep Session Started', 'Your sleep is now being tracked. Sleep well!');
    } catch (error) {
      Alert.alert('Error', 'Failed to start sleep session. Please try again.');
    }
  };

  const handleMusicSelect = async (sound: any) => {
    setSelectedMusic(sound);
    setShowMusicPicker(false);

    // If already tracking and music is playing, switch to new sound
    if (isTracking) {
      try {
        await playSound(sound.id, sound.uri);
      } catch (error) {
        Alert.alert('Playback Error', 'Unable to play this sound. Please try another.');
      }
    }
  };

  const toggleMusicPlayback = async () => {
    if (isPlaying) {
      await pauseSound();
    } else if (selectedMusic) {
      try {
        await playSound(selectedMusic.id, selectedMusic.uri);
      } catch (error) {
        Alert.alert('Playback Error', 'Unable to play sound. Please check your connection.');
      }
    }
  };

  const handleNextTrack = async () => {
    const currentIndex = sleepSounds.findIndex((s) => s.id === selectedMusic?.id);
    const nextIndex = (currentIndex + 1) % sleepSounds.length;
    const nextSound = sleepSounds[nextIndex];

    setSelectedMusic(nextSound);

    if (isTracking && isPlaying) {
      try {
        await playSound(nextSound.id, nextSound.uri);
      } catch (error) {
        Alert.alert('Playback Error', 'Unable to play next sound.');
      }
    }
  };

  const handlePreviousTrack = async () => {
    const currentIndex = sleepSounds.findIndex((s) => s.id === selectedMusic?.id);
    const prevIndex = currentIndex <= 0 ? sleepSounds.length - 1 : currentIndex - 1;
    const prevSound = sleepSounds[prevIndex];

    setSelectedMusic(prevSound);

    if (isTracking && isPlaying) {
      try {
        await playSound(prevSound.id, prevSound.uri);
      } catch (error) {
        Alert.alert('Playback Error', 'Unable to play previous sound.');
      }
    }
  };

  const handleEndSleepClick = () => {
    if (!isTracking) return;

    // Show confirmation dialog before opening end form
    Alert.alert(
      'End Sleep Session?',
      'Are you sure you want to stop tracking your sleep? Your progress will be saved.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => setShowEndForm(true),
        },
      ]
    );
  };

  const validateSleepInput = (): { valid: boolean; error?: string } => {
    // Validate wake-ups
    const wakeUpsNumber = parseInt(wakeUps);
    if (isNaN(wakeUpsNumber)) {
      return { valid: false, error: 'Wake-ups must be a number' };
    }
    if (wakeUpsNumber < 0) {
      return { valid: false, error: 'Wake-ups cannot be negative' };
    }
    if (wakeUpsNumber > 100) {
      return { valid: false, error: 'That seems like too many wake-ups. Please verify.' };
    }

    // Validate notes length
    if (notes.length > 500) {
      return { valid: false, error: 'Notes must be less than 500 characters' };
    }

    return { valid: true };
  };

  const handleEndSleepConfirm = async () => {
    try {
      // Validate inputs
      const validation = validateSleepInput();
      if (!validation.valid) {
        Alert.alert('Invalid Input', validation.error);
        return;
      }

      // Stop all music before ending session (both single and mixed sounds)
      if (isPlaying) {
        await stopSound();
      }
      if (isMixing) {
        await stopMixing();
      }

      // Cancel alarm
      await notificationService.cancelAlarm();

      // Stop recorder and get summary
      let recordingSummary = null;
      if (sleepRecorderService.getStatus().isRecording) {
        recordingSummary = await sleepRecorderService.stopRecording();
        console.log('🎙️ Recording Summary:', recordingSummary);

        // Save recording events to database
        if (user && currentSession?.id && recordingSummary) {
          const saved = await sleepRecorderService.saveEventsToDatabase(
            user.id,
            currentSession.id,
            new Date(currentSession.startTime) // Pass session start time for offset calculation
          );
          if (saved) {
            console.log('✅ Recording events saved to database');
          } else {
            console.warn('⚠️ Failed to save recording events to database');
          }
        }
      }

      const wakeUpsNumber = parseInt(wakeUps) || 0;
      await endSleepSession(wakeUpsNumber, notes, sleepRating);
      setShowEndForm(false);
      setWakeUps('0');
      setNotes('');
      setSleepRating(0);

      // Show recording summary if available
      let message = 'Your sleep data has been saved successfully!';
      if (recordingSummary && recordingSummary.totalNoiseEvents > 0) {
        message += `\n\n📊 Recording Summary:\n🔊 Snoring events: ${recordingSummary.snoringEvents}\n💬 Sleep talk events: ${recordingSummary.sleepTalkEvents}`;
      }

      Alert.alert(
        'Sleep Session Ended',
        message,
        [
          {
            text: 'OK',
            onPress: () => {
              // Show rating prompt after completing session
              setShowRatingPrompt(true);
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to end sleep session. Please try again.');
    }
  };

  const exitSleepMode = () => {
    if (isTracking) {
      Alert.alert(
        'Sleep Session Active',
        'You have an active sleep session. Do you want to end it?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'End Session',
            style: 'destructive',
            onPress: () => handleEndSleepClick(),
          },
          {
            text: 'Just Exit',
            onPress: async () => {
              // Stop music when exiting without ending session
              if (isPlaying) {
                await stopSound();
              }
              // Save recording events before stopping recorder
              if (sleepRecorderService.getStatus().isRecording) {
                try {
                  if (user && user.id !== 'guest' && currentSession?.id) {
                    await sleepRecorderService.saveEventsToDatabase(
                      user.id,
                      currentSession.id,
                      new Date(currentSession.startTime)
                    );
                    console.log('✅ Recording events saved before exit');
                  }
                } catch (saveErr) {
                  console.warn('⚠️ Could not save recording events:', saveErr);
                }
                await sleepRecorderService.stopRecording();
              }
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  if (showEndForm) {
    return (
      <View style={themedStyles.container}>
        <LinearGradient colors={['#0F0F1E', '#161632', '#0F0F1E']} style={themedStyles.gradient}>
          <ScrollView style={themedStyles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={themedStyles.formHeader}>
              <Text style={themedStyles.formTitle}>End Sleep Session</Text>
              <Text style={themedStyles.formSubtitle}>
                You slept for {getElapsedTime()}
              </Text>
            </View>

            <GlassView intensity={20} tint="dark" style={themedStyles.formCard}>
              {/* Sleep Quality Rating */}
              <View style={themedStyles.inputGroup}>
                <Text style={themedStyles.inputLabel}>How would you rate your sleep?</Text>
                <View style={themedStyles.starRatingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setSleepRating(star)}
                      style={themedStyles.starButton}
                      activeOpacity={0.7}
                    >
                      <Star
                        size={40}
                        color={star <= sleepRating ? '#F59E0B' : '#4A4A5A'}
                        fill={star <= sleepRating ? '#F59E0B' : 'transparent'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={themedStyles.ratingLabel}>
                  {sleepRating === 0 && 'Tap to rate'}
                  {sleepRating === 1 && 'Poor - Very restless night'}
                  {sleepRating === 2 && 'Fair - Somewhat restless'}
                  {sleepRating === 3 && 'Good - Average sleep'}
                  {sleepRating === 4 && 'Great - Slept well'}
                  {sleepRating === 5 && 'Excellent - Perfect sleep!'}
                </Text>
              </View>

              <View style={themedStyles.inputGroup}>
                <Text style={themedStyles.inputLabel}>How many times did you wake up?</Text>
                <TextInput
                  style={themedStyles.input}
                  value={wakeUps}
                  onChangeText={setWakeUps}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <View style={themedStyles.inputGroup}>
                <Text style={themedStyles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[themedStyles.input, themedStyles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  placeholder="How was your sleep?"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>

              <TouchableOpacity
                style={themedStyles.confirmButton}
                onPress={handleEndSleepConfirm}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={themedStyles.confirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={themedStyles.confirmButtonText}>Save Sleep Data</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={themedStyles.cancelButton}
                onPress={() => setShowEndForm(false)}
              >
                <Text style={themedStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </GlassView>
          </ScrollView>
        </LinearGradient>
      </View>
    );
  }

  if (isTracking && currentSession) {
    if (isDimmed) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          style={themedStyles.dimmedContainer}
          onPress={() => setIsDimmed(false)}
        >
          <StatusBar hidden />
          <View style={themedStyles.dimmedContent}>
            <Text style={themedStyles.dimmedTime}>
              {format12HourTime(clockRef.current)}
            </Text>
            <View style={themedStyles.dimmedStats}>
              <Moon size={20} color={theme.colors.textSecondary} style={{ marginRight: 8 }} />
              <Text style={themedStyles.dimmedDuration}>
                {getElapsedTime().split(':').slice(0, 2).join('h ')}m asleep
              </Text>
            </View>
            <Text style={themedStyles.dimmedHint}>Tap anywhere to wake screen</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={themedStyles.container}>
        <StatusBar hidden />

        {/* Animated Space Background */}
        <SleepBackgroundAnimation duration={300} transitionDuration={3} />

        <View style={themedStyles.contentOverlay}>
          <View style={themedStyles.topControls}>
            <TouchableOpacity onPress={exitSleepMode} style={themedStyles.exitButton}>
              <X size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={themedStyles.trackingBadge}>
              <View style={themedStyles.trackingDot} />
              <Text style={themedStyles.trackingText}>Tracking</Text>
            </View>
          </View>

          <View style={themedStyles.clockContainer}>
            <Text style={themedStyles.elapsedLabel}>Sleep Duration</Text>
            <Text style={themedStyles.timeDisplay}>{getElapsedTime()}</Text>
            <Text style={themedStyles.dateDisplay}>
              Started at {format12HourTime(new Date(currentSession.startTime))}
            </Text>
          </View>

          {currentSession.sleepSoundsEnabled && (
            <View style={themedStyles.soundStatus}>
              <View style={themedStyles.soundIndicator}>
                <View style={themedStyles.soundWave} />
                <View style={themedStyles.soundWave} />
                <View style={themedStyles.soundWave} />
              </View>
              <Text style={themedStyles.soundText}>Sleep Sounds Playing</Text>
            </View>
          )}

          {currentSession.smartAlarmEnabled && alarmTime && (
            <View style={themedStyles.alarmContainer}>
              <AlarmClock size={20} color={theme.colors.accent} />
              <Text style={themedStyles.alarmText}>
                Alarm: {format12HourTime(alarmTime)}
              </Text>
            </View>
          )}

          {recordingStatus && recordingStatus.isRecording && (
            <View style={themedStyles.recordingContainer}>
              <Mic size={20} color={theme.colors.danger} />
              <View style={themedStyles.recordingDetails}>
                <View style={themedStyles.recordingHeader}>
                  <Text style={themedStyles.recordingText}>🎙️ Recording Active</Text>
                  <View style={themedStyles.volumeMeter}>
                    <View
                      style={[
                        themedStyles.volumeBar,
                        { width: `${Math.min(100, recordingStatus.currentVolume * 100)}%` }
                      ]}
                    />
                  </View>
                </View>
                <Text style={themedStyles.recordingStats}>
                  Snoring: {recordingStatus.snoringEvents} | Sleep Talk: {recordingStatus.sleepTalkEvents}
                </Text>
              </View>
            </View>
          )}

          {/* Enhanced Music Player Controls */}
          <View style={themedStyles.musicPlayerContainer}>
            <GlassView intensity={30} tint="dark" style={themedStyles.musicPlayer}>
              {/* Track Info with Playlist Button */}
              <View style={themedStyles.musicHeader}>
                <View style={themedStyles.musicInfo}>
                  <View style={themedStyles.musicIconContainer}>
                    {(() => {
                      const Icon = ICON_MAP[selectedMusic?.icon || 'musical-note'] || Music;
                      return <Icon size={28} color={theme.colors.accent} />;
                    })()}
                  </View>
                  <View style={themedStyles.musicDetails}>
                    <Text style={themedStyles.musicName}>{selectedMusic?.name || 'No Music'}</Text>
                    <Text style={themedStyles.musicStatus}>
                      {isPlaying && currentSound === selectedMusic?.id ? '▶ Playing' : '⏸ Paused'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={themedStyles.playlistButton}
                  onPress={() => setShowMusicPicker(true)}
                  activeOpacity={0.7}
                >
                  <List size={24} color={theme.colors.accent} />
                  <Text style={themedStyles.playlistButtonText}>Playlist</Text>
                </TouchableOpacity>
              </View>

              {/* Playback Controls */}
              <View style={themedStyles.musicControls}>
                <TouchableOpacity
                  style={themedStyles.musicButton}
                  onPress={handlePreviousTrack}
                  activeOpacity={0.7}
                >
                  <SkipBack size={28} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={themedStyles.playPauseButton}
                  onPress={toggleMusicPlayback}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={themedStyles.playPauseGradient}
                  >
                    {isPlaying && currentSound === selectedMusic?.id ? (
                      <Pause size={32} color="#FFFFFF" fill="#FFFFFF" />
                    ) : (
                      <Play size={32} color="#FFFFFF" fill="#FFFFFF" />
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={themedStyles.musicButton}
                  onPress={handleNextTrack}
                  activeOpacity={0.7}
                >
                  <SkipForward size={28} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Volume Control */}
              <View style={themedStyles.volumeContainer}>
                <TouchableOpacity onPress={() => setVolume(0)} activeOpacity={0.7}>
                  <VolumeX size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <Slider
                  style={themedStyles.volumeSlider}
                  value={volume}
                  onValueChange={setVolume}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor="#8B5CF6"
                  maximumTrackTintColor="#2A2D3A"
                  thumbTintColor="#8B5CF6"
                />
                <TouchableOpacity onPress={() => setVolume(1)} activeOpacity={0.7}>
                  <Volume2 size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Stop Button */}
              <TouchableOpacity
                style={themedStyles.stopButton}
                onPress={stopSound}
                activeOpacity={0.7}
              >
                <CircleStop size={20} color={theme.colors.danger} />
                <Text style={themedStyles.stopButtonText}>Stop Playback</Text>
              </TouchableOpacity>
            </GlassView>
          </View>

          <TouchableOpacity
            style={themedStyles.endButton}
            onPress={handleEndSleepClick}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[theme.colors.danger, '#FF8E8E']}
              style={themedStyles.endGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <CircleStop size={24} color={theme.colors.textPrimary} />
              <Text style={themedStyles.endButtonText}>End Sleep Session</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Memoize styles to prevent unnecessary re-renders

  return (
    <View style={themedStyles.container}>
      <LinearGradient colors={['#0F0F1E', '#161632', '#0F0F1E']} style={themedStyles.gradient}>
        <View style={themedStyles.topControls}>
          <TouchableOpacity onPress={exitSleepMode} style={themedStyles.backButton}>
            <ChevronLeft size={28} color={theme.colors.textSecondary} />
            <Text style={themedStyles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={themedStyles.content}
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 100
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={themedStyles.header}>
            <Text style={themedStyles.title}>Ready to Sleep?</Text>
            <Text style={themedStyles.subtitle}>Configure your sleep session</Text>
          </View>

          <GlassView intensity={20} tint="dark" style={themedStyles.card}>
            <Text style={themedStyles.cardTitle}>Sleep Settings</Text>

            {/* Nap Mode Toggle */}
            <View style={themedStyles.settingItem}>
              <View style={themedStyles.settingLeft}>
                <Coffee size={24} color="#F59E0B" />
                <View>
                  <Text style={themedStyles.settingLabel}>Nap Mode</Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                    {isNapMode ? 'Short rest · No morning alarm' : 'Full night sleep'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[themedStyles.toggle, isNapMode && { backgroundColor: '#F59E0B' }]}
                onPress={() => {
                  setIsNapMode(!isNapMode);
                  // Disable smart alarm for naps
                  if (!isNapMode) setSmartAlarmEnabled(false);
                }}
              >
                <View style={[themedStyles.toggleThumb, isNapMode && themedStyles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={themedStyles.settingItem}>
              <View style={themedStyles.settingLeft}>
                <Music size={24} color={theme.colors.accent} />
                <Text style={themedStyles.settingLabel}>Sleep Sounds</Text>
              </View>
              <TouchableOpacity
                style={[themedStyles.toggle, sleepSoundsEnabled && themedStyles.toggleActive]}
                onPress={() => setSleepSoundsEnabled(!sleepSoundsEnabled)}
              >
                <View
                  style={[
                    themedStyles.toggleThumb,
                    sleepSoundsEnabled && themedStyles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {sleepSoundsEnabled && (
              <TouchableOpacity
                style={themedStyles.musicSelectButton}
                onPress={() => setShowMusicPicker(true)}
              >
                <View style={themedStyles.musicSelectContent}>
                  {(() => {
                    const Icon = ICON_MAP[selectedMusic?.icon || 'musical-note'] || Music;
                    return <Icon size={20} color={theme.colors.accent} />;
                  })()}
                  <Text style={themedStyles.musicSelectText}>{selectedMusic?.name || 'Choose Music'}</Text>
                </View>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <View style={themedStyles.settingItem}>
              <View style={themedStyles.settingLeft}>
                <AlarmClock size={24} color={theme.colors.highlight} />
                <Text style={themedStyles.settingLabel}>Smart Alarm</Text>
              </View>
              <TouchableOpacity
                style={[themedStyles.toggle, smartAlarmEnabled && themedStyles.toggleActive]}
                onPress={() => setSmartAlarmEnabled(!smartAlarmEnabled)}
              >
                <View
                  style={[
                    themedStyles.toggleThumb,
                    smartAlarmEnabled && themedStyles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {smartAlarmEnabled && (
              <TouchableOpacity
                style={themedStyles.alarmTimeButton}
                onPress={() => setShowAlarmPicker(true)}
              >
                <View style={themedStyles.alarmTimeContent}>
                  <Clock size={20} color={theme.colors.highlight} />
                  <Text style={themedStyles.alarmTimeText}>
                    {alarmTime ? `Wake up at ${format12HourTime(alarmTime)}` : 'Set Alarm Time'}
                  </Text>
                </View>
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}

            <View style={themedStyles.settingItem}>
              <View style={themedStyles.settingLeft}>
                <Mic size={24} color={theme.colors.danger} />
                <Text style={themedStyles.settingLabel}>Sleep Recorder</Text>
              </View>
              <TouchableOpacity
                style={[themedStyles.toggle, sleepRecorderEnabled && themedStyles.toggleActive]}
                onPress={() => setSleepRecorderEnabled(!sleepRecorderEnabled)}
              >
                <View
                  style={[
                    themedStyles.toggleThumb,
                    sleepRecorderEnabled && themedStyles.toggleThumbActive,
                  ]}
                />
              </TouchableOpacity>
            </View>

            {sleepRecorderEnabled && (
              <View style={themedStyles.recorderInfo}>
                <Info size={16} color={theme.colors.textSecondary} />
                <Text style={themedStyles.recorderInfoText}>
                  Monitors audio for snoring and sleep talk detection
                </Text>
              </View>
            )}
          </GlassView>

          <GlassView intensity={20} tint="dark" style={themedStyles.tipsCard}>
            <View style={themedStyles.tipHeader}>
              <Lightbulb size={20} color={theme.colors.premium} />
              <Text style={themedStyles.tipTitle}>Sleep Tips</Text>
            </View>
            <Text style={themedStyles.tipText}>
              • Place your phone face down on a stable surface{'\n'}
              • Keep your phone plugged in{'\n'}
              • Enable Do Not Disturb mode{'\n'}
              • Create a comfortable sleep environment
            </Text>
          </GlassView>

          <TouchableOpacity
            style={themedStyles.startButton}
            onPress={handleStartSleep}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isNapMode ? ['#F59E0B', '#D97706'] : ['#8B5CF6', '#6366F1']}
              style={themedStyles.startGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isNapMode ? <Coffee size={24} color="#FFFFFF" /> : <Moon size={24} color="#FFFFFF" />}
              <Text style={themedStyles.startButtonText}>
                {isNapMode ? 'Start Nap Session' : 'Start Sleep Session'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={themedStyles.bottomSpacing} />
        </ScrollView>

        {/* Music Picker Modal */}
        <Modal
          visible={showMusicPicker}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMusicPicker(false)}
        >
          <View style={themedStyles.modalOverlay}>
            <GlassView intensity={90} tint="dark" style={themedStyles.modalBlur}>
              <View style={themedStyles.modalContent}>
                <View style={themedStyles.modalHeader}>
                  <Text style={themedStyles.modalTitle}>Choose Sleep Music</Text>
                  <TouchableOpacity
                    onPress={() => setShowMusicPicker(false)}
                    style={themedStyles.modalClose}
                  >
                    <X size={28} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={themedStyles.soundsList} showsVerticalScrollIndicator={false}>
                  {sleepSounds.map((sound) => (
                    <TouchableOpacity
                      key={sound.id}
                      style={[
                        themedStyles.soundItem,
                        selectedMusic?.id === sound.id && themedStyles.soundItemSelected,
                      ]}
                      onPress={() => handleMusicSelect(sound)}
                    >
                      <View style={themedStyles.soundItemLeft}>
                        <View
                          style={[
                            themedStyles.soundIcon,
                            selectedMusic?.id === sound.id && themedStyles.soundIconSelected,
                          ]}
                        >
                          {(() => {
                            const IconComponent = ICON_MAP[sound.icon] || Music;
                            return (
                              <IconComponent
                                size={24}
                                color={selectedMusic?.id === sound.id ? theme.colors.background : theme.colors.accent}
                              />
                            );
                          })()}
                        </View>
                        <Text style={themedStyles.soundName}>{sound.name}</Text>
                      </View>
                      {selectedMusic?.id === sound.id && (
                        <CheckCircle2 size={24} color={theme.colors.accent} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </GlassView>
          </View>
        </Modal>

        {/* Alarm Time Picker Modal */}
        {showAlarmPicker && (
          <Modal
            visible={showAlarmPicker}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setShowAlarmPicker(false)}
          >
            <TouchableOpacity
              style={themedStyles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowAlarmPicker(false)}
            >
              <GlassView intensity={90} tint="dark" style={themedStyles.modalBlur}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={themedStyles.modalContent}>
                    <View style={themedStyles.modalHeader}>
                      <Text style={themedStyles.modalTitle}>Set Wake-Up Time</Text>
                      <TouchableOpacity
                        onPress={() => setShowAlarmPicker(false)}
                        style={themedStyles.modalClose}
                      >
                        <X size={28} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    <View style={themedStyles.pickerContainer}>
                      {/* Quick Preset Buttons */}
                      <View style={themedStyles.quickPresetsContainer}>
                        <Text style={themedStyles.quickPresetsLabel}>Quick Select:</Text>
                        <View style={themedStyles.quickPresetsButtons}>
                          {[6, 7, 8, 9].map((hour) => {
                            const presetTime = new Date();
                            const currentHour = presetTime.getHours();

                            // If the preset hour has already passed today, set it for tomorrow
                            if (hour <= currentHour) {
                              presetTime.setDate(presetTime.getDate() + 1);
                            }

                            presetTime.setHours(hour, 0, 0, 0);

                            return (
                              <TouchableOpacity
                                key={hour}
                                style={themedStyles.presetButton}
                                onPress={() => {
                                  setAlarmTime(presetTime);
                                  setTempAlarmTime(presetTime);
                                  setShowAlarmPicker(false);
                                }}
                              >
                                <Text style={themedStyles.presetButtonText}>{hour}:00</Text>
                                <Text style={themedStyles.presetButtonLabel}>AM</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      <Text style={themedStyles.orText}>or set custom time</Text>

                      {/* Current Selection Display */}
                      {tempAlarmTime && (
                        <View style={themedStyles.selectedTimeDisplay}>
                          <Text style={themedStyles.selectedTimeLabel}>Selected Time:</Text>
                          <Text style={themedStyles.selectedTimeValue}>
                            {format12HourTime(tempAlarmTime)}
                          </Text>
                        </View>
                      )}

                      {/* Time Picker */}
                      <DateTimePicker
                        value={tempAlarmTime}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                        onChange={(event, selectedDate) => {
                          if (event.type === 'dismissed') {
                            return;
                          }
                          if (selectedDate) {
                            setTempAlarmTime(selectedDate);
                            // On Android, automatically close and set time
                            if (Platform.OS === 'android') {
                              setAlarmTime(selectedDate);
                              setShowAlarmPicker(false);
                            }
                          }
                        }}
                        textColor="#FFFFFF"
                        themeVariant="dark"
                      />

                      {/* iOS Only: Confirm Button */}
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={themedStyles.pickerDoneButton}
                          onPress={() => {
                            setAlarmTime(tempAlarmTime);
                            setShowAlarmPicker(false);
                          }}
                        >
                          <LinearGradient
                            colors={['#8B5CF6', '#6366F1']}
                            style={themedStyles.pickerDoneGradient}
                          >
                            <Text style={themedStyles.pickerDoneText}>Set Alarm</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </GlassView>
            </TouchableOpacity>
          </Modal>
        )}
      </LinearGradient>

      {/* Rating Prompt */}
      {showRatingPrompt && (
        <RatingPrompt 
          trigger="session_complete" 
          sessionCount={sleepHistory?.length || 0}
        />
      )}
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  dimmedContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dimmedContent: {
    alignItems: 'center',
  },
  dimmedTime: {
    fontSize: 84,
    fontWeight: '100',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 4,
  },
  dimmedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dimmedDuration: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  },
  dimmedHint: {
    position: 'absolute',
    bottom: -100,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '400',
  },
  container: {
    flex: 1,
    backgroundColor: '#05050A', // Deeper black for better contrast
  },
  contentOverlay: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Moved down from top
    marginBottom: 20,
  },
  exitButton: {
    padding: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginLeft: -10,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 115, 115, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E57373',
    marginRight: 6,
  },
  trackingText: {
    color: '#E57373',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    marginBottom: 30,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
    fontWeight: '500',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2D3A',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8E8E93',
  },
  toggleThumbActive: {
    backgroundColor: '#8B5CF6',
    alignSelf: 'flex-end',
  },
  tipsCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    overflow: 'hidden',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  startButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  clockContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: -40,
  },
  elapsedLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  timeDisplay: {
    fontSize: 64,
    fontWeight: '200',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(139, 92, 246, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  dateDisplay: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  soundStatus: {
    alignItems: 'center',
    marginBottom: 30,
  },
  soundIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  soundWave: {
    width: 3,
    height: 20,
    backgroundColor: '#8B5CF6',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  soundText: {
    fontSize: 14,
    color: '#8B5CF6',
    textAlign: 'center',
  },
  alarmContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  alarmText: {
    fontSize: 14,
    color: '#8B5CF6',
    marginLeft: 8,
    fontWeight: '600',
  },
  endButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 40,
  },
  endGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  endButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginLeft: 10,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formHeader: {
    marginTop: 80,
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  formCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 12,
    fontWeight: '500',
  },
  starRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: 'rgba(42, 45, 58, 0.6)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  confirmButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  confirmGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.background,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 30,
  },
  musicSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.2)',
  },
  musicSelectContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicSelectText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: 10,
    fontWeight: '500',
  },
  musicPlayerContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  musicPlayer: {
    backgroundColor: 'rgba(27, 29, 42, 0.8)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  musicIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 255, 209, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicDetails: {
    marginLeft: 12,
    flex: 1,
  },
  musicName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  musicStatus: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  musicControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  musicButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  playPauseButton: {
    borderRadius: 32,
    overflow: 'hidden',
    marginHorizontal: 16,
  },
  playPauseGradient: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  volumeSlider: {
    flex: 1,
    marginHorizontal: 12,
  },
  playlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playlistButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E57373',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(27, 29, 42, 0.95)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  modalClose: {
    padding: 4,
  },
  soundsList: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(42, 45, 58, 0.4)',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  soundItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  soundItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  soundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  soundIconSelected: {
    backgroundColor: '#8B5CF6',
  },
  soundName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  alarmTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  alarmTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmTimeText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: 10,
    fontWeight: '500',
  },
  recorderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  recorderInfoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 30,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(229, 115, 115, 0.3)',
  },
  recordingDetails: {
    marginLeft: 10,
    flex: 1,
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recordingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#E57373',
  },
  volumeMeter: {
    height: 4,
    width: 60,
    backgroundColor: 'rgba(229, 115, 115, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeBar: {
    height: '100%',
    backgroundColor: '#E57373',
  },
  recordingStats: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pickerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  timePickerWrapper: {
    marginVertical: 20,
    backgroundColor: 'rgba(42, 45, 58, 0.4)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  pickerLabel: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerDoneButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  pickerDoneGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedTimeDisplay: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  selectedTimeLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  selectedTimeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  pickerButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  pickerCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(160, 174, 192, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(160, 174, 192, 0.3)',
    alignItems: 'center',
  },
  pickerCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  pickerOKButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerOKGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOKButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alarmInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  alarmInfoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  quickPresetsContainer: {
    marginBottom: 20,
    width: '100%',
  },
  quickPresetsLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  quickPresetsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  presetButtonLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  orText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: 16,
    fontStyle: 'italic',
  },
});

