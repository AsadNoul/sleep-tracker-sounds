import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Music, AlarmClock, Mic, Lightbulb, Moon, Clock, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { loadUserAge, saveUserAge } from '../utils/storage';
import { format12HourTime, formatDuration } from '../utils/dateFormatting';
import { useSleep } from '../contexts/SleepContext';

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

const { width } = Dimensions.get('window');

type RootStackParamList = {
  Main: undefined;
  SleepSession: undefined;
  Subscription: undefined;
  HelpSupport: undefined;
  PrivacySettings: undefined;
};

export default function TrackerScreen() {
  const { theme, isDark } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getSleepStats, getLatestInsight } = useSleep();
  const [sleepSounds, setSleepSounds] = useState(false);
  const [alarm, setAlarm] = useState(true);
  const [sleepRecorder, setSleepRecorder] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userAge, setUserAge] = useState(25);
  const [latestInsight, setLatestInsight] = useState<{ insight: string; recommendation: string } | null>(null);
  const [alarmTime, setAlarmTime] = useState(() => {
    const d = new Date();
    d.setHours(7, 0, 0, 0);
    return d;
  });
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);

  const sleepStats = getSleepStats();

  // Load user age and latest insight on mount
  useEffect(() => {
    const loadData = async () => {
      const age = await loadUserAge();
      if (age !== null) {
        setUserAge(age);
      } else {
        await saveUserAge(25);
      }

      const insight = await getLatestInsight();
      setLatestInsight(insight);
    };
    loadData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getSleepRecommendation = () => {
    if (userAge < 18) return '8-10 hours';
    if (userAge < 65) return '7-9 hours';
    return '7-8 hours';
  };

  const getQualityLabel = (quality: number) => {
    if (quality >= 90) return 'Excellent';
    if (quality >= 80) return 'Good';
    if (quality >= 70) return 'Fair';
    if (quality > 0) return 'Poor';
    return 'No Data';
  };

  const navigateToSleepSession = () => {
    navigation.navigate('SleepSession', {
      initialAlarmTime: alarmTime.toISOString(),
      initialSmartAlarm: alarm,
      initialRecorder: sleepRecorder,
      initialSounds: sleepSounds
    } as any);
  };

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        style={styles(theme).gradient}
      >
        <ScrollView style={styles(theme).content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles(theme).header}>
            <Image source={require('../assets/app_logo.png')} style={styles(theme).logo} />
            <Text style={styles(theme).greeting}>Good evening</Text>
            <Text style={styles(theme).time}>
              {format12HourTime(currentTime)}
            </Text>
          </View>

          {/* Sleep Quality Card */}
          <GlassView intensity={20} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).cardHeader}>
              <Text style={styles(theme).cardTitle}>Sleep Quality</Text>
              <View style={styles(theme).qualityBadge}>
                <Text style={styles(theme).qualityText}>
                  {getQualityLabel(sleepStats.lastNightQuality)}
                </Text>
              </View>
            </View>
            <View style={styles(theme).sleepStats}>
              <View style={styles(theme).statItem}>
                <Text style={styles(theme).statValue}>
                  {sleepStats.lastNightDuration > 0
                    ? formatDuration(sleepStats.lastNightDuration)
                    : '--'}
                </Text>
                <Text style={styles(theme).statLabel}>Last Night</Text>
              </View>
              <View style={styles(theme).statItem}>
                <Text style={styles(theme).statValue}>
                  {sleepStats.averageQuality > 0
                    ? sleepStats.averageQuality.toFixed(1)
                    : '--'}
                </Text>
                <Text style={styles(theme).statLabel}>Sleep Score</Text>
              </View>
              <View style={styles(theme).statItem}>
                <Text style={styles(theme).statValue}>
                  {sleepStats.lastNightWakeUps >= 0
                    ? `${sleepStats.lastNightWakeUps}x`
                    : '--'}
                </Text>
                <Text style={styles(theme).statLabel}>Woke Up</Text>
              </View>
            </View>
          </GlassView>

          {/* Sleep Controls */}
          <GlassView intensity={20} tint="dark" style={styles(theme).card}>
            <Text style={styles(theme).cardTitle}>Sleep Controls</Text>
            
            <View style={styles(theme).controlItem}>
              <View style={styles(theme).controlInfo}>
                <Music size={24} color={theme.colors.accent} />
                <Text style={styles(theme).controlLabel}>Sleep Sounds</Text>
              </View>
              <Switch
                value={sleepSounds}
                onValueChange={setSleepSounds}
                trackColor={{ false: '#333', true: theme.colors.accent }}
                thumbColor={sleepSounds ? '#fff' : '#ccc'}
              />
            </View>

            <View style={styles(theme).controlItem}>
              <View style={styles(theme).controlInfo}>
                <AlarmClock size={24} color="#33C6FF" />
                <Text style={styles(theme).controlLabel}>Smart Alarm</Text>
              </View>
              <Switch
                value={alarm}
                onValueChange={setAlarm}
                trackColor={{ false: '#333', true: theme.colors.highlight }}
                thumbColor={alarm ? '#fff' : '#ccc'}
              />
            </View>

            {alarm && (
              <TouchableOpacity 
                style={styles(theme).alarmTimeSelector}
                onPress={() => setShowAlarmPicker(true)}
              >
                <View style={styles(theme).alarmTimeInfo}>
                  <Clock size={20} color={theme.colors.textSecondary} />
                  <Text style={styles(theme).alarmTimeLabel}>Wake up at</Text>
                </View>
                <View style={styles(theme).alarmTimeValueContainer}>
                  <Text style={styles(theme).alarmTimeValue}>
                    {format12HourTime(alarmTime)}
                  </Text>
                  <ChevronRight size={20} color={theme.colors.textSecondary} />
                </View>
              </TouchableOpacity>
            )}

            {showAlarmPicker && (
              <DateTimePicker
                value={alarmTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowAlarmPicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setAlarmTime(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles(theme).controlItem}>
              <View style={styles(theme).controlInfo}>
                <Mic size={24} color="#FF6B6B" />
                <Text style={styles(theme).controlLabel}>Sleep Recorder</Text>
              </View>
              <Switch
                value={sleepRecorder}
                onValueChange={setSleepRecorder}
                trackColor={{ false: '#333', true: '#FF6B6B' }}
                thumbColor={sleepRecorder ? '#fff' : '#ccc'}
              />
            </View>
          </GlassView>

          {/* AI Sleep Architect Insights */}
          <GlassView intensity={20} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).cardHeader}>
              <View style={styles(theme).aiHeader}>
                <Moon size={24} color={theme.colors.premium} />
                <Text style={styles(theme).cardTitle}>AI Sleep Architect</Text>
              </View>
              <View style={styles(theme).premiumBadge}>
                <Text style={styles(theme).premiumText}>AI POWERED</Text>
              </View>
            </View>
            
            {latestInsight ? (
              <View style={styles(theme).insightContent}>
                <Text style={styles(theme).insightText}>
                  "{latestInsight.insight}"
                </Text>
                <View style={styles(theme).recommendationBox}>
                  <Lightbulb size={18} color={theme.colors.highlight} />
                  <Text style={styles(theme).recommendationText}>
                    {latestInsight.recommendation}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles(theme).noInsightBox}>
                <Text style={styles(theme).noInsightText}>
                  Complete a sleep session with the recorder enabled to get AI-powered insights.
                </Text>
              </View>
            )}
          </GlassView>

          {/* Sleep Recommendation */}
          <GlassView intensity={20} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).cardHeader}>
              <Lightbulb size={24} color="#FFD700" />
              <Text style={styles(theme).cardTitle}>Sleep Recommendation</Text>
            </View>
            <Text style={styles(theme).recommendationText}>
              Based on your age and sleep patterns, you should aim for{' '}
              <Text style={styles(theme).highlightText}>{getSleepRecommendation()}</Text> of sleep tonight.
            </Text>
            <Text style={styles(theme).tipText}>
              ­ƒÆí Try going to bed by 10:30 PM to get optimal rest
            </Text>
          </GlassView>

          {/* Sleep Now Button */}
          <TouchableOpacity 
            style={styles(theme).sleepButton}
            onPress={navigateToSleepSession}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.highlight]}
              style={styles(theme).sleepButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Moon size={24} color="#000" fill="#000" />
              <Text style={styles(theme).sleepButtonText}>Sleep Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles(theme).bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 5,
  },
  time: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  sleepStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.5,
  },
  insightContent: {
    marginTop: 5,
  },
  insightText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 15,
  },
  recommendationBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  noInsightBox: {
    padding: 10,
  },
  noInsightText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  controlInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  alarmTimeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    marginTop: -10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  alarmTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 10, columnGap: 10,
  },
  alarmTimeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  alarmTimeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 4, columnGap: 4,
  },
  alarmTimeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.highlight,
  },
  recommendationText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 10,
  },
  highlightText: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 14,
    color: theme.colors.premium,
    fontStyle: 'italic',
  },
  sleepButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  sleepButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
  },
  sleepButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});
