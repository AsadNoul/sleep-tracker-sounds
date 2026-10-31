import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  StatusBar,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import notificationHistoryService from '../services/notificationHistoryService';
import { a11y } from '../utils/accessibility';
import {
  Moon,
  Clock,
  TrendingUp,
  Bell,
  Search,
  Waves,
  Trophy,
  Star,
  Zap,
  Activity,
  X,
  ChevronRight,
  Thermometer,
  Coffee,
  CheckCircle2,
  Book,
  Gauge,
  Volume2,
  Headphones,
  Lightbulb,
  HelpCircle,
  HeartPulse,
  Users,
  MoreVertical,
} from 'lucide-react-native';

import SleepPrintMark from '../components/SleepPrintMark';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { useSleep } from '../contexts/SleepContext';
import { getSleepQualityColor, getSleepScoreColor } from '../utils/sleepQualityColors';
import { useAuth } from '../contexts/AuthContext';
import { formatDuration, format12HourTime } from '../utils/dateFormatting';
import alarmService from '../services/alarmService';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import PushNotificationPrompt from '../components/PushNotificationPrompt';

// ============================================================================
// Nightprint — Home (redesign/ui-ux-v3)
// ============================================================================
// Rebuilt to match the design canvas's `Night-Home.dc.html` / `Day-Home.dc.html`
// (the "app" / "dayapp" pages — the approved final structure, not the
// `explore` page's early A/B/C options). Canvas layout matched directly:
//   - Greeting header (date + Fraunces "Good evening/afternoon, name") +
//     round avatar button
//   - "Sleep Mode / Day View" pill with warm-colors countdown copy
//   - Bedtime hero: giant Fraunces time + "in Xh Ym" countdown
//   - Full-width accent "Start Sleep" CTA
//   - "Last night" card: mini SleepPrintMark + score + duration/wake-ups
//   - 3 quick-action tiles (Sounds / Breathe / Routine)
// Bottom tab nav is untouched per instructions (App.tsx owns it).
//
// Sections below that have NO canvas equivalent (vitals grid, Control
// Center quick actions, Sleep Improvement weekly dashboard, daily tip,
// achievements) are kept — same data, same navigation — but restyled with
// the same card system as the canvas: theme.colors.card/cardBorder,
// theme.borderRadius.card, Fraunces for big numbers, DM Sans for body.
// ============================================================================

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { theme, isNight } = useAppTheme();
  const { user } = useAuth();
  const { getSleepStats, isLoading, sleepHistory, isTracking, getCurrentStreak, getGoodNightStreak, getSleepDebt, getReadinessScore, getSmartBedtime, loadSleepHistory } = useSleep();
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const { width } = useWindowDimensions();
  const s = useMemo(() => styles(theme), [theme]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextAlarm, setNextAlarm] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useFocusEffect(
    useCallback(() => {
      notificationHistoryService.getUnreadCount().then(count => setHasUnreadNotifications(count > 0));
    }, [])
  );
  const [searchQuery, setSearchQuery] = useState('');

  const sleepStats = useMemo(() => getSleepStats(), [sleepHistory]);
  const currentStreak = useMemo(() => getCurrentStreak(), [sleepHistory]);
  const goodNightStreak = useMemo(() => getGoodNightStreak(), [sleepHistory]);
  const sleepDebt = useMemo(() => getSleepDebt(), [sleepHistory]);
  const readinessScore = useMemo(() => getReadinessScore(), [sleepHistory]);

  const sleepTips = useMemo(() => ([
    'Try the 4-7-8 breathing technique to calm your nervous system before bed.',
    'Dim bright screens at least 60 minutes before sleep to improve melatonin release.',
    'Keep your bedroom cool and dark to support deeper sleep cycles.',
    'Avoid caffeine in the late afternoon to reduce night-time awakenings.',
    'A short wind-down routine helps your brain switch from alert mode to rest mode.',
    'Wake up at the same time daily to stabilize your circadian rhythm.',
  ]), []);

  const tipOfTheDay = useMemo(() => {
    const dayOfYear = Math.floor((Date.UTC(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate()) - Date.UTC(currentTime.getFullYear(), 0, 0)) / 86400000);
    const offset = Math.max(0, currentStreak);
    const index = (dayOfYear + offset) % sleepTips.length;
    return sleepTips[index];
  }, [currentTime, currentStreak, sleepTips]);

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
        let mins = st.getHours() * 60 + st.getMinutes();
        if (mins < 360) mins += 1440;
        return sum + mins;
      }, 0) / thisWeek.length
      : 0;

    const lastWeekAvgQuality = lastWeek.length > 0
      ? Math.round((lastWeek.reduce((sum, s) => sum + s.quality, 0) / lastWeek.length) * 10)
      : 0;
    const qualityChange = lastWeekAvgQuality > 0
      ? avgQuality - lastWeekAvgQuality
      : 0;

    let bedtimeStr = '--:--';
    if (avgBedtimeMs > 0) {
      let totalMins = Math.round(avgBedtimeMs);
      if (totalMins >= 1440) totalMins -= 1440;
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      bedtimeStr = `${h12}:${m.toString().padStart(2, '0')} ${ampm} `;
    }

    const durationH = Math.floor(avgDuration / 60);
    const durationM = avgDuration % 60;
    const durationStr = avgDuration > 0 ? `${durationH}h ${durationM.toString().padStart(2, '0')} m` : '0h 00m';

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
      { label: 'Health Tracking', screen: 'HealthTracking', keywords: ['health', 'medication', 'meal', 'exercise', 'log'] },
      { label: 'Partner Mode', screen: 'PartnerMode', keywords: ['partner', 'couple', 'compare', 'share sleep'] },
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
    const lastSession = sleepHistory[0];

    if (lastSession) {
      const sessionTime = lastSession.endTime || lastSession.startTime;
      const hoursSinceSession = (new Date().getTime() - new Date(sessionTime).getTime()) / (1000 * 60 * 60);

      if (hoursSinceSession > 24) {
        return 0;
      }
      if (lastSession.sleepScore != null) return lastSession.sleepScore;
    }

    if (sleepStats.totalSessions === 0) return 0;
    const qualityScore = sleepStats.averageQuality * 10;
    const idealDuration = 480;
    const durationScore = Math.min(100, (sleepStats.averageDuration / idealDuration) * 100);
    return Math.round((qualityScore * 0.6) + (durationScore * 0.4));
  }, [sleepStats, sleepHistory]);

  const scoreQuality = useMemo(() => {
    if (isTracking) {
      return { color: theme.colors.warning, label: 'Tracking...', emoji: '⏱️' };
    }
    return getSleepScoreColor(displayMode === 'daytime' ? readinessScore : sleepScore);
  }, [sleepScore, readinessScore, displayMode, isTracking, theme]);

  const lastNightQuality = useMemo(
    () => getSleepQualityColor(sleepStats.lastNightQuality),
    [sleepStats.lastNightQuality]
  );

  const lastNightWakeups = useMemo(() => {
    const lastSession = sleepHistory[0];
    if (!lastSession || !lastSession.sleepStages) return 0;
    return lastSession.sleepStages.filter((seg: any) => seg.stage === 'awake').length;
  }, [sleepHistory]);

  // Smart bedtime for tonight's countdown — same `getSmartBedtime` the app
  // already used for its recommendation logic, now surfaced as the hero.
  const tonightBedtime = useMemo(() => {
    const wake = new Date();
    wake.setHours(7, 0, 0, 0);
    if (wake.getTime() < Date.now()) wake.setDate(wake.getDate() + 1);
    return getSmartBedtime(wake);
  }, [getSmartBedtime, currentTime]);

  const countdownToBedtime = useMemo(() => {
    const diffMs = tonightBedtime.getTime() - currentTime.getTime();
    if (diffMs <= 0) return null;
    const totalMinutes = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h <= 0) return `in ${m}m`;
    return `in ${h}h ${m}m`;
  }, [tonightBedtime, currentTime]);

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

  const greeting = displayMode === 'morning' ? 'Good morning' : displayMode === 'daytime' ? 'Good afternoon' : 'Good evening';
  const userFirstName = user?.email?.split('@')[0] || 'Dreamer';
  const isVip = isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email) &&
    user?.role !== 'admin' && user?.email !== 'admin@naulx.com';

  if (isLoading) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />
        <View style={[s.scrollContent, { paddingTop: insets.top + 20 }]}>
          <View style={s.loadingBlock} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: bottomMargin + 24 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        {/* Header — date + Fraunces greeting + round avatar (canvas: Night-Home / Day-Home) */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.dateText}>
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <View style={s.greetingRow}>
              <Text style={s.greeting} numberOfLines={1}>
                {greeting}, {userFirstName}
              </Text>
              {isVip && (
                <View style={s.vipBadge}>
                  <Star size={10} color={theme.colors.premiumBadgeText} fill={theme.colors.premiumBadgeText} />
                  <Text style={s.vipBadgeText}>VIP</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={s.bellButton}
            {...a11y.navigation('Notifications', 'Opens your notification history')}
            activeOpacity={0.8}
          >
            <Bell size={20} color={theme.colors.textPrimary} />
            {hasUnreadNotifications && <View style={[s.notifDot, { backgroundColor: theme.colors.error }]} />}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsSidebarVisible(true)}
            style={s.bellButton}
            {...a11y.button('Menu', 'Opens sidebar menu with tools and support options')}
            activeOpacity={0.8}
          >
            <MoreVertical size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Mode pill — "Sleep Mode · warm colors until 6:04 AM" / "Day View · Sleep Mode starts ..." */}
        <View style={s.modePill}>
          {isNight ? (
            <Moon size={15} color={theme.colors.accent} strokeWidth={2.2} />
          ) : (
            <Thermometer size={15} color={theme.colors.accent} strokeWidth={2.2} />
          )}
          <Text style={s.modePillText}>
            <Text style={s.modePillBold}>{isNight ? 'Sleep Mode' : 'Day View'}</Text>
            {isNight ? ' · warm colors on' : ' · full insights on'}
          </Text>
        </View>

        {/* Bedtime hero — giant Fraunces time + countdown (canvas hero block) */}
        <View style={s.heroBlock}>
          <View pointerEvents="none" style={s.heroGlow} />
          <Text style={s.heroLabel}>
            {isTracking ? "TONIGHT'S SLEEP" : 'TONIGHT\'S BEDTIME'}
          </Text>
          <View style={s.heroTimeRow}>
            <Text style={s.heroTime}>
              {isTracking ? format12HourTime(tonightBedtime).split(' ')[0] : format12HourTime(tonightBedtime).split(' ')[0]}
            </Text>
            <Text style={s.heroAmPm}>{format12HourTime(tonightBedtime).split(' ')[1]}</Text>
          </View>
          <Text style={s.heroSubtext}>
            {isTracking
              ? 'Sleep in progress'
              : countdownToBedtime
                ? `${countdownToBedtime} · wake at 7:00 AM`
                : 'wake at 7:00 AM'}
          </Text>
        </View>

        {/* Start Sleep / End Sleep / View Analysis CTA */}
        <TouchableOpacity
          style={[s.ctaButton, isTracking && s.ctaButtonTracking]}
          onPress={() => navigation.navigate('SleepSession')}
          activeOpacity={0.9}
        >
          {isTracking ? (
            <Moon size={20} color={theme.colors.ctaText} strokeWidth={2.4} />
          ) : (
            <Waves size={20} color={theme.colors.ctaText} strokeWidth={2.4} />
          )}
          <Text style={s.ctaButtonText}>
            {isTracking ? 'End Sleep' : sleepScore > 0 ? 'Start Sleep' : 'Start Sleep'}
          </Text>
        </TouchableOpacity>

        {/* Last night summary card — mini SleepPrintMark + score (canvas's "Last night" row) */}
        <TouchableOpacity
          style={s.lastNightCard}
          onPress={() => navigation.navigate('SleepAnalysis')}
          activeOpacity={0.85}
        >
          <View style={s.lastNightMark}>
            {sleepScore > 0 ? (
              <SleepPrintMark size={72} colors={theme.sleepPrintMark} />
            ) : (
              <View style={s.lastNightMarkEmpty}>
                <Moon size={24} color={theme.colors.textTertiary} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.lastNightLabel}>Last night</Text>
            <Text style={s.lastNightValue}>
              {sleepScore > 0 ? `${sleepScore} · ${lastNightQuality.label || 'Logged'}` : 'No data yet'}
            </Text>
            <Text style={s.lastNightSubtext}>
              {sleepScore > 0
                ? `${formatDuration(sleepStats.lastNightDuration)} asleep · ${lastNightWakeups} wake-up${lastNightWakeups === 1 ? '' : 's'}`
                : 'Track a session to see your Sleep Print'}
            </Text>
          </View>
          <ChevronRight size={20} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {/* 3 quick-action tiles — Sounds / Breathe / Routine (canvas grid) */}
        <View style={s.tileGrid}>
          <TouchableOpacity
            style={s.tile}
            onPress={() => navigation.navigate('Sounds')}
            activeOpacity={0.85}
          >
            <View style={s.tileIcon}>
              <Volume2 size={20} color={theme.colors.accent} strokeWidth={2} />
            </View>
            <View>
              <Text style={s.tileTitle}>Sounds</Text>
              <Text style={s.tileSubtext}>Sleep music</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.tile}
            onPress={() => navigation.navigate('BedtimeRoutine')}
            activeOpacity={0.85}
          >
            <View style={s.tileIcon}>
              <Waves size={20} color={theme.colors.accent} strokeWidth={2} />
            </View>
            <View>
              <Text style={s.tileTitle}>Breathe</Text>
              <Text style={s.tileSubtext}>4-7-8 · 5 min</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.tile}
            onPress={() => navigation.navigate('BedtimeRoutine')}
            activeOpacity={0.85}
          >
            <View style={s.tileIcon}>
              <CheckCircle2 size={20} color={theme.colors.accent} strokeWidth={2} />
            </View>
            <View>
              <Text style={s.tileTitle}>Routine</Text>
              <Text style={s.tileSubtext}>3 steps</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ───────────────────────────────────────────────────────────────
            Sections below have no canvas Home equivalent — restyled in the
            same design system (theme.colors.card/cardBorder, borderRadius.card,
            Fraunces headings, DM Sans body) rather than removed.
           ─────────────────────────────────────────────────────────────── */}

        {/* Vitals row — Readiness / Sleep Debt / Next Alarm / Streak */}
        <Text style={s.sectionTitle}>Today's vitals</Text>
        <View style={s.vitalsGrid}>
          <View style={s.vitalsRow}>
            <View style={[s.vitalCard, { marginRight: 12 }]}>
              <View style={s.vitalIconRow}>
                <Zap size={14} color={theme.colors.success} strokeWidth={2.2} />
                <Text style={s.vitalLabel}>Readiness</Text>
              </View>
              <Text style={s.vitalValue}>{readinessScore}%</Text>
              <View style={s.vitalBarTrack}>
                <View style={[s.vitalBarFill, { width: `${readinessScore}%` as any, backgroundColor: theme.colors.success }]} />
              </View>
            </View>

            <View style={s.vitalCard}>
              <View style={s.vitalIconRow}>
                <Activity size={14} color={sleepDebt > 0 ? theme.colors.error : theme.colors.success} strokeWidth={2.2} />
                <Text style={s.vitalLabel}>Sleep Debt</Text>
              </View>
              <Text style={s.vitalValue}>{sleepDebt > 0 ? '-' : '+'}{Math.abs(sleepDebt)}h</Text>
              <Text style={s.vitalSubtext}>{sleepDebt > 0 ? 'Recovery needed' : 'Well rested'}</Text>
            </View>
          </View>

          <View style={s.vitalsRow}>
            <TouchableOpacity
              style={[s.vitalCard, { marginRight: 12 }]}
              onPress={() => navigation.navigate('Alarms')}
              activeOpacity={0.85}
            >
              <View style={s.vitalIconRow}>
                <Bell size={14} color={theme.colors.accent} strokeWidth={2.2} />
                <Text style={s.vitalLabel}>Next Alarm</Text>
              </View>
              <Text style={s.vitalValue}>{nextAlarm ? nextAlarm.time : '--:--'}</Text>
              <Text style={s.vitalSubtext}>{nextAlarm ? (nextAlarm.name || 'Wake up') : 'Not set'}</Text>
            </TouchableOpacity>

            <View style={s.vitalCard}>
              <View style={s.vitalIconRow}>
                <Trophy size={14} color={theme.colors.warning} strokeWidth={2.2} />
                <Text style={s.vitalLabel}>Streak</Text>
              </View>
              <Text style={s.vitalValue}>{currentStreak} Days</Text>
              <Text style={s.vitalSubtext}>{currentStreak >= 7 ? 'On fire' : currentStreak >= 3 ? 'Building' : currentStreak > 0 ? 'Started' : 'Track now'}</Text>
            </View>
          </View>
        </View>

        {/* Sleep Improvement — weekly performance dashboard */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Sleep Improvement</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SleepAnalysis')}>
            <Text style={s.seeAllText}>Detailed view</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.improvementCard}
          onPress={() => navigation.navigate('SleepAnalysis')}
          activeOpacity={0.9}
        >
          <View style={s.improvementHeader}>
            <View style={s.improvementIconCircle}>
              <TrendingUp size={22} color={theme.colors.accent} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.improvementTitle}>Weekly Performance</Text>
              <Text style={s.improvementSubtitle}>
                {weeklyStats.sessionCount === 0
                  ? 'No data this week'
                  : weeklyStats.qualityChange !== 0
                    ? `Quality is ${weeklyStats.qualityChange > 0 ? 'up' : 'down'} ${Math.abs(weeklyStats.qualityChange)}% vs last week`
                    : `${weeklyStats.sessionCount} session${weeklyStats.sessionCount === 1 ? '' : 's'} this week`}
              </Text>
            </View>
            {weeklyStats.qualityChange !== 0 && (
              <View style={s.trendBadge}>
                <TrendingUp size={11} color={weeklyStats.qualityChange > 0 ? theme.colors.success : theme.colors.error} />
                <Text style={[s.trendText, { color: weeklyStats.qualityChange > 0 ? theme.colors.success : theme.colors.error }]}>
                  {weeklyStats.qualityChange > 0 ? '+' : ''}{weeklyStats.qualityChange}%
                </Text>
              </View>
            )}
          </View>

          <View style={s.improvementStatsRow}>
            <View style={s.improvementStatItem}>
              <Text style={s.improvementStatValue}>{weeklyStats.avgDuration}</Text>
              <Text style={s.improvementStatLabel}>Avg Duration</Text>
            </View>
            <View style={s.improvementStatDivider} />
            <View style={s.improvementStatItem}>
              <Text style={s.improvementStatValue}>{weeklyStats.avgQuality}%</Text>
              <Text style={s.improvementStatLabel}>Avg Quality</Text>
            </View>
            <View style={s.improvementStatDivider} />
            <View style={s.improvementStatItem}>
              <Text style={s.improvementStatValue}>{weeklyStats.bedtime}</Text>
              <Text style={s.improvementStatLabel}>Bedtime</Text>
            </View>
          </View>

          <View style={s.miniChartContainer}>
            {weeklyStats.chartData.map((h, i) => {
              const now = new Date();
              const dayIndex = (now.getDay() + 7 - (6 - i)) % 7;
              const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
              const barHeight = Math.max(3, (h / 100) * 26);
              return (
                <View key={i} style={s.miniChartColumn}>
                  <View style={[s.miniChartBar, { height: barHeight, backgroundColor: i === 6 ? theme.colors.accent : h > 0 ? theme.colors.accentLight : theme.colors.disabled }]} />
                  <Text style={s.miniChartLabel}>{labels[dayIndex]}</Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>

        {/* Sleep Tip of the Day */}
        <TouchableOpacity style={s.tipCard} onPress={() => navigation.navigate('BedtimeRoutine')} activeOpacity={0.9}>
          <View pointerEvents="none" style={s.tipGlow} />
          <View style={s.tipIconCircle}>
            <Lightbulb size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
          </View>
          <View style={s.tipContent}>
            <View style={s.tipTagRow}>
              <View style={s.tipTag}>
                <Text style={s.tipTagText}>DAILY TIP</Text>
              </View>
            </View>
            <Text style={s.tipText}>{tipOfTheDay}</Text>
            <Text style={s.tipActionText}>Tap to build your routine →</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Sidebar/Menu Modal */}
      <Modal
        visible={isSidebarVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsSidebarVisible(false)}
      >
        <View style={s.sidebarOverlay}>
          <View style={s.sidebarContainer}>
            <View style={[s.sidebarHeader, { paddingTop: insets.top + 20 }]}>
              <Text style={s.sidebarTitle}>Tools & Support</Text>
              <TouchableOpacity onPress={() => {
                setIsSidebarVisible(false);
                setSearchQuery('');
              }}>
                <X size={24} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={s.sidebarSearchContainer}>
              <View style={s.sidebarSearchInputWrapper}>
                <Search size={18} color={theme.colors.textTertiary} />
                <TextInput
                  style={s.sidebarSearchInput}
                  placeholder="Search tools, sounds..."
                  placeholderTextColor={theme.colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView style={s.sidebarContent} showsVerticalScrollIndicator={false}>
              {searchQuery.length > 0 ? (
                <View style={{ marginBottom: 20 }}>
                  <Text style={s.sidebarSectionTitle}>Search Results</Text>
                  {searchResults.length > 0 ? (
                    searchResults.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={s.sidebarItem}
                        onPress={() => {
                          setIsSidebarVisible(false);
                          setSearchQuery('');
                          navigation.navigate(item.screen);
                        }}
                      >
                        <View style={s.sidebarIconContainer}>
                          <Zap size={20} color={theme.colors.accent} />
                        </View>
                        <Text style={s.sidebarItemText}>{item.label}</Text>
                        <ChevronRight size={16} color={theme.colors.textTertiary} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={s.sidebarNoResults}>No matches found</Text>
                  )}
                  <View style={s.sidebarDivider} />
                </View>
              ) : null}

              <Text style={s.sidebarSectionTitle}>Wellness & Analysis</Text>
              {[
                { label: 'Bedtime Routine', icon: <CheckCircle2 size={20} color={theme.colors.accent} />, screen: 'BedtimeRoutine' },
                { label: 'Dream Journal', icon: <Book size={20} color={theme.colors.accent} />, screen: 'DreamJournal' },
                { label: 'Room Environment', icon: <Gauge size={20} color={theme.colors.accent} />, screen: 'RoomEnvironment' },
                { label: 'Sleep Stages', icon: <Activity size={20} color={theme.colors.accent} />, screen: 'SleepStages' },
                { label: 'Snore Detection', icon: <Volume2 size={20} color={theme.colors.accent} />, screen: 'SnoreDetection' },
                { label: 'Sleep Interruptions', icon: <Clock size={20} color={theme.colors.accent} />, screen: 'SleepInterruptions' },
                { label: 'Relaxation Library', icon: <Headphones size={20} color={theme.colors.accent} />, screen: 'RelaxationLibrary' },
                { label: 'Caffeine Calculator', icon: <Coffee size={20} color={theme.colors.accent} />, screen: 'CaffeineCalculator' },
                { label: 'Health Tracking', icon: <HeartPulse size={20} color={theme.colors.accent} />, screen: 'HealthTracking' },
                { label: 'Partner Mode', icon: <Users size={20} color={theme.colors.accent} />, screen: 'PartnerMode' },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={s.sidebarItem}
                  onPress={() => {
                    setIsSidebarVisible(false);
                    navigation.navigate(item.screen);
                  }}
                >
                  <View style={s.sidebarIconContainer}>{item.icon}</View>
                  <Text style={s.sidebarItemText}>{item.label}</Text>
                  <ChevronRight size={16} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}

              <View style={s.sidebarDivider} />

              <Text style={s.sidebarSectionTitle}>Support & Feedback</Text>
              {[
                { label: 'Request a Feature', icon: <Lightbulb size={20} color={theme.colors.accent} />, screen: 'FeatureRequest' },
                { label: 'Help & Support', icon: <HelpCircle size={20} color={theme.colors.accent} />, screen: 'HelpSupport' },
              ].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={s.sidebarItem}
                  onPress={() => {
                    setIsSidebarVisible(false);
                    navigation.navigate(item.screen);
                  }}
                >
                  <View style={s.sidebarIconContainer}>{item.icon}</View>
                  <Text style={s.sidebarItemText}>{item.label}</Text>
                  <ChevronRight size={16} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}

              <View style={{ height: insets.bottom + 40 }} />
            </ScrollView>
          </View>
          <TouchableOpacity
            style={s.sidebarCloseArea}
            activeOpacity={1}
            onPress={() => setIsSidebarVisible(false)}
          />
        </View>
      </Modal>

      {/* Push Notification Prompt - shown on first visit to home */}
      <PushNotificationPrompt
        userId={user?.id !== 'guest' ? user?.id : undefined}
        trigger="first_session"
      />
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingBlock: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginBottom: 2,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    letterSpacing: -0.4,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: theme.colors.premiumBadgeBackground,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
  },
  vipBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.premiumBadgeText,
    marginLeft: 3,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Mode pill
  modePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 16,
    columnGap: 8,
  },
  modePillText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modePillBold: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
  },

  // Bedtime hero
  heroBlock: {
    position: 'relative',
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16,
  },
  heroGlow: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: -10,
    bottom: -14,
    borderRadius: 999,
    backgroundColor: theme.colors.accentLight,
    opacity: 0.6,
  },
  heroLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.textTertiary,
    marginBottom: 6,
  },
  heroTimeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    columnGap: 6,
  },
  heroTime: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2,
    color: theme.colors.textPrimary,
  },
  heroAmPm: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 20,
    color: theme.colors.textSecondary,
  },
  heroSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },

  // CTA
  ctaButton: {
    height: 60,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.ctaBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    marginBottom: 16,
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
  ctaButtonTracking: {
    backgroundColor: theme.colors.error,
  },
  ctaButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 17,
    color: theme.colors.ctaText,
  },

  // Last night card
  lastNightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 14,
    marginBottom: 16,
    columnGap: 14,
  },
  lastNightMark: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastNightMarkEmpty: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastNightLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  lastNightValue: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 19,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  lastNightSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },

  // 3 quick-action tiles
  tileGrid: {
    flexDirection: 'row',
    marginBottom: 24,
    columnGap: 12,
  },
  tile: {
    flex: 1,
    height: 108,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 14,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  tileSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },

  // Section headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 19,
    color: theme.colors.textPrimary,
    marginBottom: 14,
  },
  seeAllText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 14,
    color: theme.colors.accent,
  },

  // Vitals
  vitalsGrid: {
    marginBottom: 24,
  },
  vitalsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
    padding: 14,
  },
  vitalIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    columnGap: 6,
  },
  vitalLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  vitalValue: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  vitalSubtext: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  vitalBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.disabled,
    overflow: 'hidden',
  },
  vitalBarFill: {
    height: 4,
    borderRadius: 2,
  },

  // Sleep Improvement
  improvementCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 14,
    marginBottom: 20,
  },
  improvementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  improvementIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  improvementTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  improvementSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    columnGap: 4,
  },
  trendText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 12,
  },
  improvementStatsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: theme.borderRadius.lg,
    padding: 10,
    marginBottom: 12,
  },
  improvementStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  improvementStatValue: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  improvementStatLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 9,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
  },
  improvementStatDivider: {
    width: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  miniChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 44,
  },
  miniChartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  miniChartBar: {
    width: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  miniChartLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 10,
    color: theme.colors.textTertiary,
  },

  // Tip card
  tipCard: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 18,
    marginBottom: 24,
    columnGap: 14,
  },
  tipGlow: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: theme.colors.accentLight,
  },
  tipIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.colors.navActiveBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTagRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  tipTag: {
    backgroundColor: theme.colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tipTagText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: theme.colors.accent,
  },
  tipText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  tipActionText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
    color: theme.colors.accent,
  },

  // Achievements
  achievementsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 24,
    columnGap: 16,
  },
  achievementsTrophyCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementsTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  achievementsStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementStat: {
    alignItems: 'center',
  },
  achievementStatValue: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  achievementStatLabel: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 9,
    color: theme.colors.textTertiary,
  },
  achievementStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.cardBorder,
    marginHorizontal: 12,
  },

  // Sidebar
  sidebarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
  },
  sidebarCloseArea: {
    flex: 1,
  },
  sidebarContainer: {
    width: '75%',
    maxWidth: 320,
    backgroundColor: theme.colors.backgroundSecondary,
    height: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: { elevation: 20 },
    }),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  sidebarTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 20,
    color: theme.colors.textPrimary,
  },
  sidebarContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sidebarSectionTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
    columnGap: 12,
  },
  sidebarIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarItemText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: 16,
    marginHorizontal: 4,
  },
  sidebarSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  sidebarSearchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    columnGap: 10,
  },
  sidebarSearchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  sidebarNoResults: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
