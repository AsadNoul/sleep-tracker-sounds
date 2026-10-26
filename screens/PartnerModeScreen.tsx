import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  BarChart3,
  Calendar,
  Lightbulb,
  TrendingUp,
  Moon,
  Dumbbell,
  Bed,
  Smartphone,
  Thermometer,
  VolumeX,
} from 'lucide-react-native';

// ============================================================================
// Partner Mode (redesign/ui-ux-v3)
// ============================================================================
// Rebuilt to match the design canvas's `Hl-Partner.dc.html` / `D-Hl-Partner.dc.html`
// (main view) plus `Gp-PartnerHistory.dc.html` / `D-Gp-PartnerHistory.dc.html`
// (History tab) and `Gp-PartnerInsights.dc.html` / `D-Gp-PartnerInsights.dc.html`
// (Insights tab): back button + Fraunces title, a 3-way segmented nav
// (Overview/History/Insights) matching the screen's existing selectedView
// tabs, bordered cards with grid comparison rows, and insight callout cards
// with an icon chip + bold title + body text.
//
// Canvas/real-feature note: the canvas depicts a *connected* partner account
// ("Connected with Sam", live Sleep Print rings, a "Nudge Sam" action, and
// snore-correlation insights) — i.e. a two-device social/sync feature. The
// real screen has no such backend: `partner1`/`partner2` are two manually
// edited local profiles (name + stats you type in yourself), persisted to
// AsyncStorage, with no invite/connection/snore-cross-reference logic. I
// did NOT invent that connected-account layer. Instead I kept the canvas's
// tab nav, card system, and comparison-row/insight-card visual language,
// applied to the real editable-two-profile data: partner cards with an
// Edit/Save name field (unchanged behavior), a comparison card with
// labeled rows instead of the canvas's live Sleep Print rings (there is no
// Sleep Print data for a manually-entered partner), a History tab using
// the real 7-day `history` array in a grid-row list (no bar-chart data is
// tracked, so the canvas's paired bar chart is not fabricated), and an
// Insights tab using the real generated insight/recommendation strings
// restyled into the canvas's icon-chip insight-card pattern. All data/logic
// (state, AsyncStorage read/write, getWinner, insight text) is unchanged.
// ============================================================================

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
  const s = styles(theme);
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

  const getWinner = () => {
    if (partner1.sleepQuality > partner2.sleepQuality) return partner1.name;
    if (partner2.sleepQuality > partner1.sleepQuality) return partner2.name;
    return 'Tie';
  };

  const renderPartnerCard = (partner: PartnerData, partnerNum: 1 | 2) => {
    const isEditing = editingPartner === partnerNum;
    const goalProgress = (partner.lastNightHours / partner.sleepGoal) * 100;

    return (
      <View style={s.partnerCard} key={partnerNum}>
        <View style={s.partnerHeader}>
          {isEditing ? (
            <TextInput
              style={s.nameInput}
              value={partner.name}
              onChangeText={(text) => {
                if (partnerNum === 1) setPartner1({ ...partner1, name: text });
                else setPartner2({ ...partner2, name: text });
              }}
              placeholder="Partner name"
              placeholderTextColor={theme.colors.textTertiary}
            />
          ) : (
            <Text style={s.partnerName}>{partner.name}</Text>
          )}
          <TouchableOpacity
            onPress={() => (isEditing ? savePartnerData(partnerNum, partner) : setEditingPartner(partnerNum))}
            style={s.editButton}
            activeOpacity={0.85}
          >
            <Text style={s.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statValue}>{partner.lastNightHours.toFixed(1)}h</Text>
            <Text style={s.statLabel}>Last Night</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{partner.avgSleepTime.toFixed(1)}h</Text>
            <Text style={s.statLabel}>Avg Sleep</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statValue}>{partner.sleepQuality}%</Text>
            <Text style={s.statLabel}>Quality</Text>
          </View>
        </View>

        <View style={s.goalSection}>
          <Text style={s.goalLabel}>Sleep Goal: {partner.sleepGoal}h</Text>
          <View style={s.progressBar}>
            <View
              style={[
                s.progressFill,
                {
                  backgroundColor: goalProgress >= 100 ? theme.colors.success : theme.colors.accent,
                  width: `${Math.min(goalProgress, 100)}%` as any,
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header — back button + Fraunces title + subtitle (canvas: Hl-Partner) */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} activeOpacity={0.8}>
          <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Partner mode</Text>
          <Text style={s.subtitle}>Compare sleep with {partner2.name}</Text>
        </View>
      </View>

      {/* Segmented nav — Overview / History / Insights (canvas's 3-way nav) */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, selectedView === 'overview' && s.tabActive]}
          onPress={() => setSelectedView('overview')}
          activeOpacity={0.85}
        >
          <BarChart3 size={16} color={selectedView === 'overview' ? theme.colors.textPrimary : theme.colors.textSecondary} strokeWidth={2.2} />
          <Text style={[s.tabText, selectedView === 'overview' && s.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, selectedView === 'history' && s.tabActive]}
          onPress={() => setSelectedView('history')}
          activeOpacity={0.85}
        >
          <Calendar size={16} color={selectedView === 'history' ? theme.colors.textPrimary : theme.colors.textSecondary} strokeWidth={2.2} />
          <Text style={[s.tabText, selectedView === 'history' && s.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, selectedView === 'insights' && s.tabActive]}
          onPress={() => setSelectedView('insights')}
          activeOpacity={0.85}
        >
          <Lightbulb size={16} color={selectedView === 'insights' ? theme.colors.textPrimary : theme.colors.textSecondary} strokeWidth={2.2} />
          <Text style={[s.tabText, selectedView === 'insights' && s.tabTextActive]}>Insights</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {selectedView === 'overview' && (
          <>
            {renderPartnerCard(partner1, 1)}
            {renderPartnerCard(partner2, 2)}

            <View style={s.card}>
              <Text style={s.cardTitle}>Sleep Comparison</Text>

              <View style={s.comparisonGridRow}>
                <Text style={s.comparisonGridLabel}>Last night</Text>
                <Text style={s.comparisonGridHeader}>{partner1.name}</Text>
                <Text style={s.comparisonGridHeader}>{partner2.name}</Text>
              </View>
              <View style={s.comparisonGridRow}>
                <Text style={s.comparisonGridRowLabel}>Hours</Text>
                <Text style={s.comparisonGridValue}>{partner1.lastNightHours.toFixed(1)}h</Text>
                <Text style={s.comparisonGridValue}>{partner2.lastNightHours.toFixed(1)}h</Text>
              </View>
              <View style={s.comparisonGridRow}>
                <Text style={s.comparisonGridRowLabel}>Quality</Text>
                <Text style={s.comparisonGridValue}>{partner1.sleepQuality}%</Text>
                <Text style={s.comparisonGridValue}>{partner2.sleepQuality}%</Text>
              </View>
              <View style={[s.comparisonGridRow, { borderBottomWidth: 0 }]}>
                <Text style={s.comparisonGridRowLabel}>7-day avg</Text>
                <Text style={s.comparisonGridValue}>{partner1.avgSleepTime.toFixed(1)}h</Text>
                <Text style={s.comparisonGridValue}>{partner2.avgSleepTime.toFixed(1)}h</Text>
              </View>

              <View style={s.winnerBadge}>
                <Text style={s.winnerText}>Better sleep quality: {getWinner()}</Text>
              </View>
            </View>
          </>
        )}

        {selectedView === 'history' && (
          <View>
            <Text style={s.sectionLabel}>7-day history</Text>
            <View style={s.card}>
              {history.map((day, index) => (
                <View
                  key={day.date}
                  style={[s.historyRow, index === history.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={s.historyDate}>
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={s.historyValuesRow}>
                    <View style={s.historyPartnerCol}>
                      <Text style={s.historyName}>{partner1.name}</Text>
                      <Text style={s.historyHours}>{day.user1Hours}h</Text>
                      <Text style={s.historyQuality}>{day.user1Quality}% quality</Text>
                    </View>
                    <View style={s.historyDivider} />
                    <View style={s.historyPartnerCol}>
                      <Text style={s.historyName}>{partner2.name}</Text>
                      <Text style={s.historyHours}>{day.user2Hours}h</Text>
                      <Text style={s.historyQuality}>{day.user2Quality}% quality</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {selectedView === 'insights' && (
          <View>
            <View style={s.insightCard}>
              <View style={s.insightIconCircle}>
                <TrendingUp size={18} color={theme.colors.success} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.insightTitle}>Sleep trends</Text>
                <Text style={s.insightText}>
                  {partner1.name} averages {partner1.avgSleepTime.toFixed(1)} hours per night
                </Text>
                <Text style={s.insightText}>
                  {partner2.name} averages {partner2.avgSleepTime.toFixed(1)} hours per night
                </Text>
                <Text style={[s.insightText, { marginBottom: 0 }]}>
                  Sleep difference: {Math.abs(partner1.avgSleepTime - partner2.avgSleepTime).toFixed(1)} hours
                </Text>
              </View>
            </View>

            <View style={s.insightCard}>
              <View style={s.insightIconCircle}>
                <Moon size={18} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.insightTitle}>Sleep quality</Text>
                <Text style={s.insightText}>
                  {partner1.name}: {partner1.sleepQuality}% quality (
                  {partner1.sleepQuality >= 80 ? 'Excellent' : partner1.sleepQuality >= 70 ? 'Good' : 'Needs Improvement'})
                </Text>
                <Text style={[s.insightText, { marginBottom: 0 }]}>
                  {partner2.name}: {partner2.sleepQuality}% quality (
                  {partner2.sleepQuality >= 80 ? 'Excellent' : partner2.sleepQuality >= 70 ? 'Good' : 'Needs Improvement'})
                </Text>
              </View>
            </View>

            <View style={s.insightCard}>
              <View style={s.insightIconCircle}>
                <Dumbbell size={18} color={theme.colors.warning} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.insightTitle}>Recommendations</Text>
                {partner1.avgSleepTime < 7 && (
                  <Text style={s.insightText}>{partner1.name} should aim for 7-9 hours of sleep</Text>
                )}
                {partner2.avgSleepTime < 7 && (
                  <Text style={s.insightText}>{partner2.name} should aim for 7-9 hours of sleep</Text>
                )}
                {Math.abs(partner1.avgSleepTime - partner2.avgSleepTime) > 1 && (
                  <Text style={s.insightText}>Consider syncing bedtimes for better sleep harmony</Text>
                )}
                <Text style={[s.insightText, { marginBottom: 0 }]}>Maintain consistent sleep schedules together</Text>
              </View>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>Couple's Sleep Tips</Text>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <Bed size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Go to bed at the same time to sync sleep schedules</Text>
              </View>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <Smartphone size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Create a phone-free bedroom policy 30 minutes before sleep</Text>
              </View>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <Thermometer size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Find a comfortable room temperature (60-67°F / 16-19°C)</Text>
              </View>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <VolumeX size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Use white noise or earplugs if partner snores</Text>
              </View>
              <View style={[s.tipRow, { marginBottom: 0 }]}>
                <View style={s.tipIconCircle}>
                  <Dumbbell size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Exercise together but not within 3 hours of bedtime</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 40,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      paddingHorizontal: 20,
      marginBottom: 14,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 24,
      letterSpacing: -0.3,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    // Segmented nav
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 4,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      columnGap: 4,
    },
    tab: {
      flex: 1,
      height: 42,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      columnGap: 6,
    },
    tabActive: {
      backgroundColor: theme.colors.disabled,
    },
    tabText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textPrimary,
    },

    // Partner card
    partnerCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 18,
      marginBottom: 16,
    },
    partnerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 18,
    },
    partnerName: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 22,
      color: theme.colors.textPrimary,
    },
    nameInput: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 22,
      color: theme.colors.textPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
      paddingVertical: 4,
      flex: 1,
      marginRight: 12,
    },
    editButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.ctaBackground,
    },
    editButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 14,
      color: theme.colors.ctaText,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    statBox: {
      alignItems: 'center',
    },
    statValue: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 22,
      color: theme.colors.accent,
      marginBottom: 2,
    },
    statLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    goalSection: {
      marginTop: 2,
    },
    goalLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    progressBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.disabled,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },

    // Shared card
    card: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 18,
      marginBottom: 16,
    },
    cardTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 18,
      color: theme.colors.textPrimary,
      marginBottom: 14,
    },

    // Comparison grid
    comparisonGridRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    comparisonGridLabel: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    comparisonGridHeader: {
      width: 72,
      textAlign: 'right',
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    comparisonGridRowLabel: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    comparisonGridValue: {
      width: 72,
      textAlign: 'right',
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    winnerBadge: {
      marginTop: 14,
      padding: 12,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
    },
    winnerText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.accent,
    },

    // History
    sectionLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
      marginBottom: 10,
    },
    historyRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    historyDate: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.textPrimary,
      marginBottom: 10,
    },
    historyValuesRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    historyPartnerCol: {
      flex: 1,
      alignItems: 'center',
    },
    historyName: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginBottom: 4,
    },
    historyHours: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 22,
      color: theme.colors.accent,
      marginBottom: 2,
    },
    historyQuality: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    historyDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.cardBorder,
      marginHorizontal: 16,
    },

    // Insights
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 16,
      marginBottom: 14,
    },
    insightIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    insightTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    insightText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },

    // Tips
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      marginBottom: 14,
    },
    tipIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipText: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
  });
