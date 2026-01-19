import { useAppTheme } from '../hooks/useAppTheme';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import React, { useState, useMemo, memo, useEffect } from 'react';
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
} from 'react-native';
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
  AlertCircle
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import CircularProgress from '../components/CircularProgress';
import Svg, { Rect, G, Line, Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

type TimeFrame = 'week' | 'month' | '3months' | '6months';

/**
 * Enhanced Sleep Trend Area Chart
 */
const SleepTrendAreaChart = memo(({ data, theme, isDark }: any) => {
  const maxValue = Math.max(...data.map((d: any) => d.value), 100);
  const chartHeight = 150;
  const chartWidth = width - 60;
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  // Create path for the line and area
  const linePath = data.map((d: any, i: number) => {
    const x = i * pointSpacing;
    const y = chartHeight - (d.value / maxValue) * chartHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <View style={{ marginVertical: 20 }}>
      <Svg height={chartHeight + 40} width={chartWidth}>
        <Defs>
          <SvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.4" />
            <Stop offset="1" stopColor="#8B5CF6" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <G>
          {/* Area fill */}
          <Path
            d={areaPath}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <Path
            d={linePath}
            stroke="#8B5CF6"
            strokeWidth="3"
            fill="none"
          />

          {/* Data points */}
          {data.map((d: any, i: number) => {
            const x = i * pointSpacing;
            const y = chartHeight - (d.value / maxValue) * chartHeight;
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r="5"
                fill="#8B5CF6"
                stroke="#fff"
                strokeWidth="2"
              />
            );
          })}
        </G>
      </Svg>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        {data.map((d: any, i: number) => (
          <Text key={i} style={{ color: theme.colors.textSecondary, fontSize: 9, fontWeight: '700', fontFamily: theme.typography.fontFamily.semibold }}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
});

/**
 * Sleep Stages Heatmap
 */
const SleepStagesHeatmap = memo(({ data, theme, isDark }: any) => {
  const cellSize = (width - 80) / 7;

  const stageColors: any = {
    deep: '#4F46E5',
    rem: '#8B5CF6',
    light: '#6366F1',
    awake: '#EF4444',
    none: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  };

  return (
    <View style={{ marginVertical: 20 }}>
      {data.map((week: any, weekIndex: number) => (
        <View key={weekIndex} style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
          {week.map((day: any, dayIndex: number) => (
            <View
              key={dayIndex}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: stageColors[day.dominantStage || 'none'],
                borderRadius: 8,
              }}
            />
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 }}>
        {['Deep', 'Light', 'REM'].map((stage, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: stageColors[stage.toLowerCase()] }} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 10, fontWeight: '700', fontFamily: theme.typography.fontFamily.semibold }}>
              {stage}
            </Text>
          </View>
        ))}
      </View>

      {/* Day labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <Text key={i} style={{ color: theme.colors.textSecondary, fontSize: 10, fontWeight: '700', fontFamily: theme.typography.fontFamily.semibold, width: cellSize, textAlign: 'center' }}>
            {day}
          </Text>
        ))}
      </View>
    </View>
  );
});

/**
 * Premium Locked Section
 */
const PremiumLockedSection = memo(({ children, isPremium, title, icon: Icon, theme, isDark }: any) => {
  if (isPremium) return children;

  return (
    <View style={styles(theme, isDark).premiumSectionWrapper}>
      <View style={styles(theme, isDark).sectionHeader}>
        <View style={styles(theme, isDark).titleRow}>
          <Icon size={18} color="#8B5CF6" />
          <Text style={styles(theme, isDark).sectionTitle}>{title}</Text>
        </View>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles(theme, isDark).proBadge}
        >
          <Lock size={10} color="#FFF" style={{ marginRight: 4 }} />
          <Text style={styles(theme, isDark).proBadgeText}>PRO</Text>
        </LinearGradient>
      </View>

      <View style={styles(theme, isDark).lockedModule}>
        <BlurView intensity={Platform.OS === 'ios' ? 40 : 80} tint="dark" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(15, 23, 42, 0.4)', 'rgba(2, 6, 23, 0.95)']}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>

        <View style={styles(theme, isDark).lockContent}>
          <View style={styles(theme, isDark).lockCircle}>
            <Sparkles size={24} color="#8B5CF6" />
          </View>
          <Text style={styles(theme, isDark).lockTitle}>Unlock Premium Analytics</Text>
          <Text style={styles(theme, isDark).lockSubtitle}>Advanced trends, insights, and comprehensive reports.</Text>

          <TouchableOpacity
            style={styles(theme, isDark).unlockButton}
            activeOpacity={0.8}
            onPress={() => { }}
          >
            <Text style={styles(theme, isDark).unlockButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default function SleepAnalysisScreen({ hideHeader = false, isSubcomponent = false }: any) {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { sleepHistory, getReadinessScore, getSleepDebt, getSleepStats, loadSleepHistory } = useSleep();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeFrame>('week');

  const isPremium = useMemo(() => isPremiumActive(user?.subscription_status, user?.subscription_end_date), [user]);
  const readinessScore = useMemo(() => getReadinessScore(), [getReadinessScore, sleepHistory]);
  const sleepDebt = useMemo(() => getSleepDebt(), [getSleepDebt, sleepHistory]);
  const stats = useMemo(() => getSleepStats(), [getSleepStats, sleepHistory]);

  // Load sleep history on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadSleepHistory();
      setIsLoading(false);
    };
    loadData();
  }, [user?.id]);

  useEffect(() => {
    console.log('🔄 SleepAnalysisScreen: sleepHistory updated with', sleepHistory.length, 'records');
  }, [sleepHistory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSleepHistory();
    setRefreshing(false);
  };

  // Get data based on selected timeframe
  const timeframeData = useMemo(() => {
    const days = selectedTimeframe === 'week' ? 7 : selectedTimeframe === 'month' ? 30 : selectedTimeframe === '3months' ? 90 : 180;
    return sleepHistory.slice(0, days);
  }, [sleepHistory, selectedTimeframe]);

  // Latest session
  const latestSession = useMemo(() => {
    const session = sleepHistory.length > 0 ? sleepHistory[0] : null;
    console.log('📊 Latest session:', session ? new Date(session.endTime || session.startTime).toLocaleDateString() : 'none');
    return session;
  }, [sleepHistory]);

  // Calculate average sleep score for timeframe
  const avgSleepScore = useMemo(() => {
    if (timeframeData.length === 0) return 0;
    const sum = timeframeData.reduce((acc, session) => acc + (session.sleepScore || session.quality * 10), 0);
    return Math.round(sum / timeframeData.length);
  }, [timeframeData]);

  // Calculate trend percentage
  const trendPercentage = useMemo(() => {
    if (timeframeData.length < 2) return 0;
    const recent = timeframeData.slice(0, Math.floor(timeframeData.length / 2));
    const older = timeframeData.slice(Math.floor(timeframeData.length / 2));

    const recentAvg = recent.reduce((acc, s) => acc + (s.sleepScore || s.quality * 10), 0) / recent.length;
    const olderAvg = older.reduce((acc, s) => acc + (s.sleepScore || s.quality * 10), 0) / older.length;

    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
  }, [timeframeData]);

  // Sleep trend graph data
  const trendGraphData = useMemo(() => {
    const dataPoints = selectedTimeframe === 'week' ? 7 : selectedTimeframe === 'month' ? 4 : selectedTimeframe === '3months' ? 12 : 6;
    const sessions = timeframeData.slice(0, dataPoints).reverse();

    return sessions.map((session, i) => {
      const date = new Date(session.endTime || session.startTime);
      return {
        label: selectedTimeframe === 'week'
          ? date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1)
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: session.sleepScore || session.quality * 10
      };
    });
  }, [timeframeData, selectedTimeframe]);

  // Total sleep time
  const totalSleepTime = useMemo(() => {
    if (!latestSession) return '—';
    const hours = Math.floor(latestSession.duration / 60);
    const minutes = latestSession.duration % 60;
    return `${hours}h ${minutes}m`;
  }, [latestSession]);

  // Deep sleep time
  const deepSleepTime = useMemo(() => {
    if (!latestSession?.sleepStages) return '—';
    const deepMinutes = latestSession.sleepStages
      .filter((s: any) => s.stage === 'deep')
      .reduce((acc: number, s: any) => {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        return acc + (end - start) / 60000;
      }, 0);
    const hours = Math.floor(deepMinutes / 60);
    const minutes = Math.round(deepMinutes % 60);
    return `${hours}h ${minutes}m`;
  }, [latestSession]);

  // AI Insights
  const aiInsights = useMemo(() => {
    if (!latestSession) return { text: 'Start tracking to get personalized insights', tags: [] };

    const insights: string[] = [];
    const tags: string[] = [];

    const deepPct = latestSession.sleepStages?.filter((s: any) => s.stage === 'deep').length || 0;

    if (latestSession.duration >= 420) {
      insights.push(`You tend to get ${Math.round(latestSession.duration - 420)} min more deep sleep on days when you exercise before 6 PM.`);
      tags.push('#Exercise');
    }

    if (deepPct > 2) {
      tags.push('#Routine');
    }

    return {
      text: insights[0] || 'Keep up your consistent sleep routine for optimal rest.',
      tags
    };
  }, [latestSession]);

  // Best and worst nights
  const bestWorstNights = useMemo(() => {
    if (timeframeData.length === 0) return { best: null, worst: null };

    const sorted = [...timeframeData].sort((a, b) =>
      (b.sleepScore || b.quality * 10) - (a.sleepScore || a.quality * 10)
    );

    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1]
    };
  }, [timeframeData]);

  // Sleep debt visualization
  const sleepDebtData = useMemo(() => {
    const ideal = 8 * 60; // 8 hours in minutes
    const actual = timeframeData.reduce((acc, s) => acc + s.duration, 0) / timeframeData.length;
    const deficit = ideal - actual;
    const accumulated = deficit * 7; // 7 days

    return {
      deficit: Math.round(deficit),
      accumulated: Math.round(accumulated),
      percentage: Math.min(100, Math.max(0, (actual / ideal) * 100))
    };
  }, [timeframeData]);

  // Sleep stages heatmap
  const sleepStagesHeatmap = useMemo(() => {
    const weeks = 4;
    const data = [];

    for (let w = 0; w < weeks; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const index = w * 7 + d;
        const session = sleepHistory[index];

        if (session?.sleepStages) {
          const stageCounts = session.sleepStages.reduce((acc: any, s: any) => {
            acc[s.stage] = (acc[s.stage] || 0) + 1;
            return acc;
          }, {});

          const dominant = Object.entries(stageCounts).sort((a: any, b: any) => b[1] - a[1])[0];
          week.push({ dominantStage: dominant?.[0] });
        } else {
          week.push({ dominantStage: 'none' });
        }
      }
      data.push(week);
    }

    return data;
  }, [sleepHistory]);

  // Consistency score
  const consistencyData = useMemo(() => {
    if (timeframeData.length < 3) return { score: 0, bedtime: '—', wakeTime: '—' };

    const bedtimes = timeframeData.map(s => new Date(s.startTime).getHours() * 60 + new Date(s.startTime).getMinutes());
    const wakeTimes = timeframeData.map(s => new Date(s.endTime || s.startTime).getHours() * 60 + new Date(s.endTime || s.startTime).getMinutes());

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const avgWakeTime = wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length;

    const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
    const stdDev = Math.sqrt(variance);
    const score = Math.max(0, 100 - (stdDev / 2));

    const bedtimeHour = Math.floor(avgBedtime / 60);
    const bedtimeMin = Math.round(avgBedtime % 60);
    const wakeHour = Math.floor(avgWakeTime / 60);
    const wakeMin = Math.round(avgWakeTime % 60);

    return {
      score: Math.round(score),
      bedtime: `${bedtimeHour % 12 || 12}:${bedtimeMin.toString().padStart(2, '0')} ${bedtimeHour >= 12 ? 'PM' : 'AM'}`,
      wakeTime: `${wakeHour % 12 || 12}:${wakeMin.toString().padStart(2, '0')} ${wakeHour >= 12 ? 'PM' : 'AM'}`
    };
  }, [timeframeData]);

  return (
    <View style={[styles(theme, isDark).container, isSubcomponent && { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" />

      {!hideHeader && !isSubcomponent && (
        <View style={[styles(theme, isDark).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles(theme, isDark).backButton}>
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme, isDark).headerTitle}>Sleep Trends</Text>
          <View style={styles(theme, isDark).headerPlaceholder} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.textPrimary}
            colors={['#8B5CF6']}
          />
        }
        contentContainerStyle={[
          styles(theme, isDark).scrollContent,
          { paddingBottom: insets.bottom + 100 },
          isSubcomponent && { paddingTop: 20 }
        ]}
      >
        {isLoading && sleepHistory.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
            <Activity size={40} color="#8B5CF6" />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 20, fontSize: 14, fontFamily: theme.typography.fontFamily.medium }}>Loading sleep data...</Text>
          </View>
        ) : (
          <>
            {/* Timeframe Tabs */}
            <View style={styles(theme, isDark).timeframeTabs}>
              {(['week', 'month', '3months', '6months'] as TimeFrame[]).map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={[
                    styles(theme, isDark).tab,
                    selectedTimeframe === tf && styles(theme, isDark).activeTab
                  ]}
                  onPress={() => setSelectedTimeframe(tf)}
                >
                  <Text style={[
                    styles(theme, isDark).tabText,
                    selectedTimeframe === tf && styles(theme, isDark).activeTabText
                  ]}>
                    {tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : tf === '3months' ? '3 Months' : '6 Months'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Sleep Score Trend */}
            <View style={styles(theme, isDark).section}>
              <Text style={styles(theme, isDark).sectionLabel}>Sleep Score Trend</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
                <Text style={styles(theme, isDark).scoreValue}>{avgSleepScore}</Text>
                <Text style={styles(theme, isDark).avgLabel}>avg</Text>
                {trendPercentage !== 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {trendPercentage > 0 ? <TrendingUp size={14} color="#10B981" /> : <TrendingDown size={14} color="#EF4444" />}
                    <Text style={{ color: trendPercentage > 0 ? '#10B981' : '#EF4444', fontSize: 12, fontWeight: '600', fontFamily: theme.typography.fontFamily.semibold }}>
                      {Math.abs(trendPercentage)}% vs last {selectedTimeframe}
                    </Text>
                  </View>
                )}
              </View>
              {trendGraphData.length > 0 && (
                <SleepTrendAreaChart data={trendGraphData} theme={theme} isDark={isDark} />
              )}
            </View>

            {/* Quick Metrics */}
            <View style={styles(theme, isDark).metricsGrid}>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).metricCard}>
                <Moon size={20} color="#8B5CF6" />
                <Text style={styles(theme, isDark).metricLabel}>Total Sleep</Text>
                <Text style={styles(theme, isDark).metricValue}>{totalSleepTime}</Text>
              </BlurView>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).metricCard}>
                <Award size={20} color="#8B5CF6" />
                <Text style={styles(theme, isDark).metricLabel}>Avg Score</Text>
                <Text style={styles(theme, isDark).metricValue}>{avgSleepScore}</Text>
              </BlurView>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).metricCard}>
                <Battery size={20} color="#8B5CF6" />
                <Text style={styles(theme, isDark).metricLabel}>Deep Sleep</Text>
                <Text style={styles(theme, isDark).metricValue}>{deepSleepTime}</Text>
              </BlurView>
            </View>

            {/* AI Insights */}
            <PremiumLockedSection isPremium={isPremium} title="AI INSIGHTS" icon={Sparkles} theme={theme} isDark={isDark}>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).aiInsightsCard}>
                <View style={styles(theme, isDark).aiHeader}>
                  <Sparkles size={18} color="#8B5CF6" />
                  <Text style={styles(theme, isDark).sectionTitle}>AI Insights</Text>
                </View>
                <Text style={styles(theme, isDark).insightText}>{aiInsights.text}</Text>
                <View style={styles(theme, isDark).tagsContainer}>
                  {aiInsights.tags.map((tag, i) => (
                    <View key={i} style={styles(theme, isDark).tag}>
                      <Text style={styles(theme, isDark).tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </BlurView>
            </PremiumLockedSection>

            {/* Best/Worst Nights */}
            {bestWorstNights.best && bestWorstNights.worst && (
              <View style={styles(theme, isDark).bestWorstContainer}>
                <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).nightCard}>
                  <View style={[styles(theme, isDark).nightIcon, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                    <CheckCircle2 size={16} color="#10B981" />
                  </View>
                  <Text style={styles(theme, isDark).nightLabel}>Best Night</Text>
                  <Text style={styles(theme, isDark).nightScore}>{bestWorstNights.best.sleepScore || Math.round(bestWorstNights.best.quality * 10)}</Text>
                  <Text style={styles(theme, isDark).nightDay}>
                    {new Date(bestWorstNights.best.endTime || bestWorstNights.best.startTime).toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                </BlurView>
                <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).nightCard}>
                  <View style={[styles(theme, isDark).nightIcon, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                    <AlertCircle size={16} color="#EF4444" />
                  </View>
                  <Text style={styles(theme, isDark).nightLabel}>Worst Night</Text>
                  <Text style={styles(theme, isDark).nightScore}>{bestWorstNights.worst.sleepScore || Math.round(bestWorstNights.worst.quality * 10)}</Text>
                  <Text style={styles(theme, isDark).nightDay}>
                    {new Date(bestWorstNights.worst.endTime || bestWorstNights.worst.startTime).toLocaleDateString('en-US', { weekday: 'long' })}
                  </Text>
                </BlurView>
              </View>
            )}

            {/* Sleep Debt */}
            <View style={styles(theme, isDark).section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles(theme, isDark).sectionLabel}>Sleep Debt</Text>
                <Text style={{ color: sleepDebtData.deficit > 0 ? '#EF4444' : '#10B981', fontSize: 12, fontWeight: '700', fontFamily: theme.typography.fontFamily.bold }}>
                  {sleepDebtData.deficit > 0 ? 'Needs Recovery' : 'Well Rested'}
                </Text>
              </View>
              <View style={styles(theme, isDark).debtBar}>
                <View style={[styles(theme, isDark).debtFill, {
                  width: `${sleepDebtData.percentage
                    } % `,
                  backgroundColor: sleepDebtData.deficit > 60 ? '#EF4444' : sleepDebtData.deficit > 30 ? '#F59E0B' : '#10B981'
                }]} />
              </View>
              <Text style={styles(theme, isDark).debtText}>
                {sleepDebtData.deficit > 0 ? `${sleepDebtData.deficit}m deficit` : `${Math.abs(sleepDebtData.deficit)}m surplus`} • Accumulated over last 7 days
              </Text>
            </View>

            {/* Consistency */}
            <View style={styles(theme, isDark).section}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles(theme, isDark).sectionLabel}>Consistency</Text>
                <Text style={{ color: consistencyData.score >= 80 ? '#10B981' : consistencyData.score >= 60 ? '#F59E0B' : '#EF4444', fontSize: 12, fontWeight: '700', fontFamily: theme.typography.fontFamily.bold }}>
                  {consistencyData.score >= 80 ? 'Good' : consistencyData.score >= 60 ? 'Fair' : 'Poor'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                <CircularProgress size={80} strokeWidth={8} score={consistencyData.score} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={[styles(theme, isDark).timeDot, { backgroundColor: '#8B5CF6' }]} />
                    <Text style={styles(theme, isDark).timeLabel}>Bedtime: {consistencyData.bedtime}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles(theme, isDark).timeDot, { backgroundColor: '#10B981' }]} />
                    <Text style={styles(theme, isDark).timeLabel}>Wake: {consistencyData.wakeTime}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Sleep Stages Heatmap */}
            <PremiumLockedSection isPremium={isPremium} title="SLEEP STAGES" icon={Layout} theme={theme} isDark={isDark}>
              <View style={styles(theme, isDark).section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={styles(theme, isDark).sectionLabel}>Sleep Stages</Text>
                  <TouchableOpacity>
                    <Text style={{ color: '#8B5CF6', fontSize: 12, fontWeight: '600', fontFamily: theme.typography.fontFamily.semibold }}>View Details</Text>
                  </TouchableOpacity>
                </View>
                <SleepStagesHeatmap data={sleepStagesHeatmap} theme={theme} isDark={isDark} />
              </View>
            </PremiumLockedSection>

            {/* Generate Report Button */}
            <TouchableOpacity style={styles(theme, isDark).reportButton}>
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <FileText size={20} color="#FFF" />
              <Text style={styles(theme, isDark).reportButtonText}>Generate Full Sleep Report</Text>
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
      backgroundColor: theme.colors.background
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingBottom: 20
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold, color: theme.colors.textPrimary, letterSpacing: -0.5 },
    headerPlaceholder: { width: 40 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 20 },

    timeframeTabs: {
      flexDirection: 'row',
      backgroundColor: theme.colors.cardOverlay,
      borderRadius: 14,
      padding: 4,
      marginBottom: 25,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
    },
    activeTab: {
      backgroundColor: '#8B5CF6',
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      fontFamily: theme.typography.fontFamily.semibold,
      color: theme.colors.textSecondary,
    },
    activeTabText: {
      color: '#FFF',
      fontFamily: theme.typography.fontFamily.bold,
    },

    section: { marginBottom: 30 },
    sectionLabel: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', fontFamily: theme.typography.fontFamily.bold, marginBottom: 10 },
    scoreValue: { color: theme.colors.textPrimary, fontSize: 48, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold },
    avgLabel: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '600', fontFamily: theme.typography.fontFamily.semibold },

    metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    metricCard: {
      flex: 1,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardOverlay,
      alignItems: 'center',
    },
    metricLabel: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '700', fontFamily: theme.typography.fontFamily.semibold, marginTop: 8, marginBottom: 4 },
    metricValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold },

    aiInsightsCard: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardOverlay,
    },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold, letterSpacing: 1 },
    insightText: { color: theme.colors.textPrimary, fontSize: 14, lineHeight: 22, fontFamily: theme.typography.fontFamily.medium, marginBottom: 12 },
    tagsContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    tag: {
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    tagText: { color: '#8B5CF6', fontSize: 11, fontWeight: '700', fontFamily: theme.typography.fontFamily.semibold },

    bestWorstContainer: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    nightCard: {
      flex: 1,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardOverlay,
      alignItems: 'center',
    },
    nightIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    nightLabel: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700', fontFamily: theme.typography.fontFamily.semibold, marginBottom: 4 },
    nightScore: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold, marginBottom: 4 },
    nightDay: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '600', fontFamily: theme.typography.fontFamily.medium },

    debtBar: {
      height: 24,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 10,
    },
    debtFill: {
      height: '100%',
      borderRadius: 12,
    },
    debtText: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: theme.typography.fontFamily.regular },

    timeDot: { width: 8, height: 8, borderRadius: 4 },
    timeLabel: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '600', fontFamily: theme.typography.fontFamily.semibold },

    reportButton: {
      height: 56,
      borderRadius: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      overflow: 'hidden',
      marginVertical: 20,
    },
    reportButtonText: { color: '#FFF', fontSize: 16, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold },

    premiumSectionWrapper: { marginBottom: 30 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12
    },
    proBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', fontFamily: theme.typography.fontFamily.black },
    lockedModule: { height: 210, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' },
    lockContent: { alignItems: 'center', paddingHorizontal: 40, zIndex: 10 },
    lockCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16
    },
    lockTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold, marginBottom: 8 },
    lockSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: theme.typography.fontFamily.regular, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    unlockButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 25 },
    unlockButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800', fontFamily: theme.typography.fontFamily.bold },
  });
}
