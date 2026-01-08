import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CircularProgress from '../components/CircularProgress';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTheme } from '../contexts/ThemeContext';
import { useSleep } from '../contexts/SleepContext';
import { useBackHandler } from '../hooks/useBackHandler';
import { formatDuration, format12HourTime } from '../utils/dateFormatting';

type RootStackParamList = {
  Main: undefined;
  SleepSession: undefined;
  Profile: undefined;
};

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, isDark } = useTheme();
  const { getSleepStats, isLoading, syncStatus, syncError } = useSleep();
  const [sleepSounds, setSleepSounds] = useState(false);
  const [smartAlarm, setSmartAlarm] = useState(true);
  const [sleepRecorder, setSleepRecorder] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const sleepStats = getSleepStats();

  // Handle Android back button
  useBackHandler();

  // Setup timer first (hooks must be called before early returns)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Show loading spinner while fetching sleep history
  if (isLoading) {
    return <LoadingSpinner message="Loading your sleep data..." fullScreen />;
  }

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToSleepSession = () => {
    navigation.navigate('SleepSession');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDark ? ['#0F111A', '#1B1D2A', '#0F111A'] : [theme.background, theme.backgroundSecondary, theme.background]}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.time}>
                {format12HourTime(currentTime)}
              </Text>
            </View>
            <TouchableOpacity onPress={navigateToProfile} style={styles.profileButton}>
              <Ionicons name="person-circle" size={40} color="#00FFD1" />
            </TouchableOpacity>
          </View>

          {/* Sync Status Indicator */}
          {syncStatus !== 'idle' && (
            <View style={[
              styles.syncStatusBar,
              syncStatus === 'syncing' && styles.syncingSyncStatus,
              syncStatus === 'success' && styles.successSyncStatus,
              syncStatus === 'error' && styles.errorSyncStatus,
            ]}>
              <View style={styles.syncStatusContent}>
                {syncStatus === 'syncing' && (
                  <>
                    <ActivityIndicator size="small" color="#00FFD1" style={styles.syncStatusIcon} />
                    <Text style={styles.syncStatusText}>Saving to cloud...</Text>
                  </>
                )}
                {syncStatus === 'success' && (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#00FFD1" style={styles.syncStatusIcon} />
                    <Text style={styles.syncStatusText}>{syncError || 'Sleep data saved!'}</Text>
                  </>
                )}
                {syncStatus === 'error' && (
                  <>
                    <Ionicons name="alert-circle" size={18} color="#FF6B6B" style={styles.syncStatusIcon} />
                    <Text style={styles.syncStatusText}>{syncError || 'Failed to sync'}</Text>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Sleep Quality Card */}
          <BlurView intensity={30} tint="dark" style={styles.sleepQualityCard}>
            <Text style={styles.cardTitle}>Sleep Quality</Text>

            <View style={styles.circularProgressContainer}>
              <CircularProgress
                score={sleepStats.lastNightQuality || sleepStats.averageQuality || 0}
                size={160}
                strokeWidth={14}
              />
            </View>

            <View style={styles.sleepMetrics}>
            <View style={styles.metricItem}>
              <Ionicons name="moon" size={20} color="#00FFD1" />
              <Text style={styles.metricValue}>
                {sleepStats.lastNightDuration > 0
                  ? formatDuration(sleepStats.lastNightDuration)
                  : 'No data'}
              </Text>
              <Text style={styles.metricLabel}>Total Sleep</Text>
            </View>              <View style={styles.metricDivider} />

              <View style={styles.metricItem}>
                <Ionicons name="trending-up" size={20} color="#33C6FF" />
                <Text style={styles.metricValue}>
                  {sleepStats.lastNightWakeUps >= 0 ? `${sleepStats.lastNightWakeUps}x` : 'No data'}
                </Text>
                <Text style={styles.metricLabel}>Wake Up</Text>
              </View>
            </View>
          </BlurView>

          {/* Sleep Controls Card */}
          <BlurView intensity={30} tint="dark" style={styles.card}>
            <Text style={styles.sectionTitle}>Sleep Controls</Text>

            <View style={styles.controlItem}>
              <View style={styles.controlLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="musical-notes" size={22} color="#00FFD1" />
                </View>
                <Text style={styles.controlLabel}>Sleep Sounds</Text>
              </View>
              <Switch
                value={sleepSounds}
                onValueChange={setSleepSounds}
                trackColor={{ false: '#2A2D3A', true: 'rgba(0, 255, 209, 0.3)' }}
                thumbColor={sleepSounds ? '#00FFD1' : '#8E8E93'}
                ios_backgroundColor="#2A2D3A"
              />
            </View>

            <View style={styles.controlItem}>
              <View style={styles.controlLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(51, 198, 255, 0.15)' }]}>
                  <Ionicons name="alarm" size={22} color="#33C6FF" />
                </View>
                <Text style={styles.controlLabel}>Smart Alarm</Text>
              </View>
              <Switch
                value={smartAlarm}
                onValueChange={setSmartAlarm}
                trackColor={{ false: '#2A2D3A', true: 'rgba(51, 198, 255, 0.3)' }}
                thumbColor={smartAlarm ? '#33C6FF' : '#8E8E93'}
                ios_backgroundColor="#2A2D3A"
              />
            </View>

            <View style={[styles.controlItem, { marginBottom: 0 }]}>
              <View style={styles.controlLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(138, 92, 246, 0.15)' }]}>
                  <Ionicons name="mic" size={22} color="#8A5CF6" />
                </View>
                <Text style={styles.controlLabel}>Sleep Recorder</Text>
              </View>
              <Switch
                value={sleepRecorder}
                onValueChange={setSleepRecorder}
                trackColor={{ false: '#2A2D3A', true: 'rgba(138, 92, 246, 0.3)' }}
                thumbColor={sleepRecorder ? '#8A5CF6' : '#8E8E93'}
                ios_backgroundColor="#2A2D3A"
              />
            </View>
          </BlurView>

          {/* Sleep Recommendation Card */}
          <BlurView intensity={30} tint="dark" style={styles.card}>
            <View style={styles.recommendationHeader}>
              <Ionicons name="bulb" size={24} color="#FFD700" />
              <Text style={styles.sectionTitle}>Sleep Recommendation</Text>
            </View>

            <Text style={styles.recommendationText}>
              Based on your age and sleep patterns, you should aim for 7-9 hours of sleep tonight.
            </Text>

            <View style={styles.tipContainer}>
              <Ionicons name="time-outline" size={18} color="#00FFD1" />
              <Text style={styles.tipText}>
                Try going to bed by 10:30 PM to get optimal rest.
              </Text>
            </View>
          </BlurView>

          {/* Sleep Now Button */}
          <TouchableOpacity
            style={styles.sleepNowButton}
            onPress={navigateToSleepSession}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#00FFD1', '#33C6FF']}
              style={styles.sleepNowGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="moon" size={24} color="#0F111A" />
              <Text style={styles.sleepNowText}>Sleep Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F111A',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  time: {
    fontSize: 15,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  profileButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncStatusBar: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  syncingSyncStatus: {
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.3)',
  },
  successSyncStatus: {
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.3)',
  },
  errorSyncStatus: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  syncStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncStatusIcon: {
    marginRight: 8,
  },
  syncStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sleepQualityCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.8)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  circularProgressContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  sleepMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    color: '#A0AEC0',
  },
  metricDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  controlItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  controlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 209, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  controlLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationText: {
    fontSize: 15,
    color: '#A0AEC0',
    lineHeight: 22,
    marginBottom: 16,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 209, 0.08)',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#00FFD1',
  },
  tipText: {
    fontSize: 14,
    color: '#00FFD1',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  sleepNowButton: {
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#00FFD1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sleepNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  sleepNowText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F111A',
    marginLeft: 10,
  },
  bottomSpacing: {
    height: 30,
  },
});
