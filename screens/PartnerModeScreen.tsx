import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface PartnerData {
  name: string;
  sleepGoal: number;
  avgSleepTime: number;
  lastNightHours: number;
  sleepQuality: number;
}

interface SleepComparison {
  date: string;
  user1Hours: number;
  user2Hours: number;
  user1Quality: number;
  user2Quality: number;
}

export default function PartnerModeScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const [partner1, setPartner1] = useState<PartnerData>({
    name: 'You',
    sleepGoal: 8,
    avgSleepTime: 7.2,
    lastNightHours: 7.5,
    sleepQuality: 82,
  });
  const [partner2, setPartner2] = useState<PartnerData>({
    name: 'Partner',
    sleepGoal: 8,
    avgSleepTime: 6.9,
    lastNightHours: 6.8,
    sleepQuality: 75,
  });
  const [history, setHistory] = useState<SleepComparison[]>([
    { date: '2026-01-07', user1Hours: 7.5, user2Hours: 6.8, user1Quality: 82, user2Quality: 75 },
    { date: '2026-01-06', user1Hours: 7.8, user2Hours: 7.2, user1Quality: 85, user2Quality: 80 },
    { date: '2026-01-05', user1Hours: 6.5, user2Hours: 6.0, user1Quality: 70, user2Quality: 68 },
    { date: '2026-01-04', user1Hours: 8.2, user2Hours: 7.5, user1Quality: 88, user2Quality: 82 },
    { date: '2026-01-03', user1Hours: 7.0, user2Hours: 6.5, user1Quality: 78, user2Quality: 72 },
    { date: '2026-01-02', user1Hours: 7.3, user2Hours: 7.0, user1Quality: 80, user2Quality: 76 },
    { date: '2026-01-01', user1Hours: 8.5, user2Hours: 8.0, user1Quality: 90, user2Quality: 87 },
  ]);
  const [editingPartner, setEditingPartner] = useState<1 | 2 | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'history' | 'insights'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p1Data, p2Data, historyData] = await Promise.all([
        AsyncStorage.getItem('partner1_data'),
        AsyncStorage.getItem('partner2_data'),
        AsyncStorage.getItem('partner_sleep_history'),
      ]);
      
      if (p1Data) setPartner1(JSON.parse(p1Data));
      if (p2Data) setPartner2(JSON.parse(p2Data));
      if (historyData) setHistory(JSON.parse(historyData));
    } catch (error) {
      console.error('Error loading partner data:', error);
    }
  };

  const savePartnerData = async (partnerNum: 1 | 2, data: PartnerData) => {
    try {
      await AsyncStorage.setItem(`partner${partnerNum}_data`, JSON.stringify(data));
      if (partnerNum === 1) setPartner1(data);
      else setPartner2(data);
      setEditingPartner(null);
    } catch (error) {
      console.error('Error saving partner data:', error);
    }
  };

  const renderPartnerCard = (partner: PartnerData, partnerNum: 1 | 2) => {
    const isEditing = editingPartner === partnerNum;
    const goalProgress = (partner.lastNightHours / partner.sleepGoal) * 100;

    return (
      <View style={[styles.partnerCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.partnerHeader}>
          {isEditing ? (
            <TextInput
              style={[styles.nameInput, { color: theme.colors.textPrimary, borderColor: theme.colors.backgroundSecondary }]}
              value={partner.name}
              onChangeText={(text) => {
                if (partnerNum === 1) setPartner1({ ...partner1, name: text });
                else setPartner2({ ...partner2, name: text });
              }}
              placeholder="Partner name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          ) : (
            <Text style={[styles.partnerName, { color: theme.colors.textPrimary }]}>{partner.name}</Text>
          )}
          <TouchableOpacity
            onPress={() => isEditing ? savePartnerData(partnerNum, partner) : setEditingPartner(partnerNum)}
            style={[styles.editButton, { backgroundColor: theme.colors.accent }]}
          >
            <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              {partner.lastNightHours.toFixed(1)}h
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Last Night</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              {partner.avgSleepTime.toFixed(1)}h
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Avg Sleep</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
              {partner.sleepQuality}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Quality</Text>
          </View>
        </View>

        <View style={styles.goalSection}>
          <Text style={[styles.goalLabel, { color: theme.colors.textSecondary }]}>
            Sleep Goal: {partner.sleepGoal}h
          </Text>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.backgroundSecondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: goalProgress >= 100 ? '#4ade80' : theme.colors.accent,
                  width: `${Math.min(goalProgress, 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  const getWinner = () => {
    if (partner1.sleepQuality > partner2.sleepQuality) return partner1.name;
    if (partner2.sleepQuality > partner1.sleepQuality) return partner2.name;
    return 'Tie';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Partner Sleep Tracking</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Track & compare sleep patterns
          </Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, selectedView === 'overview' && { backgroundColor: theme.colors.accent }]}
          onPress={() => setSelectedView('overview')}
        >
          <Ionicons name="stats-chart" size={20} color={selectedView === 'overview' ? '#fff' : theme.colors.textSecondary} />
          <Text style={[styles.tabText, selectedView === 'overview' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedView === 'history' && { backgroundColor: theme.colors.accent }]}
          onPress={() => setSelectedView('history')}
        >
          <Ionicons name="calendar" size={20} color={selectedView === 'history' ? '#fff' : theme.colors.textSecondary} />
          <Text style={[styles.tabText, selectedView === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedView === 'insights' && { backgroundColor: theme.colors.accent }]}
          onPress={() => setSelectedView('insights')}
        >
          <Ionicons name="bulb" size={20} color={selectedView === 'insights' ? '#fff' : theme.colors.textSecondary} />
          <Text style={[styles.tabText, selectedView === 'insights' && styles.tabTextActive]}>Insights</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedView === 'overview' && (
          <>
            {renderPartnerCard(partner1, 1)}
            {renderPartnerCard(partner2, 2)}

            <View style={[styles.comparisonCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Sleep Comparison</Text>
              
              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: theme.colors.textSecondary }]}>
                  Total Hours (Last Night)
                </Text>
                <View style={styles.comparisonValues}>
                  <Text style={[styles.comparisonValue, { color: theme.colors.textPrimary }]}>
                    {partner1.lastNightHours.toFixed(1)}h
                  </Text>
                  <Text style={[styles.comparisonVs, { color: theme.colors.textSecondary }]}>vs</Text>
                  <Text style={[styles.comparisonValue, { color: theme.colors.textPrimary }]}>
                    {partner2.lastNightHours.toFixed(1)}h
                  </Text>
                </View>
              </View>

              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: theme.colors.textSecondary }]}>
                  Sleep Quality
                </Text>
                <View style={styles.comparisonValues}>
                  <Text style={[styles.comparisonValue, { color: theme.colors.textPrimary }]}>
                    {partner1.sleepQuality}%
                  </Text>
                  <Text style={[styles.comparisonVs, { color: theme.colors.textSecondary }]}>vs</Text>
                  <Text style={[styles.comparisonValue, { color: theme.colors.textPrimary }]}>
                    {partner2.sleepQuality}%
                  </Text>
                </View>
              </View>

              <View style={styles.comparisonRow}>
                <Text style={[styles.comparisonLabel, { color: theme.colors.textSecondary }]}>
                  7-Day Average
                </Text>
                <View style={styles.comparisonValues}>
                  <Text style={[styles.comparisonValue, { color: theme.colors.textPrimary }]}>
                    {partner1.avgSleepTime.toFixed(1)}h
                  </Text>
                  <Text style={[styles.comparisonVs, { color: theme.colors.textSecondary }]}>vs</Text>
                  <Text style={[styles.comparisonValue, { color: theme.colors.textPrimary }]}>
                    {partner2.avgSleepTime.toFixed(1)}h
                  </Text>
                </View>
              </View>

              <View style={[styles.winnerBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                <Text style={[styles.winnerText, { color: theme.colors.accent }]}>
                  🏆 Better Sleep Quality: {getWinner()}
                </Text>
              </View>
            </View>
          </>
        )}

        {selectedView === 'history' && (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>7-Day History</Text>
            {history.map((day) => (
              <View key={day.date} style={[styles.historyCard, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.historyDate, { color: theme.colors.textPrimary }]}>
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <View style={styles.historyRow}>
                  <View style={styles.historyPartner}>
                    <Text style={[styles.historyName, { color: theme.colors.textSecondary }]}>{partner1.name}</Text>
                    <Text style={[styles.historyHours, { color: theme.colors.accent }]}>{day.user1Hours}h</Text>
                    <Text style={[styles.historyQuality, { color: theme.colors.textSecondary }]}>{day.user1Quality}% quality</Text>
                  </View>
                  <View style={styles.historyDivider} />
                  <View style={styles.historyPartner}>
                    <Text style={[styles.historyName, { color: theme.colors.textSecondary }]}>{partner2.name}</Text>
                    <Text style={[styles.historyHours, { color: theme.colors.accent }]}>{day.user2Hours}h</Text>
                    <Text style={[styles.historyQuality, { color: theme.colors.textSecondary }]}>{day.user2Quality}% quality</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {selectedView === 'insights' && (
          <View>
            <View style={[styles.insightCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.insightHeader}>
                <Ionicons name="trending-up" size={24} color="#4ade80" />
                <Text style={[styles.insightTitle, { color: theme.colors.textPrimary }]}>Sleep Trends</Text>
              </View>
              <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                • {partner1.name} averages {partner1.avgSleepTime.toFixed(1)} hours per night
              </Text>
              <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                • {partner2.name} averages {partner2.avgSleepTime.toFixed(1)} hours per night
              </Text>
              <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                • Sleep difference: {Math.abs(partner1.avgSleepTime - partner2.avgSleepTime).toFixed(1)} hours
              </Text>
            </View>

            <View style={[styles.insightCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.insightHeader}>
                <Ionicons name="moon" size={24} color="#a78bfa" />
                <Text style={[styles.insightTitle, { color: theme.colors.textPrimary }]}>Sleep Quality</Text>
              </View>
              <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                • {partner1.name}: {partner1.sleepQuality}% quality ({partner1.sleepQuality >= 80 ? 'Excellent' : partner1.sleepQuality >= 70 ? 'Good' : 'Needs Improvement'})
              </Text>
              <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                • {partner2.name}: {partner2.sleepQuality}% quality ({partner2.sleepQuality >= 80 ? 'Excellent' : partner2.sleepQuality >= 70 ? 'Good' : 'Needs Improvement'})
              </Text>
            </View>

            <View style={[styles.insightCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.insightHeader}>
                <Ionicons name="fitness" size={24} color="#f59e0b" />
                <Text style={[styles.insightTitle, { color: theme.colors.textPrimary }]}>Recommendations</Text>
              </View>
              {partner1.avgSleepTime < 7 && (
                <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                  • {partner1.name} should aim for 7-9 hours of sleep
                </Text>
              )}
              {partner2.avgSleepTime < 7 && (
                <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                  • {partner2.name} should aim for 7-9 hours of sleep
                </Text>
              )}
              {Math.abs(partner1.avgSleepTime - partner2.avgSleepTime) > 1 && (
                <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                  • Consider syncing bedtimes for better sleep harmony
                </Text>
              )}
              <Text style={[styles.insightText, { color: theme.colors.textSecondary }]}>
                • Maintain consistent sleep schedules together
              </Text>
            </View>

            <View style={[styles.tipsCard, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Couple's Sleep Tips</Text>
              <View style={styles.tipItem}>
                <Ionicons name="bed" size={20} color={theme.colors.accent} style={styles.tipIcon} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  Go to bed at the same time to sync sleep schedules
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="phone-portrait" size={20} color={theme.colors.accent} style={styles.tipIcon} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  Create a phone-free bedroom policy 30 minutes before sleep
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="thermometer" size={20} color={theme.colors.accent} style={styles.tipIcon} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  Find a comfortable room temperature (60-67°F / 16-19°C)
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="volume-mute" size={20} color={theme.colors.accent} style={styles.tipIcon} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  Use white noise or earplugs if partner snores
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="fitness" size={20} color={theme.colors.accent} style={styles.tipIcon} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  Exercise together but not within 3 hours of bedtime
                </Text>
              </View>
            </View>
          </View>
        )}
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
  partnerCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  partnerName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    padding: 4,
    flex: 1,
    marginRight: 12,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  goalSection: {
    marginTop: 12,
  },
  goalLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  comparisonCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  comparisonRow: {
    marginBottom: 16,
  },
  comparisonLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  comparisonVs: {
    fontSize: 14,
    marginHorizontal: 16,
  },
  winnerBadge: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  winnerText: {
    fontSize: 16,
    fontWeight: '600',
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
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  tabBar: {
    flexDirection: 'row',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  historyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyPartner: {
    flex: 1,
    alignItems: 'center',
  },
  historyName: {
    fontSize: 12,
    marginBottom: 4,
  },
  historyHours: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  historyQuality: {
    fontSize: 12,
  },
  historyDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  insightCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
});


