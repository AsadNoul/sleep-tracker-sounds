import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Play, Square, Bell, Sparkles } from 'lucide-react-native';

interface SleepStage {
  timestamp: number;
  stage: 'awake' | 'light' | 'deep' | 'rem';
  movement: number;
}

export default function SleepStagesScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const [currentStage, setCurrentStage] = useState<string>('awake');
  const [stageHistory, setStageHistory] = useState<SleepStage[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [smartAlarm, setSmartAlarm] = useState(false);
  const [wakeUpTime, setWakeUpTime] = useState('07:00');
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [insight, setInsight] = useState<string>('Analyzing your sleep patterns...');

  useEffect(() => {
    loadSettings();
    loadStageHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const alarm = await AsyncStorage.getItem('smart_alarm_enabled');
      const time = await AsyncStorage.getItem('smart_alarm_time');
      if (alarm) setSmartAlarm(JSON.parse(alarm));
      if (time) setWakeUpTime(time);
    } catch (e) { console.error(e); }
  };

  const toggleAlarm = async () => {
    const newVal = !smartAlarm;
    setSmartAlarm(newVal);
    await AsyncStorage.setItem('smart_alarm_enabled', JSON.stringify(newVal));
  };

  const checkAlarm = (stage: string) => {
    if (!smartAlarm || !isTracking || alarmTriggered) return;

    const now = new Date();
    const [h, m] = wakeUpTime.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);

    const windowStart = new Date(target.getTime() - 30 * 60 * 1000);

    if (now >= windowStart && now <= target) {
      if (stage === 'light' || stage === 'awake') {
        triggerAlarm();
      }
    } else if (now > target && !alarmTriggered) {
      triggerAlarm();
    }
  };

  const triggerAlarm = () => {
    setAlarmTriggered(true);
    Alert.alert('Smart Wake Up', "Good morning! You're in a light sleep phase, the perfect time to wake up.", [
      { text: 'Stop', onPress: () => setAlarmTriggered(false) },
    ]);
  };

  const loadStageHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('sleep_stages_history');
      if (stored) {
        setStageHistory(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load stage history:', error);
    }
  };

  const saveStageHistory = async (history: SleepStage[]) => {
    try {
      await AsyncStorage.setItem('sleep_stages_history', JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save stage history:', error);
    }
  };

  useEffect(() => {
    if (!isTracking) return;

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const movement = Math.sqrt(x * x + y * y + z * z);

      let stage: 'awake' | 'light' | 'deep' | 'rem' = 'deep';
      if (movement > 0.15) stage = 'awake';
      else if (movement > 0.08) stage = 'light';
      else if (movement > 0.05) stage = 'rem';

      setCurrentStage(stage);
      checkAlarm(stage);

      const newStage: SleepStage = {
        timestamp: Date.now(),
        stage,
        movement,
      };

      setStageHistory(prev => {
        const updated = [...prev, newStage].slice(-1000);
        saveStageHistory(updated);
        return updated;
      });
    });

    Accelerometer.setUpdateInterval(5000);

    return () => subscription.remove();
  }, [isTracking]);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'awake': return theme.colors.error;
      case 'light': return theme.colors.highlight;
      case 'deep': return theme.colors.accent;
      case 'rem': return '#A78BFA';
      default: return theme.colors.textPrimary;
    }
  };

  const stageStats = {
    awake: stageHistory.filter(s => s.stage === 'awake').length,
    light: stageHistory.filter(s => s.stage === 'light').length,
    deep: stageHistory.filter(s => s.stage === 'deep').length,
    rem: stageHistory.filter(s => s.stage === 'rem').length,
  };

  const total = Object.values(stageStats).reduce((a, b) => a + b, 0) || 1;
  const deepSleepPercent = Math.round((stageStats.deep / total) * 100);
  const sleepScore = Math.min(100, (deepSleepPercent * 2) + (stageStats.rem / total * 100) - (stageStats.awake / total * 50));

  useEffect(() => {
    generateInsight();
  }, [stageHistory]);

  const generateInsight = async () => {
    try {
      const caffeineData = await AsyncStorage.getItem('caffeine_logs');
      const snores = await AsyncStorage.getItem('snore_events');

      let msg = 'Your sleep architecture looks balanced today.';

      if (caffeineData) {
        const logs = JSON.parse(caffeineData);
        const lateCaffeine = logs.filter((l: any) => new Date(l.time).getHours() > 16);
        if (lateCaffeine.length > 0 && deepSleepPercent < 20) {
          msg = 'Late caffeine intake likely suppressed your deep sleep. Try avoiding caffeine after 4 PM.';
        }
      } else if (snores) {
        const events = JSON.parse(snores);
        if (events.length > 10) {
          msg = 'Frequent snoring detected. This may be causing micro-awakenings and light sleep.';
        }
      }

      setInsight(msg);
    } catch (e) { console.error(e); }
  };

  const s = styles(theme);

  const DISTRIBUTION = [
    { key: 'awake' as const, label: 'Awake' },
    { key: 'light' as const, label: 'Light Sleep' },
    { key: 'deep' as const, label: 'Deep Sleep' },
    { key: 'rem' as const, label: 'REM Sleep' },
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={[s.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            Sleep Stages
          </Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            Real-time sleep stage detection
          </Text>
        </View>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.currentStageCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[s.stageLabel, { color: theme.colors.textSecondary }]}>
            {isTracking ? 'Monitoring Active' : 'Ready to Track'}
          </Text>
          <View
            style={[
              s.stageBadge,
              { backgroundColor: isTracking ? getStageColor(currentStage) : theme.colors.backgroundTertiary },
            ]}
          >
            <Text style={[s.stageName, { color: isTracking ? theme.colors.background : theme.colors.textTertiary }]}>
              {isTracking ? currentStage.toUpperCase() : 'IDLE'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              s.mainButton,
              { backgroundColor: isTracking ? theme.colors.error : theme.colors.ctaBackground },
            ]}
            onPress={() => setIsTracking(!isTracking)}
            activeOpacity={0.9}
          >
            {isTracking ? (
              <Square size={18} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
            ) : (
              <Play size={18} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
            )}
            <Text style={[s.mainButtonText, { color: theme.colors.ctaText }]}>
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={s.alarmHeader}>
            <Bell size={20} color={theme.colors.accent} />
            <Text style={[s.alarmTitle, { color: theme.colors.textPrimary }]}>Smart Alarm</Text>
            <TouchableOpacity
              onPress={toggleAlarm}
              style={[
                s.toggle,
                { backgroundColor: smartAlarm ? theme.colors.accent : theme.colors.backgroundTertiary },
              ]}
            >
              <View style={[s.toggleKnob, smartAlarm && { transform: [{ translateX: 20 }] }]} />
            </TouchableOpacity>
          </View>
          <Text style={[s.alarmDesc, { color: theme.colors.textSecondary }]}>
            Wakes you up in an optimal light sleep phase in the 30 minutes before {wakeUpTime}.
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.accentBorder }]}>
          <View style={s.intelHeader}>
            <Sparkles size={18} color={theme.colors.premium} />
            <Text style={[s.intelTitle, { color: theme.colors.textPrimary }]}>Sleep Intelligence</Text>
          </View>
          <Text style={[s.intelText, { color: theme.colors.textSecondary }]}>{insight}</Text>
          <View style={[s.scoreRow, { borderTopColor: theme.colors.cardBorder }]}>
            <Text style={[s.scoreLabel, { color: theme.colors.textSecondary }]}>Sleep Quality Score</Text>
            <Text style={[s.scoreValue, { color: theme.colors.accent }]}>{Math.round(sleepScore)}/100</Text>
          </View>
        </View>

        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            Sleep Distribution
          </Text>

          {DISTRIBUTION.map(({ key, label }) => (
            <View key={key} style={s.statRow}>
              <View style={[s.statBarTrack, { backgroundColor: theme.colors.backgroundTertiary }]}>
                <View
                  style={[
                    s.statBarFill,
                    { width: `${(stageStats[key] / total) * 100}%`, backgroundColor: getStageColor(key) },
                  ]}
                />
              </View>
              <Text style={[s.statText, { color: theme.colors.textPrimary }]}>
                {label}: {Math.round((stageStats[key] / total) * 100)}%
              </Text>
            </View>
          ))}
        </View>

        <View style={[s.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <Text style={[s.sectionTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            How it works
          </Text>
          <Text style={[s.infoText, { color: theme.colors.textSecondary }]}>
            Sleep stages are detected using your phone's accelerometer. Place your phone on the mattress near your pillow for accurate tracking.
          </Text>
        </View>

        <View style={s.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      padding: 20,
      paddingTop: 10,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: { flex: 1 },
    title: { fontSize: 22, letterSpacing: -0.2, marginBottom: 2 },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
    },
    content: { flex: 1, paddingHorizontal: 20 },
    currentStageCard: {
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      marginBottom: 16,
    },
    stageLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 14,
    },
    stageBadge: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      marginBottom: 20,
    },
    stageName: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 22,
    },
    mainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 52,
      paddingHorizontal: 28,
      borderRadius: theme.borderRadius.lg,
      columnGap: 10,
    },
    mainButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
    },
    card: {
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      padding: 20,
      marginBottom: 16,
    },
    alarmHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      marginBottom: 10,
    },
    alarmTitle: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
    },
    alarmDesc: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 18,
    },
    toggle: {
      width: 44,
      height: 24,
      borderRadius: 12,
      padding: 2,
    },
    toggleKnob: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#FFFFFF',
    },
    intelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
      marginBottom: 12,
    },
    intelTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
    },
    intelText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 16,
      fontStyle: 'italic',
    },
    scoreRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
    },
    scoreLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
    },
    scoreValue: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 22,
    },
    sectionTitle: {
      fontSize: 18,
      marginBottom: 16,
    },
    statRow: {
      marginBottom: 14,
      rowGap: 8,
    },
    statBarTrack: {
      height: 10,
      borderRadius: 5,
      overflow: 'hidden',
    },
    statBarFill: {
      height: 10,
      borderRadius: 5,
    },
    statText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
    },
    infoText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
    },
    bottomSpacing: { height: 60 },
  });
