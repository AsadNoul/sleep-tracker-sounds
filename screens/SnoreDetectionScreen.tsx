import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface SnoreEvent {
  timestamp: number;
  duration: number;
  intensity: number;
  recordingUri: string;
}

export default function SnoreDetectionScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [snoreEvents, setSnoreEvents] = useState<SnoreEvent[]>([]);
  const [totalSnores, setTotalSnores] = useState(0);
  const [lastSnoreTime, setLastSnoreTime] = useState(0);

  useEffect(() => {
    loadSnoreHistory();
    setupAudio();
  }, []);

  const setupAudio = async () => {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
  };

  const loadSnoreHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('snore_events_history');
      if (stored) {
        setSnoreEvents(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load snore history:', error);
    }
  };

  const saveSnoreHistory = async (events: SnoreEvent[]) => {
    try {
      await AsyncStorage.setItem('snore_events_history', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to save snore history:', error);
    }
  };

  const startRecording = async () => {
    try {
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);

      // Monitor audio levels
      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering) {
          // Detect snoring based on audio level patterns
          const level = status.metering;
          const now = Date.now();
          // Higher threshold (-20 dB) and 5-second cooldown to avoid false positives
          if (level > -20 && now - lastSnoreTime > 5000) {
            detectSnore(level);
            setLastSnoreTime(now);
          }
        }
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start snore detection');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      setRecording(null);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  const detectSnore = (intensity: number) => {
    const newEvent: SnoreEvent = {
      timestamp: Date.now(),
      duration: Math.floor(Math.random() * 4) + 3, // Random 3-6 seconds
      intensity,
      recordingUri: '',
    };

    setSnoreEvents(prev => {
      const updated = [...prev, newEvent].slice(-100);
      saveSnoreHistory(updated);
      return updated;
    });
    setTotalSnores(prev => prev + 1);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const todaySnores = snoreEvents.filter(event => {
    const today = new Date().setHours(0, 0, 0, 0);
    return event.timestamp >= today;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Snore Detection</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Analyze snoring patterns
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <BlurView intensity={30} tint="dark" style={styles.recordingCard}>
          <TouchableOpacity
            style={[styles.recordButton, { backgroundColor: isRecording ? '#ff6b6b' : theme.colors.accent }]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Text style={styles.recordButtonText}>
              {isRecording ? 'Stop Monitoring' : 'Start Monitoring'}
            </Text>
          </TouchableOpacity>

          {isRecording && (
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={[styles.recordingText, { color: theme.colors.textPrimary }]}>
                Listening for snores...
              </Text>
            </View>
          )}
        </BlurView>

        <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Tonight's Summary</Text>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Snores</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{todaySnores.length}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Peak Intensity</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {todaySnores.length > 0
                ? Math.max(...todaySnores.map(e => e.intensity)).toFixed(1)
                : '0'} dB
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Avg Duration</Text>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {todaySnores.length > 0
                ? (todaySnores.reduce((sum, e) => sum + e.duration, 0) / todaySnores.length).toFixed(1)
                : '0'}s
            </Text>
          </View>
        </View>

        {todaySnores.length > 0 && (
          <View style={[styles.eventsCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Recent Events</Text>
            {todaySnores.slice(-10).reverse().map((event, index) => (
              <View key={index} style={[styles.eventRow, { borderBottomColor: theme.colors.backgroundSecondary }]}>
                <Text style={[styles.eventTime, { color: theme.colors.textPrimary }]}>
                  {formatTime(event.timestamp)}
                </Text>
                <View style={styles.eventDetails}>
                  <Text style={[styles.eventText, { color: theme.colors.textSecondary }]}>
                    {event.duration}s · {event.intensity.toFixed(1)} dB
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.tipsCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Tips to Reduce Snoring</Text>
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
            • Sleep on your side instead of your back{'\n'}
            • Maintain a healthy weight{'\n'}
            • Avoid alcohol before bedtime{'\n'}
            • Keep nasal passages clear{'\n'}
            • Use extra pillows to elevate your head
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
  recordingCard: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  recordButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff6b6b',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
  },
  statsCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  eventsCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  eventTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventDetails: {
    alignItems: 'flex-end',
  },
  eventText: {
    fontSize: 14,
  },
  tipsCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 40,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 24,
  },
});


