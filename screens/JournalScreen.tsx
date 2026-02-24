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
  Battery,
  Sparkles
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
import { isPremiumActive } from '../utils/subscriptionHelpers';
import sleepRecorderService from '../services/sleepRecorderService';
import Svg, { Path, Circle, Rect, Line, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop, Polyline } from 'react-native-svg';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [localRecordings, setLocalRecordings] = useState<Array<{ id: string, event_type: string, timestamp: string, loudness_db: number, audio_file_url?: string, audio_offset_ms?: number, duration_seconds?: number }>>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const isPremium = useMemo(() => isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email), [user]);

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

  // Score Breakdown: weighted components
  const scoreBreakdown = useMemo(() => {
    if (!selectedDaySession) return null;
    const duration = selectedDaySession.duration || 0;
    const idealDuration = 480; // 8 hours
    const durationScore = Math.min(100, Math.round((duration / idealDuration) * 100));

    const stages = selectedDaySession.sleepStages || [];
    const deepMins = stages.filter((s: any) => s.stage === 'deep').reduce((sum: number, s: any) => sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000, 0);
    const remMins = stages.filter((s: any) => s.stage === 'rem').reduce((sum: number, s: any) => sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000, 0);
    const qualityScore = Math.min(100, Math.round(((deepMins + remMins) / Math.max(duration, 1)) * 250));

    // Consistency from recent history
    const recentBedtimes = sleepHistory.slice(0, 7).map(s => {
      const d = new Date(s.startTime);
      return d.getHours() * 60 + d.getMinutes();
    });
    const avgBedtime = recentBedtimes.length > 0 ? recentBedtimes.reduce((a: number, b: number) => a + b, 0) / recentBedtimes.length : 0;
    const variance = recentBedtimes.length > 1 ? recentBedtimes.reduce((sum: number, t: number) => sum + Math.abs(t - avgBedtime), 0) / recentBedtimes.length : 0;
    const consistencyScore = Math.max(0, Math.min(100, 100 - Math.round(variance / 1.2)));

    const wakeUps = selectedDaySession.wakeUps || 0;
    const disruptionScore = Math.max(0, 100 - wakeUps * 20);

    return {
      duration: { label: 'Duration', score: durationScore, weight: 40, color: '#8B5CF6' },
      quality: { label: 'Quality', score: qualityScore, weight: 30, color: '#10B981' },
      consistency: { label: 'Consistency', score: consistencyScore, weight: 20, color: '#F59E0B' },
      disruptions: { label: 'Disruptions', score: disruptionScore, weight: 10, color: '#EC4899' },
    };
  }, [selectedDaySession, sleepHistory]);

  // Trends comparison vs last week
  const trendsComparison = useMemo(() => {
    if (sleepHistory.length < 2) return null;
    const thisWeek = sleepHistory.slice(0, 7);
    const lastWeek = sleepHistory.slice(7, 14);
    if (lastWeek.length === 0) return null;

    const thisAvgDuration = thisWeek.reduce((sum, s) => sum + (s.duration || 0), 0) / thisWeek.length;
    const lastAvgDuration = lastWeek.reduce((sum, s) => sum + (s.duration || 0), 0) / lastWeek.length;
    const durationDiff = Math.round(thisAvgDuration - lastAvgDuration);

    const thisAvgScore = thisWeek.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / thisWeek.length;
    const lastAvgScore = lastWeek.reduce((sum, s) => sum + (s.sleepScore || 0), 0) / lastWeek.length;
    const scoreDiff = Math.round(thisAvgScore - lastAvgScore);

    return { durationDiff, scoreDiff };
  }, [sleepHistory]);

  // Smart recommendations based on tags and session
  const smartTip = useMemo(() => {
    const tips: string[] = [];
    if (selectedTags.includes('Caffeine')) tips.push('\u2615 You tagged caffeine. Try cutting it 6+ hours before bed for better deep sleep.');
    if (selectedTags.includes('Stressful')) tips.push('\ud83e\uddd8 Stress detected. A 5-min breathing exercise before bed can lower cortisol by 23%.');
    if (selectedDaySession && (selectedDaySession.wakeUps || 0) >= 3) tips.push('\ud83d\udca1 You had multiple wake-ups. Try keeping your room at 65-68\u00b0F for fewer disruptions.');
    if (selectedDaySession && (selectedDaySession.duration || 0) < 360) tips.push('\u23f0 Short sleep detected. Aim for 7-8 hours \u2014 even 30 mins more can boost your score by 10+ points.');
    if (selectedMood === '\ud83d\ude14') tips.push('\ud83c\udf19 Feeling down? Research shows consistent sleep timing improves mood by 30% over 2 weeks.');
    if (tips.length === 0 && selectedDaySession) tips.push('\u2728 Your sleep looks on track! Keep up the good habits.');
    return tips[0] || null;
  }, [selectedTags, selectedDaySession, selectedMood]);

  // Weekly summary data
  const weeklySummary = useMemo(() => {
    const weekEntries = journalEntries.filter(e => {
      const entryDate = new Date(e.entry_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    });
    const allTags = weekEntries.flatMap(e => e.tags || []);
    const tagCounts: Record<string, number> = {};
    allTags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; });
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

    const moodCounts: Record<string, number> = {};
    weekEntries.forEach(e => { if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1; });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    const weekSessions = sleepHistory.slice(0, 7);
    const avgScore = weekSessions.length > 0 ? Math.round(weekSessions.reduce((s, sess) => s + (sess.sleepScore || 0), 0) / weekSessions.length) : 0;

    return { entriesCount: weekEntries.length, topTags, topMood, avgScore, sessionsCount: weekSessions.length };
  }, [journalEntries, sleepHistory]);

  // Sleep environment score
  const environmentScore = useMemo(() => {
    if (!selectedDaySession) return null;
    const noiseLevel = selectedDaySession.ambientNoise || 0;
    const wakeUps = selectedDaySession.wakeUps || 0;
    const movements = selectedDaySession.movementEvents || 0;
    const noiseScore = Math.max(0, 100 - ((noiseLevel - 20) * 2));
    const disruptionPenalty = (wakeUps * 10) + (movements * 2);
    const envScore = Math.max(0, Math.min(100, Math.round((noiseScore + Math.max(0, 100 - disruptionPenalty)) / 2)));
    return { score: envScore, noise: noiseLevel, wakeUps, movements };
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

    // Clean up old recordings (keep last 30 days)
    import('../services/sleepRecorderService').then(module => {
      module.default.cleanupOldRecordings(30);
    });

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

      // Set up real-time subscription for sleep recordings (disruptions)
      const disruptionsChannel = supabase
        .channel('sleep_recordings_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sleep_recordings',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadLocalRecordings(selectedDaySession?.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(journalChannel);
        supabase.removeChannel(disruptionsChannel);
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

  // Load recordings from LOCAL AsyncStorage (where sleepRecorderService saves them)
  const loadLocalRecordings = async (sessionId?: string) => {
    if (!sessionId) {
      setLocalRecordings([]);
      setDisruptions([]);
      return;
    }

    try {
      const storageKey = `@recording_events_${sessionId}`;
      const dataStr = await AsyncStorage.getItem(storageKey);

      if (dataStr) {
        const data = JSON.parse(dataStr);
        console.log(`\u2705 Loaded ${data.length} local recordings for session ${sessionId}`);

        const formatted = data.map((record: any, index: number) => ({
          id: record.id || `local_${sessionId}_${index}`,
          event_type: record.event_type,
          timestamp: record.timestamp,
          loudness_db: record.loudness_db || 0,
          audio_file_url: record.audio_file_url || null,
          audio_offset_ms: record.audio_offset_ms || 0,
          duration_seconds: record.duration_seconds || 0,
        }));

        setLocalRecordings(formatted);
        // Also set disruptions (snoring, sleep_talk, noise, dreaming)
        setDisruptions(formatted.filter((r: any) =>
          ['snoring', 'sleep_talk', 'noise', 'dreaming'].includes(r.event_type)
        ));
      } else {
        setLocalRecordings([]);
        setDisruptions([]);
        console.log('\ud83d\udcdd No local recordings for session:', sessionId);
      }
    } catch (error) {
      console.error('Error loading local recordings:', error);
      setLocalRecordings([]);
      setDisruptions([]);
    }
  };

  // Also try Supabase for cloud recordings
  const loadCloudDisruptions = async (sessionId?: string) => {
    if (!user || user.id === 'guest' || !sessionId) return;

    try {
      const { data, error } = await supabase
        .from('sleep_recordings')
        .select('id, event_type, timestamp, loudness_db, audio_file_url, audio_offset_ms, duration_seconds')
        .eq('user_id', user.id)
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (!error && data && data.length > 0) {
        console.log(`\u2601\ufe0f Loaded ${data.length} cloud recordings for session ${sessionId}`);
        // Add to localRecordings if they don't exist locally
        setLocalRecordings(prev => {
          if (prev.length === 0) return data;
          const existingIds = new Set(prev.map(d => d.timestamp));
          const newOnes = data.filter(d => !existingIds.has(d.timestamp));
          return [...prev, ...newOnes];
        });
        // Also add disruption types to disruptions
        const disruptionTypes = ['snoring', 'sleep_talk', 'noise', 'dreaming'];
        setDisruptions(prev => {
          const existingTimestamps = new Set(prev.map(d => d.timestamp));
          const newOnes = data.filter(d => !existingTimestamps.has(d.timestamp) && disruptionTypes.includes(d.event_type));
          return [...prev, ...newOnes];
        });
      }
    } catch (error) {
      console.error('Error loading cloud disruptions:', error);
    }
  };

  useEffect(() => {
    setDisruptions([]);
    setLocalRecordings([]);
    if (selectedDaySession?.id) {
      loadLocalRecordings(selectedDaySession.id);
      loadCloudDisruptions(selectedDaySession.id);
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
        currentSound.stopAsync().catch(() => { }).then(() => currentSound.unloadAsync().catch(() => { }));
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
                if (selectedDaySession?.id) await loadLocalRecordings(selectedDaySession.id);
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

          {/* Score Breakdown */}
          {scoreBreakdown && selectedDaySession && (
            <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
              <View style={styles(theme).sectionHeader}>
                <Zap size={20} color="#F59E0B" />
                <Text style={styles(theme).sectionTitle}>Score Breakdown</Text>
              </View>
              {Object.values(scoreBreakdown).map((item, idx) => (
                <View key={idx} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: '#CBD5E1', fontSize: 13, fontWeight: '500' }}>{item.label} ({item.weight}%)</Text>
                    <Text style={{ color: item.color, fontSize: 13, fontWeight: '700' }}>{item.score}/100</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${item.score}%`, backgroundColor: item.color, borderRadius: 3 }} />
                  </View>
                </View>
              ))}
            </BlurView>
          )}

          {/* Trends Comparison */}
          {trendsComparison && (
            <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
              <View style={styles(theme).sectionHeader}>
                <TrendingUp size={20} color="#10B981" />
                <Text style={styles(theme).sectionTitle}>vs Last Week</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {trendsComparison.durationDiff >= 0 ? (
                      <TrendingUp size={16} color="#10B981" />
                    ) : (
                      <TrendingDown size={16} color="#EF4444" />
                    )}
                    <Text style={{ color: trendsComparison.durationDiff >= 0 ? '#10B981' : '#EF4444', fontSize: 18, fontWeight: '700' }}>
                      {trendsComparison.durationDiff > 0 ? '+' : ''}{trendsComparison.durationDiff}m
                    </Text>
                  </View>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>Avg Duration</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {trendsComparison.scoreDiff >= 0 ? (
                      <TrendingUp size={16} color="#10B981" />
                    ) : (
                      <TrendingDown size={16} color="#EF4444" />
                    )}
                    <Text style={{ color: trendsComparison.scoreDiff >= 0 ? '#10B981' : '#EF4444', fontSize: 18, fontWeight: '700' }}>
                      {trendsComparison.scoreDiff > 0 ? '+' : ''}{trendsComparison.scoreDiff}
                    </Text>
                  </View>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 4 }}>Avg Score</Text>
                </View>
              </View>
            </BlurView>
          )}

          {/* Environment Score */}
          {environmentScore && selectedDaySession && (
            <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
              <View style={styles(theme).sectionHeader}>
                <Thermometer size={20} color="#6366F1" />
                <Text style={styles(theme).sectionTitle}>Sleep Environment</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: environmentScore.score >= 70 ? '#10B981' : environmentScore.score >= 40 ? '#F59E0B' : '#EF4444', fontSize: 28, fontWeight: '800' }}>{environmentScore.score}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Environment Score</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 16, fontWeight: '600' }}>{environmentScore.noise > 0 ? `${environmentScore.noise}dB` : '—'}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Noise Level</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 16, fontWeight: '600' }}>{environmentScore.wakeUps}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Wake-ups</Text>
                </View>
              </View>
            </BlurView>
          )}

          {/* Sleep Recordings — Local + Cloud */}
          {localRecordings.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
              <View style={styles(theme).sectionHeader}>
                <Mic size={20} color="#8B5CF6" />
                <Text style={styles(theme).sectionTitle}>Sleep Recordings ({localRecordings.length})</Text>
              </View>
              <View style={styles(theme).disruptionsList}>
                {localRecordings.map((recording) => {
                  const timestamp = new Date(recording.timestamp);
                  const time = timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

                  let icon = Volume2;
                  let title = 'Sound detected';
                  let color = '#F59E0B';

                  if (recording.event_type === 'snoring') { title = 'Snoring'; color = '#F59E0B'; }
                  else if (recording.event_type === 'sleep_talk') { title = 'Sleep Talking'; color = '#33C6FF'; }
                  else if (recording.event_type === 'dreaming') { icon = Cloud; title = 'Dreaming (REM)'; color = '#BE4BDB'; }
                  else if (recording.event_type === 'noise') { title = 'Noise'; color = '#FFD700'; }
                  else if (recording.event_type === 'breathing') { icon = Wind; title = 'Breathing'; color = '#10B981'; }

                  const hasDuration = recording.duration_seconds && recording.duration_seconds > 0;

                  return (
                    <View key={recording.id} style={styles(theme).disruptionItem}>
                      <View style={[styles(theme).disruptionIcon, { backgroundColor: color + '20' }]}>
                        {React.createElement(icon, { size: 18, color })}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles(theme).disruptionTitle}>{title}</Text>
                        <Text style={styles(theme).disruptionTime}>
                          {time}{hasDuration ? ` \u2022 ${recording.duration_seconds}s` : ''}
                        </Text>
                      </View>
                      {recording.loudness_db > 0 && (
                        <Text style={[styles(theme).disruptionVolume, { color }]}>
                          {Math.round(recording.loudness_db)}%
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => playAudio(recording)}
                        style={styles(theme).playButton}
                      >
                        {playingAudioId === recording.id ? (
                          <Pause size={20} color={color} />
                        ) : (
                          <Play size={20} color={color} />
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </BlurView>
          )}

          {/* Disruptions Summary */}
          {disruptions.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
              <View style={styles(theme).sectionHeader}>
                <Bell size={20} color="#F59E0B" />
                <Text style={styles(theme).sectionTitle}>Disruptions ({disruptions.length})</Text>
              </View>
              <View style={styles(theme).disruptionsList}>
                {disruptions.slice(0, 10).map((disruption) => {
                  const timestamp = new Date(disruption.timestamp);
                  const time = timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  });

                  let icon = Volume2;
                  let title = 'Noise detected';
                  let color = '#F59E0B';

                  if (disruption.event_type === 'snoring') { title = 'Snoring detected'; color = '#F59E0B'; }
                  else if (disruption.event_type === 'sleep_talk') { title = 'Sleep talking'; color = '#33C6FF'; }
                  else if (disruption.event_type === 'dreaming') { icon = Cloud; title = 'Dreaming (REM)'; color = '#BE4BDB'; }
                  else if (disruption.event_type === 'noise') { title = 'Noise detected'; color = '#FFD700'; }

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
                    </View>
                  );
                })}
                {disruptions.length > 10 && (
                  <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                    +{disruptions.length - 10} more disruptions
                  </Text>
                )}
              </View>
            </BlurView>
          )}

          {/* Smart Recommendation */}
          {smartTip && selectedDaySession && (
            <BlurView intensity={20} tint="dark" style={[styles(theme).disruptionsCard, { borderColor: 'rgba(139, 92, 246, 0.2)', borderWidth: 1 }]}>
              <View style={styles(theme).sectionHeader}>
                <Sparkles size={20} color="#8B5CF6" />
                <Text style={styles(theme).sectionTitle}>Smart Insight</Text>
              </View>
              <Text style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 22 }}>{smartTip}</Text>
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

          {/* Weekly Summary */}
          {weeklySummary.entriesCount > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
              <View style={styles(theme).sectionHeader}>
                <LayoutGrid size={20} color="#EC4899" />
                <Text style={styles(theme).sectionTitle}>This Week</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>{weeklySummary.sessionsCount}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Sessions</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>{weeklySummary.avgScore}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Avg Score</Text>
                </View>
                <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{weeklySummary.topMood?.[0] || '—'}</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 2 }}>Top Mood</Text>
                </View>
              </View>
              {weeklySummary.topTags.length > 0 && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 8 }}>RECURRING TAGS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {weeklySummary.topTags.map(([tag, count]) => (
                      <View key={tag} style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: '#CBD5E1', fontSize: 12 }}>{tag}</Text>
                        <Text style={{ color: '#8B5CF6', fontSize: 11, fontWeight: '700' }}>{count}x</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </BlurView>
          )}

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
      gap: 8,
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
      gap: 8,
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
      gap: 10,
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
      gap: 4,
      paddingBottom: 10,
    },
    chartBar: {
      flex: 1,
      borderRadius: 4,
    },
    chartLegend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
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
      gap: 12,
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
      gap: 8,
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
      gap: 12,
    },
    disruptionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
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
      gap: 8,
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
      gap: 6,
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
      gap: 8,
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
