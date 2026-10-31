import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ChevronLeft,
  CheckCircle2,
  Circle,
  Flame,
  Star,
  Moon,
  Activity,
  Thermometer,
  Repeat,
  Lock,
} from 'lucide-react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../contexts/AuthContext';
import { useSleep } from '../contexts/SleepContext';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import sleepCoachService, { CoachAction } from '../services/sleepCoachService';
import analyticsService from '../services/analyticsService';

const CATEGORY_ICON: Record<CoachAction['category'], any> = {
  consistency: Repeat,
  environment: Thermometer,
  habit: Moon,
  'wind-down': Star,
  activity: Activity,
};

export default function SleepCoachScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { sleepHistory } = useSleep();

  const isPremium = isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email);

  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);

  const plan = useMemo(() => sleepCoachService.generatePlan(sleepHistory), [sleepHistory]);

  useEffect(() => {
    if (!isPremium) return;
    sleepCoachService.getTodayProgress().then(setCompletedToday);
    sleepCoachService.getStreak().then(setStreak);
    analyticsService.trackScreenView('SleepCoach').catch(() => {});
  }, [isPremium]);

  const handleToggle = async (actionId: string) => {
    const updated = await sleepCoachService.toggleAction(actionId);
    setCompletedToday(updated);
    const newStreak = await sleepCoachService.getStreak();
    setStreak(newStreak);
  };

  const s = styles(theme);

  if (!isPremium) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={[s.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>Sleep Coach</Text>
        </View>
        <View style={s.lockedCard}>
          <View style={[s.lockedIcon, { backgroundColor: theme.colors.accentLight }]}>
            <Lock size={28} color={theme.colors.accent} />
          </View>
          <Text style={[s.lockedTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            Unlock Sleep Coach
          </Text>
          <Text style={[s.lockedText, { color: theme.colors.textSecondary }]}>
            Get a personalized, prioritized improvement plan built from your own sleep data — with daily action items and streak tracking.
          </Text>
          <TouchableOpacity
            style={[s.unlockButton, { backgroundColor: theme.colors.ctaBackground }]}
            onPress={() => {
              analyticsService.trackFeatureGateHit('sleep_coach').catch(() => {});
              navigation.navigate('Subscription', { source: 'sleep_coach' });
            }}
          >
            <Text style={[s.unlockButtonText, { color: theme.colors.ctaText }]}>Unlock with Pro</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[s.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={[s.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>Sleep Coach</Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>{plan.programTitle}</Text>
        </View>
        {streak > 0 && (
          <View style={[s.streakBadge, { backgroundColor: theme.colors.accentLight, borderColor: theme.colors.accentBorder }]}>
            <Flame size={14} color={theme.colors.accent} />
            <Text style={[s.streakText, { color: theme.colors.accent }]}>{streak}</Text>
          </View>
        )}
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <View style={[s.summaryCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.accentBorder }]}>
          <Text style={[s.summaryText, { color: theme.colors.textSecondary }]}>{plan.summary}</Text>
        </View>

        <Text style={[s.sectionTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
          Today's focus
        </Text>

        <View style={[s.listCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          {plan.actions.map((action, index) => {
            const Icon = CATEGORY_ICON[action.category] || Moon;
            const isDone = completedToday.includes(action.id);
            return (
              <TouchableOpacity
                key={action.id}
                style={[
                  s.actionRow,
                  index < plan.actions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
                ]}
                onPress={() => handleToggle(action.id)}
                activeOpacity={0.8}
              >
                <View style={[s.actionIcon, { backgroundColor: theme.colors.backgroundTertiary }]}>
                  <Icon size={18} color={theme.colors.accent} />
                </View>
                <View style={s.actionTextCol}>
                  <Text
                    style={[
                      s.actionTitle,
                      { color: isDone ? theme.colors.textTertiary : theme.colors.textPrimary },
                      isDone && { textDecorationLine: 'line-through' },
                    ]}
                  >
                    {action.title}
                  </Text>
                  <Text style={[s.actionDesc, { color: theme.colors.textTertiary }]}>{action.description}</Text>
                </View>
                {isDone ? (
                  <CheckCircle2 size={22} color={theme.colors.accent} fill={theme.colors.accentLight} />
                ) : (
                  <Circle size={22} color={theme.colors.textTertiary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[s.footerNote, { color: theme.colors.textTertiary }]}>
          Your plan updates automatically as you log more sleep sessions.
        </Text>

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
    title: { fontSize: 22, letterSpacing: -0.2 },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      marginTop: 2,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 14,
      borderWidth: 1,
    },
    streakText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
    },
    content: { flex: 1, paddingHorizontal: 20 },
    summaryCard: {
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      padding: 16,
      marginBottom: 20,
    },
    summaryText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
    },
    sectionTitle: {
      fontSize: 16,
      marginBottom: 10,
    },
    listCard: {
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      marginBottom: 16,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      padding: 16,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
      marginTop: 2,
    },
    actionTextCol: { flex: 1, rowGap: 4 },
    actionTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
    },
    actionDesc: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 18,
    },
    footerNote: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 20,
    },
    bottomSpacing: { height: 60 },
    lockedCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      rowGap: 12,
    },
    lockedIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    lockedTitle: { fontSize: 20 },
    lockedText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      marginBottom: 12,
    },
    unlockButton: {
      height: 48,
      paddingHorizontal: 28,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unlockButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
    },
  });
