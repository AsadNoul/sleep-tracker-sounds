import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer } from 'expo-sensors';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Interruption {
  id: string;
  timestamp: Date;
  duration: number; // minutes awake
  type: 'movement' | 'manual' | 'detected';
  notes?: string;
}

interface NightData {
  date: string;
  interruptions: Interruption[];
  totalInterruptions: number;
  totalAwakeTime: number;
  sleepEfficiency: number;
}

export default function SleepInterruptionsScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const [isTracking, setIsTracking] = useState(false);
  const [currentNight, setCurrentNight] = useState<Interruption[]>([]);
  const [history, setHistory] = useState<NightData[]>([]);
  const [lastMovement, setLastMovement] = useState<number>(0);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    let subscription: any;

    if (isTracking) {
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // Detect significant movement (possible awakening)
        if (magnitude > 0.3 && now - lastMovement > 60000) {
          // At least 1 minute between detections
          detectInterruption();
          setLastMovement(now);
        }
      });
      Accelerometer.setUpdateInterval(1000);
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, [isTracking, lastMovement]);

  const loadHistory = async () => {
    try {
      const data = await AsyncStorage.getItem('sleep_interruptions_history');
      if (data) {
        const parsed = JSON.parse(data);
        setHistory(parsed.map((night: NightData) => ({
          ...night,
          interruptions: night.interruptions.map(i => ({
            ...i,
            timestamp: new Date(i.timestamp),
          })),
        })));
      }
    } catch (error) {
      console.error('Error loading interruptions:', error);
    }
  };

  const saveHistory = async (nights: NightData[]) => {
    try {
      await AsyncStorage.setItem('sleep_interruptions_history', JSON.stringify(nights));
      setHistory(nights);
    } catch (error) {
      console.error('Error saving interruptions:', error);
    }
  };

  const detectInterruption = () => {
    const newInterruption: Interruption = {
      id: Date.now().toString(),
      timestamp: new Date(),
      duration: 5, // Estimate 5 minutes
      type: 'detected',
    };
    setCurrentNight([...currentNight, newInterruption]);
  };

  const logManualInterruption = () => {
    const newInterruption: Interruption = {
      id: Date.now().toString(),
      timestamp: new Date(),
      duration: 10, // Default 10 minutes
      type: 'manual',
    };
    setCurrentNight([...currentNight, newInterruption]);
  };

  const startTracking = () => {
    setIsTracking(true);
    setCurrentNight([]);
  };

  const stopTracking = () => {
    setIsTracking(false);
    if (currentNight.length > 0) {
      const totalAwakeTime = currentNight.reduce((sum, i) => sum + i.duration, 0);
      const assumedSleepTime = 480; // 8 hours in minutes
      const sleepEfficiency = ((assumedSleepTime - totalAwakeTime) / assumedSleepTime) * 100;

      const nightData: NightData = {
        date: new Date().toISOString().split('T')[0],
        interruptions: currentNight,
        totalInterruptions: currentNight.length,
        totalAwakeTime,
        sleepEfficiency: Math.max(0, sleepEfficiency),
      };

      saveHistory([nightData, ...history.slice(0, 29)]);
      setCurrentNight([]);
    }
  };

  const getInterruptionColor = (count: number) => {
    if (count <= 2) return '#4ade80';
    if (count <= 4) return '#fbbf24';
    return '#ef4444';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Sleep Interruptions</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Track wake-ups & disturbances
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.trackingCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {isTracking ? 'Currently Tracking' : 'Start Tracking Tonight'}
          </Text>
          
          {isTracking && (
            <View style={styles.currentStats}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                  {currentNight.length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Interruptions
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                  {currentNight.reduce((sum, i) => sum + i.duration, 0)}m
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Awake Time
                </Text>
              </View>
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.trackButton,
                { backgroundColor: isTracking ? '#ef4444' : theme.colors.accent },
              ]}
              onPress={isTracking ? stopTracking : startTracking}
            >
              <Text style={styles.trackButtonText}>
                {isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </Text>
            </TouchableOpacity>
            
            {isTracking && (
              <TouchableOpacity
                style={[styles.logButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                onPress={logManualInterruption}
              >
                <Text style={[styles.logButtonText, { color: theme.colors.textPrimary }]}>
                  Log Wake-Up
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isTracking && currentNight.length > 0 && (
            <View style={styles.currentList}>
              <Text style={[styles.listTitle, { color: theme.colors.textPrimary }]}>Tonight's Wake-Ups</Text>
              {currentNight.map((interruption) => (
                <View key={interruption.id} style={styles.listItem}>
                  <Text style={[styles.listTime, { color: theme.colors.textPrimary }]}>
                    {formatTime(interruption.timestamp)}
                  </Text>
                  <Text style={[styles.listDuration, { color: theme.colors.textSecondary }]}>
                    {interruption.duration}m
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>30-Day Summary</Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {history.length > 0
                  ? (
                      history.reduce((sum, n) => sum + n.totalInterruptions, 0) / history.length
                    ).toFixed(1)
                  : '0'}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Avg Interruptions/Night
              </Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>
                {history.length > 0
                  ? (
                      history.reduce((sum, n) => sum + n.sleepEfficiency, 0) / history.length
                    ).toFixed(0)
                  : '0'}
                %
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
                Avg Sleep Efficiency
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.historyCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Recent Nights</Text>
          {history.slice(0, 7).map((night) => (
            <View key={night.date} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={[styles.historyDate, { color: theme.colors.textPrimary }]}>{night.date}</Text>
                <Text style={[styles.historyInfo, { color: theme.colors.textSecondary }]}>
                  {night.totalAwakeTime}m awake · {night.sleepEfficiency.toFixed(0)}% efficiency
                </Text>
              </View>
              <View
                style={[
                  styles.interruptionBadge,
                  { backgroundColor: getInterruptionColor(night.totalInterruptions) + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.interruptionCount,
                    { color: getInterruptionColor(night.totalInterruptions) },
                  ]}
                >
                  {night.totalInterruptions}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.tipsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Reduce Interruptions</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🚰</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Limit fluids 2 hours before bed
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🌡️</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Keep room temperature between 60-67°F
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🔇</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Use white noise to mask disturbing sounds
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>🛏️</Text>
            <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
              Invest in comfortable, supportive mattress
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  trackingCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  currentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  trackButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentList: {
    marginTop: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  listTime: {
    fontSize: 14,
  },
  listDuration: {
    fontSize: 14,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryBox: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  historyCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  historyLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyInfo: {
    fontSize: 12,
  },
  interruptionBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interruptionCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tipsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

