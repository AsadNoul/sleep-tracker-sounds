import { useAppTheme } from '../hooks/useAppTheme';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Settings as SettingsIcon,
  ChevronRight,
  Award,
  Moon,
  BookHeart,
  AlarmClock,
  Users,
  Thermometer,
  ClipboardList,
  Coffee,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useSleep } from '../contexts/SleepContext';
import { supabase } from '../lib/supabase';
import { format24hTo12h } from '../utils/dateFormatting';
import achievementsService from '../services/achievementsService';
import alarmService from '../services/alarmService';

// Canvas (`Ac-Profile.dc.html`): avatar-initial + Fraunces name + "plan · member
// since" line, a 3-stat row (Nights/Streak/Avg score), a "Go Premium" CTA card,
// a "Your sleep" grouped list, and a "Wellness & habits" 4-up grid. This screen
// is the canvas's actual Profile page — trimmed to exactly that, no extra
// account-management chrome (that lives in Settings instead).

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const s = styles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { sleepHistory, getSleepStats, getCurrentStreak } = useSleep();

  const [memberSinceMonth, setMemberSinceMonth] = useState<string | null>(null);
  const [achievementsEarned, setAchievementsEarned] = useState(0);
  const [nextAlarmLabel, setNextAlarmLabel] = useState<string | null>(null);

  const isPremium = isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email);

  useEffect(() => {
    if (!user || user.id === 'guest') return;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const createdAt = session?.user?.created_at;
        if (createdAt) {
          setMemberSinceMonth(MONTH_NAMES[new Date(createdAt).getMonth()]);
        }
      } catch {}
    })();

    (async () => {
      try {
        await achievementsService.initialize();
        setAchievementsEarned(achievementsService.getUnlockedAchievements().length);
      } catch {}
    })();

    (async () => {
      try {
        const alarms = await alarmService.getAlarms();
        const enabled = (alarms || []).filter((a: any) => a.enabled);
        if (enabled.length > 0) {
          const next = enabled.sort((a: any, b: any) => a.time.localeCompare(b.time))[0];
          setNextAlarmLabel(format24hTo12h(next.time));
        }
      } catch {}
    })();
  }, [user]);

  const sleepStats = getSleepStats();
  const streak = getCurrentStreak();
  const avgScore = sleepHistory.length > 0
    ? Math.round(
        sleepHistory.reduce((sum, sess) => sum + (sess.sleepScore ?? Math.round(sleepStats.averageQuality * 10)), 0) / sleepHistory.length
      )
    : 0;

  const avatarInitial = (user?.full_name || user?.email || 'U').trim().charAt(0).toUpperCase();

  if (!user) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.emptyCard}>
          <Text style={s.emptyCardTitle}>Sign In Required</Text>
          <Text style={s.emptyCardText}>Please sign in to view your profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: insets.bottom + 40, rowGap: 16 }}
      >
        {/* Header: avatar + name + plan line + settings button */}
        <View style={s.headerRow}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarInitial}>{avatarInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>{user.full_name || 'User'}</Text>
            <Text style={s.planLine}>
              {isPremium ? 'Premium plan' : 'Free plan'}{memberSinceMonth ? ` · member since ${memberSinceMonth}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={s.settingsButton}
            onPress={() => navigation.navigate('Settings' as never)}
            accessibilityLabel="Settings"
          >
            <SettingsIcon size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Nights</Text>
            <Text style={s.statValue}>{sleepStats.totalSessions}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Streak</Text>
            <Text style={s.statValue}>{streak}</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statLabel}>Avg score</Text>
            <Text style={s.statValue}>{avgScore}</Text>
          </View>
        </View>

        {/* Go Premium CTA */}
        {!isPremium && (
          <TouchableOpacity
            style={s.premiumCard}
            onPress={() => navigation.navigate('Subscription', { source: 'profile' })}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.premiumTitle}>Go Premium</Text>
              <Text style={s.premiumSubtitle}>All 30+ sounds, mixing, full history</Text>
            </View>
            <View style={s.premiumCta}>
              <Text style={s.premiumCtaText}>Try 7 days free</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Your sleep */}
        <View style={{ rowGap: 8 }}>
          <Text style={s.sectionLabel}>Your sleep</Text>
          <View style={s.groupCard}>
            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Achievements')} activeOpacity={0.6}>
              <View style={s.rowIconChip}>
                <Award size={16} color={theme.colors.accent} />
              </View>
              <Text style={[s.rowLabel, s.rowLabelGrow]}>Achievements</Text>
              {achievementsEarned > 0 && <Text style={s.rowValue}>{achievementsEarned} earned</Text>}
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={s.rowDivider} />

            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('SleepAnalysis')} activeOpacity={0.6}>
              <View style={s.rowIconChip}>
                <Moon size={16} color={theme.colors.accent} />
              </View>
              <Text style={[s.rowLabel, s.rowLabelGrow]}>Sleep Prints</Text>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={s.rowDivider} />

            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('DreamJournal')} activeOpacity={0.6}>
              <View style={s.rowIconChip}>
                <BookHeart size={16} color={theme.colors.accent} />
              </View>
              <Text style={[s.rowLabel, s.rowLabelGrow]}>Dream journal</Text>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={s.rowDivider} />

            <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Alarms')} activeOpacity={0.6}>
              <View style={s.rowIconChip}>
                <AlarmClock size={16} color={theme.colors.accent} />
              </View>
              <Text style={[s.rowLabel, s.rowLabelGrow]}>Alarms</Text>
              {nextAlarmLabel && <Text style={s.rowValue}>{nextAlarmLabel}</Text>}
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <View style={s.rowDivider} />

            <TouchableOpacity style={[s.row, s.rowLast]} onPress={() => navigation.navigate('PartnerMode')} activeOpacity={0.6}>
              <View style={s.rowIconChip}>
                <Users size={16} color={theme.colors.accent} />
              </View>
              <Text style={[s.rowLabel, s.rowLabelGrow]}>Partner mode</Text>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Wellness & habits */}
        <View style={{ rowGap: 8 }}>
          <Text style={s.sectionLabel}>Wellness & habits</Text>
          <View style={s.wellnessGrid}>
            <TouchableOpacity
              style={[s.wellnessTile, s.wellnessTileActive]}
              onPress={() => navigation.navigate('BedtimeRoutine')}
              activeOpacity={0.8}
            >
              <Text style={s.wellnessTileTextActive}>Wellness</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.wellnessTile} onPress={() => navigation.navigate('RoomEnvironment')} activeOpacity={0.8}>
              <Thermometer size={16} color={theme.colors.textSecondary} />
              <Text style={s.wellnessTileText}>Room</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.wellnessTile} onPress={() => navigation.navigate('HealthTracking')} activeOpacity={0.8}>
              <ClipboardList size={16} color={theme.colors.textSecondary} />
              <Text style={s.wellnessTileText}>Health log</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.wellnessTile} onPress={() => navigation.navigate('CaffeineCalculator')} activeOpacity={0.8}>
              <Coffee size={16} color={theme.colors.textSecondary} />
              <Text style={s.wellnessTileText}>Caffeine</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.navActiveBackground,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    color: theme.colors.textPrimary,
  },
  name: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 26,
    letterSpacing: -0.2,
    color: theme.colors.textPrimary,
  },
  planLine: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    columnGap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    rowGap: 2,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },

  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    borderRadius: theme.borderRadius.card,
    padding: 18,
    overflow: 'hidden',
  },
  premiumTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  premiumSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  premiumCta: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCtaText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.background,
  },

  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textTertiary,
  },

  groupCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingVertical: 12,
  },
  rowLast: {},
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  rowIconChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  rowLabelGrow: { flex: 1 },
  rowValue: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
  },

  wellnessGrid: {
    flexDirection: 'row',
    columnGap: 8,
  },
  wellnessTile: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 2,
  },
  wellnessTileActive: {
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.navActiveBackground,
  },
  wellnessTileText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  wellnessTileTextActive: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },

  emptyCard: {
    margin: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 40,
    alignItems: 'center',
  },
  emptyCardTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyCardText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
