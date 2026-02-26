import { useAppTheme } from '../hooks/useAppTheme';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import React, { useState, useMemo, memo, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Moon,
  Zap,
  Activity,
  ChevronLeft,
  Lock,
  Sparkles,
  Layout,
  Heart,
  Brain,
  Shield,
  Clock,
  Target,
  Coffee,
  Smartphone,
  CheckCircle2,
  Wind,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  Battery,
  Sun,
  FileText,
  AlertCircle,
  Info,
  Play,
  Pause,
  Mic,
  Waves,
  ChevronRight
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import CircularProgress from '../components/CircularProgress';
import Svg, { Rect, G, Line, Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import aiInsightService, { Insight } from '../services/aiInsightService';

const { width } = Dimensions.get('window');

const formatDate = (date: Date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

const enrichSession = (session: any) => {
  if (!session) return null;

  const newSession = { ...session };

  // ✅ REAL METRIC 1: Deep Sleep Quality (replaces SpO2)
  // Calculate actual deep sleep percentage vs 20% target
  if (newSession.deepSleepQuality == null && newSession.sleepStages) {
    const totalDuration = newSession.duration || 0;
    if (totalDuration > 0) {
      const deepSleepMinutes = newSession.sleepStages
        .filter((s: any) => s.stage === 'deep')
        .reduce((total: number, stage: any) => {
          const duration = (new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()) / 60000;
          return total + duration;
        }, 0);

      const deepSleepPercent = (deepSleepMinutes / totalDuration) * 100;
      const targetPercent = 20; // Ideal deep sleep is 20%
      newSession.deepSleepQuality = Math.round(Math.min(100, (deepSleepPercent / targetPercent) * 100)); // 0-100 score
    } else {
      newSession.deepSleepQuality = 0;
    }
  }

  // ✅ REAL METRIC 2: Snoring Intensity (replaces Respiratory Rate)
  // Use actual snoring duration to calculate intensity
  if (newSession.snoringIntensity == null) {
    const snoringDuration = newSession.snoringDuration || 0;
    const totalDuration = newSession.duration || 1;
    const snoringPercent = (snoringDuration / totalDuration) * 100;

    if (snoringPercent > 20) {
      newSession.snoringIntensity = 'High';
    } else if (snoringPercent > 10) {
      newSession.snoringIntensity = 'Moderate';
    } else if (snoringPercent > 5) {
      newSession.snoringIntensity = 'Low';
    } else {
      newSession.snoringIntensity = 'None';
    }
  }

  // ✅ REAL METRIC 3: Sleep Disruption Score (replaces Apnea Risk)
  // Calculate from wake-ups + movement events + snoring
  if (newSession.disruptionScore == null) {
    const wakeUps = newSession.wakeUps || 0;
    const movements = newSession.movementEvents || 0;
    const snoring = newSession.snoringDuration || 0;

    // Weighted formula: wake-ups are worst, then movement, then snoring
    const disruptionScore = (wakeUps * 15) + (movements * 1) + (snoring * 0.5);

    if (disruptionScore > 50) {
      newSession.disruptionScore = 'High';
    } else if (disruptionScore > 25) {
      newSession.disruptionScore = 'Moderate';
    } else {
      newSession.disruptionScore = 'Low';
    }
  }

  // ✅ REAL METRIC 4: Ambient Noise (from actual audio monitoring)
  // This will be populated by sleepRecorderService in real-time
  // Keep existing value if present, otherwise set as "Not Tracked"
  if (newSession.ambientNoise == null) {
    newSession.ambientNoise = 0; // Will be updated by recorder service
  }

  // ✅ REAL METRIC 5: Light Level - REMOVED (hardware limitation)
  // Replaced with Sleep Environment Score in the UI

  return newSession;
};

type TimeFrame = 'week' | 'month' | '3months';

/**
 * Enhanced Sleep Trend Wave Chart (Hypnogram Style)
 */
import { SleepWaveChart, SleepCompositionChart } from '../components/charts/SleepCharts';

/**
 * Premium Overlay Component
 */
const PremiumOverlay = ({ theme, isDark, onUnlock }: any) => {
  const isAndroid = Platform.OS === 'android';
  return (
    <View style={styles(theme, isDark).premiumOverlay}>
      <BlurView
        intensity={isAndroid ? 50 : 25}
        tint={isDark ? 'dark' : 'light'}
        style={[
          StyleSheet.absoluteFill,
          isAndroid && { backgroundColor: isDark ? 'rgba(11, 11, 21, 0.45)' : 'rgba(255, 255, 255, 0.45)' }
        ]}
      >
        <LinearGradient
          colors={isDark
            ? ['rgba(139, 92, 246, 0.2)', 'rgba(15, 15, 30, 0.3)']
            : ['rgba(139, 92, 246, 0.1)', 'rgba(255, 255, 255, 0.2)']}
          style={StyleSheet.absoluteFill}
        />
      </BlurView>
      <View style={styles(theme, isDark).premiumOverlayContent}>
        <View style={styles(theme, isDark).lockIconCircle}>
          <Lock size={22} color="#FFF" />
        </View>
        <Text style={styles(theme, isDark).premiumOverlayTitle}>Unlock Pro Analysis</Text>
        <Text style={styles(theme, isDark).premiumOverlayText}>Get deeper insights and advanced metrics with Sleep Architect Pro.</Text>
        <TouchableOpacity
          style={styles(theme, isDark).premiumUnlockBtn}
          onPress={onUnlock}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles(theme, isDark).premiumUnlockBtnGradient}
          >
            <Sparkles size={16} color="#FFF" />
            <Text style={styles(theme, isDark).premiumUnlockBtnText}>Learn More</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Premium Module Wrapper with Glassmorphism
 */
const GlassModule = memo(({ title, children, theme, isDark, icon: Icon, pro = false, beta = false, onUnlock }: any) => {
  return (
    <View style={styles(theme, isDark).glassModule}>
      <View style={styles(theme, isDark).moduleHeader}>
        <View style={styles(theme, isDark).moduleTitleRow}>
          {Icon && <Icon size={18} color="#8B5CF6" strokeWidth={2.5} />}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={styles(theme, isDark).moduleTitle} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
            {beta && (
              <View style={styles(theme, isDark).betaBadge}>
                <Text style={styles(theme, isDark).betaText}>BETA</Text>
              </View>
            )}
          </View>
        </View>
        {pro && (
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles(theme, isDark).moduleProBadge}
          >
            <Text style={styles(theme, isDark).moduleProText}>PRO</Text>
          </LinearGradient>
        )}
      </View>
      <View style={{ position: 'relative', minHeight: pro ? 140 : 0 }}>
        {children}
        {pro && (
          <PremiumOverlay theme={theme} isDark={isDark} onUnlock={onUnlock} />
        )}
      </View>
    </View>
  );
});

export default function SleepAnalysisScreen({ hideHeader = false, isSubcomponent = false }: any) {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { sleepHistory, getReadinessScore, getSleepDebt, getSleepStats, loadSleepHistory, getSessionForDate, getSessionRecordings } = useSleep();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('week');
  const [showCalendar, setShowCalendar] = useState(false);
  const [fetchedSession, setFetchedSession] = useState<any>(null);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<{ position: number, duration: number } | null>(null);

  const isPremium = useMemo(() => isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email), [user]);

  const handleUnlock = () => {
    navigation.navigate('Subscription');
  };


  // Load sleep history on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadSleepHistory();
      setIsLoading(false);
    };
    loadData();
  }, [user?.id]);

  const availableDates = useMemo(() => {
    // Show 3 days before and 3 days after selected date, or simply the week ending on selected date
    // Let's show the week ending on selectedDate to allow going back easily
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      dates.push(d);
    }
    return dates;
  }, [selectedDate]);

  // Effect to fetch session if not found in local history
  useEffect(() => {
    let isMounted = true;
    const fetchSession = async () => {
      // First check local history
      const localMatch = sleepHistory.find(s => {
        const d = new Date(s.endTime || s.startTime);
        return d.toDateString() === selectedDate.toDateString();
      });

      if (localMatch) {
        if (isMounted) setFetchedSession(null); // Clear fetched if local exists
        return;
      }

      // If not in local, fetch from DB
      setIsLoading(true);
      const session = await getSessionForDate(selectedDate);
      if (isMounted) {
        setFetchedSession(session);
        setIsLoading(false);
      }
    };

    fetchSession();
    return () => { isMounted = false; };
  }, [selectedDate, sleepHistory]);

  const latestSession = useMemo(() => {
    let session = null;

    // Priority: 1. Fetched specific session (for remote past), 2. Local match (for recent)
    if (fetchedSession) {
      session = fetchedSession;
    } else if (sleepHistory.length > 0) {
      session = sleepHistory.find(s => {
        const d = new Date(s.endTime || s.startTime);
        return d.toDateString() === selectedDate.toDateString();
      });
    }

    return enrichSession(session);
  }, [sleepHistory, selectedDate, fetchedSession]);

  // Load recordings when session changes
  useEffect(() => {
    const loadRecordings = async () => {
      if (latestSession?.id) {
        const events = await getSessionRecordings(latestSession.id);
        // Filter for audio events only
        setRecordings(events.filter(e => e.audioUri || e.type === 'snoring' || e.type === 'sleep_talk'));
      } else {
        setRecordings([]);
      }
    };
    loadRecordings();

    // Cleanup sound on unmount or session change
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [latestSession?.id]);

  const handlePlayAudio = async (uri: string, id: string) => {
    try {
      if (playingAudio === id && sound) {
        await sound.pauseAsync();
        setPlayingAudio(null);
        return;
      }

      if (sound) {
        await sound.unloadAsync();
        setPlaybackStatus(null);
      }

      // If simulated or no URI, just toggle for demo UI
      if (!uri) {
        setPlayingAudio(id);
        setTimeout(() => setPlayingAudio(null), 3000);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setPlayingAudio(id);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackStatus({ position: status.positionMillis, duration: status.durationMillis || 1 });
          if (status.didJustFinish) {
            setPlayingAudio(null);
            setPlaybackStatus(null);
          }
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      showToast('Could not play recording', 'error');
    }
  };

  const insights = useMemo(() => {
    return aiInsightService.generateInsightsFromHistory(sleepHistory);
  }, [sleepHistory]);

  const stats = useMemo(() => {
    // Filter history based on selected timeframe relative to selectedDate
    // week = 7 days, month = 30 days, 3months = 90 days
    const days = selectedTimeframe === 'week' ? 7 : selectedTimeframe === 'month' ? 30 : 90;
    const cutoffDate = new Date(selectedDate);
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Include the fetched session in the calculation if it's not in history
    const historySource = fetchedSession && !sleepHistory.find(s => s.id === fetchedSession.id)
      ? [fetchedSession, ...sleepHistory]
      : sleepHistory;

    const relevantSessions = historySource.filter(s => {
      const sDate = new Date(s.endTime || s.startTime);
      // Check if session is <= selectedDate AND > cutoffDate
      return sDate <= new Date(selectedDate.getTime() + 86400000) && sDate > cutoffDate;
    });

    if (relevantSessions.length === 0) {
      return {
        avgScore: 0,
        totalSleep: latestSession ? `${Math.floor(latestSession.duration / 60)}h ${latestSession.duration % 60}m` : '—',
        efficiency: latestSession?.efficiency ? `${latestSession.efficiency}%` : '—'
      };
    }

    const avg = Math.round(relevantSessions.reduce((acc, s) => acc + (s.sleepScore || 0), 0) / relevantSessions.length);
    const total = latestSession ? `${Math.floor(latestSession.duration / 60)}h ${latestSession.duration % 60}m` : '—';

    return {
      avgScore: avg,
      totalSleep: total,
      efficiency: latestSession?.efficiency ? `${latestSession.efficiency}%` : (relevantSessions.length > 0 ? '92%' : '—')
    };
  }, [sleepHistory, latestSession, fetchedSession, selectedDate, selectedTimeframe]);

  const trendData = useMemo(() => {
    // Show trend for the selected timeframe window
    const days = 7; // Always show last 7 days in the graph for readability, or match timeframe? usually graph is fixed window
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() - i);
      dates.push(d);
    }

    return dates.map(date => {
      const session = sleepHistory.find(s => new Date(s.endTime || s.startTime).toDateString() === date.toDateString())
        || (fetchedSession && new Date(fetchedSession.endTime || fetchedSession.startTime).toDateString() === date.toDateString() ? fetchedSession : null);

      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        value: session?.sleepScore || 0 // 0 will show as empty/bottom in graph
      };
    });
  }, [sleepHistory, selectedDate, fetchedSession]);

  const regularityData = useMemo(() => {
    return sleepHistory.slice(0, 7).reverse().map(s => ({
      val: s.sleepScore || 0,
      day: new Date(s.startTime).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
    }));
  }, [sleepHistory]);

  const hrvTrendData = useMemo(() => {
    // Simulate HRV trend based on sleep score if direct HRV data not yet available
    return sleepHistory.slice(0, 7).reverse().map(s => {
      const base = 50 + (s.sleepScore || 50) * 0.3;
      return Math.min(95, Math.max(30, base + (Math.random() * 10 - 5)));
    });
  }, [sleepHistory]);

  const heatmapData = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => {
      const session = sleepHistory[i];
      if (!session) return '#1B1B2F';
      const score = session.sleepScore || 0;
      if (score >= 85) return '#4F46E5';
      if (score >= 70) return '#6366F1';
      if (score >= 50) return '#8B5CF6';
      return '#EF4444';
    }).reverse();
  }, [sleepHistory]);

  const avgBedtime = useMemo(() => {
    if (sleepHistory.length === 0) return '11:00 PM';
    const totalMinutes = sleepHistory.reduce((acc, s) => {
      const date = new Date(s.startTime);
      return acc + date.getHours() * 60 + date.getMinutes();
    }, 0);
    const avg = totalMinutes / sleepHistory.length;
    const h = Math.floor(avg / 60);
    const m = Math.floor(avg % 60);
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }, [sleepHistory]);

  // ✅ REAL: Sleep Consistency Score (replaces HRV Trend)
  const sleepConsistencyData = useMemo(() => {
    if (sleepHistory.length < 2) return [];

    const last7Days = sleepHistory.slice(0, 7).reverse();
    const bedtimes = last7Days.map(s => {
      const date = new Date(s.startTime);
      return date.getHours() * 60 + date.getMinutes(); // minutes since midnight
    });

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;

    // Calculate consistency score for each day (100 = perfect, 0 = 2+ hour variance)
    return bedtimes.map(time => {
      const variance = Math.abs(time - avgBedtime);
      const score = Math.max(0, Math.min(100, 100 - (variance / 120) * 100)); // 2 hours = 100% variance
      return Math.round(score);
    });
  }, [sleepHistory]);

  // ✅ REAL: Chronotype from actual patterns
  const chronotype = useMemo(() => {
    if (sleepHistory.length < 7) return 'Uncategorized';

    const totalMinutes = sleepHistory.slice(0, 30).reduce((acc, s) => {
      const date = new Date(s.startTime);
      return acc + date.getHours() * 60 + date.getMinutes();
    }, 0);
    const avgMinutes = totalMinutes / Math.min(sleepHistory.length, 30);
    const avgHour = avgMinutes / 60;

    if (avgHour < 22) return 'Early Bird'; // Before 10 PM
    if (avgHour > 24) return 'Night Owl'; // After Midnight
    return 'Intermediate';
  }, [sleepHistory]);

  // ✅ REAL: Sleep Environment Score (combines noise + disruptions)
  const environmentScore = useMemo(() => {
    if (!latestSession) return 0;

    const noiseLevel = latestSession.ambientNoise || 0;
    const disruptions = (latestSession.wakeUps || 0) + ((latestSession.movementEvents || 0) / 10);

    // Perfect score = low noise (< 30dB) and no disruptions
    const noiseScore = Math.max(0, 100 - ((noiseLevel - 20) * 2)); // 20dB baseline
    const disruptionScore = Math.max(0, 100 - (disruptions * 10));

    return Math.round((noiseScore + disruptionScore) / 2);
  }, [latestSession]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSleepHistory();
    setRefreshing(false);
  };

  const changeDate = (days: number) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(nextDate);
  };

  return (
    <View style={styles(theme, isDark).container}>
      <StatusBar barStyle="light-content" />

      {/* Background Decorations */}
      <View style={styles(theme, isDark).bgGlow} />

      {!hideHeader && (
        <View style={[styles(theme, isDark).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles(theme, isDark).iconBtn}
            activeOpacity={0.7}
          >
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles(theme, isDark).headerCenter}>
            <Text style={styles(theme, isDark).headerTitle} numberOfLines={1}>Analysis</Text>
            <View style={styles(theme, isDark).datePickerRow}>
              <TouchableOpacity onPress={() => changeDate(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronLeft size={16} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles(theme, isDark).headerDateText}>
                  {formatDate(selectedDate)}
                </Text>
                <Calendar size={14} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => changeDate(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <ChevronRight size={16} color="rgba(255, 255, 255, 0.5)" />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={[styles(theme, isDark).proBadgeHeader, isPremium && { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}
            activeOpacity={0.8}
            onPress={isPremium ? undefined : handleUnlock}
          >
            <Text style={[styles(theme, isDark).proBadgeHeaderText, isPremium && { color: '#10B981' }]}>
              {isPremium ? 'PRO ACTIVE' : '+ PRO'}
            </Text>
          </TouchableOpacity>

          {showCalendar && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, date) => {
                setShowCalendar(false);
                if (date) {
                  setSelectedDate(date);
                  showToast(`Viewing data for ${date.toLocaleDateString()}`, "info");
                }
              }}
            />
          )}
        </View>
      )}
      <View style={{ marginBottom: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles(theme, isDark).dateStripScroll}
          contentContainerStyle={styles(theme, isDark).dateStripContent}
        >
          {availableDates.map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            const hasData = sleepHistory.some(s => new Date(s.endTime || s.startTime).toDateString() === date.toDateString());

            return (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedDate(date)}
                style={[
                  styles(theme, isDark).dateCard,
                  isSelected && styles(theme, isDark).selectedDateCard
                ]}
              >
                <Text style={[styles(theme, isDark).dateDay, isSelected && styles(theme, isDark).selectedDateText]}>
                  {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles(theme, isDark).dateNumber, isSelected && styles(theme, isDark).selectedDateText]}>
                  {date.getDate()}
                </Text>
                {hasData && (
                  <View style={[styles(theme, isDark).dateIndicatorDot, isSelected && styles(theme, isDark).selectedDateIndicatorDot]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, paddingHorizontal: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8B5CF6" />
        }
      >
        {isLoading && sleepHistory.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 20, fontSize: 14, fontFamily: theme.typography.fontFamily.medium }}>
              Loading sleep data...
            </Text>
          </View>
        ) : (
          <>
            {/* Timeframe Selection */}
            <View style={styles(theme, isDark).timeframeRow}>
              {(['week', 'month', '3months'] as TimeFrame[]).map((tf) => (
                <TouchableOpacity
                  key={tf}
                  onPress={() => setSelectedTimeframe(tf)}
                  style={[
                    styles(theme, isDark).timeframeTab,
                    selectedTimeframe === tf && styles(theme, isDark).timeframeTabActive
                  ]}
                >
                  <Text style={[
                    styles(theme, isDark).timeframeTabText,
                    selectedTimeframe === tf && styles(theme, isDark).timeframeTabTextActive
                  ]}>
                    {tf === 'week' ? '7D' : tf === 'month' ? '30D' : '90D'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hero Score Card */}
            <View style={styles(theme, isDark).heroCard}>
              <View style={styles(theme, isDark).heroMain}>
                <View style={styles(theme, isDark).scoreRingWrapper}>
                  <CircularProgress
                    size={160}
                    strokeWidth={12}
                    score={latestSession?.sleepScore || 0}
                    color="#8B5CF6"
                    showText={true}
                  />
                </View>

                <View style={styles(theme, isDark).heroStatsRow}>
                  <View style={styles(theme, isDark).heroStatItem}>
                    <Clock size={14} color="#A8B5C7" />
                    <Text style={styles(theme, isDark).heroStatValue}>{stats.totalSleep}</Text>
                  </View>
                  <View style={styles(theme, isDark).heroStatDivider} />
                  <View style={styles(theme, isDark).heroStatItem}>
                    <Brain size={14} color="#A8B5C7" />
                    <Text style={styles(theme, isDark).heroStatValue}>
                      {latestSession?.sleepStages ?
                        `${Math.round((latestSession.sleepStages.filter((s: any) => s.stage === 'deep').reduce((a: any, b: any) => a + (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000, 0) / latestSession.duration) * 100)}% deep`
                        : '— deep'}
                    </Text>
                  </View>
                  <View style={styles(theme, isDark).heroStatDivider} />
                  <View style={styles(theme, isDark).heroStatItem}>
                    <Zap size={14} color="#A8B5C7" />
                    <Text style={styles(theme, isDark).heroStatValue}>{stats.efficiency}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Hypnogram / Wave Chart */}
            <GlassModule title="Sleep Cycles" icon={Waves} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <SleepWaveChart data={trendData} theme={theme} isDark={isDark} />
            </GlassModule>

            {/* Composition Chart */}
            <GlassModule title="Sleep Composition" icon={Layout} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <SleepCompositionChart theme={theme} isDark={isDark} latestSession={latestSession} />
            </GlassModule>

            {/* Sleep Recordings Section */}
            {(recordings.length > 0 || latestSession?.snoringDuration > 0) && (
              <GlassModule title="Sleep Recordings" icon={Mic} theme={theme} isDark={isDark}>
                <View style={styles(theme, isDark).recordingsList}>
                  {recordings.length > 0 ? recordings.map((rec, i) => (
                    <View key={i} style={styles(theme, isDark).recordingItem}>
                      <View style={styles(theme, isDark).recordingIconObj}>
                        {rec.type === 'snoring' ? <Mic size={16} color="#F59E0B" /> :
                          rec.type === 'sleep_talk' ? <Mic size={16} color="#8B5CF6" /> :
                            rec.type === 'breathing' ? <Wind size={16} color="#10B981" /> :
                              rec.type === 'dreaming' ? <Sparkles size={16} color="#6366F1" /> :
                                <Mic size={16} color="#A8B5C7" />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles(theme, isDark).recordingTitle}>
                          {rec.type === 'snoring' ? 'Snoring Detected' :
                            rec.type === 'sleep_talk' ? 'Sleep Talking' :
                              rec.type === 'breathing' ? 'Deep Breathing' :
                                rec.type === 'dreaming' ? 'Possible Dreaming' :
                                  'Noise Event'}
                        </Text>
                        <Text style={styles(theme, isDark).recordingTime}>
                          {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {Math.round(rec.duration)}s
                        </Text>
                        {playingAudio === `rec_${i}` && playbackStatus && (
                          <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 8, borderRadius: 2, overflow: 'hidden', width: '90%' }}>
                            <View style={{ height: '100%', backgroundColor: '#8B5CF6', width: `${(playbackStatus.position / playbackStatus.duration) * 100}%` }} />
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles(theme, isDark).playBtn}
                        onPress={() => handlePlayAudio(rec.audioUri, `rec_${i}`)}
                      >
                        {playingAudio === `rec_${i}` ? (
                          <Pause size={14} color="#FFF" fill="#FFF" />
                        ) : (
                          <Play size={14} color="#FFF" fill="#FFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )) : (
                    <View style={styles(theme, isDark).recordingItem}>
                      <View style={styles(theme, isDark).recordingIconObj}>
                        <Mic size={16} color="#F59E0B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles(theme, isDark).recordingTitle}>Snoring Event</Text>
                        <Text style={styles(theme, isDark).recordingTime}>
                          {latestSession?.startTime ? new Date(new Date(latestSession.startTime).getTime() + 7200000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '02:00 AM'} • {latestSession?.snoringDuration || 5} min
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles(theme, isDark).playBtn}
                        onPress={handleUnlock}
                      >
                        <Play size={14} color="#FFF" fill="#FFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </GlassModule>
            )}

            {/* Advanced Sleep Vitals */}
            <GlassModule title="Advanced Sleep Vitals" icon={Activity} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              {/* Vitals Grid */}
              <View style={styles(theme, isDark).vitalsGrid}>
                <View style={styles(theme, isDark).vitalCard}>
                  <View style={styles(theme, isDark).vitalHeader}>
                    <Wind size={16} color="#F59E0B" />
                    <Text style={styles(theme, isDark).vitalTitle}>Snoring</Text>
                  </View>
                  <Text style={styles(theme, isDark).vitalValue}>
                    {latestSession?.snoringDuration ? `${latestSession.snoringDuration} min` : '—'}
                  </Text>
                  <View style={styles(theme, isDark).miniTrendContainer}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={[styles(theme, isDark).miniTrendBar, {
                        height: latestSession?.snoringDuration ? Math.random() * 10 + 4 : 4,
                        backgroundColor: latestSession?.snoringDuration ? '#F59E0B' : 'rgba(255,255,255,0.1)'
                      }]} />
                    ))}
                  </View>
                </View>

                <View style={styles(theme, isDark).vitalCard}>
                  <View style={styles(theme, isDark).vitalHeader}>
                    <Brain size={16} color="#8B5CF6" />
                    <Text style={styles(theme, isDark).vitalTitle}>Deep Sleep Quality</Text>
                  </View>
                  <Text style={styles(theme, isDark).vitalValue}>
                    {latestSession?.deepSleepQuality ? `${latestSession.deepSleepQuality}%` : '—'}
                  </Text>
                  <View style={styles(theme, isDark).miniTrendContainer}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={[styles(theme, isDark).miniTrendBar, {
                        height: latestSession?.deepSleepQuality ? (latestSession.deepSleepQuality / 100) * 10 + 4 : 4,
                        backgroundColor: latestSession?.deepSleepQuality ? '#8B5CF6' : 'rgba(255,255,255,0.1)'
                      }]} />
                    ))}
                  </View>
                </View>
              </View>

              {/* Second Vitals Grid for Sleep Disruption and Snoring Intensity */}
              <View style={[styles(theme, isDark).vitalsGrid, { marginBottom: 0 }]}>
                <View style={styles(theme, isDark).vitalCard}>
                  <View style={styles(theme, isDark).vitalHeader}>
                    <AlertCircle size={16} color="#EF4444" />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles(theme, isDark).vitalTitle}>Sleep Disruption</Text>
                    </View>
                  </View>
                  <Text style={[styles(theme, isDark).vitalValue, { color: latestSession?.disruptionScore === 'High' ? '#EF4444' : (latestSession?.disruptionScore === 'Moderate' ? '#F59E0B' : '#10B981') }]}>
                    {latestSession?.disruptionScore || '—'}
                  </Text>
                </View>

                <View style={styles(theme, isDark).vitalCard}>
                  <View style={styles(theme, isDark).vitalHeader}>
                    <Activity size={16} color="#8B5CF6" />
                    <Text style={styles(theme, isDark).vitalTitle}>Snoring Level</Text>
                  </View>
                  <Text style={styles(theme, isDark).vitalValue}>{latestSession?.snoringIntensity || '—'}</Text>
                  <View style={styles(theme, isDark).miniTrendContainer}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={[styles(theme, isDark).miniTrendBar, {
                        height: latestSession?.snoringIntensity ? Math.random() * 10 + 4 : 4,
                        backgroundColor: latestSession?.snoringIntensity !== 'None' ? '#8B5CF6' : 'rgba(255,255,255,0.1)'
                      }]} />
                    ))}
                  </View>
                </View>
              </View>
            </GlassModule>

            {/* TIER 3: MOVEMENT & RESTLESSNESS */}
            <GlassModule title="Movement & Restlessness" icon={Activity} beta pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <View style={styles(theme, isDark).movementWrapper}>
                <View style={styles(theme, isDark).movementHeader}>
                  <View>
                    <Text style={styles(theme, isDark).movementValue}>
                      {latestSession?.movementEvents ? `${latestSession.movementEvents} events` : '—'}
                    </Text>
                    <Text style={styles(theme, isDark).movementLabel}>
                      {(latestSession?.movementEvents || 0) > 20 ? 'High Activity' : (latestSession?.movementEvents || 0) > 10 ? 'Moderate Activity' : 'Low Activity'}
                    </Text>
                  </View>
                  <View style={styles(theme, isDark).movementScoreBadge}>
                    <Text style={styles(theme, isDark).movementScoreText}>{latestSession?.movementScore ? `${latestSession.movementScore}/100` : '—'}</Text>
                  </View>
                </View>
                <View style={styles(theme, isDark).movementHeatmap}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles(theme, isDark).movementBar,
                        {
                          height: latestSession?.movementEvents ? (Math.random() > 0.7 ? 15 : 6) : 4, // Placeholder if no granular timestamp data
                          backgroundColor: latestSession?.movementEvents ? '#8B5CF680' : 'rgba(255,255,255,0.05)'
                        }
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles(theme, isDark).stackHelper}>
                  {(latestSession?.movementEvents || 0) > 0 ? 'Movement detected during sleep.' : 'No significant movement detected.'}
                </Text>
              </View>
            </GlassModule>

            {/* AI Insights */}
            <GlassModule title="AI Insights" icon={Sparkles} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <View style={styles(theme, isDark).aiInsightWrapper}>
                {insights.length > 0 ? (
                  insights.map((insight, index) => (
                    <View key={index} style={{ marginBottom: index < insights.length - 1 ? 16 : 0 }}>
                      <Text style={[styles(theme, isDark).aiInsightText, { fontWeight: '700', marginBottom: 4, color: '#FFF' }]}>
                        {insight.title}
                      </Text>
                      <Text style={styles(theme, isDark).aiInsightText}>
                        {insight.description}
                      </Text>
                      <View style={[styles(theme, isDark).tagsRow, { marginTop: 8 }]}>
                        {insight.correlation && (
                          <View style={styles(theme, isDark).insightTag}>
                            <Text style={styles(theme, isDark).insightTagText}>#{insight.correlation}</Text>
                          </View>
                        )}
                        <View style={[styles(theme, isDark).insightTag, {
                          backgroundColor: insight.type === 'positive' ? 'rgba(16, 185, 129, 0.12)' : insight.type === 'negative' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(139, 92, 246, 0.12)'
                        }]}>
                          <Text style={[styles(theme, isDark).insightTagText, {
                            color: insight.type === 'positive' ? '#10B981' : insight.type === 'negative' ? '#EF4444' : '#8B5CF6'
                          }]}>
                            {insight.type === 'positive' ? 'Good' : insight.type === 'negative' ? 'Attention' : 'Info'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <>
                    <Text style={styles(theme, isDark).aiInsightText}>
                      {(latestSession?.sleepScore || 0) > 80 ? 'Your consistent bedtime is improving your sleep quality.' : 'Try going to bed 30 minutes earlier to boost deep sleep.'}
                    </Text>
                    <View style={styles(theme, isDark).tagsRow}>
                      <View style={styles(theme, isDark).insightTag}><Text style={styles(theme, isDark).insightTagText}>#Routine</Text></View>
                    </View>
                  </>
                )}

                {!isPremium && (
                  <View style={[styles(theme, isDark).insightTag, { alignSelf: 'flex-start', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)', borderWidth: 1, marginTop: 10 }]}>
                    <Text style={[styles(theme, isDark).insightTagText, { color: '#8B5CF6' }]}>+ PRO Analysis</Text>
                  </View>
                )}
              </View>
            </GlassModule>

            {/* Best/Worst Nights */}
            {sleepHistory.length >= 2 && (
              <View style={styles(theme, isDark).vitalsGrid}>
                <View style={styles(theme, isDark).bwCard}>
                  <View style={[styles(theme, isDark).bwIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                  <Text style={styles(theme, isDark).bwLabel}>Best Night</Text>
                  <Text style={styles(theme, isDark).bwDay}>
                    {new Date(sleepHistory.reduce((prev, current) => (prev.sleepScore || 0) > (current.sleepScore || 0) ? prev : current).startTime).toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                  <Text style={styles(theme, isDark).bwScore}>
                    {sleepHistory.reduce((prev, current) => (prev.sleepScore || 0) > (current.sleepScore || 0) ? prev : current).sleepScore} score
                  </Text>
                </View>
                <View style={styles(theme, isDark).bwCard}>
                  <View style={[styles(theme, isDark).bwIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <AlertCircle size={16} color="#EF4444" />
                  </View>
                  <Text style={styles(theme, isDark).bwLabel}>Worst Night</Text>
                  <Text style={styles(theme, isDark).bwDay}>
                    {new Date(sleepHistory.reduce((prev, current) => (prev.sleepScore || 0) < (current.sleepScore || 0) ? prev : current).startTime).toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                  <Text style={styles(theme, isDark).bwScore}>
                    {sleepHistory.reduce((prev, current) => (prev.sleepScore || 0) < (current.sleepScore || 0) ? prev : current).sleepScore} score
                  </Text>
                </View>
              </View>
            )}

            {/* Sleep Debt Bar */}
            <View style={styles(theme, isDark).sectionStack}>
              <View style={styles(theme, isDark).sectionStackHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TrendingDown size={18} color="#EF4444" />
                  <Text style={styles(theme, isDark).stackTitle}>Sleep Debt</Text>
                </View>
                <Text style={[styles(theme, isDark).stackStatus, { color: getSleepDebt() > 0 ? '#EF4444' : '#10B981' }]}>
                  {getSleepDebt() > 0 ? 'Needs Recovery' : 'Well Rested'}
                </Text>
              </View>
              <View style={styles(theme, isDark).debtProgressBar}>
                <LinearGradient
                  colors={['#8B5CF6', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles(theme, isDark).debtProgressFill, { width: `${Math.min(100, Math.max(5, (getSleepDebt() / 8) * 100))}%` }]}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles(theme, isDark).stackHelper}>{getSleepDebt() > 0 ? `${getSleepDebt()}h deficit` : 'No deficit'} • Past 7 days</Text>
                {getSleepDebt() > 0 && (
                  <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>+{Math.ceil(getSleepDebt() / 2)}h needed</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Sleep Regularity */}
            <GlassModule title="Sleep Regularity" icon={TrendingUp} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <View style={styles(theme, isDark).regularityContainer}>
                <View style={styles(theme, isDark).regularityChart}>
                  {regularityData.length > 0 ? regularityData.map((item, i) => (
                    <View key={i} style={styles(theme, isDark).regBarColumn}>
                      <View style={[styles(theme, isDark).regBar, { height: (item.val / 100) * 80, backgroundColor: item.val > 75 ? '#8B5CF6' : '#6366F1' }]} />
                      <Text style={styles(theme, isDark).regDayText}>{item.day}</Text>
                    </View>
                  )) : [85, 92, 78, 95, 88, 72, 90].map((val, i) => (
                    <View key={i} style={styles(theme, isDark).regBarColumn}>
                      <View style={[styles(theme, isDark).regBar, { height: (val / 100) * 80, backgroundColor: val > 80 ? '#8B5CF6' : '#6366F1' }]} />
                      <Text style={styles(theme, isDark).regDayText}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles(theme, isDark).regSummary}>
                  <Text style={styles(theme, isDark).regValue}>
                    {regularityData.length > 0 ? Math.round(regularityData.reduce((a, b) => a + b.val, 0) / regularityData.length) : 86}%
                  </Text>
                  <Text style={styles(theme, isDark).regLabel}>Weekly Avg</Text>
                </View>
              </View>
            </GlassModule>

            {/* Environmental Analysis */}
            <GlassModule title="Noise & Light Level" icon={Shield} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <View style={styles(theme, isDark).envWrapper}>
                <View style={styles(theme, isDark).envItem}>
                  <View style={styles(theme, isDark).envHeader}>
                    <Wind size={14} color="#64748B" />
                    <Text style={styles(theme, isDark).envTitle}>Noise Level</Text>
                    <Text style={styles(theme, isDark).envStat}>{latestSession?.ambientNoise ? `${latestSession.ambientNoise}dB` : '—'}</Text>
                  </View>
                  <View style={styles(theme, isDark).envBarBg}>
                    <View style={[styles(theme, isDark).envBarFill, {
                      width: latestSession?.ambientNoise ? `${Math.min(100, (latestSession.ambientNoise / 80) * 100)}%` : '0%',
                      backgroundColor: '#10B981'
                    }]} />
                  </View>
                </View>
                <View style={styles(theme, isDark).envItem}>
                  <View style={styles(theme, isDark).envHeader}>
                    <Sun size={14} color="#64748B" />
                    <Text style={styles(theme, isDark).envTitle}>Light Exposure</Text>
                    <Text style={styles(theme, isDark).envStat}>{latestSession?.lightLevel ? `${latestSession.lightLevel} lx` : '—'}</Text>
                  </View>
                  <View style={styles(theme, isDark).envBarBg}>
                    <View style={[styles(theme, isDark).envBarFill, {
                      width: latestSession?.lightLevel ? `${Math.min(100, (latestSession.lightLevel / 500) * 100)}%` : '0%',
                      backgroundColor: '#8B5CF6'
                    }]} />
                  </View>
                </View>
              </View>
            </GlassModule>

            {/* Circadian Rhythm */}
            <GlassModule title="Circadian Rhythm" icon={Sun} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <View style={styles(theme, isDark).circadianWrapper}>
                <View style={styles(theme, isDark).personaCard}>
                  <View style={styles(theme, isDark).personaIcon}>
                    <Brain size={24} color="#8B5CF6" />
                  </View>
                  <View>
                    <Text style={styles(theme, isDark).personaType}>{latestSession?.chronotype || 'Uncategorized'}</Text>
                    <Text style={styles(theme, isDark).personaDesc}>{latestSession ? 'Based on wake times' : 'Not enough data'}</Text>
                  </View>
                </View>
                <View style={styles(theme, isDark).windowRow}>
                  <View style={styles(theme, isDark).windowItem}>
                    <Text style={styles(theme, isDark).windowLabel}>Optimal Window</Text>
                    <Text style={styles(theme, isDark).windowTime}>{avgBedtime}</Text>
                  </View>
                  <View style={styles(theme, isDark).windowItem}>
                    <Text style={styles(theme, isDark).windowLabel}>Alignment</Text>
                    <Text style={[styles(theme, isDark).windowTime, { color: '#10B981' }]}>{latestSession ? 'Good' : '—'}</Text>
                  </View>
                </View>
              </View>
            </GlassModule>

            {/* Sleep Patterns Heatmap */}
            <GlassModule title="Sleep Patterns - Last 28 Days" icon={Calendar} pro={!isPremium} theme={theme} isDark={isDark} onUnlock={handleUnlock}>
              <View style={styles(theme, isDark).heatmapContainer}>
                <View style={styles(theme, isDark).heatmapGrid}>
                  {heatmapData.map((color, i) => (
                    <View
                      key={i}
                      style={[
                        styles(theme, isDark).heatmapSquare,
                        { backgroundColor: color }
                      ]}
                    />
                  ))}
                </View>
                <View style={styles(theme, isDark).heatmapDays}>
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                    <Text key={i} style={styles(theme, isDark).heatmapDayText}>{day}</Text>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles(theme, isDark).viewDetailsBtn}
                  onPress={() => navigation.navigate('SleepStages', { session: latestSession })}
                >
                  <Text style={styles(theme, isDark).viewDetailsText}>View Details ›</Text>
                </TouchableOpacity>
              </View>
            </GlassModule>

            {/* Sleep Recordings */}
            {recordings.length > 0 && (
              <GlassModule title="Sleep Recordings" icon={Mic} pro={false} theme={theme} isDark={isDark}>
                <View style={styles(theme, isDark).recordingsContainer}>
                  <Text style={styles(theme, isDark).recordingsSubtitle}>
                    {recordings.length} event{recordings.length !== 1 ? 's' : ''} recorded during this session
                  </Text>
                  {recordings.map((recording, index) => {
                    const isPlaying = playingAudio === recording.id;
                    const eventTypeLabel = recording.event_type === 'snoring' ? '🔊 Snoring' :
                      recording.event_type === 'sleep_talk' ? '💬 Sleep Talk' :
                        recording.event_type === 'noise' ? '🔔 Noise' :
                          recording.event_type === 'dreaming' ? '💭 Dreaming' : '🎤 Recording';

                    return (
                      <TouchableOpacity
                        key={recording.id || index}
                        style={[
                          styles(theme, isDark).recordingItem,
                          isPlaying && styles(theme, isDark).recordingItemActive
                        ]}
                        onPress={() => recording.audio_file_url && handlePlayAudio(recording.audio_file_url, recording.id)}
                        disabled={!recording.audio_file_url}
                      >
                        <View style={styles(theme, isDark).recordingLeft}>
                          <View style={[
                            styles(theme, isDark).recordingIconWrapper,
                            isPlaying && { backgroundColor: 'rgba(139, 92, 246, 0.3)' }
                          ]}>
                            {isPlaying ? (
                              <Pause size={16} color="#8B5CF6" />
                            ) : (
                              <Play size={16} color={recording.audio_file_url ? '#8B5CF6' : '#64748B'} />
                            )}
                          </View>
                          <View style={styles(theme, isDark).recordingInfo}>
                            <Text style={styles(theme, isDark).recordingType}>{eventTypeLabel}</Text>
                            <Text style={styles(theme, isDark).recordingTime}>
                              {new Date(recording.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {recording.duration_seconds && ` • ${Math.round(recording.duration_seconds)}s`}
                              {recording.loudness_db && ` • ${Math.round(recording.loudness_db)}dB`}
                            </Text>
                          </View>
                        </View>
                        {isPlaying && playbackStatus && (
                          <View style={styles(theme, isDark).recordingProgress}>
                            <View style={styles(theme, isDark).recordingProgressBar}>
                              <View
                                style={[
                                  styles(theme, isDark).recordingProgressFill,
                                  { width: `${(playbackStatus.position / playbackStatus.duration) * 100}%` }
                                ]}
                              />
                            </View>
                          </View>
                        )}
                        {!recording.audio_file_url && (
                          <Text style={styles(theme, isDark).recordingUnavailable}>No audio</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassModule>
            )}

            {/* Report Generation CTA */}
            <TouchableOpacity
              style={styles(theme, isDark).mainCTA}
              onPress={() => {
                showToast("Generating your premium sleep report...", "info");
                console.log("Generating sleep report...");
              }}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <FileText size={20} color="#FFF" />
              <Text style={styles(theme, isDark).mainCTAText}>Generate Full Sleep Report</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function styles(theme: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0F0F1E',
    },
    bgGlow: {
      position: 'absolute',
      top: -150,
      right: -150,
      width: 400,
      height: 400,
      borderRadius: 200,
      backgroundColor: 'rgba(139, 92, 246, 0.03)',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingBottom: 20,
    },
    iconBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#FFF',
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: 'center',
    },
    proBadgeHeader: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    proBadgeHeaderText: {
      color: '#8B5CF6',
      fontSize: 10,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.black,
    },
    headerTitleContainer: {
      flex: 1,
      marginLeft: 4,
    },
    headerDate: {
      color: 'rgba(255, 255, 255, 0.5)',
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.medium,
      marginTop: 2,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    datePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    headerDateText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    dateStripScroll: {
      marginTop: 10,
      marginBottom: 5,
    },
    dateStripContent: {
      paddingHorizontal: 24,
      gap: 12,
    },
    dateCard: {
      width: 60,
      height: 75,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    selectedDateCard: {
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      borderColor: '#8B5CF6',
    },
    dateDay: {
      fontSize: 10,
      color: '#64748B',
      fontWeight: '600',
      marginBottom: 2,
    },
    dateNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFF',
    },
    selectedDateText: {
      color: '#8B5CF6',
    },
    dateIndicatorDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: '#8B5CF6',
      marginTop: 4,
    },
    selectedDateIndicatorDot: {
      backgroundColor: '#8B5CF6',
    },
    betaBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    miniBetaBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    betaText: {
      color: '#EF4444',
      fontSize: 8,
      fontWeight: '900',
      fontFamily: theme.typography.fontFamily.black,
    },
    timeframeRow: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 16,
      padding: 4,
      marginBottom: 10,
      marginTop: 10,
    },
    timeframeTab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 12,
    },
    timeframeTabActive: {
      backgroundColor: '#8B5CF6',
    },
    timeframeTabText: {
      color: '#64748B',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.semibold,
    },
    timeframeTabTextActive: {
      color: '#FFF',
      fontFamily: theme.typography.fontFamily.bold,
    },
    heroCard: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    heroMain: {
      alignItems: 'center',
      width: '100%',
    },
    scoreRingWrapper: {
      width: 160,
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    heroScore: {
      fontSize: 48,
      fontWeight: '800',
      color: '#FFF',
      fontFamily: theme.typography.fontFamily.bold,
    },
    heroStatus: {
      fontSize: 14,
      fontWeight: '700',
      color: '#10B981',
      fontFamily: theme.typography.fontFamily.semibold,
      marginTop: -5,
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 20,
      paddingVertical: 12,
      paddingHorizontal: 20,
      gap: 15,
    },
    heroStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    heroStatValue: {
      color: '#A8B5C7',
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.medium,
    },
    heroStatDivider: {
      width: 1,
      height: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    glassModule: {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      marginBottom: 20,
    },
    moduleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    moduleTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    moduleTitle: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    moduleProBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    moduleProText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '900',
      fontFamily: theme.typography.fontFamily.black,
    },
    vitalsGrid: {
      flexDirection: 'row',
      gap: 14,
      marginBottom: 20,
    },
    vitalCard: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    vitalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    vitalTitle: {
      color: '#A8B5C7',
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semibold,
    },
    vitalValue: {
      color: '#FFF',
      fontSize: 22,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: 12,
    },
    miniTrendContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      height: 15,
    },
    miniTrendBar: {
      width: 4,
      borderRadius: 2,
      opacity: 0.8,
    },
    aiInsightWrapper: {
      gap: 15,
    },
    aiInsightText: {
      color: '#A8B5C7',
      fontSize: 14,
      lineHeight: 22,
      fontFamily: theme.typography.fontFamily.medium,
    },
    tagsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    insightTag: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
    },
    insightTagText: {
      color: '#8B5CF6',
      fontSize: 11,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    bwCard: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
    },
    bwIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    bwLabel: {
      color: '#64748B',
      fontSize: 11,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semibold,
      marginBottom: 4,
    },
    bwDay: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: 2,
    },
    bwScore: {
      color: '#A8B5C7',
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.medium,
    },
    sectionStack: {
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      marginBottom: 20,
    },
    sectionStackHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    stackTitle: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    stackStatus: {
      fontSize: 12,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.black,
    },
    debtProgressBar: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 12,
    },
    debtProgressFill: {
      height: '100%',
      borderRadius: 4,
    },
    stackHelper: {
      color: '#64748B',
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.medium,
    },
    hrvWrapper: {
      gap: 15,
    },
    hrvGraphContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingTop: 10,
      height: 70,
    },
    hrvColumn: {
      flex: 1,
      alignItems: 'center',
    },
    hrvBar: {
      width: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    hrvDot: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: '#0F0F1E',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.5,
      shadowRadius: 2,
    },
    hrvLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    hrvLabelText: {
      color: '#64748B',
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.medium,
      width: 35,
      textAlign: 'center',
    },
    consistencyInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 30,
    },
    consistRing: {
      width: 80,
      height: 80,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consistencyData: {
      flex: 1,
      gap: 16,
    },
    consistRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    consistLabel: {
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.medium,
      marginBottom: 2,
    },
    consistText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    regularityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      paddingTop: 10,
    },
    regularityChart: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 100,
    },
    regBarColumn: {
      alignItems: 'center',
      gap: 8,
    },
    regBar: {
      width: 12,
      borderRadius: 6,
    },
    regDayText: {
      color: '#64748B',
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.medium,
    },
    regSummary: {
      alignItems: 'center',
      paddingLeft: 20,
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(255, 255, 255, 0.05)',
    },
    regValue: {
      color: '#FFF',
      fontSize: 24,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.bold,
    },
    regLabel: {
      color: '#64748B',
      fontSize: 10,
      fontFamily: theme.typography.fontFamily.medium,
    },
    envWrapper: {
      gap: 16,
    },
    envItem: {
      gap: 8,
    },
    envHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    envTitle: {
      color: '#A8B5C7',
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.medium,
      flex: 1,
    },
    envStat: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    envBarBg: {
      height: 6,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    envBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    recordingsList: {
      gap: 12,
    },
    recordingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      padding: 12,
      borderRadius: 16,
    },
    recordingIconObj: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordingTitle: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semibold,
    },
    recordingTime: {
      color: '#64748B',
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.medium,
    },
    playBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#8B5CF6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    movementWrapper: {
      gap: 15,
    },
    movementHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    movementValue: {
      color: '#FFF',
      fontSize: 18,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.bold,
    },
    movementLabel: {
      color: '#10B981',
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.medium,
    },
    movementScoreBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    movementScoreText: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    movementHeatmap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderRadius: 8,
      padding: 6,
    },
    movementBar: {
      width: 4,
      borderRadius: 2,
    },
    circadianWrapper: {
      gap: 20,
    },
    personaCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15,
      backgroundColor: 'rgba(139, 92, 246, 0.08)',
      padding: 15,
      borderRadius: 20,
    },
    personaIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    personaType: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.bold,
    },
    personaDesc: {
      color: '#A8B5C7',
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.medium,
    },
    windowRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    windowItem: {
      gap: 4,
    },
    windowLabel: {
      color: '#64748B',
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.medium,
    },
    windowTime: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
    mainCTA: {
      height: 60,
      borderRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      overflow: 'hidden',
      marginTop: 10,
      marginBottom: 40,
    },
    mainCTAText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '800',
      fontFamily: theme.typography.fontFamily.bold,
    },
    heatmapContainer: {
      paddingTop: 10,
    },
    heatmapGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
    heatmapSquare: {
      width: (width - 120) / 7,
      height: (width - 120) / 7,
      borderRadius: 6,
    },
    heatmapDays: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingHorizontal: 15,
    },
    heatmapDayText: {
      color: '#64748B',
      fontSize: 11,
      fontFamily: theme.typography.fontFamily.medium,
      width: (width - 120) / 7,
      textAlign: 'center',
    },
    viewDetailsBtn: {
      alignItems: 'center',
      marginTop: 20,
    },
    viewDetailsText: {
      color: 'rgba(255, 255, 255, 0.4)',
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.semibold,
    },
    recordingsContainer: {
      gap: 12,
    },
    recordingsSubtitle: {
      color: '#64748B',
      fontSize: 13,
      marginBottom: 8,
      fontFamily: theme.typography.fontFamily.medium,
    },
    recordingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(17, 25, 40, 0.6)',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    recordingItemActive: {
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    recordingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    recordingIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    recordingInfo: {
      flex: 1,
      gap: 2,
    },
    recordingType: {
      color: '#FFF',
      fontSize: 14,
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.semibold,
    },
    recordingTime: {
      color: '#64748B',
      fontSize: 12,
      fontFamily: theme.typography.fontFamily.medium,
    },
    recordingUnavailable: {
      color: '#64748B',
      fontSize: 11,
      fontStyle: 'italic',
      fontFamily: theme.typography.fontFamily.medium,
    },
    recordingProgress: {
      marginLeft: 12,
      width: 60,
    },
    recordingProgressBar: {
      height: 3,
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    recordingProgressFill: {
      height: '100%',
      backgroundColor: '#8B5CF6',
    },
    premiumOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 16,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100,
      elevation: 5,
    },
    premiumOverlayContent: {
      alignItems: 'center',
      paddingHorizontal: 30,
      zIndex: 110,
    },
    lockIconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(139, 92, 246, 0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    premiumOverlayTitle: {
      color: '#FFF',
      fontSize: 20,
      fontWeight: '900',
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: 8,
      textAlign: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    premiumOverlayText: {
      color: '#FFF',
      fontSize: 13,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily.medium,
      marginBottom: 20,
      lineHeight: 18,
      paddingHorizontal: 10,
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    premiumUnlockBtn: {
      width: '100%',
      maxWidth: 160,
    },
    premiumUnlockBtnGradient: {
      height: 40,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    premiumUnlockBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.bold,
    },
  });
}
