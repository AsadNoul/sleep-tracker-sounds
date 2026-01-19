import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SleepStage {
  timestamp: number;
  stage: 'awake' | 'light' | 'deep' | 'rem';
  movement: number;
}

export default function SleepStagesScreen() {
  const { theme } = useAppTheme();  const navigation = useNavigation();  const [currentStage, setCurrentStage] = useState<string>('awake');
  const [stageHistory, setStageHistory] = useState<SleepStage[]>([]);
  const [isTracking, setIsTracking] = useState(false);

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
        <Text style={[styles.stageLabel, { color: theme.colors.textSecondary }]}>Current Stage</Text>
        <View style={[styles.stageBadge, { backgroundColor: getStageColor(currentStage) }]}>
          <Text style={styles.stageName}>{currentStage.toUpperCase()}</Text>
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
});


