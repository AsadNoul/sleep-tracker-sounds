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
  Activity,
  Waves,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSleep } from '../contexts/SleepContext';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { format12HourTime, formatDuration } from '../utils/dateFormatting';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import notificationService from '../services/notificationService';
import sleepRecorderService from '../services/sleepRecorderService';
import RatingPrompt from '../components/RatingPrompt';

// ============================================================================
// Nightprint — Sleep Session (redesign/ui-ux-v3)
// ============================================================================
// Rebuilt to match the design canvas's `Trk-Session.dc.html` ("Sleeping ·
// active session") and `Trk-Wake.dc.html` ("Good morning · rate night"), plus
// their `D-` Day variants. This screen is a single route (App.tsx's
// `SleepSession`) with internal view-state sections — it is NOT split into
// two app screens, matching the existing state machine:
//   1. Setup (not tracking)      — no canvas equivalent for the pre-session
//      settings list; self-designed in the same card system.
//   2. Active tracking (isTracking) — canvas: Trk-Session.dc.html
//   3. Dimmed lock screen (isDimmed) — no canvas equivalent; self-designed,
//      keeps the near-black true "dimmed" look since it exists to save
//      battery/avoid light at night.
//   4. End-of-sleep rating form (showEndForm) — canvas: Trk-Wake.dc.html
//
// No data flow, service call, or business logic was touched — only JSX and
// styling. theme.colors.cardBorder is used for every card/row border (never
// a hardcoded color) so this screen inherits the ~2.0 contrast-ratio fix
// automatically.
// ============================================================================

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
  const { theme, isNight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { currentSession, isTracking, startSleepSession, endSleepSession, sleepHistory } = useSleep();
  const { isPlaying, currentSound, volume, playSound, pauseSound, stopSound, setVolume, isMixing, stopMixing } = useAudio();
  const s = useMemo(() => styles(theme), [theme]);

  // Initialize states from navigation params if available
  const [sleepSoundsEnabled, setSleepSoundsEnabled] = useState(route.params?.initialSounds ?? false);
  const [smartAlarmEnabled, setSmartAlarmEnabled] = useState(route.params?.initialSmartAlarm ?? true);
  const [sleepRecorderEnabled, setSleepRecorderEnabled] = useState(route.params?.initialRecorder ?? false);
  const [isNapMode, setIsNapMode] = useState(route.params?.isNap ?? false);
  // Nap duration in minutes: null = not set, user picks before starting
  const [napDuration, setNapDuration] = useState<number | null>(null);
  const [showNapPicker, setShowNapPicker] = useState(false);
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
    let dimTimer: ReturnType<typeof setTimeout>;

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

  // "In bed" stat for the active-tracking card grid (canvas: "In bed" tile) —
  // same elapsed clock, formatted as "Xh Ym" to match the canvas's style.
  const getInBedLabel = () => {
    const raw = getElapsedTime(); // "H:MM:SS"
    const [h, m] = raw.split(':');
    const hours = parseInt(h, 10) || 0;
    const minutes = parseInt(m, 10) || 0;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const handleStartSleep = async () => {
    // If nap mode and no duration chosen, show picker first
    if (isNapMode && napDuration === null) {
      setShowNapPicker(true);
      return;
    }

    try {
      // startSleepSession returns the session id via currentSession after state update,
      // but we need it synchronously — generate it here and pass it in.
      // Generate a proper UUID v4 — must match SleepContext which also uses UUID now
      const sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

      // Compute alarm time for nap mode
      let effectiveAlarmTime = alarmTime;
      if (isNapMode && napDuration !== null) {
        const napEnd = new Date(Date.now() + napDuration * 60 * 1000);
        effectiveAlarmTime = napEnd;
      }

      // Pass settings to startSleepSession
      await startSleepSession(
        sleepSoundsEnabled,
        smartAlarmEnabled || (isNapMode && napDuration !== null),
        sleepRecorderEnabled,
        effectiveAlarmTime || undefined,
        [],
        isNapMode
      );

      // Schedule notification alarm using the pre-generated sessionId
      if (effectiveAlarmTime && (smartAlarmEnabled || isNapMode)) {
        try {
          await notificationService.scheduleAlarm({
            alarmTime: effectiveAlarmTime,
            sessionId: sessionId,
            smartAlarm: smartAlarmEnabled && !isNapMode,
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
          await playSound(selectedMusic.id, selectedMusic.uri, selectedMusic.name);
        } catch (audioError) {
          console.log('Failed to start music, but session started:', audioError);
        }
      }

      Alert.alert(
        isNapMode ? 'Nap Started' : 'Sleep Session Started',
        isNapMode && napDuration !== null
          ? `Your ${napDuration}-minute nap timer is set. Rest well!`
          : 'Your sleep is now being tracked. Sleep well!'
      );
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
        await playSound(selectedMusic.id, selectedMusic.uri, selectedMusic.name);
      } catch (error) {
        Alert.alert('Playback Error', 'Unable to play sound. Please check your connection.');
      }
    }
  };

  const handleNextTrack = async () => {
    const currentIndex = sleepSounds.findIndex((snd) => snd.id === selectedMusic?.id);
    const nextIndex = (currentIndex + 1) % sleepSounds.length;
    const nextSound = sleepSounds[nextIndex];

    setSelectedMusic(nextSound);

    if (isTracking && isPlaying) {
      try {
        await playSound(nextSound.id, nextSound.uri, nextSound.name);
      } catch (error) {
        Alert.alert('Playback Error', 'Unable to play next sound.');
      }
    }
  };

  const handlePreviousTrack = async () => {
    const currentIndex = sleepSounds.findIndex((snd) => snd.id === selectedMusic?.id);
    const prevIndex = currentIndex <= 0 ? sleepSounds.length - 1 : currentIndex - 1;
    const prevSound = sleepSounds[prevIndex];

    setSelectedMusic(prevSound);

    if (isTracking && isPlaying) {
      try {
        await playSound(prevSound.id, prevSound.uri, prevSound.name);
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

      // Show rating prompt BEFORE navigating back (goBack unmounts the screen)
      setShowRatingPrompt(true);
      // Give rating prompt a moment to mount, then optionally navigate
      // Navigation is handled after the rating prompt closes (or user dismisses it)
      Alert.alert(
        'Sleep Session Ended',
        message,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
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

  // ==========================================================================
  // 4. End-of-sleep rating form — canvas: Trk-Wake.dc.html / D-Trk-Wake.dc.html
  // ==========================================================================
  if (showEndForm) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />
        <ScrollView
          style={s.formScroll}
          contentContainerStyle={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.formHeader}>
            <Text style={s.formEyebrow}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })} · {format12HourTime(new Date())}
            </Text>
            <Text style={s.formTitle}>Good morning</Text>
            <Text style={s.formSubtitle}>
              You slept <Text style={s.formSubtitleStrong}>{getElapsedTime().split(':').slice(0, 2).join('h ')}m</Text>. Your print is ready.
            </Text>
          </View>

          {/* How did you sleep — canvas's 1-10 rating grid, mapped onto the
              app's existing 5-star rating state (no new data field invented). */}
          <View style={s.formCard}>
            <View style={s.formCardHeaderRow}>
              <Text style={s.formCardTitle}>How did you sleep?</Text>
              <Text style={s.formCardHint}>1 = poor · 5 = excellent</Text>
            </View>
            <View style={s.starRatingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSleepRating(star)}
                  style={[s.starButton, star <= sleepRating && s.starButtonActive]}
                  activeOpacity={0.7}
                >
                  <Star
                    size={26}
                    color={star <= sleepRating ? theme.colors.ctaText : theme.colors.textTertiary}
                    fill={star <= sleepRating ? theme.colors.ctaText : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.ratingLabel}>
              {sleepRating === 0 && 'Tap to rate'}
              {sleepRating === 1 && 'Poor — very restless night'}
              {sleepRating === 2 && 'Fair — somewhat restless'}
              {sleepRating === 3 && 'Good — average sleep'}
              {sleepRating === 4 && 'Great — slept well'}
              {sleepRating === 5 && 'Excellent — perfect sleep'}
            </Text>
          </View>

          {/* Wake-ups — existing data field, styled like the canvas's tag card */}
          <View style={s.formCard}>
            <Text style={s.formCardTitle}>How many times did you wake up?</Text>
            <TextInput
              style={s.input}
              value={wakeUps}
              onChangeText={setWakeUps}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          {/* Note — canvas's "Note · Optional" textarea */}
          <View style={s.formCard}>
            <View style={s.noteLabelRow}>
              <Text style={s.formCardTitle}>Note</Text>
              <Text style={s.formCardHint}>Optional</Text>
            </View>
            <TextInput
              style={[s.input, s.textArea]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholder="Dreamt about the sea…"
              placeholderTextColor={theme.colors.textTertiary}
            />
          </View>

          <TouchableOpacity
            style={s.confirmButton}
            onPress={handleEndSleepConfirm}
            activeOpacity={0.9}
          >
            <Text style={s.confirmButtonText}>Save Sleep Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.cancelButton}
            onPress={() => setShowEndForm(false)}
          >
            <Text style={s.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ==========================================================================
  // 2 / 3. Active tracking — canvas: Trk-Session.dc.html / D-Trk-Session.dc.html
  // ==========================================================================
  if (isTracking && currentSession) {
    // 3. Dimmed lock screen — no canvas equivalent; self-designed, deliberately
    // near-black regardless of theme since its whole purpose is dimness at
    // night (kept close to the original intent rather than theme-recolored).
    if (isDimmed) {
      return (
        <TouchableOpacity
          activeOpacity={1}
          style={s.dimmedContainer}
          onPress={() => setIsDimmed(false)}
        >
          <StatusBar hidden />
          <View style={s.dimmedContent}>
            <Text style={s.dimmedTime}>
              {format12HourTime(clockRef.current)}
            </Text>
            <View style={s.dimmedStats}>
              <Moon size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
              <Text style={s.dimmedDuration}>{getInBedLabel()} asleep</Text>
            </View>
            <Text style={s.dimmedHint}>Tap anywhere to wake screen</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={[s.trackContainer, { backgroundColor: isNight ? '#000000' : theme.colors.background }]}>
        <StatusBar hidden />

        <View
          style={[
            s.trackContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
          ]}
        >
          {/* Top row — Tracking pill (canvas) + exit control (app necessity, no canvas equivalent) */}
          <View style={s.trackTopRow}>
            <View style={s.trackingBadge}>
              <View style={s.trackingDot} />
              <Text style={s.trackingBadgeText}>Tracking your sleep</Text>
            </View>
            <TouchableOpacity onPress={exitSleepMode} style={s.trackExitButton} activeOpacity={0.7}>
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Giant Fraunces clock — canvas hero */}
          <View style={s.trackHero}>
            <View pointerEvents="none" style={s.trackHeroGlow} />
            <Text style={s.trackHeroTime}>{format12HourTime(clockRef.current).split(' ')[0]}</Text>
            <Text style={s.trackHeroSubtext}>
              {format12HourTime(clockRef.current).split(' ')[1]}
              {alarmTime ? ` · Alarm at ${format12HourTime(alarmTime)}` : ''}
            </Text>
          </View>

          {/* 3-stat grid — canvas: In bed / Movement / Snoring, wired to the
              real recorder status instead of static demo values */}
          <View style={s.trackStatsGrid}>
            <View style={s.trackStatTile}>
              <Text style={s.trackStatLabel}>In bed</Text>
              <Text style={s.trackStatValue}>{getInBedLabel()}</Text>
            </View>
            <View style={s.trackStatTile}>
              <Text style={s.trackStatLabel}>Movement</Text>
              <Text style={s.trackStatValue}>
                {recordingStatus?.isRecording
                  ? (recordingStatus.currentVolume > 0.4 ? 'Active' : 'Calm')
                  : '—'}
              </Text>
            </View>
            <View style={s.trackStatTile}>
              <Text style={s.trackStatLabel}>Snoring</Text>
              <Text style={s.trackStatValue}>
                {sleepRecorderEnabled
                  ? (recordingStatus?.snoringEvents > 0 ? `${recordingStatus.snoringEvents} events` : 'Listening')
                  : 'Off'}
              </Text>
            </View>
          </View>

          {/* Recorder detail strip — self-designed, no canvas equivalent for
              the live volume meter / snoring+talk counts the old screen had */}
          {sleepRecorderEnabled && recordingStatus?.isRecording && (
            <View style={s.recordingCard}>
              <Mic size={18} color={theme.colors.error} />
              <View style={s.recordingDetails}>
                <View style={s.recordingHeaderRow}>
                  <Text style={s.recordingCardText}>Recording active</Text>
                  <View style={s.volumeMeter}>
                    <View
                      style={[
                        s.volumeBar,
                        { width: `${Math.min(100, (recordingStatus.currentVolume || 0) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <Text style={s.recordingStatsText}>
                  Noise {recordingStatus.eventsDetected} · Snoring {recordingStatus.snoringEvents} · Talk {recordingStatus.sleepTalkEvents}
                </Text>
              </View>
            </View>
          )}

          {/* Sound player row — canvas's "Rainy cabin" row, wired to the real player */}
          {sleepSoundsEnabled && (
            <View style={s.soundRow}>
              <View style={s.soundRowIcon}>
                {(() => {
                  const Icon = ICON_MAP[selectedMusic?.icon || 'musical-note'] || Music;
                  return <Icon size={18} color={theme.colors.textSecondary} />;
                })()}
              </View>
              <View style={s.soundRowText}>
                <Text style={s.soundRowTitle} numberOfLines={1}>{selectedMusic?.name || 'No sound'}</Text>
                <Text style={s.soundRowSubtitle}>
                  {isPlaying && currentSound === selectedMusic?.id ? 'Playing' : 'Paused'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMusicPicker(true)}
                style={s.soundRowListButton}
                activeOpacity={0.7}
              >
                <List size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={toggleMusicPlayback}
                style={s.soundRowPlayButton}
                activeOpacity={0.8}
              >
                {isPlaying && currentSound === selectedMusic?.id ? (
                  <Pause size={18} color={theme.colors.textPrimary} fill={theme.colors.textPrimary} />
                ) : (
                  <Play size={18} color={theme.colors.textPrimary} fill={theme.colors.textPrimary} />
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Full transport + volume — self-designed extension of the canvas's
              single row, since this app has prev/next/volume the canvas lacks */}
          {sleepSoundsEnabled && (
            <View style={s.transportRow}>
              <TouchableOpacity onPress={handlePreviousTrack} style={s.transportButton} activeOpacity={0.7}>
                <SkipBack size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setVolume(volume > 0 ? 0 : 1)} activeOpacity={0.7}>
                {volume > 0 ? (
                  <Volume2 size={18} color={theme.colors.textSecondary} />
                ) : (
                  <VolumeX size={18} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>
              <Slider
                style={s.volumeSlider}
                value={volume}
                onValueChange={setVolume}
                minimumValue={0}
                maximumValue={1}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.cardBorder}
                thumbTintColor={theme.colors.accent}
              />
              <TouchableOpacity onPress={handleNextTrack} style={s.transportButton} activeOpacity={0.7}>
                <SkipForward size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Hold-to-wake CTA — canvas's bottom button + caption */}
          <View style={s.trackBottom}>
            <TouchableOpacity
              style={s.wakeButton}
              onPress={handleEndSleepClick}
              activeOpacity={0.85}
            >
              <View pointerEvents="none" style={s.wakeButtonFill} />
              <CircleStop size={20} color={theme.colors.ctaText} style={{ marginRight: 10 }} />
              <Text style={s.wakeButtonText}>End Sleep Session</Text>
            </TouchableOpacity>
            <Text style={s.trackCaption}>Place your phone face down on the bed, near your pillow.</Text>
          </View>
        </View>
      </View>
    );
  }

  // ==========================================================================
  // 1. Setup / pre-session settings — no canvas equivalent; self-designed in
  //    the same card system (theme.colors.card/cardBorder, Fraunces/DM Sans).
  // ==========================================================================
  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />

      <View style={[s.topControls, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={exitSleepMode} style={s.backButton} activeOpacity={0.7}>
          <ChevronLeft size={24} color={theme.colors.textSecondary} />
          <Text style={s.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.content}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <Text style={s.eyebrow}>Tonight</Text>
          <Text style={s.title}>Ready to sleep?</Text>
          <Text style={s.subtitle}>Configure your session before you start.</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Sleep Settings</Text>

          {/* Nap Mode Toggle */}
          <View style={s.settingItem}>
            <View style={s.settingLeft}>
              <View style={s.settingIcon}>
                <Coffee size={20} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.settingLabel}>Nap Mode</Text>
                <Text style={s.settingSubtext}>
                  {isNapMode
                    ? napDuration !== null ? `${napDuration} min nap · Auto alarm` : 'Tap to set duration'
                    : 'Full night sleep'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.toggle, isNapMode && s.toggleActive]}
              onPress={() => {
                const enabling = !isNapMode;
                setIsNapMode(enabling);
                if (enabling) {
                  setSmartAlarmEnabled(false);
                  setShowNapPicker(true); // Immediately ask for duration
                } else {
                  setNapDuration(null);
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, isNapMode && s.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {/* Nap duration row (shows when nap mode is on) */}
          {isNapMode && (
            <TouchableOpacity style={s.subRow} onPress={() => setShowNapPicker(true)} activeOpacity={0.8}>
              <View style={s.subRowContent}>
                <Clock size={18} color={theme.colors.accent} />
                <Text style={s.subRowText}>
                  {napDuration !== null ? `Nap for ${napDuration} minutes` : 'Choose nap duration'}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}

          <View style={s.settingDivider} />

          <View style={s.settingItem}>
            <View style={s.settingLeft}>
              <View style={s.settingIcon}>
                <Music size={20} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={s.settingLabel}>Sleep Sounds</Text>
            </View>
            <TouchableOpacity
              style={[s.toggle, sleepSoundsEnabled && s.toggleActive]}
              onPress={() => setSleepSoundsEnabled(!sleepSoundsEnabled)}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, sleepSoundsEnabled && s.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {sleepSoundsEnabled && (
            <TouchableOpacity style={s.subRow} onPress={() => setShowMusicPicker(true)} activeOpacity={0.8}>
              <View style={s.subRowContent}>
                {(() => {
                  const Icon = ICON_MAP[selectedMusic?.icon || 'musical-note'] || Music;
                  return <Icon size={18} color={theme.colors.accent} />;
                })()}
                <Text style={s.subRowText}>{selectedMusic?.name || 'Choose Music'}</Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}

          <View style={s.settingDivider} />

          <View style={s.settingItem}>
            <View style={s.settingLeft}>
              <View style={s.settingIcon}>
                <AlarmClock size={20} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={s.settingLabel}>Smart Alarm</Text>
            </View>
            <TouchableOpacity
              style={[s.toggle, smartAlarmEnabled && s.toggleActive]}
              onPress={() => setSmartAlarmEnabled(!smartAlarmEnabled)}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, smartAlarmEnabled && s.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {smartAlarmEnabled && (
            <TouchableOpacity style={s.subRow} onPress={() => setShowAlarmPicker(true)} activeOpacity={0.8}>
              <View style={s.subRowContent}>
                <Clock size={18} color={theme.colors.accent} />
                <Text style={s.subRowText}>
                  {alarmTime ? `Wake up at ${format12HourTime(alarmTime)}` : 'Set Alarm Time'}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}

          <View style={s.settingDivider} />

          <View style={s.settingItem}>
            <View style={s.settingLeft}>
              <View style={s.settingIcon}>
                <Mic size={20} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={s.settingLabel}>Sleep Recorder</Text>
            </View>
            <TouchableOpacity
              style={[s.toggle, sleepRecorderEnabled && s.toggleActive]}
              onPress={() => setSleepRecorderEnabled(!sleepRecorderEnabled)}
              activeOpacity={0.8}
            >
              <View style={[s.toggleThumb, sleepRecorderEnabled && s.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {sleepRecorderEnabled && (
            <View style={s.recorderInfo}>
              <Info size={15} color={theme.colors.textTertiary} />
              <Text style={s.recorderInfoText}>
                Monitors audio for snoring and sleep talk detection
              </Text>
            </View>
          )}
        </View>

        <View style={s.tipsCard}>
          <View pointerEvents="none" style={s.tipsGlow} />
          <View style={s.tipHeader}>
            <View style={s.tipIconCircle}>
              <Lightbulb size={18} color={theme.colors.textPrimary} strokeWidth={2.2} />
            </View>
            <Text style={s.tipTitle}>Sleep Tips</Text>
          </View>
          <Text style={s.tipText}>
            • Place your phone face down on a stable surface{'\n'}
            • Keep your phone plugged in{'\n'}
            • Enable Do Not Disturb mode{'\n'}
            • Create a comfortable sleep environment
          </Text>
        </View>

        <TouchableOpacity
          style={s.startButton}
          onPress={handleStartSleep}
          activeOpacity={0.9}
        >
          {isNapMode ? (
            <Coffee size={20} color={theme.colors.ctaText} strokeWidth={2.4} />
          ) : (
            <Waves size={20} color={theme.colors.ctaText} strokeWidth={2.4} />
          )}
          <Text style={s.startButtonText}>
            {isNapMode ? 'Start Nap Session' : 'Start Sleep Session'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Music Picker Modal */}
      <Modal
        visible={showMusicPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMusicPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Choose Sleep Music</Text>
              <TouchableOpacity onPress={() => setShowMusicPicker(false)} style={s.modalClose} activeOpacity={0.7}>
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalList} showsVerticalScrollIndicator={false}>
              {sleepSounds.map((sound) => (
                <TouchableOpacity
                  key={sound.id}
                  style={[s.modalRow, selectedMusic?.id === sound.id && s.modalRowSelected]}
                  onPress={() => handleMusicSelect(sound)}
                  activeOpacity={0.8}
                >
                  <View style={s.modalRowLeft}>
                    <View style={[s.modalRowIcon, selectedMusic?.id === sound.id && s.modalRowIconSelected]}>
                      {(() => {
                        const IconComponent = ICON_MAP[sound.icon] || Music;
                        return (
                          <IconComponent
                            size={20}
                            color={selectedMusic?.id === sound.id ? theme.colors.ctaText : theme.colors.accent}
                          />
                        );
                      })()}
                    </View>
                    <Text style={s.modalRowText}>{sound.name}</Text>
                  </View>
                  {selectedMusic?.id === sound.id && (
                    <CheckCircle2 size={20} color={theme.colors.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Nap Duration Picker Modal */}
      <Modal
        visible={showNapPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNapPicker(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>How long is your nap?</Text>
              <TouchableOpacity onPress={() => setShowNapPicker(false)} style={s.modalClose} activeOpacity={0.7}>
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalList} showsVerticalScrollIndicator={false}>
              {[10, 15, 20, 25, 30, 45, 60, 90].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[s.modalRow, napDuration === mins && s.modalRowSelected]}
                  onPress={() => {
                    setNapDuration(mins);
                    setShowNapPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={s.modalRowLeft}>
                    <View style={[s.modalRowIcon, napDuration === mins && s.modalRowIconSelected]}>
                      <Clock size={20} color={napDuration === mins ? theme.colors.ctaText : theme.colors.accent} />
                    </View>
                    <View>
                      <Text style={s.modalRowText}>{mins} minutes</Text>
                      <Text style={s.modalRowSubtext}>
                        {mins <= 20 ? 'Power nap' : mins <= 45 ? 'Recovery nap' : 'Full cycle nap'}
                      </Text>
                    </View>
                  </View>
                  {napDuration === mins && <CheckCircle2 size={20} color={theme.colors.accent} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
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
            style={s.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowAlarmPicker(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={s.modalContent}>
                <View style={s.modalHeader}>
                  <Text style={s.modalTitle}>Set Wake-Up Time</Text>
                  <TouchableOpacity onPress={() => setShowAlarmPicker(false)} style={s.modalClose} activeOpacity={0.7}>
                    <X size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={s.pickerContainer}>
                  {/* Quick Preset Buttons */}
                  <View style={s.quickPresetsContainer}>
                    <Text style={s.quickPresetsLabel}>Quick Select</Text>
                    <View style={s.quickPresetsButtons}>
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
                            style={s.presetButton}
                            onPress={() => {
                              setAlarmTime(presetTime);
                              setTempAlarmTime(presetTime);
                              setShowAlarmPicker(false);
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={s.presetButtonText}>{hour}:00</Text>
                            <Text style={s.presetButtonLabel}>AM</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <Text style={s.orText}>or set a custom time</Text>

                  {/* Current Selection Display */}
                  {tempAlarmTime && (
                    <View style={s.selectedTimeDisplay}>
                      <Text style={s.selectedTimeLabel}>Selected Time</Text>
                      <Text style={s.selectedTimeValue}>
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
                    textColor={theme.colors.textPrimary}
                    themeVariant={isNight ? 'dark' : 'light'}
                  />

                  {/* iOS Only: Confirm Button */}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={s.pickerDoneButton}
                      onPress={() => {
                        setAlarmTime(tempAlarmTime);
                        setShowAlarmPicker(false);
                      }}
                      activeOpacity={0.9}
                    >
                      <Text style={s.pickerDoneText}>Set Alarm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

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
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topControls: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginLeft: 2,
  },

  // Setup header
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  eyebrow: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.textTertiary,
    marginBottom: 6,
  },
  title: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 30,
    letterSpacing: -0.4,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },

  // Settings card
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    columnGap: 12,
  },
  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  settingSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  settingDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: 12,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: theme.colors.selectedBackground,
    borderColor: theme.colors.accentBorder,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.textTertiary,
  },
  toggleThumbActive: {
    backgroundColor: theme.colors.accent,
    alignSelf: 'flex-end',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  subRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    flex: 1,
  },
  subRowText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  recorderInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    columnGap: 8,
  },
  recorderInfoText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    flex: 1,
    lineHeight: 17,
  },

  // Tips card
  tipsCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 18,
    marginBottom: 24,
  },
  tipsGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: theme.colors.accentLight,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 12,
  },
  tipIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.navActiveBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  tipText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 21,
  },

  // Start CTA
  startButton: {
    height: 60,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.ctaBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.ctaBackground,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 18,
      },
      android: { elevation: 6 },
    }),
  },
  startButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 17,
    color: theme.colors.ctaText,
  },

  // ===== Active tracking (canvas: Trk-Session) =====
  trackContainer: {
    flex: 1,
  },
  trackContent: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  trackTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    columnGap: 8,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  trackingBadgeText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  trackExitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  trackHero: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 64,
  },
  trackHeroGlow: {
    position: 'absolute',
    left: -80,
    right: -80,
    top: -50,
    bottom: -50,
    borderRadius: 999,
    backgroundColor: theme.colors.accentLight,
  },
  trackHeroTime: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: 80,
    letterSpacing: -2,
    lineHeight: 84,
    color: theme.colors.textPrimary,
  },
  trackHeroSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  trackStatsGrid: {
    width: '100%',
    flexDirection: 'row',
    columnGap: 10,
    marginTop: 44,
  },
  trackStatTile: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  trackStatLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  trackStatValue: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  recordingCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    columnGap: 12,
  },
  recordingDetails: {
    flex: 1,
  },
  recordingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recordingCardText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  volumeMeter: {
    height: 4,
    width: 56,
    borderRadius: 2,
    backgroundColor: theme.colors.disabled,
    overflow: 'hidden',
  },
  volumeBar: {
    height: '100%',
    backgroundColor: theme.colors.error,
  },
  recordingStatsText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  soundRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 20,
    padding: 12,
    marginTop: 14,
    columnGap: 12,
  },
  soundRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundRowText: {
    flex: 1,
  },
  soundRowTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  soundRowSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  soundRowListButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
  },
  soundRowPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginTop: 14,
  },
  transportButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeSlider: {
    flex: 1,
  },
  trackBottom: {
    marginTop: 'auto',
    width: '100%',
    alignItems: 'center',
    rowGap: 14,
  },
  wakeButton: {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: 64,
    borderRadius: 22,
    backgroundColor: theme.colors.ctaBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wakeButtonFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '34%',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  wakeButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 17,
    color: theme.colors.ctaText,
  },
  trackCaption: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },

  // ===== Dimmed lock screen (self-designed) =====
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
    fontFamily: theme.typography.fontFamily.display,
    fontSize: 84,
    fontWeight: '300',
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dimmedDuration: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  dimmedHint: {
    position: 'absolute',
    bottom: -100,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
  },

  // ===== End-of-sleep rating form (canvas: Trk-Wake) =====
  formScroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formHeader: {
    marginBottom: 16,
    rowGap: 4,
  },
  formEyebrow: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  formTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 30,
    letterSpacing: -0.4,
    color: theme.colors.textPrimary,
  },
  formSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  formSubtitleStrong: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 18,
    marginBottom: 14,
  },
  formCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formCardTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  formCardHint: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  noteLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    columnGap: 8,
    marginBottom: 10,
  },
  starRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 10,
  },
  starButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  ratingLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 14,
    padding: 16,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  confirmButton: {
    height: 60,
    borderRadius: 20,
    backgroundColor: theme.colors.ctaBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  confirmButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 17,
    color: theme.colors.ctaText,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },

  // ===== Modals (music / nap / alarm pickers) =====
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 21,
    color: theme.colors.textPrimary,
  },
  modalClose: {
    padding: 4,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  modalRowSelected: {
    backgroundColor: theme.colors.selectedBackground,
    borderColor: theme.colors.accentBorder,
  },
  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    columnGap: 14,
  },
  modalRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRowIconSelected: {
    backgroundColor: theme.colors.accent,
  },
  modalRowText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  modalRowSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  pickerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  quickPresetsContainer: {
    marginBottom: 16,
    width: '100%',
  },
  quickPresetsLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginBottom: 10,
    textAlign: 'center',
  },
  quickPresetsButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    columnGap: 8,
  },
  presetButton: {
    flex: 1,
    backgroundColor: theme.colors.accentLight,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    alignItems: 'center',
  },
  presetButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.accent,
  },
  presetButtonLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  orText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginVertical: 14,
  },
  selectedTimeDisplay: {
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    alignItems: 'center',
    width: '100%',
  },
  selectedTimeLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  selectedTimeValue: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 26,
    color: theme.colors.accent,
  },
  pickerDoneButton: {
    marginTop: 18,
    height: 56,
    borderRadius: 16,
    width: '100%',
    backgroundColor: theme.colors.ctaBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDoneText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.ctaText,
  },
});
