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
  Sun
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import CircularProgress from '../components/CircularProgress';
import Svg, { Rect, G, Line, Circle, Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

/**
 * Sleep Stage Pie Chart Component
 */
const StagePieChart = memo(({ stages, theme, isDark }: any) => {
  const total = stages.reduce((sum: number, s: any) => sum + s.percentage, 0);

  const stageColors: any = {
    deep: '#4F46E5',
    rem: '#8B5CF6',
    light: '#6366F1',
    awake: '#EF4444'
  };

  let currentAngle = -90;

  return (
    <View style={{ alignItems: 'center', marginVertical: 20 }}>
      <Svg height="140" width="140">
        <G>
          {stages.map((stage: any, i: number) => {
            const angle = (stage.percentage / 100) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;

            const startX = 70 + 60 * Math.cos((startAngle * Math.PI) / 180);
            const startY = 70 + 60 * Math.sin((startAngle * Math.PI) / 180);
            const endX = 70 + 60 * Math.cos((endAngle * Math.PI) / 180);
            const endY = 70 + 60 * Math.sin((endAngle * Math.PI) / 180);

            const largeArc = angle > 180 ? 1 : 0;

            const pathData = [
              `M 70 70`,
              `L ${startX} ${startY}`,
              `A 60 60 0 ${largeArc} 1 ${endX} ${endY}`,
              `Z`
            ].join(' ');

            currentAngle = endAngle;

            return (
              <Path
                key={i}
                d={pathData}
                fill={stageColors[stage.name]}
                opacity={0.9}
              />
            );
          })}
          <Circle cx="70" cy="70" r="35" fill={theme.colors.background} />
        </G>
      </Svg>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 15, gap: 10, justifyContent: 'center' }}>
        {stages.map((stage: any, i: number) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: stageColors[stage.name] }} />
            <Text style={{ color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
              {stage.label}: {stage.percentage}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

/**
 * Sleep Trend Line Chart
 */
const TrendLineChart = memo(({ data, theme, isDark }: any) => {
  const maxValue = Math.max(...data.map((d: any) => d.value), 8);
  const chartHeight = 100;
  const chartWidth = width - 80;
  const pointSpacing = chartWidth / (data.length - 1 || 1);

  return (
    <View style={{ marginVertical: 20 }}>
      <Svg height={chartHeight + 40} width={chartWidth}>
        <G>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y, i) => (
            <Line
              key={i}
              x1="0"
              y1={(chartHeight * y) / 100}
              x2={chartWidth}
              y2={(chartHeight * y) / 100}
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              strokeWidth="1"
            />
          ))}

          {/* Line path */}
          {data.length > 1 && (
            <Path
              d={data.map((d: any, i: number) => {
                const x = i * pointSpacing;
                const y = chartHeight - (d.value / maxValue) * chartHeight;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              stroke="#8B5CF6"
              strokeWidth="3"
              fill="none"
            />
          )}

          {/* Data points */}
          {data.map((d: any, i: number) => {
            const x = i * pointSpacing;
            const y = chartHeight - (d.value / maxValue) * chartHeight;
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r="4"
                fill="#8B5CF6"
              />
            );
          })}
        </G>
      </Svg>

      {/* X-axis labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        {data.map((d: any, i: number) => (
          <Text key={i} style={{ color: theme.colors.textSecondary, fontSize: 9, fontWeight: '700' }}>
            {d.label}
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
          <Text style={styles(theme, isDark).lockSubtitle}>Advanced insights, trends, and AI-driven recommendations.</Text>

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

/**
 * Architecture Graph Component
 */
const ArchitectureGraph = memo(({ data, theme, isDark }: any) => {
  return (
    <View style={styles(theme, isDark).cardContainer}>
      <View style={styles(theme, isDark).archLegend}>
        <View style={styles(theme, isDark).legendDot}><View style={[styles(theme, isDark).dot, { backgroundColor: '#EF4444' }]} /><Text style={styles(theme, isDark).legendText}>Awake</Text></View>
        <View style={styles(theme, isDark).legendDot}><View style={[styles(theme, isDark).dot, { backgroundColor: '#8B5CF6' }]} /><Text style={styles(theme, isDark).legendText}>REM</Text></View>
        <View style={styles(theme, isDark).legendDot}><View style={[styles(theme, isDark).dot, { backgroundColor: '#3B82F6' }]} /><Text style={styles(theme, isDark).legendText}>Light</Text></View>
        <View style={styles(theme, isDark).legendDot}><View style={[styles(theme, isDark).dot, { backgroundColor: '#1E3A8A' }]} /><Text style={styles(theme, isDark).legendText}>Deep</Text></View>
      </View>
      <View style={styles(theme, isDark).graphTimeline}>
        <Svg height="120" width={width - 52}>
          <G>
            {data.map((d: any, i: number) => {
              const stageColors: any = { 0: '#EF4444', 1: '#8B5CF6', 2: '#3B82F6', 3: '#1E3A8A' };
              const stageY: any = { 1: 10, 0: 40, 2: 70, 3: 100 };
              let xOffset = 0;
              for (let j = 0; j < i; j++) xOffset += (data[j].width * (width - 52)) / 100;

              return (
                <Rect
                  key={`rect-${i}`}
                  x={xOffset}
                  y={stageY[d.level]}
                  width={(d.width * (width - 52)) / 100}
                  height="4"
                  fill={stageColors[d.level]}
                  rx="2"
                />
              );
            })}

            {data.slice(1).map((d: any, i: number) => {
              const stageY: any = { 1: 10, 0: 40, 2: 70, 3: 100 };
              const prevLevel = data[i].level;
              const currentLevel = d.level;
              let xOffset = 0;
              for (let j = 0; j <= i; j++) xOffset += (data[j].width * (width - 52)) / 100;

              return (
                <Line
                  key={`line-${i}`}
                  x1={xOffset}
                  y1={stageY[prevLevel]}
                  x2={xOffset}
                  y2={stageY[currentLevel]}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                />
              );
            })}
          </G>
        </Svg>
      </View>
      <View style={styles(theme, isDark).xAxis}>
        <Text style={styles(theme, isDark).xText}>START</Text>
        <Text style={styles(theme, isDark).xText}>MID</Text>
        <Text style={styles(theme, isDark).xText}>PEAK</Text>
        <Text style={styles(theme, isDark).xText}>WAKE</Text>
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

  const isPremium = useMemo(() => isPremiumActive(user?.subscription_status, user?.subscription_end_date), [user]);
  const readinessScore = useMemo(() => getReadinessScore(), [getReadinessScore, sleepHistory]);
  const sleepDebt = useMemo(() => getSleepDebt(), [getSleepDebt, sleepHistory]);
  const stats = useMemo(() => getSleepStats(), [getSleepStats, sleepHistory]);

  // Load sleep history on mount and when user changes
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadSleepHistory();
      setIsLoading(false);
    };
    loadData();
  }, [user?.id]);

  // Log when sleepHistory updates
  useEffect(() => {
    console.log('🔄 SleepAnalysisScreen: sleepHistory updated with', sleepHistory.length, 'records');
  }, [sleepHistory]);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSleepHistory();
    setRefreshing(false);
  };

  // Get latest session (most recent sleep) - force recalculation when sleepHistory changes
  const latestSession = useMemo(() => {
    const session = sleepHistory.length > 0 ? sleepHistory[0] : null;
    console.log('📊 Latest session:', session ? new Date(session.endTime || session.startTime).toLocaleDateString() : 'none');
    return session;
  }, [sleepHistory]);

  // Calculate sleep stage breakdown from latest session
  const stageBreakdown = useMemo(() => {
    if (!latestSession?.sleepStages || latestSession.sleepStages.length === 0) {
      return [];
    }

    const stages = { deep: 0, rem: 0, light: 0, awake: 0 };
    let totalDuration = 0;

    latestSession.sleepStages.forEach((stage: any) => {
      const start = new Date(stage.startTime).getTime();
      const end = new Date(stage.endTime).getTime();
      const duration = (end - start) / 60000; // minutes

      totalDuration += duration;
      stages[stage.stage as keyof typeof stages] += duration;
    });

    return [
      { name: 'deep', label: 'Deep', percentage: Math.round((stages.deep / totalDuration) * 100) },
      { name: 'rem', label: 'REM', percentage: Math.round((stages.rem / totalDuration) * 100) },
      { name: 'light', label: 'Light', percentage: Math.round((stages.light / totalDuration) * 100) },
      { name: 'awake', label: 'Awake', percentage: Math.round((stages.awake / totalDuration) * 100) }
    ].filter(s => s.percentage > 0);
  }, [latestSession]);

  // 7-day sleep trend data
  const sleepTrendData = useMemo(() => {
    const last7 = sleepHistory.slice(0, 7).reverse();

    return last7.map((session, i) => {
      const date = new Date(session.endTime || session.startTime);
      return {
        label: date.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 1),
        value: session.duration / 60 // hours
      };
    });
  }, [sleepHistory]);

  // Calculate weekly consistency score
  const consistencyScore = useMemo(() => {
    if (sleepHistory.length < 3) return 0;

    const last7 = sleepHistory.slice(0, 7);
    const bedtimes = last7.map(s => new Date(s.startTime).getHours() * 60 + new Date(s.startTime).getMinutes());

    const avgBedtime = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
    const variance = bedtimes.reduce((sum, time) => sum + Math.pow(time - avgBedtime, 2), 0) / bedtimes.length;
    const stdDev = Math.sqrt(variance);

    // Lower stdDev = higher consistency
    const score = Math.max(0, 100 - (stdDev / 2));
    return Math.round(score);
  }, [sleepHistory]);

  // Generate AI insights from real data
  const biologicalInsights = useMemo(() => {
    if (!latestSession) return [];

    const insights: string[] = [];
    const deepSleepPct = stageBreakdown.find(s => s.name === 'deep')?.percentage || 0;
    const remPct = stageBreakdown.find(s => s.name === 'rem')?.percentage || 0;

    if (deepSleepPct >= 20) {
      insights.push('Excellent deep sleep achieved - optimal for physical recovery and tissue repair.');
    } else if (deepSleepPct < 15) {
      insights.push('Deep sleep below optimal range. Consider reducing caffeine intake after 2 PM.');
    }

    if (remPct >= 20) {
      insights.push('Strong REM cycles detected - great for memory consolidation and learning.');
    } else if (remPct < 15) {
      insights.push('Limited REM sleep. Try maintaining consistent sleep schedule for better dream cycles.');
    }

    if (latestSession.wakeUps <= 2) {
      insights.push('Minimal disruptions - your sleep environment is well optimized.');
    } else if (latestSession.wakeUps >= 5) {
      insights.push('Frequent wake-ups detected. Check room temperature (ideal: 65-68°F) and noise levels.');
    }

    if (consistencyScore >= 80) {
      insights.push('Your circadian rhythm is well-aligned thanks to consistent sleep schedule.');
    }

    return insights.length > 0 ? insights : ['Continue tracking to generate personalized insights.'];
  }, [latestSession, stageBreakdown, consistencyScore]);

  // Architecture data for graph
  const architectureData = useMemo(() => {
    if (!latestSession?.sleepStages || latestSession.sleepStages.length === 0) {
      return [];
    }

    const total = latestSession.sleepStages.reduce((sum: number, s: any) => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      return sum + (end - start);
    }, 0);

    return latestSession.sleepStages.map((s: any) => {
      const start = new Date(s.startTime).getTime();
      const end = new Date(s.endTime).getTime();
      const duration = end - start;

      return {
        stage: s.stage,
        width: (duration / total) * 100,
        level: s.stage === 'awake' ? 0 : s.stage === 'rem' ? 1 : s.stage === 'light' ? 2 : 3
      };
    });
  }, [latestSession]);

  // Recovery score based on deep sleep
  const recoveryScore = useMemo(() => {
    const deepSleepPct = stageBreakdown.find(s => s.name === 'deep')?.percentage || 0;
    return Math.min(100, Math.round(deepSleepPct * 5));
  }, [stageBreakdown]);

  return (
    <View style={[styles(theme, isDark).container, isSubcomponent && { backgroundColor: 'transparent' }]}>
      <StatusBar barStyle="light-content" />

      {!hideHeader && !isSubcomponent && (
        <View style={[styles(theme, isDark).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles(theme, isDark).backButton}>
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme, isDark).headerTitle}>Sleep Architect</Text>
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
        {/* Display loading state */}
        {isLoading && sleepHistory.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 }}>
            <Activity size={40} color="#8B5CF6" />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 20, fontSize: 14 }}>Loading sleep data...</Text>
          </View>
        ) : (
          <>
            {/* Readiness Hero Section */}
            <View style={styles(theme, isDark).heroSection}>
              <CircularProgress
                size={180}
                strokeWidth={14}
                score={latestSession?.sleepScore || (latestSession?.quality ? latestSession.quality * 10 : 0) || readinessScore}
              />

              {/* Date Display */}
              {latestSession && (
                <View style={styles(theme, isDark).dateDisplay}>
                  <Calendar size={14} color={theme.colors.textSecondary} />
                  <Text style={styles(theme, isDark).dateText}>
                    {new Date(latestSession.endTime || latestSession.startTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              )}

              <View style={styles(theme, isDark).readinessCardHost}>
                <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).readinessCard}>
                  <View style={styles(theme, isDark).readinessHeader}>
                    <Activity size={16} color="#8B5CF6" />
                    <Text style={styles(theme, isDark).readinessLabel}>RECOVERY ARCHITECTURE</Text>
                  </View>
                  <View style={styles(theme, isDark).readinessValueRow}>
                    <View>
                      <Text style={styles(theme, isDark).readinessValue}>{readinessScore}</Text>
                      <Text style={styles(theme, isDark).readinessSub}>READINESS</Text>
                    </View>
                    <View style={[styles(theme, isDark).vertDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
                    <View>
                      <Text style={[styles(theme, isDark).readinessValue, { color: sleepDebt > 1 ? '#EF4444' : '#10B981' }]}>
                        {Math.abs(sleepDebt)}h
                      </Text>
                      <Text style={styles(theme, isDark).readinessSub}>{sleepDebt > 0 ? 'DEBT' : 'SURPLUS'}</Text>
                    </View>
                  </View>
                  <View style={styles(theme, isDark).statusBadge}>
                    <CheckCircle2 size={12} color="#10B981" />
                    <Text style={styles(theme, isDark).statusText}>
                      {readinessScore >= 80 ? 'Peak Performance Ready' : readinessScore >= 60 ? 'Good to Go' : 'Need More Rest'}
                    </Text>
                  </View>
                </BlurView>
              </View>
            </View>

            {/* Quick Metrics Grid */}
            <View style={styles(theme, isDark).metricsGrid}>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).metricItem}>
                <Clock size={18} color={theme.colors.textSecondary} opacity={0.6} />
                <Text style={styles(theme, isDark).metricVal}>
                  {latestSession ? `${Math.floor(latestSession.duration / 60)}h ${latestSession.duration % 60}m` : '—'}
                </Text>
                <Text style={styles(theme, isDark).metricLab}>LAST NIGHT</Text>
              </BlurView>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).metricItem}>
                <Target size={18} color={theme.colors.textSecondary} opacity={0.6} />
                <Text style={styles(theme, isDark).metricVal}>{consistencyScore}%</Text>
                <Text style={styles(theme, isDark).metricLab}>CONSISTENCY</Text>
              </BlurView>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).metricItem}>
                <Moon size={18} color={theme.colors.textSecondary} opacity={0.6} />
                <Text style={styles(theme, isDark).metricVal}>{latestSession?.wakeUps || 0}</Text>
                <Text style={styles(theme, isDark).metricLab}>WAKE-UPS</Text>
              </BlurView>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).metricItem}>
                <Heart size={18} color={theme.colors.textSecondary} opacity={0.6} />
                <Text style={styles(theme, isDark).metricVal}>{recoveryScore}<Text style={{ fontSize: 10 }}>%</Text></Text>
                <Text style={styles(theme, isDark).metricLab}>RECOVERY</Text>
              </BlurView>
            </View>

            {/* 7-Day Sleep Trend */}
            {sleepTrendData.length > 0 && (
              <PremiumLockedSection isPremium={isPremium} title="7-DAY SLEEP TREND" icon={TrendingUp} theme={theme} isDark={isDark}>
                <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).cardContainer}>
                  <View style={styles(theme, isDark).sectionHeader}>
                    <TrendingUp size={18} color="#8B5CF6" />
                    <Text style={styles(theme, isDark).sectionTitle}>7-DAY SLEEP TREND</Text>
                  </View>
                  <TrendLineChart data={sleepTrendData} theme={theme} isDark={isDark} />
                  <Text style={styles(theme, isDark).trendNote}>
                    Avg: {stats.averageDuration ? `${Math.floor(stats.averageDuration / 60)}h ${stats.averageDuration % 60}m` : '—'} •
                    Target: 7-9h
                  </Text>
                </BlurView>
              </PremiumLockedSection>
            )}

            {/* Sleep Stage Breakdown */}
            {stageBreakdown.length > 0 && (
              <View style={styles(theme, isDark).section}>
                <View style={styles(theme, isDark).sectionHeader}>
                  <Moon size={18} color="#8B5CF6" />
                  <Text style={styles(theme, isDark).sectionTitle}>SLEEP COMPOSITION</Text>
                </View>
                <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).cardContainer}>
                  <StagePieChart stages={stageBreakdown} theme={theme} isDark={isDark} />
                </BlurView>
              </View>
            )}

            {/* Sleep Architecture Graph */}
            {architectureData.length > 0 && (
              <PremiumLockedSection isPremium={isPremium} title="Sleep Architecture" icon={Layout} theme={theme} isDark={isDark}>
                <ArchitectureGraph data={architectureData} theme={theme} isDark={isDark} />
              </PremiumLockedSection>
            )}

            {/* Biology Insights (Now with Real Data!) */}
            <View style={styles(theme, isDark).section}>
              <View style={styles(theme, isDark).sectionHeader}>
                <Sparkles size={18} color="#8B5CF6" />
                <Text style={styles(theme, isDark).sectionTitle}>BIOLOGICAL INSIGHTS</Text>
              </View>
              <BlurView intensity={15} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).insightsList}>
                {biologicalInsights.map((insight: string, i: number) => (
                  <View key={i} style={styles(theme, isDark).insightItem}>
                    <View style={styles(theme, isDark).insightIconCircle}>
                      <Zap size={12} color="#8B5CF6" strokeWidth={3} />
                    </View>
                    <Text style={styles(theme, isDark).insightText}>{insight}</Text>
                  </View>
                ))}
              </BlurView>
            </View>

            {/* Weekly Consistency Score */}
            <View style={styles(theme, isDark).section}>
              <View style={styles(theme, isDark).sectionHeader}>
                <Calendar size={18} color="#8B5CF6" />
                <Text style={styles(theme, isDark).sectionTitle}>SLEEP SCHEDULE</Text>
              </View>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).cardContainer}>
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <CircularProgress
                    size={120}
                    strokeWidth={10}
                    score={consistencyScore}
                  />
                  <Text style={[styles(theme, isDark).consistencyNote, { marginTop: 15 }]}>
                    {consistencyScore >= 80 ? 'Excellent routine!' : consistencyScore >= 60 ? 'Good consistency' : 'Try to sleep at similar times'}
                  </Text>
                </View>
              </BlurView>
            </View>

            {/* Environmental Intelligence */}
            <View style={styles(theme, isDark).section}>
              <View style={styles(theme, isDark).sectionHeader}>
                <Shield size={18} color="#8B5CF6" />
                <Text style={styles(theme, isDark).sectionTitle}>SLEEP QUALITY FACTORS</Text>
              </View>
              <BlurView intensity={10} tint={isDark ? "dark" : "light"} style={styles(theme, isDark).envContainer}>
                <View style={styles(theme, isDark).envItem}>
                  <Wind size={20} color={theme.colors.textSecondary} />
                  <View style={styles(theme, isDark).envTxtBound}>
                    <Text style={styles(theme, isDark).envValText}>
                      {(latestSession?.wakeUps ?? 0) <= 2 ? 'Quiet Night' : 'Some Disruptions'}
                    </Text>
                    <Text style={styles(theme, isDark).envSubText}>
                      {latestSession?.wakeUps ?? 0} wake-ups recorded
                    </Text>
                  </View>
                </View>
                <View style={[styles(theme, isDark).envDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
                <View style={styles(theme, isDark).envItem}>
                  <Sun size={20} color={theme.colors.textSecondary} />
                  <View style={styles(theme, isDark).envTxtBound}>
                    <Text style={styles(theme, isDark).envValText}>
                      {consistencyScore >= 70 ? 'Circadian Aligned' : 'Irregular Schedule'}
                    </Text>
                    <Text style={styles(theme, isDark).envSubText}>
                      {consistencyScore}% schedule consistency
                    </Text>
                  </View>
                </View>
              </BlurView>
            </View>

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
    headerTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
    headerPlaceholder: { width: 40 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 10 },

    heroSection: { alignItems: 'center', marginBottom: 35 },
    dateDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.15)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.3)',
    },
    dateText: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    readinessCardHost: { width: '100%', marginTop: 25 },
    readinessCard: {
      padding: 24,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardOverlay
    },
    readinessHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    readinessLabel: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 2, opacity: 0.7 },
    readinessValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
    readinessValue: { color: theme.colors.textPrimary, fontSize: 38, fontWeight: '800', letterSpacing: -1 },
    readinessSub: { fontSize: 10, fontWeight: '800', color: theme.colors.textSecondary, marginTop: 2, letterSpacing: 1 },
    vertDivider: { width: 1, height: 40 },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)'
    },
    statusText: { color: '#10B981', fontSize: 11, fontWeight: '800' },

    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 35 },
    metricItem: {
      width: (width - 60) / 2,
      padding: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardOverlay,
      alignItems: 'center'
    },
    metricVal: { color: theme.colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 10 },
    metricLab: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },

    section: { marginBottom: 35 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },

    cardContainer: {
      padding: 24,
      borderRadius: 32,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.cardOverlay
    },
    archLegend: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    legendDot: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: theme.colors.textSecondary, fontSize: 10, fontWeight: '800' },
    graphTimeline: { height: 120, justifyContent: 'center' },
    xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    xText: { color: theme.colors.textSecondary, fontSize: 9, fontWeight: '900', opacity: 0.4 },

    trendNote: { color: theme.colors.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 15 },
    consistencyNote: { color: theme.colors.textSecondary, fontSize: 13, fontStyle: 'italic' },

    insightsList: { padding: 24, borderRadius: 32, borderWidth: 1, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardOverlay },
    insightItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 15, marginBottom: 20 },
    insightIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(139, 92, 246, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)'
    },
    insightText: { flex: 1, color: theme.colors.textPrimary, fontSize: 14, lineHeight: 22, fontWeight: '500' },

    envContainer: { borderRadius: 32, padding: 24, borderWidth: 1, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardOverlay },
    envItem: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    envTxtBound: { flex: 1 },
    envValText: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700' },
    envSubText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, opacity: 0.7 },
    envDivider: { height: 1, marginVertical: 20 },

    premiumSectionWrapper: { marginBottom: 35 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    proBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12
    },
    proBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
    lockedModule: { height: 210, borderRadius: 32, overflow: 'hidden', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' },
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
    lockTitle: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 8 },
    lockSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    unlockButton: { backgroundColor: '#8B5CF6', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 25 },
    unlockButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  });
}
