import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  useWindowDimensions,
  Platform,
  StatusBar,
  RefreshControl,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Moon,
  Clock,
  Star,
  Activity,
  TrendingUp,
  BookOpen,
  Save,
  Mic,
  Play,
  Pause,
  Volume2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Sun,
  Eye,
  Cloud,
  TrendingDown,
  LayoutGrid,
  Bell,
  Zap,
  CheckCircle2,
  ArrowRight,
  Quote,
  Smartphone,
  Flame,
  Utensils,
  Pill,
  Leaf,
  Heart,
  Wind,
  Thermometer,
  Droplets,
  Layout,
  RefreshCw,
  Battery
} from 'lucide-react-native';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonCard, SkeletonList } from '../components/SkeletonLoader';
import CircularProgress from '../components/CircularProgress';
import FluidBackground from '../components/FluidBackground';
import { formatDuration, format12HourTime } from '../utils/dateFormatting';
import Svg, { Path, Circle, Rect, Line, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop, Polyline } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import SleepAnalysisScreen from './SleepAnalysisScreen';

export default function JournalScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const CHART_WIDTH = SCREEN_WIDTH - 80;
  const CHART_HEIGHT = 120;
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const navigation = useNavigation<any>();
  const { sleepHistory, getSleepStats, loadSleepHistory } = useSleep();
  const { user } = useAuth();

  const themedStyles = useMemo(() => createStyles(theme, SCREEN_WIDTH, CHART_HEIGHT), [theme, SCREEN_WIDTH, CHART_HEIGHT]);
  const styles = useCallback((_theme: any) => themedStyles, [themedStyles]);

  const [activeTab, setActiveTab] = useState<'entries' | 'stats'>('entries');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalEntry, setJournalEntry] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [journalEntries, setJournalEntries] = useState<Array<{ id: string, entry_text: string, entry_date: string, created_at: string, mood?: string, tags?: string[] }>>([]);
  const [disruptions, setDisruptions] = useState<Array<{ id: string, event_type: string, timestamp: string, loudness_db: number, audio_file_url?: string, audio_offset_ms?: number, duration_seconds?: number }>>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const stats = getSleepStats();

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  // Dynamic Display Mode & Backgrounds
  const displayMode = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'daytime';
    return 'evening';
  }, []);

  const bgColors = useMemo((): [string, string, ...string[]] => {
    switch (displayMode) {
      case 'morning': return ['#0F172A', '#1E1B4B', '#312E81'];
      case 'daytime': return ['#0F172A', '#1E293B', '#334155'];
      case 'evening': return ['#0F0F1E', '#1E1B4B', '#2E1065'];
      default: return ['#0F0F1E', '#1B1B2F'];
    }
  }, [displayMode]);

  // Build available dates from history (fallback to last 14 days)
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();

    // Always include today for quick entry even without history
    const today = new Date();
    datesSet.add(today.toDateString());

    sleepHistory.forEach(session => {
      const sessionDate = new Date(session.endTime || session.startTime);
      datesSet.add(sessionDate.toDateString());
    });

    // Ensure we have a rolling window if history is empty
    if (datesSet.size === 1) {
      for (let i = 1; i < 14; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        datesSet.add(date.toDateString());
      }
    }

    return Array.from(datesSet)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime())
      .slice(0, 30); // cap to 30 days for UI simplicity
  }, [sleepHistory]);

  const datesWithSleepData = useMemo(() => {
    const dates = new Set<string>();
    sleepHistory.forEach(session => {
      const date = new Date(session.endTime || session.startTime);
      dates.add(date.toDateString());
    });
    return dates;
  }, [sleepHistory]);

  // Get selected day's sleep session
  const selectedDaySession = useMemo(() => {
    return sleepHistory.find(session => {
      const sessionDate = new Date(session.endTime || session.startTime);
      return sessionDate.toDateString() === selectedDate.toDateString();
    });
  }, [selectedDate, sleepHistory]);

  useEffect(() => {
    if (availableDates.length === 0) return;
    const exists = availableDates.some(d => d.toDateString() === selectedDate.toDateString());
    if (!exists) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates]);

  const displayScore = useMemo(() => {
    if (!selectedDaySession) return 0; // Use 0 when no session to avoid mixed states
    return selectedDaySession.sleepScore || Math.round((selectedDaySession.quality || 7.5) * 10);
  }, [selectedDaySession]);

  const scoreLabel = useMemo(() => {
    if (!selectedDaySession) return 'No data';
    if (displayScore >= 85) return 'Excellent';
    if (displayScore >= 70) return 'Good';
    return 'Fair';
  }, [displayScore, selectedDaySession]);

  // Calculate real-time stats from session data
  const sessionStats = useMemo(() => {
    if (!selectedDaySession) {
      return {
        timeToFallAsleep: '—',
        totalSleep: '—',
        sleepEfficiency: '—',
        restlessness: '—',
      };
    }

    const stages = selectedDaySession.sleepStages || [];
    const firstDeepOrRem = stages.find(s => s.stage === 'deep' || s.stage === 'rem');

    // Time to fall asleep (time until first deep/REM sleep)
    let timeToSleep = 12; // default
    if (firstDeepOrRem) {
      const sleepStart = new Date(selectedDaySession.startTime).getTime();
      const firstSleepTime = new Date(firstDeepOrRem.startTime).getTime();
      timeToSleep = Math.round((firstSleepTime - sleepStart) / 60000); // minutes
    }

    // Total sleep duration
    const totalSleep = formatDuration(selectedDaySession.duration);

    // Sleep efficiency (time asleep / time in bed * 100)
    const awakeTime = stages
      .filter(s => s.stage === 'awake')
      .reduce((sum, s) => {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        return sum + (end - start);
      }, 0);
    const totalTimeInBed = selectedDaySession.duration * 60000; // convert to ms
    const actualSleepTime = totalTimeInBed - awakeTime;
    const efficiency = totalTimeInBed > 0
      ? Math.round((actualSleepTime / totalTimeInBed) * 100)
      : 0;

    // Restlessness based on wake-ups and movements
    const wakeUps = selectedDaySession.wakeUps || 0;
    const restlessness = wakeUps >= 5 ? 'High' : wakeUps >= 3 ? 'Medium' : 'Low';

    return {
      timeToFallAsleep: `${timeToSleep}m`,
      totalSleep,
      sleepEfficiency: `${efficiency}%`,
      restlessness,
    };
  }, [selectedDaySession]);

  const architectureData = useMemo(() => {
    if (!selectedDaySession || !selectedDaySession.sleepStages || selectedDaySession.sleepStages.length === 0) {
      return [
        { h: 20, c: '#6366F1' }, { h: 35, c: '#8B5CF6' }, { h: 65, c: '#4F46E5' },
        { h: 75, c: '#4F46E5' }, { h: 55, c: '#8B5CF6' }, { h: 30, c: '#6366F1' },
        { h: 45, c: '#8B5CF6' }, { h: 70, c: '#4F46E5' }, { h: 60, c: '#4F46E5' },
        { h: 40, c: '#8B5CF6' }, { h: 15, c: '#EF4444' }, { h: 30, c: '#6366F1' }
      ];
    }

    const slots = 12;
    const startTime = new Date(selectedDaySession.startTime).getTime();
    const endTime = new Date(selectedDaySession.endTime || new Date()).getTime();
    const totalDuration = endTime - startTime;
    const slotDuration = totalDuration / slots;

    return Array.from({ length: slots }).map((_, i) => {
      const slotStart = startTime + i * slotDuration;
      const stage = selectedDaySession.sleepStages?.find(s =>
        new Date(s.startTime).getTime() <= slotStart && new Date(s.endTime).getTime() >= slotStart
      );

      let h = 30;
      let c = '#6366F1';
      if (stage) {
        switch (stage.stage) {
          case 'deep': h = 70; c = '#4F46E5'; break;
          case 'rem': h = 50; c = '#8B5CF6'; break;
          case 'light': h = 30; c = '#6366F1'; break;
          case 'awake': h = 15; c = '#EF4444'; break;
        }
      }
      return { h, c };
    });
  }, [selectedDaySession]);

  const filteredEntries = useMemo(() => {
    if (showAllEntries) return journalEntries;
    const target = selectedDate.toISOString().split('T')[0];
    return journalEntries.filter(entry => entry.entry_date === target);
  }, [journalEntries, selectedDate, showAllEntries]);

  useEffect(() => {
    loadSleepHistory();
    loadJournalEntries();

    setTimeout(() => setIsLoading(false), 500);

    // Set up real-time subscription for journal entries
    if (user && user.id !== 'guest') {
      const journalChannel = supabase
        .channel('journal_entries_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'journal_entries',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadJournalEntries();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(journalChannel);
      };
    }
  }, [user, selectedDaySession?.id]);

  const loadJournalEntries = async () => {
    if (user && user.id !== 'guest') {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data) {
          setJournalEntries(data);
        }
      } catch (error) {
        console.error('Error loading journal entries:', error);
      }
    }
  };

  const loadDisruptions = async (sessionId?: string) => {
    if (!sessionId) {
      setDisruptions([]);
      return;
    }

    try {
      // Recordings are saved locally to AsyncStorage (not Supabase) for privacy.
      // Key format: @recording_events_${sessionId}
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const storageKey = `@recording_events_${sessionId}`;
      const dataStr = await AsyncStorage.getItem(storageKey);

      if (dataStr) {
        const records = JSON.parse(dataStr);
        const filtered = records
          .filter((r: any) => ['snoring', 'sleep_talk', 'noise', 'dreaming'].includes(r.event_type))
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .map((r: any, i: number) => ({
            id: r.id || `local_${i}`,
            event_type: r.event_type,
            timestamp: r.timestamp,
            loudness_db: r.loudness_db || 0,
            audio_file_url: r.audio_file_url || undefined,
            audio_offset_ms: r.audio_offset_ms || 0,
            duration_seconds: r.duration_seconds || 0,
          }));
        setDisruptions(filtered);
      } else {
        setDisruptions([]);
      }
    } catch (error) {
      console.error('Error loading disruptions from local storage:', error);
      setDisruptions([]);
    }
  };

  useEffect(() => {
    setDisruptions([]);
    if (selectedDaySession?.id) {
      loadDisruptions(selectedDaySession.id);
    }
  }, [selectedDaySession?.id]);

  const saveJournal = async () => {
    if (!journalEntry.trim() && !selectedMood) {
      Alert.alert('Empty Entry', 'Please add a mood or note.');
      return;
    }

    setIsSaving(true);
    try {
      if (user && user.id !== 'guest') {
        const { error } = await supabase
          .from('journal_entries')
          .insert([
            {
              id: `journal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              user_id: user.id,
              entry_text: journalEntry,
              mood: selectedMood,
              tags: selectedTags,
              entry_date: selectedDate.toISOString().split('T')[0],
            },
          ]);

        if (error) throw error;
        Alert.alert('Success', 'Journal entry saved!');
        setJournalEntry('');
        setSelectedMood(null);
        setSelectedTags([]);
        loadJournalEntries();
      } else {
        Alert.alert('Guest Mode', 'Journaling is available for registered users.');
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      Alert.alert('Error', 'Could not save entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Audio playback functions
  const playAudio = async (disruption: typeof disruptions[0]) => {
    try {
      // If already playing this audio, pause it
      if (playingAudioId === disruption.id && currentSound) {
        await currentSound.pauseAsync();
        setPlayingAudioId(null);
        return;
      }

      // Stop any currently playing audio
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
        setCurrentSound(null);
      }

      // Check if audio file URL exists
      if (!disruption.audio_file_url) {
        Alert.alert(
          'No Recording',
          'This disruption was detected but no audio was recorded.'
        );
        return;
      }

      // Verify file exists before attempting playback
      const fileExists = await FileSystem.getInfoAsync(disruption.audio_file_url)
        .then(info => info.exists)
        .catch(() => false);

      if (!fileExists) {
        Alert.alert(
          'Recording Not Found',
          'The audio file for this recording could not be found. It may have been deleted or moved.'
        );
        return;
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Calculate playback position and duration
      const startPosition = disruption.audio_offset_ms || 0;
      const eventDuration = (disruption.duration_seconds || 10) * 1000; // Default 10 seconds

      console.log(`🎵 Playing audio from ${startPosition}ms for ${eventDuration}ms`);

      // Load and play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: disruption.audio_file_url },
        {
          shouldPlay: true,
          positionMillis: startPosition, // Seek to event timestamp
        },
        (status) => {
          // Handle playback status updates
          if (status.isLoaded) {
            // Stop playback after event duration
            if (status.positionMillis >= startPosition + eventDuration) {
              sound.stopAsync();
              setPlayingAudioId(null);
            }
            // Handle natural finish
            if (status.didJustFinish) {
              setPlayingAudioId(null);
            }
          }
        }
      );

      setCurrentSound(sound);
      setPlayingAudioId(disruption.id);

      // Auto-stop after event duration
      setTimeout(async () => {
        if (sound) {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await sound.stopAsync();
            setPlayingAudioId(null);
          }
        }
      }, eventDuration + 500); // Add 500ms buffer
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert(
        'Playback Error',
        'Unable to play this recording. The file may be corrupted or unavailable.'
      );
    }
  };

  // Cleanup audio on unmount or when date changes
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.unloadAsync();
      }
    };
  }, []);

  // Stop audio when date or session changes
  useEffect(() => {
    if (currentSound) {
      currentSound.stopAsync().then(() => currentSound.unloadAsync());
      setCurrentSound(null);
      setPlayingAudioId(null);
    }
  }, [selectedDate, selectedDaySession?.id]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentSound) {
        currentSound.stopAsync().catch(() => {}).then(() => currentSound.unloadAsync().catch(() => {}));
      }
    };
  }, [currentSound]);

  if (isLoading) {
    return <LoadingSpinner message="Opening your journal..." fullScreen />;
  }


  return (
    <View style={styles(theme).container}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
      <StatusBar barStyle="light-content" />

      <View style={styles(theme).header}>
        <View style={{ paddingTop: insets.top + 10 }}>
          <Text style={styles(theme).headerLargeTitle}>Dream Journal</Text>
          <View style={styles(theme).headerSubtitleRow}>
            <View style={styles(theme).statusIndicator} />
            <Text style={styles(theme).headerSubtitleText}>PERSONAL DREAM DATA</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles(theme).headerActionFab}
          onPress={() => setShowDatePicker(true)}
        >
          <Calendar size={22} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setSelectedDate(date);
              }
            }}
          />
        )}
      </View>

      {/* Persistent Tab Switcher */}
      <View style={[styles(theme).persistentTabSwitcher, { marginTop: 10 }]}>
        <View style={styles(theme).tabSwitcher}>
          <TouchableOpacity
            style={[styles(theme).tabButton, activeTab === 'entries' && styles(theme).activeTabButton]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab('entries');
            }}
          >
            <Text style={[styles(theme).tabText, activeTab === 'entries' && styles(theme).activeTabText]}>Entries</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles(theme).tabButton, activeTab === 'stats' && styles(theme).activeTabButton]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setActiveTab('stats');
            }}
          >
            <Text style={[styles(theme).tabText, activeTab === 'stats' && styles(theme).activeTabText]}>Sleep Stages</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'entries' ? (
        <ScrollView
          style={styles(theme).scrollView}
          contentContainerStyle={[styles(theme).scrollContent, { paddingBottom: bottomMargin }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadSleepHistory();
                await loadJournalEntries();
                if (selectedDaySession?.id) await loadDisruptions(selectedDaySession.id);
                setRefreshing(false);
              }}
              tintColor="#8B5CF6"
              colors={['#8B5CF6']}
              progressBackgroundColor="rgba(27, 29, 42, 0.9)"
            />
          }
        >
          {/* Horizontal Date Picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles(theme).datePickerScroll}
            contentContainerStyle={styles(theme).datePickerContent}
          >
            {availableDates.map((date, i) => {
              const isSelected = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <TouchableOpacity
                  key={`${date.toDateString()}_${i}`}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    styles(theme).dateCard,
                    isSelected && styles(theme).selectedDateCard
                  ]}
                >
                  <Text style={[styles(theme).dateDay, isSelected && styles(theme).selectedDateText]}>
                    {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles(theme).dateNumber, isSelected && styles(theme).selectedDateText]}>
                    {date.getDate()}
                  </Text>
                  {datesWithSleepData.has(date.toDateString()) && (
                    <View style={[styles(theme).dateIndicatorDot, isSelected && styles(theme).selectedDateIndicatorDot]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Premium Sleep Score Dashboard */}
          <BlurView intensity={30} tint="dark" style={styles(theme).scoreCard}>
            <View style={styles(theme).scoreWheelContainer}>
              {/* Score Glow */}
              {selectedDaySession && <View style={[styles(theme).scoreGlow, { backgroundColor: '#8B5CF6' }]} />}
              {selectedDaySession ? (
                <CircularProgress
                  size={160}
                  strokeWidth={14}
                  score={displayScore}
                  showText={false}
                  color="#8B5CF6"
                />
              ) : (
                <View style={{ width: 160, height: 160, borderRadius: 80, borderWidth: 14, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
              )}
              <View style={[StyleSheet.absoluteFill, styles(theme).wheelContent]}>
                <Text style={styles(theme).wheelScore}>{selectedDaySession ? displayScore : '—'}</Text>
                <Text style={styles(theme).wheelLabel}>SLEEP QUALITY</Text>
                <Text style={styles(theme).wheelSubLabel}>{scoreLabel}</Text>
              </View>
            </View>
            <View style={styles(theme).scoreFooter}>
              <Calendar size={14} color="#94A3B8" />
              <Text style={styles(theme).scoreDate}>
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
          </BlurView>

          {/* Sleep Stages Chart */}
          <BlurView intensity={20} tint="dark" style={styles(theme).chartCard}>
            <View style={styles(theme).sectionHeader}>
              <TrendingUp size={20} color="#8B5CF6" />
              <Text style={styles(theme).sectionTitle}>Sleep Stages</Text>
            </View>
            {!selectedDaySession ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Moon size={48} color="#64748B" style={{ marginBottom: 16, opacity: 0.5 }} />
                <Text style={styles(theme).noResultsText}>No sleep data recorded for this date</Text>
                <Text style={[styles(theme).noResultsText, { fontSize: 12, marginTop: 4 }]}>Select a date with sleep data or record a new session</Text>
              </View>
            ) : (
              <>
                <View style={styles(theme).barChartContainer}>
                  <View style={styles(theme).yAxis}>
                    <Text style={styles(theme).yAxisText}>Awake</Text>
                    <Text style={styles(theme).yAxisText}>REM</Text>
                    <Text style={styles(theme).yAxisText}>Light</Text>
                    <Text style={styles(theme).yAxisText}>Deep</Text>
                  </View>
                  <View style={styles(theme).barsContainer}>
                    {architectureData?.map((bar, i) => (
                      <View key={i} style={[styles(theme).chartBar, { height: bar.h, backgroundColor: bar.c }]} />
                    ))}
                  </View>
                </View>
              </>
            )}
            {selectedDaySession && (
              <View style={styles(theme).chartLegend}>
                <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#EF4444' }]} /><Text style={styles(theme).legendText}>Awake</Text></View>
                <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#8B5CF6' }]} /><Text style={styles(theme).legendText}>REM</Text></View>
                <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#6366F1' }]} /><Text style={styles(theme).legendText}>Light</Text></View>
                <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#4F46E5' }]} /><Text style={styles(theme).legendText}>Deep</Text></View>
              </View>
            )}
          </BlurView>

          {/* Stats Grid - Premium 2x2 */}
          <View style={styles(theme).statsGrid}>
            <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
              <View style={styles(theme).statIconWrapper}>
                <Clock size={16} color="#F59E0B" />
              </View>
              <Text style={styles(theme).statValue}>{sessionStats.timeToFallAsleep}</Text>
              <Text style={styles(theme).statLabel}>Fall Asleep</Text>
            </BlurView>

            <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
              <View style={styles(theme).statIconWrapper}>
                <Moon size={16} color="#8B5CF6" />
              </View>
              <Text style={styles(theme).statValue}>{sessionStats.totalSleep}</Text>
              <Text style={styles(theme).statLabel}>Total Rest</Text>
            </BlurView>

            <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
              <View style={styles(theme).statIconWrapper}>
                <Activity size={16} color="#10B981" />
              </View>
              <Text style={styles(theme).statValue}>{sessionStats.sleepEfficiency}</Text>
              <Text style={styles(theme).statLabel}>Efficiency</Text>
            </BlurView>

            <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
              <View style={styles(theme).statIconWrapper}>
                <RefreshCw size={16} color="#EC4899" />
              </View>
              <Text style={styles(theme).statValue}>{sessionStats.restlessness}</Text>
              <Text style={styles(theme).statLabel}>Restlessness</Text>
            </BlurView>
          </View>

          {/* Disruptions */}
          {disruptions.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
              <View style={styles(theme).sectionHeader}>
                <Bell size={20} color="#F59E0B" />
                <Text style={styles(theme).sectionTitle}>Disruptions ({disruptions.length})</Text>
              </View>
              <View style={styles(theme).disruptionsList}>
                {disruptions.map((disruption) => {
                  const timestamp = new Date(disruption.timestamp);
                  const time = timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  let icon = Volume2;
                  let title = 'Noise detected';
                  let color = '#F59E0B';

                  if (disruption.event_type === 'snoring') {
                    icon = Volume2;
                    title = 'Snoring detected';
                    color = '#F59E0B';
                  } else if (disruption.event_type === 'sleep_talk') {
                    icon = Volume2;
                    title = 'Sleep talking';
                    color = '#33C6FF';
                  } else if (disruption.event_type === 'dreaming') {
                    icon = Cloud;
                    title = 'Dreaming (REM)';
                    color = '#BE4BDB';
                  } else if (disruption.event_type === 'noise') {
                    icon = Volume2;
                    title = 'Noise detected';
                    color = '#FFD700';
                  }

                  return (
                    <View key={disruption.id} style={styles(theme).disruptionItem}>
                      <View style={[styles(theme).disruptionIcon, { backgroundColor: color + '20' }]}>
                        {React.createElement(icon, { size: 18, color })}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles(theme).disruptionTitle}>{title}</Text>
                        <Text style={styles(theme).disruptionTime}>{time}</Text>
                      </View>
                      {disruption.loudness_db > 0 && (
                        <Text style={[styles(theme).disruptionVolume, { color }]}>
                          {Math.round(disruption.loudness_db)}%
                        </Text>
                      )}
                      {disruption.audio_file_url && (
                        <TouchableOpacity
                          onPress={() => playAudio(disruption)}
                          style={styles(theme).playButton}
                        >
                          {playingAudioId === disruption.id ? (
                            <Pause size={20} color={color} />
                          ) : (
                            <Play size={20} color={color} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </BlurView>
          )}

          {/* Journal Entry */}
          <BlurView intensity={20} tint="dark" style={styles(theme).journalEntryCard}>
            <View style={styles(theme).sectionHeader}>
              <BookOpen size={20} color="#EC4899" />
              <Text style={styles(theme).sectionTitle}>Journal Entry</Text>
            </View>

            <Text style={styles(theme).inputLabel}>How do you feel?</Text>
            <View style={styles(theme).moodGrid}>
              {['😊', '😴', '😌', '😐', '😔'].map((mood) => (
                <TouchableOpacity
                  key={mood}
                  onPress={() => setSelectedMood(mood)}
                  style={[
                    styles(theme).moodButton,
                    selectedMood === mood && styles(theme).selectedMoodButton
                  ]}
                >
                  <Text style={styles(theme).moodEmoji}>{mood}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles(theme).journalInput}
              placeholder="Write about your sleep experience, dreams, or how you're feeling..."
              placeholderTextColor="#A0AEC0"
              multiline
              value={journalEntry}
              onChangeText={setJournalEntry}
            />

            <Text style={styles(theme).inputLabel}>Add tags</Text>
            <View style={styles(theme).tagsGrid}>
              {['Good Night', 'Vivid Dreams', 'Deep Rest', 'Stressful', 'Caffeine'].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles(theme).tagButton,
                    selectedTags.includes(tag) && styles(theme).selectedTagButton
                  ]}
                >
                  <Text style={[styles(theme).tagText, selectedTags.includes(tag) && styles(theme).selectedTagText]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles(theme).saveButton}
              onPress={saveJournal}
              disabled={isSaving}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).buttonGradient}
              />
              <Text style={styles(theme).saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Entry'}
              </Text>
            </TouchableOpacity>
          </BlurView>

          {/* Previous Journal Entries */}
          {journalEntries.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).chartCard}>
              <View style={styles(theme).sectionHeader}>
                <BookOpen size={20} color="#8B5CF6" />
                <Text style={styles(theme).sectionTitle}>Your Journal Entries</Text>
                <TouchableOpacity onPress={() => setShowAllEntries(!showAllEntries)} style={{ marginLeft: 'auto' }}>
                  <Text style={styles(theme).seeAllText}>
                    {showAllEntries ? 'Showing all' : 'Showing day'}
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredEntries.length === 0 && (
                <Text style={styles(theme).noResultsText}>No entries for this date.</Text>
              )}

              {filteredEntries.map((entry) => (
                <View key={entry.id} style={styles(theme).savedEntryCard}>
                  <View style={styles(theme).savedEntryHeader}>
                    <View style={styles(theme).entryDateBadge}>
                      <Calendar size={14} color="#8B5CF6" />
                      <Text style={styles(theme).entryDateText}>
                        {new Date(entry.entry_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                    {entry.mood && (
                      <Text style={styles(theme).savedMoodEmoji}>{entry.mood}</Text>
                    )}
                  </View>

                  {entry.entry_text && (
                    <Text style={styles(theme).savedEntryText}>
                      {entry.entry_text}
                    </Text>
                  )}

                  {entry.tags && entry.tags.length > 0 && (
                    <View style={styles(theme).savedTagsContainer}>
                      {entry.tags.map((tag, idx) => (
                        <View key={idx} style={styles(theme).savedTag}>
                          <Text style={styles(theme).savedTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles(theme).entryDivider} />
                </View>
              ))}
            </BlurView>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <SleepAnalysisScreen hideHeader={true} isSubcomponent={true} />
        </View>
      )}
    </View>
  );
}

function createStyles(theme: any, SCREEN_WIDTH: number, CHART_HEIGHT: number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingBottom: 20,
      zIndex: 10,
    },
    headerLargeTitle: {
      fontSize: 34,
      fontWeight: '900',
      color: theme.colors.textPrimary,
      letterSpacing: -1,
    },
    headerSubtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      rowGap: 8, columnGap: 8,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
    },
    headerSubtitleText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.5,
      opacity: 0.8,
    },
    headerActionFab: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.cardOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      marginTop: 10,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 12,
    },
    statsFab: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(139, 92, 246, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.5)',
      marginTop: 10,
    },
    dateIndicatorDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#8B5CF6',
      marginTop: 4,
    },
    selectedDateIndicatorDot: {
      backgroundColor: '#FFFFFF',
    },
    persistentTabSwitcher: {
      paddingHorizontal: 24,
      zIndex: 100,
    },
    tabSwitcher: {
      flexDirection: 'row',
      backgroundColor: theme.colors.cardOverlay,
      borderRadius: 16,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 14,
    },
    activeTabButton: {
      backgroundColor: '#8B5CF6',
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#94A3B8',
    },
    activeTabText: {
      color: '#FFFFFF',
    },
    datePickerScroll: {
      marginBottom: 28,
      marginHorizontal: -24,
    },
    datePickerContent: {
      paddingHorizontal: 24,
    },
    dateCard: {
      width: 60,
      height: 80,
      borderRadius: 20,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    selectedDateCard: {
      backgroundColor: '#8B5CF6',
      borderColor: '#8B5CF6',
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    dateDay: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '600',
      marginBottom: 4,
    },
    dateNumber: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    selectedDateText: {
      color: '#FFFFFF',
    },
    scoreCard: {
      borderRadius: 32,
      padding: 28,
      alignItems: 'center',
      marginBottom: 28,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardOverlay,
    },
    scoreWheelContainer: {
      width: 160,
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    wheelContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    wheelScore: {
      fontSize: 52,
      fontWeight: '800',
      color: '#FFFFFF',
      ...Platform.select({
        android: {
          textShadowColor: 'rgba(139, 92, 246, 0.8)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 8,
        },
        ios: {
          textShadowColor: 'rgba(139, 92, 246, 0.6)',
          textShadowOffset: { width: 0, height: 4 },
          textShadowRadius: 10,
        },
      }),
    },
    wheelLabel: {
      fontSize: 10,
      color: '#94A3B8',
      fontWeight: '800',
      letterSpacing: 1.5,
      marginTop: 8,
    },
    wheelSubLabel: {
      fontSize: 16,
      color: '#FFFFFF',
      fontWeight: '700',
      marginTop: 2,
    },
    scoreFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 8, columnGap: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 16,
    },
    scoreDate: {
      fontSize: 13,
      color: '#94A3B8',
      fontWeight: '600',
    },
    scoreGlow: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      opacity: 0.1,
    },
    chartCard: {
      borderRadius: 32,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 10, columnGap: 10,
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    seeAllText: {
      fontSize: 14,
      color: '#8B5CF6',
      fontWeight: '600',
    },
    barChartContainer: {
      flexDirection: 'row',
      height: CHART_HEIGHT,
      marginBottom: 20,
    },
    yAxis: {
      justifyContent: 'space-between',
      paddingRight: 12,
      paddingVertical: 4,
    },
    yAxisText: {
      fontSize: 10,
      color: '#64748B',
      fontWeight: '600',
    },
    barsContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-end',
      rowGap: 4, columnGap: 4,
      paddingBottom: 10,
    },
    chartBar: {
      flex: 1,
      borderRadius: 4,
    },
    chartLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 16, columnGap: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 6, columnGap: 6,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '500',
    },
    statIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    noResultsText: {
      fontSize: 14,
      color: '#94A3B8',
      marginBottom: 12,
      textAlign: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 12, columnGap: 12,
      marginBottom: 24,
    },
    statCard: {
      width: (SCREEN_WIDTH - 60) / 2,
      borderRadius: 24,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    statHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 8, columnGap: 8,
      marginBottom: 12,
    },
    statLabel: {
      fontSize: 11,
      color: '#94A3B8',
      fontWeight: '600',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    disruptionsCard: {
      borderRadius: 32,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    disruptionsList: {
      rowGap: 12, columnGap: 12,
    },
    disruptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 16, columnGap: 16,
      padding: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 20,
    },
    disruptionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disruptionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    disruptionTime: {
      fontSize: 12,
      color: '#94A3B8',
      marginTop: 2,
    },
    disruptionVolume: {
      fontSize: 12,
      fontWeight: '700',
      marginRight: 8,
    },
    playButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    journalEntryCard: {
      borderRadius: 32,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    inputLabel: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '600',
      marginBottom: 12,
    },
    moodGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    moodButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedMoodButton: {
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
    },
    moodEmoji: {
      fontSize: 24,
    },
    journalInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 20,
      padding: 16,
      color: '#FFFFFF',
      fontSize: 14,
      height: 120,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      marginBottom: 24,
    },
    tagsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 8, columnGap: 8,
      marginBottom: 24,
    },
    tagButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    selectedTagButton: {
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: '#8B5CF6',
    },
    tagText: {
      fontSize: 12,
      color: '#94A3B8',
      fontWeight: '500',
    },
    selectedTagText: {
      color: '#8B5CF6',
    },
    saveButton: {
      height: 56,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    buttonGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    savedEntryCard: {
      marginBottom: 20,
    },
    savedEntryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    entryDateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 6, columnGap: 6,
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    entryDateText: {
      fontSize: 12,
      color: '#8B5CF6',
      fontWeight: '600',
    },
    savedMoodEmoji: {
      fontSize: 28,
    },
    savedEntryText: {
      fontSize: 14,
      color: '#FFFFFF',
      lineHeight: 22,
      marginBottom: 12,
    },
    savedTagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 8, columnGap: 8,
      marginBottom: 12,
    },
    savedTag: {
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    savedTagText: {
      fontSize: 11,
      color: '#8B5CF6',
      fontWeight: '500',
    },
    entryDivider: {
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      marginTop: 8,
    },
  });
}
