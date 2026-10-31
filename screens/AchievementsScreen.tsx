import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Lock, Flame, Target, Star, Sparkles } from 'lucide-react-native';

import { useAppTheme } from '../hooks/useAppTheme';
import { useSleep } from '../contexts/SleepContext';
import achievementsService, { Achievement, ACHIEVEMENTS } from '../services/achievementsService';

// ============================================================================
// Nightprint — Achievements (redesign/ui-ux-v3)
// ============================================================================
// Rebuilt to match the design canvas's `Ins-Achieve.dc.html` / `D-Ins-Achieve.dc.html`
// (the "app" / "dayapp" Insights group): back button + title/subtitle, a
// streak hero card with a 7-day dot row, a "Next badge" progress card, and a
// dense 3-column badge grid (filled ring + emoji when unlocked, dashed ring +
// lock when not). All achievement data/logic (definitions, unlock state,
// streak tracking, per-achievement progress) is unchanged from the previous
// implementation — only JSX/styling was rebuilt onto theme.colors/typography.
// Category filter chips are kept (16+ achievements need them) but restyled
// to the same pill system used elsewhere in the redesign.
// ============================================================================

const CATEGORY_INFO = {
  streak: { icon: Flame, label: 'Streak' },
  milestone: { icon: Target, label: 'Milestone' },
  quality: { icon: Star, label: 'Quality' },
  special: { icon: Sparkles, label: 'Special' },
};

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function AchievementsScreen() {
  const navigation = useNavigation();
  const { theme, isNight } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { sleepHistory, getCurrentStreak, getGoodNightStreak } = useSleep();
  const s = useMemo(() => styles(theme), [theme]);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentStreak = useMemo(() => getCurrentStreak(), [sleepHistory]);
  const goodNightStreak = useMemo(() => getGoodNightStreak(), [sleepHistory]);

  useEffect(() => {
    const loadAchievements = async () => {
      await achievementsService.initialize();
      const all = achievementsService.getAllAchievements();
      setAchievements(all);

      // Check for new achievements
      await achievementsService.checkAchievements(sleepHistory, currentStreak, goodNightStreak);
      setAchievements(achievementsService.getAllAchievements());
    };
    loadAchievements();
  }, [sleepHistory, currentStreak, goodNightStreak]);

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;
  const totalCount = achievements.length;

  const filteredAchievements = selectedCategory
    ? achievements.filter(a => a.category === selectedCategory)
    : achievements;

  const categories = ['streak', 'milestone', 'quality', 'special'];

  // Longest streak across history, for the hero subtext (canvas: "Your longest is 11")
  const longestStreak = useMemo(() => {
    if (sleepHistory.length === 0) return currentStreak;
    const sorted = [...sleepHistory].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    let longest = 0;
    let running = 0;
    let prevDay: number | null = null;
    sorted.forEach(session => {
      const day = Math.floor(new Date(session.startTime).getTime() / 86400000);
      if (prevDay === null || day === prevDay + 1) {
        running += prevDay === null ? 1 : 1;
      } else if (day !== prevDay) {
        running = 1;
      }
      prevDay = day;
      longest = Math.max(longest, running);
    });
    return Math.max(longest, currentStreak);
  }, [sleepHistory, currentStreak]);

  // 7-day dot row aligned Mon-Sun, filled for nights tracked in the current streak
  const weekDots = useMemo(() => {
    const today = new Date();
    const todayIdx = (today.getDay() + 6) % 7; // 0 = Mon ... 6 = Sun
    return WEEK_LABELS.map((label, i) => {
      const daysAgo = todayIdx - i;
      const isToday = daysAgo === 0;
      const isFilled = daysAgo >= 0 && daysAgo < currentStreak;
      return { label: isToday ? 'Tonight' : label, isFilled, isToday };
    });
  }, [currentStreak]);

  // Nearest locked achievement, for the "Next" progress card
  const nextAchievement = useMemo(() => {
    const locked = achievements.filter(a => !a.unlockedAt);
    if (locked.length === 0) return null;
    let best: { achievement: Achievement; progress: number; target: number } | null = null;
    locked.forEach(achievement => {
      const { progress, target } = achievementsService.getAchievementProgress(
        achievement,
        sleepHistory,
        currentStreak,
        goodNightStreak
      );
      const ratio = target > 0 ? progress / target : 0;
      if (!best || ratio > best.progress / best.target) {
        best = { achievement, progress, target };
      }
    });
    return best;
  }, [achievements, sleepHistory, currentStreak, goodNightStreak]);

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />
      <ScrollView
        style={s.scrollView}
        contentContainerStyle={[
          s.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — back button + title + subtitle (canvas: Ins-Achieve) */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backButton}
            activeOpacity={0.8}
          >
            <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>
          <View>
            <Text style={s.headerTitle}>Achievements</Text>
            <Text style={s.headerSubtitle}>
              {unlockedCount} of {totalCount} badges earned
            </Text>
          </View>
        </View>

        {/* Streak hero — big number + week dot row (canvas hero card) */}
        <View style={s.heroCard}>
          <View pointerEvents="none" style={s.heroGlow} />
          <View style={s.heroTopRow}>
            <Text style={s.heroNumber}>{currentStreak}</Text>
            <View>
              <Text style={s.heroLabel}>night streak</Text>
              <Text style={s.heroSubtext}>Your longest is {longestStreak}</Text>
            </View>
          </View>
          <View style={s.weekRow}>
            {weekDots.map((day, i) => (
              <View key={i} style={s.weekItem}>
                <View
                  style={[
                    s.weekDot,
                    day.isFilled && s.weekDotFilled,
                    day.isToday && !day.isFilled && s.weekDotToday,
                  ]}
                />
                <Text style={[s.weekDayLabel, day.isToday && s.weekDayLabelToday]}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Next badge progress card */}
        {nextAchievement && (
          <View style={s.nextCard}>
            <View style={s.nextTopRow}>
              <Text style={s.nextTitle}>Next: {nextAchievement.achievement.name}</Text>
              <Text style={s.nextCount}>
                {nextAchievement.progress} / {nextAchievement.target}
              </Text>
            </View>
            <View style={s.nextProgressBg}>
              <View
                style={[
                  s.nextProgressFill,
                  { width: `${Math.min(100, (nextAchievement.progress / nextAchievement.target) * 100)}%` },
                ]}
              />
            </View>
            <Text style={s.nextHint}>{nextAchievement.achievement.description}</Text>
          </View>
        )}

        {/* Category Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.categoryScroll}
          contentContainerStyle={s.categoryContainer}
        >
          <TouchableOpacity
            style={[s.categoryChip, !selectedCategory && s.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.85}
          >
            <Text style={[s.categoryChipText, !selectedCategory && s.categoryChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(cat => {
            const info = CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO];
            const Icon = info.icon;
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[s.categoryChip, isActive && s.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.85}
              >
                <Icon size={14} color={isActive ? theme.colors.accent : theme.colors.textTertiary} strokeWidth={2.2} />
                <Text style={[s.categoryChipText, isActive && s.categoryChipTextActive]}>
                  {info.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Badge grid — 3 columns, filled ring + emoji unlocked / dashed ring + lock locked (canvas grid) */}
        <View style={s.badgeGrid}>
          {filteredAchievements.map(achievement => {
            const isUnlocked = !!achievement.unlockedAt;
            const { progress, target } = achievementsService.getAchievementProgress(
              achievement,
              sleepHistory,
              currentStreak,
              goodNightStreak
            );

            return (
              <View
                key={achievement.id}
                style={[s.badgeCard, isUnlocked && s.badgeCardUnlocked]}
              >
                <View style={[s.badgeRing, isUnlocked && s.badgeRingUnlocked]}>
                  {isUnlocked ? (
                    <Text style={s.badgeEmoji}>{achievement.icon}</Text>
                  ) : (
                    <Lock size={20} color={theme.colors.textTertiary} strokeWidth={2} />
                  )}
                </View>
                <Text style={[s.badgeName, !isUnlocked && s.badgeNameLocked]} numberOfLines={2}>
                  {achievement.name}
                </Text>
                <Text style={s.badgeSub} numberOfLines={1}>
                  {isUnlocked ? achievement.description : `${progress} of ${target}`}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      marginBottom: 16,
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
    headerTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 24,
      letterSpacing: -0.3,
      color: theme.colors.textPrimary,
    },
    headerSubtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    // Streak hero
    heroCard: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 20,
      marginBottom: 16,
      rowGap: 14,
    },
    heroGlow: {
      position: 'absolute',
      left: -40,
      top: -60,
      width: 260,
      height: 220,
      borderRadius: 130,
      backgroundColor: theme.colors.accentLight,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      columnGap: 10,
    },
    heroNumber: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 56,
      lineHeight: 58,
      letterSpacing: -1.4,
      color: theme.colors.textPrimary,
    },
    heroLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 18,
      color: theme.colors.textPrimary,
    },
    heroSubtext: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    weekItem: {
      alignItems: 'center',
      rowGap: 6,
      flex: 1,
    },
    weekDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.colors.cardBorder,
      borderStyle: 'dashed',
    },
    weekDotFilled: {
      backgroundColor: theme.colors.accent,
      borderWidth: 0,
      borderStyle: 'solid',
    },
    weekDotToday: {
      borderColor: theme.colors.accent,
    },
    weekDayLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 11,
      color: theme.colors.textTertiary,
    },
    weekDayLabelToday: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textPrimary,
    },

    // Next badge card
    nextCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      marginBottom: 16,
      rowGap: 10,
    },
    nextTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    nextTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.textPrimary,
      flexShrink: 1,
      marginRight: 8,
    },
    nextCount: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    nextProgressBg: {
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.disabled,
      overflow: 'hidden',
    },
    nextProgressFill: {
      height: '100%',
      borderRadius: 4,
      backgroundColor: theme.colors.accent,
    },
    nextHint: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },

    // Category chips
    categoryScroll: {
      marginBottom: 16,
      marginHorizontal: -20,
    },
    categoryContainer: {
      paddingHorizontal: 20,
      columnGap: 8,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      columnGap: 6,
    },
    categoryChipActive: {
      backgroundColor: theme.colors.selectedBackground,
      borderColor: theme.colors.accent,
    },
    categoryChipText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    categoryChipTextActive: {
      color: theme.colors.accent,
    },

    // Badge grid
    badgeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: 10,
      rowGap: 10,
    },
    badgeCard: {
      width: '31.5%',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 14,
      paddingHorizontal: 6,
      alignItems: 'center',
      rowGap: 6,
    },
    badgeCardUnlocked: {
      borderColor: theme.colors.accentBorder,
    },
    badgeRing: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 1.5,
      borderColor: theme.colors.cardBorder,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeRingUnlocked: {
      backgroundColor: theme.colors.accent,
      borderWidth: 0,
      borderStyle: 'solid',
    },
    badgeEmoji: {
      fontSize: 24,
    },
    badgeName: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      lineHeight: 16,
    },
    badgeNameLocked: {
      color: theme.colors.textTertiary,
    },
    badgeSub: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 11,
      color: theme.colors.textTertiary,
      textAlign: 'center',
    },
  });
