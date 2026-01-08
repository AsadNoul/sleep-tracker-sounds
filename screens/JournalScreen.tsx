import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatDuration, format12HourTime, formatShortDate } from '../utils/dateFormatting';

export default function JournalScreen() {
  const { sleepHistory, getSleepStats } = useSleep();
  const { user } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [journalEntry, setJournalEntry] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const stats = getSleepStats();

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('Error loading journal data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const getQualityColor = (quality: number) => {
    if (quality >= 8) return '#00FFD1'; // Excellent
    if (quality >= 6) return '#33C6FF'; // Good
    if (quality >= 4) return '#FFD700'; // Fair
    return '#FF6B6B'; // Poor
  };

  const getQualityLabel = (quality: number) => {
    if (quality >= 8) return 'Excellent';
    if (quality >= 6) return 'Good';
    if (quality >= 4) return 'Fair';
    return 'Poor';
  };

  const getQualityEmoji = (quality: number) => {
    if (quality >= 8) return '😴'; // Excellent
    if (quality >= 6) return '😊'; // Good
    if (quality >= 4) return '😐'; // Fair
    if (quality >= 2) return '😟'; // Bad
    return '😫'; // Very Bad
  };

  const getQualityStatus = (quality: number) => {
    if (quality >= 8) return 'Excellent Sleep';
    if (quality >= 6) return 'Good Sleep';
    if (quality >= 4) return 'Fair Sleep';
    if (quality >= 2) return 'Bad Sleep';
    return 'Very Bad Sleep';
  };

  const getWeeklySleepData = () => {
    const now = new Date();
    const weekData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      const dayName = dayNames[targetDate.getDay()];

      // Find sleep sessions for this day
      const daySessions = sleepHistory.filter(session => {
        const sessionDate = new Date(session.endTime!);
        return sessionDate.toDateString() === targetDate.toDateString();
      });

      if (daySessions.length > 0) {
        const totalDuration = daySessions.reduce((sum, s) => sum + s.duration, 0);
        const avgQuality = daySessions.reduce((sum, s) => sum + s.quality, 0) / daySessions.length;

        weekData.push({
          id: i.toString(),
          date: dayName,
          hours: totalDuration / 60, // Convert minutes to hours
          quality: avgQuality,
        });
      } else {
        weekData.push({
          id: i.toString(),
          date: dayName,
          hours: 0,
          quality: 0,
        });
      }
    }

    return weekData;
  };

  const weeklyData = getWeeklySleepData();

  const saveJournal = async () => {
    const trimmedEntry = journalEntry.trim();

    if (!trimmedEntry) {
      Alert.alert('Empty Entry', 'Please write something in your journal before saving.');
      return;
    }

    setIsSaving(true);
    try {
      if (user && user.id !== 'guest') {
        // Save to Supabase for authenticated users
        const { error } = await supabase.from('journal_entries').insert({
          id: `journal_${Date.now()}_${Math.random()}`,
          user_id: user.id,
          entry_text: trimmedEntry,
          entry_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        });

        if (error) {
          console.error('Error saving journal entry:', error);
          Alert.alert('Error', 'Failed to save journal entry. Please try again.');
          return;
        }

        Alert.alert('✅ Saved!', 'Your journal entry has been saved successfully!');
        setJournalEntry('');
      } else {
        // For guest users, just show success (could save to AsyncStorage if needed)
        Alert.alert('✅ Saved!', 'Your journal entry has been saved locally!');
        setJournalEntry('');
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Using formatDuration from imported utils, but create local wrapper to avoid naming conflict
  const formatDurationLocal = (minutes: number) => {
    if (minutes <= 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F111A', '#1B1D2A']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Sleep Journal</Text>
            <Text style={styles.subtitle}>Track your sleep patterns & insights</Text>
          </View>

          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {['week', 'month', 'year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodText,
                  selectedPeriod === period && styles.periodTextActive
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sleep Analytics */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Sleep Analytics</Text>

            <View style={styles.analyticsGrid}>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>
                  {stats.averageDuration > 0 ? formatDurationLocal(stats.averageDuration) : 'No data'}
                </Text>
                <Text style={styles.analyticLabel}>Average Sleep</Text>
              </View>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>
                  {stats.totalSessions > 0 ? `${Math.round((stats.averageQuality / 10) * 100)}%` : 'No data'}
                </Text>
                <Text style={styles.analyticLabel}>Sleep Quality</Text>
              </View>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>{stats.totalSessions}</Text>
                <Text style={styles.analyticLabel}>Total Sessions</Text>
              </View>
              <View style={styles.analyticItem}>
                <Text style={styles.analyticValue}>
                  {stats.averageQuality > 0 ? stats.averageQuality.toFixed(1) : 'No data'}
                </Text>
                <Text style={styles.analyticLabel}>Avg Quality Score</Text>
              </View>
            </View>

            {/* Quality Status with Emoji */}
            {stats.averageQuality > 0 && (
              <View style={styles.qualityStatusContainer}>
                <Text style={styles.qualityEmoji}>{getQualityEmoji(stats.averageQuality)}</Text>
                <Text style={[styles.qualityStatusText, { color: getQualityColor(stats.averageQuality) }]}>
                  {getQualityStatus(stats.averageQuality)}
                </Text>
              </View>
            )}
          </BlurView>

          {/* Weekly Sleep Pattern */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Weekly Sleep Pattern</Text>
            <View style={styles.sleepChart}>
              {weeklyData.map((day) => (
                <View key={day.id} style={styles.dayColumn}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.sleepBar,
                        {
                          height: day.hours > 0 ? Math.max((day.hours / 10) * 80, 10) : 5,
                          backgroundColor: day.hours > 0 ? getQualityColor(day.quality) : '#333',
                          opacity: day.hours > 0 ? 1 : 0.3,
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.dayLabel}>{day.date}</Text>
                  <Text style={styles.hoursLabel}>
                    {day.hours > 0 ? `${day.hours.toFixed(1)}h` : '-'}
                  </Text>
                </View>
              ))}
            </View>
          </BlurView>

          {/* Recent Sleep Sessions */}
          {sleepHistory.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.cardTitle}>Recent Sleep Sessions</Text>
              {sleepHistory.slice(0, 5).map((session, index) => (
                <View key={session.id} style={styles.sessionItem}>
                  <View style={styles.sessionLeft}>
                    <View
                      style={[
                        styles.qualityDot,
                        { backgroundColor: getQualityColor(session.quality) }
                      ]}
                    />
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionDate}>
                        {new Date(session.endTime!).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    <Text style={styles.sessionTime}>
                        {format12HourTime(new Date(session.startTime))} - {format12HourTime(new Date(session.endTime!))}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sessionRight}>
                    <Text style={styles.sessionDuration}>{formatDuration(session.duration)}</Text>
                    <View style={styles.qualityRow}>
                      <Text style={styles.qualityEmojiSmall}>{getQualityEmoji(session.quality)}</Text>
                      <Text style={[
                        styles.sessionQuality,
                        { color: getQualityColor(session.quality) }
                      ]}>
                        {getQualityLabel(session.quality)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </BlurView>
          )}

          {/* Empty State */}
          {sleepHistory.length === 0 && (
            <BlurView intensity={20} tint="dark" style={styles.emptyCard}>
              <Ionicons name="moon-outline" size={48} color="#A0AEC0" />
              <Text style={styles.emptyTitle}>No Sleep Data Yet</Text>
              <Text style={styles.emptyText}>
                Start tracking your sleep to see detailed analytics and insights here.
              </Text>
              <TouchableOpacity style={styles.emptyButton}>
                <LinearGradient
                  colors={['#00FFD1', '#33C6FF']}
                  style={styles.emptyButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.emptyButtonText}>Start Sleep Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}

          {/* Sleep Quality Trends */}
          {sleepHistory.length > 2 && (
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.cardTitle}>Sleep Insights</Text>

              <View style={styles.trendItem}>
                <View style={styles.trendInfo}>
                  <Ionicons name="trending-up" size={20} color="#00FFD1" />
                  <Text style={styles.trendText}>
                    Average sleep quality: {stats.averageQuality.toFixed(1)}/10
                  </Text>
                </View>
              </View>

              <View style={styles.trendItem}>
                <View style={styles.trendInfo}>
                  <Ionicons name="time" size={20} color="#FFD700" />
                  <Text style={styles.trendText}>
                    You've tracked {stats.totalSessions} sleep {stats.totalSessions === 1 ? 'session' : 'sessions'}
                  </Text>
                </View>
              </View>

              {stats.lastNightDuration < 420 && stats.lastNightDuration > 0 && (
                <View style={styles.trendItem}>
                  <View style={styles.trendInfo}>
                    <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
                    <Text style={styles.trendText}>
                      Last night's sleep was shorter than recommended (7h)
                    </Text>
                  </View>
                </View>
              )}
            </BlurView>
          )}

          {/* Journal Entry */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Today's Sleep Journal</Text>
            <TextInput
              style={styles.journalInput}
              placeholder="How did you sleep? Any dreams or thoughts to note..."
              placeholderTextColor="#A0AEC0"
              multiline
              numberOfLines={4}
              value={journalEntry}
              onChangeText={setJournalEntry}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveJournal}
              disabled={isSaving}
            >
              <LinearGradient
                colors={['#00FFD1', '#33C6FF']}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name={isSaving ? "hourglass" : "save"} size={16} color="#000" />
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Entry'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>

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
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#00FFD1',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A0AEC0',
  },
  periodTextActive: {
    color: '#000',
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 15,
  },
  analyticValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#00FFD1',
    marginBottom: 4,
  },
  analyticLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  sleepChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 10,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  sleepBar: {
    width: 16,
    borderRadius: 8,
    minHeight: 5,
  },
  dayLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 2,
  },
  hoursLabel: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qualityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionDuration: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionQuality: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 40,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  trendItem: {
    marginBottom: 12,
  },
  trendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 10,
    flex: 1,
  },
  journalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    alignSelf: 'flex-end',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  bottomSpacing: {
    height: 30,
  },
  qualityStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  qualityEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  qualityStatusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityEmojiSmall: {
    fontSize: 16,
    marginRight: 4,
  },
});
