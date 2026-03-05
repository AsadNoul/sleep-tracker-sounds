import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SleepStage {
  timestamp: number;
  stage: 'awake' | 'light' | 'deep' | 'rem';
  movement: number;
}

export default function SleepStagesScreen() {
  const { theme } = useAppTheme(); const navigation = useNavigation(); const [currentStage, setCurrentStage] = useState<string>('awake');
  const [stageHistory, setStageHistory] = useState<SleepStage[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [smartAlarm, setSmartAlarm] = useState(false);
  const [wakeUpTime, setWakeUpTime] = useState('07:00');
  const [alarmTriggered, setAlarmTriggered] = useState(false);

  useEffect(() => {
    loadSettings();
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

    // 30 min window before target
    const windowStart = new Date(target.getTime() - 30 * 60 * 1000);

    if (now >= windowStart && now <= target) {
      if (stage === 'light' || stage === 'awake') {
        triggerAlarm();
      }
    } else if (now > target && !alarmTriggered) {
      triggerAlarm(); // Forced wake up at latest time
    }
  };

  const triggerAlarm = () => {
    setAlarmTriggered(true);
    Alert.alert("Smart Wake Up", "Good morning! You're in a light sleep phase, the perfect time to wake up.", [
      { text: "Stop", onPress: () => setAlarmTriggered(false) }
    ]);
  };

  useEffect(() => {
    loadStageHistory();
  }, []);

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

      // Simple sleep stage detection based on movement
      let stage: 'awake' | 'light' | 'deep' | 'rem' = 'deep';
      if (movement > 0.15) stage = 'awake';
      else if (movement > 0.08) stage = 'light';
      else if (movement > 0.05) stage = 'rem';

      setCurrentStage(stage);
      checkAlarm(stage);

      const newStage: SleepStage = {
        timestamp: Date.now(),
        stage,
        movement
      };

      setStageHistory(prev => {
        const updated = [...prev, newStage].slice(-1000); // Keep last 1000 entries
        saveStageHistory(updated);
        return updated;
      });
    });

    Accelerometer.setUpdateInterval(5000); // Check every 5 seconds

    return () => subscription.remove();
  }, [isTracking]);

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'awake': return '#ff6b6b';
      case 'light': return '#4ecdc4';
      case 'deep': return '#45b7d1';
      case 'rem': return '#a855f7';
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

  const [insight, setInsight] = useState<string>('Analyzing your sleep patterns...');

  useEffect(() => {
    generateInsight();
  }, [stageHistory]);

  const generateInsight = async () => {
    try {
      const caffeineData = await AsyncStorage.getItem('caffeine_logs');
      const snores = await AsyncStorage.getItem('snore_events');

      let msg = "Your sleep architecture looks balanced today.";

      if (caffeineData) {
        const logs = JSON.parse(caffeineData);
        const lateCaffeine = logs.filter((l: any) => new Date(l.time).getHours() > 16);
        if (lateCaffeine.length > 0 && deepSleepPercent < 20) {
          msg = "Late caffeine intake likely suppressed your deep sleep. Try avoiding caffeine after 4 PM.";
        }
      } else if (snores) {
        const events = JSON.parse(snores);
        if (events.length > 10) {
          msg = "Frequent snoring detected. This may be causing micro-awakenings and light sleep.";
        }
      }

      setInsight(msg);
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Sleep Stages</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Real-time sleep stage detection
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.currentStage, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.stageLabel, { color: theme.colors.textSecondary }]}>
            {isTracking ? 'Monitoring Active' : 'Ready to Track'}
          </Text>
          <View style={[styles.stageBadge, { backgroundColor: isTracking ? getStageColor(currentStage) : 'rgba(255,255,255,0.1)' }]}>
            <Text style={styles.stageName}>
              {isTracking ? currentStage.toUpperCase() : 'SLEEPING'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: isTracking ? '#ff6b6b' : theme.colors.accent }
            ]}
            onPress={() => setIsTracking(!isTracking)}
          >
            <Ionicons
              name={isTracking ? "stop-circle" : "play-circle"}
              size={24}
              color="#fff"
            />
            <Text style={styles.mainButtonText}>
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.alarmCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.alarmHeader}>
            <Ionicons name="alarm" size={24} color={theme.colors.accent} />
            <Text style={[styles.alarmTitle, { color: theme.colors.textPrimary }]}>Smart Alarm</Text>
            <TouchableOpacity onPress={toggleAlarm} style={[styles.toggle, smartAlarm && { backgroundColor: theme.colors.accent }]}>
              <View style={[styles.toggleKnob, smartAlarm && { transform: [{ translateX: 20 }] }]} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.alarmDesc, { color: theme.colors.textSecondary }]}>
            Wakes you up in an optimal light sleep phase between {wakeUpTime.split(':')[0]}:{(Number(wakeUpTime.split(':')[1]) - 30 < 0 ? '30' : '30')} and {wakeUpTime}.
          </Text>
        </View>

        <View style={[styles.intelligenceCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.intelHeader}>
            <Sparkles size={20} color={theme.colors.premium || '#FFD700'} />
            <Text style={[styles.intelTitle, { color: theme.colors.textPrimary }]}>Sleep Intelligence</Text>
          </View>
          <Text style={[styles.intelText, { color: theme.colors.textSecondary }]}>{insight}</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>Sleep Quality Score</Text>
            <Text style={[styles.scoreValue, { color: theme.colors.accent }]}>{Math.round(sleepScore)}/100</Text>
          </View>
        </View>

        <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Sleep Distribution</Text>

          <View style={styles.statRow}>
            <View style={[styles.statBar, { width: `${(stageStats.awake / total) * 100}%`, backgroundColor: '#ff6b6b' }]} />
            <Text style={[styles.statText, { color: theme.colors.textPrimary }]}>
              Awake: {Math.round((stageStats.awake / total) * 100)}%
            </Text>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statBar, { width: `${(stageStats.light / total) * 100}%`, backgroundColor: '#4ecdc4' }]} />
            <Text style={[styles.statText, { color: theme.colors.textPrimary }]}>
              Light Sleep: {Math.round((stageStats.light / total) * 100)}%
            </Text>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statBar, { width: `${(stageStats.deep / total) * 100}%`, backgroundColor: '#45b7d1' }]} />
            <Text style={[styles.statText, { color: theme.colors.textPrimary }]}>
              Deep Sleep: {Math.round((stageStats.deep / total) * 100)}%
            </Text>
          </View>

          <View style={styles.statRow}>
            <View style={[styles.statBar, { width: `${(stageStats.rem / total) * 100}%`, backgroundColor: '#a855f7' }]} />
            <Text style={[styles.statText, { color: theme.colors.textPrimary }]}>
              REM Sleep: {Math.round((stageStats.rem / total) * 100)}%
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.infoTitle, { color: theme.colors.textPrimary }]}>How it works</Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Sleep stages are detected using your phone's accelerometer. Place your phone on the mattress near your pillow for accurate tracking.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  currentStage: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  stageLabel: {
    fontSize: 14,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stageBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  stageName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statsContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statRow: {
    marginBottom: 16,
  },
  statBar: {
    height: 32,
    borderRadius: 8,
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
  },
  infoCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  alarmCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  alarmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  alarmTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  alarmDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  intelligenceCard: {
    margin: 20,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    backgroundColor: 'rgba(255,215,0,0.02)',
  },
  intelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  intelTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  intelText: {
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
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 24,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


