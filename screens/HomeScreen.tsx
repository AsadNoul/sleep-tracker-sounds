import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Image,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Moon,
  Clock,
  TrendingUp,
  Bell,
  Search,
  Play,
  Calendar,
  Star,
  Zap,
  Activity,
  Layout,
  X,
  ChevronRight,
  Trophy,
  Sparkles,
  Thermometer,
  Droplets,
  Sun
} from 'lucide-react-native';

import CircularProgress from '../components/CircularProgress';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonCard, SkeletonStatCard } from '../components/SkeletonLoader';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { useSleep } from '../contexts/SleepContext';
import { generateSmartInsights, SmartInsight } from '../utils/smartInsights';
import { getSleepQualityColor, getSleepScoreColor } from '../utils/sleepQualityColors';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration, format12HourTime } from '../utils/dateFormatting';
import { Modal, TextInput } from 'react-native';
import alarmService from '../services/alarmService';

const isIOS = Platform.OS === 'ios';

const GlassView = ({ style, children, intensity = 20, tint = "dark" }: { style?: any; children: React.ReactNode; intensity?: number; tint?: 'dark' | 'light' | 'default' }) => {
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

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { theme, isDark } = useAppTheme();
  const { user } = useAuth();
  const { getSleepStats, isLoading, sleepHistory, isTracking, getCurrentStreak, getGoodNightStreak, getSleepDebt, getReadinessScore, getSmartBedtime, loadSleepHistory } = useSleep();
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const { width, height } = useWindowDimensions();
  const themedStyles = useMemo(() => styles(theme, width), [theme, width]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextAlarm, setNextAlarm] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sleepStats = useMemo(() => getSleepStats(), [sleepHistory]);
  const currentStreak = useMemo(() => getCurrentStreak(), [sleepHistory]);
  const goodNightStreak = useMemo(() => getGoodNightStreak(), [sleepHistory]);
  const sleepDebt = useMemo(() => getSleepDebt(), [sleepHistory]);
  const readinessScore = useMemo(() => getReadinessScore(), [sleepHistory]);
  const smartInsights = useMemo(() => generateSmartInsights(sleepHistory), [sleepHistory]);

  // Compute real weekly stats from sleep history
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeek = sleepHistory.filter(s => new Date(s.startTime) >= oneWeekAgo);
    const lastWeek = sleepHistory.filter(s => {
      const d = new Date(s.startTime);
      return d >= twoWeeksAgo && d < oneWeekAgo;
    });

    const avgDuration = thisWeek.length > 0
      ? Math.round(thisWeek.reduce((sum, s) => sum + s.duration, 0) / thisWeek.length)
      : 0;
    const avgQuality = thisWeek.length > 0
      ? Math.round((thisWeek.reduce((sum, s) => sum + s.quality, 0) / thisWeek.length) * 10)
      : 0;
    const avgBedtimeMs = thisWeek.length > 0
      ? thisWeek.reduce((sum, s) => {
          const st = new Date(s.startTime);
          // Normalize to minutes from midnight (handle past-midnight)
          let mins = st.getHours() * 60 + st.getMinutes();
          if (mins < 360) mins += 1440; // treat 0-6 AM as "late night" (add 24h)
          return sum + mins;
        }, 0) / thisWeek.length
      : 0;

    const lastWeekAvgQuality = lastWeek.length > 0
      ? Math.round((lastWeek.reduce((sum, s) => sum + s.quality, 0) / lastWeek.length) * 10)
      : 0;
    const qualityChange = lastWeekAvgQuality > 0
      ? avgQuality - lastWeekAvgQuality
      : 0;

    // Format bedtime
    let bedtimeStr = '--:--';
    if (avgBedtimeMs > 0) {
      let totalMins = Math.round(avgBedtimeMs);
      if (totalMins >= 1440) totalMins -= 1440;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      bedtimeStr = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    }

    // Format duration
    const durationH = Math.floor(avgDuration / 60);
    const durationM = avgDuration % 60;
    const durationStr = avgDuration > 0 ? `${durationH}h ${durationM.toString().padStart(2, '0')}m` : '0h 00m';

    // Daily chart data (last 7 days, score 0-100)
    const chartData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const daySessions = sleepHistory.filter(s => {
        const d = new Date(s.endTime || s.startTime);
        return d >= dayStart && d <= dayEnd;
      });
      if (daySessions.length > 0) {
        const best = daySessions.reduce((max, s) => Math.max(max, s.sleepScore || s.quality * 10), 0);
        chartData.push(best);
      } else {
        chartData.push(0);
      }
    }

    return { avgDuration: durationStr, avgQuality, bedtime: bedtimeStr, qualityChange, chartData, sessionCount: thisWeek.length };
  }, [sleepHistory]);

  // Compute real readiness sparkline from recent sleep scores
  const readinessSparkData = useMemo(() => {
    const recentSessions = sleepHistory.slice(0, 7).reverse();
    if (recentSessions.length === 0) return [0, 0, 0, 0, 0, 0, readinessScore];
    const data = recentSessions.map(s => s.sleepScore || s.quality * 10);
    // Pad to 7 points if needed
    while (data.length < 7) data.unshift(0);
    return data.slice(-7);
  }, [sleepHistory, readinessScore]);

  // Search functionality - filter navigable screens/features
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const items = [
      { label: 'Sleep Sounds', screen: 'Sounds', keywords: ['sound', 'music', 'rain', 'ocean', 'white noise', 'nature', 'meditation', 'deep sleep', 'calm'] },
      { label: 'Alarms', screen: 'Alarms', keywords: ['alarm', 'wake', 'morning', 'smart alarm'] },
      { label: 'Sleep Analysis', screen: 'SleepAnalysis', keywords: ['analysis', 'stats', 'report', 'quality', 'score', 'trend', 'chart', 'weekly'] },
      { label: 'Bedtime Routine', screen: 'BedtimeRoutine', keywords: ['bedtime', 'routine', 'wind down', 'evening', 'anxiety relief', 'morning routine'] },
      { label: 'Dream Journal', screen: 'DreamJournal', keywords: ['dream', 'journal', 'diary', 'log', 'note'] },
      { label: 'Caffeine Calculator', screen: 'CaffeineCalculator', keywords: ['caffeine', 'coffee', 'tea', 'energy'] },
      { label: 'Achievements', screen: 'Achievements', keywords: ['achievement', 'badge', 'trophy', 'streak', 'goal'] },
      { label: 'Settings', screen: 'Settings', keywords: ['setting', 'preference', 'theme', 'notification', 'reminder', 'account'] },
      { label: 'Start Sleep', screen: 'SleepSession', keywords: ['sleep', 'start', 'track', 'record', 'session', 'log sleep'] },
    ];
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    );
  }, [searchQuery]);

  // Update time once per minute to reduce re-renders
  useEffect(() => {
    const update = () => setCurrentTime(new Date());
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  const displayMode = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'daytime';
    return 'evening';
  }, [currentTime]);

  const sleepScore = useMemo(() => {
    if (sleepStats.totalSessions === 0) return 0;
    const lastSession = sleepHistory[0];

    // Check if last session is within 24 hours
    if (lastSession) {
      const sessionTime = lastSession.endTime || lastSession.startTime;
      const hoursSinceSession = (new Date().getTime() - new Date(sessionTime).getTime()) / (1000 * 60 * 60);

      // If session is older than 24 hours, show 0 (stale data)
      if (hoursSinceSession > 24) {
        return 0;
      }

      // Show actual score if fresh data
      if (lastSession.sleepScore) return lastSession.sleepScore;
    }

    const qualityScore = sleepStats.averageQuality * 10;
    const idealDuration = 480;
    const durationScore = Math.min(100, (sleepStats.averageDuration / idealDuration) * 100);
    return Math.round((qualityScore * 0.6) + (durationScore * 0.4));
  }, [sleepStats, sleepHistory]);

  const scoreQuality = useMemo(() => {
    // If currently tracking, show in-progress state
    if (isTracking) {
      return { color: '#F59E0B', label: 'Tracking...', emoji: '⏱️' };
    }
    return getSleepScoreColor(displayMode === 'daytime' ? readinessScore : sleepScore);
  }, [sleepScore, readinessScore, displayMode, isTracking]);
  const lastNightQuality = useMemo(
    () => getSleepQualityColor(sleepStats.lastNightQuality),
    [sleepStats.lastNightQuality]
  );

  // Dynamic Background Colors
  const bgColors = useMemo((): [string, string, ...string[]] => {
    switch (displayMode) {
      case 'morning': return ['#0F172A', '#1E1B4B', '#312E81']; // Transition from night to morning
      case 'daytime': return ['#0F172A', '#1E293B', '#334155']; // Clean slate daytime
      case 'evening': return ['#0F0F1E', '#1E1B4B', '#2E1065']; // Deep midnight/purple
      default: return ['#0F0F1E', '#1B1B2F'];
    }
  }, [displayMode]);

  // Load next alarm
  useEffect(() => {
    const loadNextAlarm = async () => {
      const alarms = await alarmService.getAlarms();
      const enabledAlarms = alarms.filter((a: any) => a.enabled);
      if (enabledAlarms.length > 0) {
        setNextAlarm(enabledAlarms[0]);
      }
    };
    loadNextAlarm();
  }, []);

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSleepHistory();
    const alarms = await alarmService.getAlarms();
    const enabledAlarms = alarms.filter((a: any) => a.enabled);
    if (enabledAlarms.length > 0) {
      setNextAlarm(enabledAlarms[0]);
    }
    setRefreshing(false);
  };

  // No changes needed here, just removing the duplicates that were here previously

  if (isLoading) {
    return (
      <View style={themedStyles.container}>
        <StatusBar barStyle="light-content" />
        <View style={[themedStyles.scrollContent, { paddingTop: insets.top + 10 }]}>
          <View style={themedStyles.header}>
            <SkeletonStatCard style={{ width: '48%' }} />
            <SkeletonStatCard style={{ width: '48%' }} />
          </View>
          <SkeletonCard style={{ marginTop: 20 }} />
          <SkeletonCard style={{ marginTop: 16 }} />
          <SkeletonCard style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={themedStyles.container}>
      <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={themedStyles.scrollView}
        contentContainerStyle={[
          themedStyles.scrollContent,
          { paddingTop: insets.top + 10, paddingBottom: bottomMargin }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
            progressBackgroundColor="rgba(27, 29, 42, 0.9)"
          />
        }
      >
        {/* Header */}
        <View style={themedStyles.header}>
          <View>
            <Text style={themedStyles.greeting}>
              {displayMode === 'morning' ? 'Good Morning' :
                displayMode === 'daytime' ? 'Good Afternoon' : 'Good Evening'},
            </Text>
            <Text style={themedStyles.userName}>{user?.email?.split('@')[0] || 'Dreamer'}</Text>
          </View>
          <View style={themedStyles.headerActions}>
            <View style={themedStyles.liveStatus}>
              <View style={themedStyles.liveDot} />
              <Text style={themedStyles.liveText}>
                {displayMode === 'evening' ? 'Optimal Window' : 'Tracking On'}
              </Text>
            </View>
            <TouchableOpacity
              style={themedStyles.iconButton}
              onPress={() => setIsSearchVisible(true)}
            >
              <Search size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Modal */}
        <Modal
          visible={isSearchVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsSearchVisible(false)}
        >
          <GlassView intensity={90} tint="dark" style={themedStyles.searchModalContainer}>
            <View style={[themedStyles.searchHeader, { paddingTop: insets.top + 20 }]}>
              <View style={themedStyles.searchInputContainer}>
                <Search size={20} color="#A0AEC0" />
                <TextInput
                  style={themedStyles.searchInput}
                  placeholder="Search sounds, articles, routines..."
                  placeholderTextColor="#A0AEC0"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={20} color="#A0AEC0" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={themedStyles.closeSearchButton}
                onPress={() => setIsSearchVisible(false)}
              >
                <Text style={themedStyles.closeSearchText}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={themedStyles.searchResults}>
              {searchQuery.length === 0 ? (
                <View style={themedStyles.searchSuggestions}>
                  <Text style={themedStyles.suggestionTitle}>Suggested</Text>
                  {['Deep Sleep', 'Rain Sounds', 'Morning Routine', 'Anxiety Relief'].map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={themedStyles.suggestionItem}
                      onPress={() => setSearchQuery(item)}
                    >
                      <TrendingUp size={16} color="#8B5CF6" />
                      <Text style={themedStyles.suggestionText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : searchResults.length > 0 ? (
                <View style={themedStyles.searchSuggestions}>
                  <Text style={themedStyles.suggestionTitle}>Results</Text>
                  {searchResults.map((item) => (
                    <TouchableOpacity
                      key={item.screen}
                      style={themedStyles.suggestionItem}
                      onPress={() => {
                        setIsSearchVisible(false);
                        setSearchQuery('');
                        navigation.navigate(item.screen as never);
                      }}
                    >
                      <ChevronRight size={16} color="#8B5CF6" />
                      <Text style={themedStyles.suggestionText}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={themedStyles.searchNoResults}>
                  <Text style={themedStyles.noResultsText}>No results for "{searchQuery}"</Text>
                </View>
              )}
            </ScrollView>
          </GlassView>
        </Modal>

        {/* Hero Section - Dynamic Based on Mode */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate(displayMode === 'morning' ? 'SleepAnalysis' : 'SleepSession')}
          style={themedStyles.mainCardContainer}
        >
          <GlassView intensity={30} tint="dark" style={themedStyles.mainCardBlur}>
            <LinearGradient
              colors={
                displayMode === 'morning' ? ['rgba(16, 185, 129, 0.2)', 'rgba(5, 150, 105, 0.1)'] :
                  displayMode === 'daytime' ? ['rgba(245, 158, 11, 0.2)', 'rgba(217, 119, 6, 0.1)'] :
                    ['rgba(139, 92, 246, 0.2)', 'rgba(99, 102, 241, 0.1)']
              }
              style={themedStyles.mainCard}
            >
              <View style={themedStyles.cardHeader}>
                <View style={themedStyles.statusBadge}>
                  <Text style={themedStyles.statusText}>
                    {isTracking ? '🌙 Sleep in Progress' : (sleepScore > 0 ? 'Last Night Summary' : 'Ready to Track')}
                  </Text>
                </View>
                <Text style={themedStyles.currentDate}>
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
              </View>

              <View style={themedStyles.scoreContainer}>
                {/* Visual Glow behind progress */}
                <View style={[themedStyles.scoreGlow, { backgroundColor: scoreQuality.color, opacity: 0.15 }]} />
                <CircularProgress
                  score={isTracking ? 0 : (displayMode === 'daytime' ? readinessScore : sleepScore)}
                  size={Math.max(140, Math.min(width * 0.45, 180))}
                  strokeWidth={12}
                  showText={false}
                  color={displayMode === 'morning' ? lastNightQuality.color : scoreQuality.color}
                />
                <View style={themedStyles.scoreInnerContent}>
                  <Text style={[themedStyles.scoreValue, {
                    color: isTracking ? '#F59E0B' : (displayMode === 'daytime' ? (readinessScore >= 75 ? '#10B981' : '#F59E0B') : scoreQuality.color)
                  }]}>
                    {isTracking ? '⏱️' : (displayMode === 'daytime' ? readinessScore : sleepScore)}
                  </Text>
                  <Text style={themedStyles.scoreLabel}>
                    {isTracking ? 'TRACKING' : (sleepScore === 0 ? 'NO DATA' : (displayMode === 'daytime' ? 'READINESS' : 'SLEEP SCORE'))}
                  </Text>
                  <Text style={[themedStyles.scoreQualityLabel, { color: scoreQuality.color }]}>
                    {isTracking ? 'In Progress' : (sleepScore === 0 ? 'Start tracking' : (displayMode === 'daytime' ? (readinessScore >= 85 ? '👑 Peak' : '⚡ Good') : `${scoreQuality.emoji} ${scoreQuality.label}`))}
                  </Text>
                </View>
              </View>

              <View style={themedStyles.statsRow}>
                <View style={themedStyles.statItem}>
                  <View style={themedStyles.statIconContainer}>
                    <Clock size={20} color={lastNightQuality.color} />
                  </View>
                  <Text style={[themedStyles.statValue, { color: lastNightQuality.color }]}>
                    {formatDuration(sleepStats.lastNightDuration)}
                  </Text>
                  <Text style={themedStyles.statLabel}>Duration</Text>
                </View>
                <View style={themedStyles.statDivider} />
                <View style={themedStyles.statItem}>
                  <View style={themedStyles.statIconContainer}>
                    <Zap size={20} color="#F59E0B" />
                  </View>
                  <Text style={themedStyles.statValue}>{Math.round(sleepStats.averageQuality * 10)}%</Text>
                  <Text style={themedStyles.statLabel}>Efficiency</Text>
                </View>
                <View style={themedStyles.statDivider} />
                <View style={themedStyles.statItem}>
                  <View style={themedStyles.statIconContainer}>
                    <Trophy size={20} color="#8B5CF6" />
                  </View>
                  <Text style={themedStyles.statValue}>{currentStreak}</Text>
                  <Text style={themedStyles.statLabel}>Streak</Text>
                </View>
              </View>

              <TouchableOpacity
                style={themedStyles.startSessionButton}
                onPress={() => navigation.navigate(isTracking ? 'SleepSession' : (sleepScore > 0 ? 'SleepAnalysis' : 'SleepSession'))}
              >
                <LinearGradient
                  colors={
                    isTracking ? ['#EF4444', '#DC2626'] : (sleepScore > 0 ? ['#10B981', '#059669'] : ['#8B5CF6', '#6366F1'])
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={themedStyles.buttonGradient}
                />
                <View style={themedStyles.buttonContent}>
                  {isTracking ? <Moon size={18} color="#FFFFFF" /> : (sleepScore > 0 ? <TrendingUp size={18} color="#FFFFFF" /> : <Play size={18} color="#FFFFFF" fill="#FFFFFF" />)}
                  <Text style={themedStyles.startSessionText}>
                    {isTracking ? 'End Sleep' : (sleepScore > 0 ? 'View Analysis' : 'Start Sleep')}
                  </Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </GlassView>
        </TouchableOpacity>

        {/* Vital Widgets Grid (2x2) */}
        <View style={themedStyles.vitalsGrid}>
          {/* Row 1 */}
          <View style={themedStyles.vitalsRow}>
            {/* Readiness Widget */}
            <GlassView intensity={20} tint="dark" style={themedStyles.vitalWidgetGrid}>
              <View style={themedStyles.vitalIconRow}>
                <Zap size={16} color="#10B981" />
                <Text style={themedStyles.vitalLabel}>Readiness</Text>
              </View>
              <Text style={themedStyles.vitalValue}>{readinessScore}%</Text>
              <View style={themedStyles.sparkLineContainer}>
                {readinessSparkData.map((v, i) => (
                  <View key={i} style={[themedStyles.sparkBar, { height: Math.max(2, (v / 100) * 16), backgroundColor: v >= 80 ? '#10B981' : v > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.1)' }]} />
                ))}
              </View>
            </GlassView>

            {/* Sleep Debt Widget */}
            <GlassView intensity={20} tint="dark" style={themedStyles.vitalWidgetGrid}>
              <View style={themedStyles.vitalIconRow}>
                <Activity size={16} color={sleepDebt > 0 ? '#EF4444' : '#10B981'} />
                <Text style={themedStyles.vitalLabel}>Sleep Debt</Text>
              </View>
              <Text style={[themedStyles.vitalValue, { color: sleepDebt > 0 ? '#EF4444' : '#10B981' }]}>
                {sleepDebt > 0 ? '-' : '+'}{Math.abs(sleepDebt)}h
              </Text>
              <Text style={themedStyles.vitalSubtext}>{sleepDebt > 0 ? 'Recovery needed' : 'Well rested'}</Text>
            </GlassView>
          </View>

          {/* Row 2 */}
          <View style={themedStyles.vitalsRow}>
            {/* Next Alarm Widget */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Alarms')}
              style={themedStyles.vitalWidgetGrid}
            >
              <View style={themedStyles.vitalIconRow}>
                <Bell size={16} color="#8B5CF6" />
                <Text style={themedStyles.vitalLabel}>Next Alarm</Text>
              </View>
              <Text style={themedStyles.vitalValue}>{nextAlarm ? nextAlarm.time : '--:--'}</Text>
              <Text style={themedStyles.vitalSubtext}>{nextAlarm ? (nextAlarm.name || 'Wake up') : 'Not set'}</Text>
            </TouchableOpacity>

            {/* Streak Widget */}
            <GlassView intensity={20} tint="dark" style={themedStyles.vitalWidgetGrid}>
              <View style={themedStyles.vitalIconRow}>
                <Trophy size={16} color="#F59E0B" />
                <Text style={themedStyles.vitalLabel}>Streak</Text>
              </View>
              <Text style={themedStyles.vitalValue}>{currentStreak} Days</Text>
              <Text style={themedStyles.vitalSubtext}>{currentStreak >= 7 ? '🔥 On fire!' : currentStreak >= 3 ? '✨ Building' : currentStreak > 0 ? '🌱 Started' : '💤 Track now'}</Text>
            </GlassView>
          </View>
        </View>

        {/* Control Center - Quick Actions */}
        <View style={[themedStyles.sectionHeader, { marginTop: 16 }]}>
          <Text style={themedStyles.sectionTitle}>🛠️ Control Center</Text>
        </View>
        <View style={themedStyles.quickActionsGrid}>
          {/* Row 1 */}
          <View style={themedStyles.quickActionsRow}>
            <TouchableOpacity
              style={themedStyles.actionCard}
              onPress={() => navigation.navigate('Sounds')}
            >
              <LinearGradient
                colors={['rgba(107, 114, 128, 0.28)', 'rgba(107, 114, 128, 0.10)']}
                style={themedStyles.actionContent}
              >
                <View style={[themedStyles.actionIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.22)' }]}>
                  <Moon size={22} color="#8B5CF6" strokeWidth={2.5} />
                </View>
                <Text style={themedStyles.actionLabel}>Sounds</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={themedStyles.actionCard}
              onPress={() => navigation.navigate('Alarms')}
            >
              <LinearGradient
                colors={['rgba(107, 114, 128, 0.28)', 'rgba(107, 114, 128, 0.10)']}
                style={themedStyles.actionContent}
              >
                <View style={[themedStyles.actionIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.22)' }]}>
                  <Bell size={22} color="#10B981" strokeWidth={2.5} />
                </View>
                <Text style={themedStyles.actionLabel}>Alarms</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={themedStyles.quickActionsRow}>
            <TouchableOpacity
              style={themedStyles.actionCard}
              onPress={() => navigation.navigate('SleepSession')}
            >
              <LinearGradient
                colors={['rgba(245, 158, 11, 0.28)', 'rgba(245, 158, 11, 0.10)']}
                style={themedStyles.actionContent}
              >
                <View style={[themedStyles.actionIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.22)' }]}>
                  <Activity size={22} color="#F59E0B" strokeWidth={2.5} />
                </View>
                <Text style={themedStyles.actionLabel}>Log Sleep</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={themedStyles.actionCard}
              onPress={() => navigation.navigate('Settings')}
            >
              <LinearGradient
                colors={['rgba(107, 114, 128, 0.28)', 'rgba(107, 114, 128, 0.10)']}
                style={themedStyles.actionContent}
              >
                <View style={[themedStyles.actionIconWrapper, { backgroundColor: 'rgba(107, 114, 128, 0.22)' }]}>
                  <Layout size={22} color="#9CA3AF" strokeWidth={2.5} />
                </View>
                <Text style={themedStyles.actionLabel}>Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Sleep Improvement Dashboard */}
        <View style={[themedStyles.sectionHeader, { marginTop: 8 }]}>
          <Text style={themedStyles.sectionTitle}>⭐ Sleep Improvement</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SleepAnalysis')}>
            <Text style={themedStyles.seeAllText}>Detailed View</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('SleepAnalysis')}
          style={themedStyles.analysisCardLarge}
        >
          <GlassView intensity={30} tint="dark" style={themedStyles.improvementContent}>
            <View style={themedStyles.improvementHeader}>
              <View style={themedStyles.analysisIconCircle}>
                <TrendingUp size={24} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={themedStyles.analysisTitle}>Weekly Performance</Text>
                <Text style={themedStyles.analysisSubtitle}>
                  {weeklyStats.sessionCount === 0
                    ? 'No data this week'
                    : weeklyStats.qualityChange !== 0
                      ? `Quality is ${weeklyStats.qualityChange > 0 ? 'up' : 'down'} ${Math.abs(weeklyStats.qualityChange)}% vs last week`
                      : `${weeklyStats.sessionCount} session${weeklyStats.sessionCount === 1 ? '' : 's'} this week`}
                </Text>
              </View>
              {weeklyStats.qualityChange !== 0 && (
                <View style={themedStyles.trendBadge}>
                  <TrendingUp size={12} color={weeklyStats.qualityChange > 0 ? '#10B981' : '#EF4444'} />
                  <Text style={[themedStyles.trendText, { color: weeklyStats.qualityChange > 0 ? '#10B981' : '#EF4444' }]}>
                    {weeklyStats.qualityChange > 0 ? '+' : ''}{weeklyStats.qualityChange}%
                  </Text>
                </View>
              )}
            </View>

            <View style={themedStyles.improvementStatsRow}>
              <View style={themedStyles.improvementStatItem}>
                <Text style={themedStyles.improvementStatValue}>{weeklyStats.avgDuration}</Text>
                <Text style={themedStyles.improvementStatLabel}>Avg Duration</Text>
              </View>
              <View style={themedStyles.improvementStatDivider} />
              <View style={themedStyles.improvementStatItem}>
                <Text style={themedStyles.improvementStatValue}>{weeklyStats.avgQuality}%</Text>
                <Text style={themedStyles.improvementStatLabel}>Avg Quality</Text>
              </View>
              <View style={themedStyles.improvementStatDivider} />
              <View style={themedStyles.improvementStatItem}>
                <Text style={themedStyles.improvementStatValue}>{weeklyStats.bedtime}</Text>
                <Text style={themedStyles.improvementStatLabel}>Bedtime</Text>
              </View>
            </View>

            <View style={themedStyles.miniChartContainer}>
              {weeklyStats.chartData.map((h, i) => {
                const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
                const now = new Date();
                const dayIndex = (now.getDay() + 7 - (6 - i)) % 7;
                // Map 0=Sun to labels
                const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
                return (
                  <View key={i} style={themedStyles.miniChartColumn}>
                    <View style={[themedStyles.miniChartBar, { height: Math.max(4, h), backgroundColor: i === 6 ? '#8B5CF6' : h > 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.1)' }]} />
                    <Text style={themedStyles.miniChartLabel}>{labels[dayIndex]}</Text>
                  </View>
                );
              })}
            </View>
          </GlassView>
        </TouchableOpacity>

        {/* Sleep Tip of the Day */}
        <TouchableOpacity style={themedStyles.tipCard}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.15)', 'rgba(99, 102, 241, 0.05)']}
            style={themedStyles.tipGradient}
          >
            <View style={themedStyles.iconButton}>
              <Zap size={20} color="#8B5CF6" />
            </View>
            <View style={themedStyles.tipContent}>
              <Text style={themedStyles.tipLabel}>Sleep Tip of the Day</Text>
              <Text style={themedStyles.tipText}>
                Try the 4-7-8 breathing technique to calm your nervous system before bed.
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Achievements */}
        <View style={[themedStyles.sectionHeader, { marginTop: 8 }]}>
          <Text style={themedStyles.sectionTitle}>🏆 Achievements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
            <Text style={themedStyles.seeAllText}>All</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Achievements')}
        >
          <GlassView intensity={20} tint="dark" style={themedStyles.achievementsCard}>
            <View style={themedStyles.achievementsRow}>
              <View style={themedStyles.achievementsTrophyCircle}>
                <Trophy size={28} color="#F59E0B" />
              </View>
              <View style={themedStyles.achievementsInfo}>
                <Text style={themedStyles.achievementsTitle}>Your Journey</Text>
                <View style={themedStyles.achievementsStats}>
                  <View style={themedStyles.achievementStat}>
                    <Text style={themedStyles.achievementStatEmoji}>🔥</Text>
                    <Text style={themedStyles.achievementStatValue}>{currentStreak}</Text>
                    <Text style={themedStyles.achievementStatLabel}>Streak</Text>
                  </View>
                  <View style={themedStyles.achievementStatDivider} />
                  <View style={themedStyles.achievementStat}>
                    <Text style={themedStyles.achievementStatEmoji}>⭐</Text>
                    <Text style={themedStyles.achievementStatValue}>{goodNightStreak}</Text>
                    <Text style={themedStyles.achievementStatLabel}>Good Nights</Text>
                  </View>
                  <View style={themedStyles.achievementStatDivider} />
                  <View style={themedStyles.achievementStat}>
                    <Text style={themedStyles.achievementStatEmoji}>📊</Text>
                    <Text style={themedStyles.achievementStatValue}>{sleepHistory.length}</Text>
                    <Text style={themedStyles.achievementStatLabel}>Sessions</Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={20} color="#A0AEC0" />
            </View>
          </GlassView>
        </TouchableOpacity>

      </ScrollView>

      {/* AI Assistant Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('SleepAnalysis')}
        style={[themedStyles.aiFab, { bottom: bottomMargin + 20 }]}
      >
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          style={themedStyles.aiFabGradient}
        >
          <Sparkles size={24} color="#FFFFFF" strokeWidth={2.5} />
        </LinearGradient>
      </TouchableOpacity>
    </View >
  );
}

const styles = (theme: any, width: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  greeting: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: theme.typography.fontFamily.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCardContainer: {
    marginBottom: 24,
    borderRadius: 32,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  mainCardBlur: {
    borderRadius: 32,
    overflow: 'hidden',
  },
  mainCard: {
    padding: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  currentDate: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
  },
  scoreContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    height: 180,
    width: 180,
  },
  scoreGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.1,
  },
  scoreInnerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 60,
    fontWeight: '800',
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFFFFF',
    lineHeight: 64,
  },
  scoreLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  scoreQualityLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 24,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    marginBottom: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  startSessionButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startSessionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    letterSpacing: 0.5,
  },
  vitalsGrid: {
    gap: 12,
    marginBottom: 32,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  vitalWidgetGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 12,
    paddingBottom: 10,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  vitalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  vitalLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
    marginLeft: 6,
  },
  vitalValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: 2,
  },
  vitalSubtext: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
    fontFamily: theme.typography.fontFamily.medium,
  },
  vitalBottomRow: {
    height: 16,
    marginTop: 4,
    justifyContent: 'center',
  },
  sparkLineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 16,
    gap: 3,
    marginTop: 4,
  },
  sparkBar: {
    width: 4,
    borderRadius: 2,
  },
  insightsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    color: '#FFFFFF',
  },
  insightBadgeCount: {
    backgroundColor: '#8B5CF6',
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: theme.typography.fontFamily.bold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  seeAllText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
  },
  insightCardCompact: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 16,
    width: 260,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: 6,
  },
  insightMessage: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.regular,
    lineHeight: 18,
    marginBottom: 12,
  },
  insightAction: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
  },
  quickActionsGrid: {
    gap: 12,
    marginBottom: 24,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionContent: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
  },
  analysisCardLarge: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  improvementContent: {
    padding: 20,
    borderRadius: 24,
  },
  improvementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    marginLeft: 4,
  },
  improvementStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 15,
    borderRadius: 20,
  },
  improvementStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  improvementStatValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
    marginBottom: 4,
  },
  improvementStatLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
    textTransform: 'uppercase',
  },
  improvementStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  miniChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
    paddingTop: 10,
  },
  miniChartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  miniChartBar: {
    width: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  miniChartLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: theme.typography.fontFamily.semibold,
  },
  analysisInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analysisIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analysisTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: theme.typography.fontFamily.bold,
  },
  analysisSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: theme.typography.fontFamily.regular,
    marginTop: 2,
  },
  tipCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tipGradient: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  tipContent: {
    flex: 1,
    marginLeft: 16,
  },
  tipLabel: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  achievementsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  achievementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementsTrophyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementsInfo: {
    flex: 1,
  },
  achievementsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  achievementsStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementStat: {
    alignItems: 'center',
  },
  achievementStatEmoji: {
    fontSize: 14,
    marginBottom: 2,
  },
  achievementStatValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  achievementStatLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '600',
  },
  achievementStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  closeSearchButton: {
    marginLeft: 16,
  },
  closeSearchText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchSuggestions: {
    marginTop: 24,
  },
  suggestionTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 16,
  },
  searchNoResults: {
    marginTop: 40,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#64748B',
    fontSize: 16,
  },
  atmosphereWidget: {
    padding: 16,
    borderRadius: 20,
    minWidth: 110,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  atmosphereValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 4,
  },
  atmosphereLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  aiFab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  aiFabGradient: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
});