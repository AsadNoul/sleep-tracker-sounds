import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Trophy, Lock, Star, Flame, Target, Sparkles } from 'lucide-react-native';

import { useAppTheme } from '../hooks/useAppTheme';
import { useSleep } from '../contexts/SleepContext';
import achievementsService, { Achievement, ACHIEVEMENTS } from '../services/achievementsService';

const GlassView = ({ style, children, intensity = 20, tint = "dark" }: any) => {
  if (Platform.OS === 'android') {
    return (
      <View style={[style, { backgroundColor: 'rgba(17, 25, 40, 0.7)' }]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
};

const CATEGORY_INFO = {
  streak: { icon: Flame, color: '#F59E0B', label: 'Streak' },
  milestone: { icon: Target, color: '#8B5CF6', label: 'Milestone' },
  quality: { icon: Star, color: '#10B981', label: 'Quality' },
  special: { icon: Sparkles, color: '#EC4899', label: 'Special' },
};

export default function AchievementsScreen() {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { sleepHistory, getCurrentStreak, getGoodNightStreak } = useSleep();

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

  return (
    <View style={styles(theme).container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F0F1E', '#161632', '#0F0F1E']} style={styles(theme).gradient}>
        <ScrollView
          style={styles(theme).scrollView}
          contentContainerStyle={[
            styles(theme).scrollContent,
            { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 30 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles(theme).header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles(theme).backButton}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles(theme).headerTitle}>Achievements</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Progress Summary */}
          <GlassView intensity={20} tint="dark" style={styles(theme).progressCard}>
            <View style={styles(theme).trophyContainer}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.3)', 'rgba(99, 102, 241, 0.1)']}
                style={styles(theme).trophyGradient}
              >
                <Trophy size={48} color="#F59E0B" />
              </LinearGradient>
            </View>
            <View style={styles(theme).progressInfo}>
              <Text style={styles(theme).progressTitle}>Your Progress</Text>
              <Text style={styles(theme).progressCount}>
                {unlockedCount} / {totalCount}
              </Text>
              <Text style={styles(theme).progressSubtext}>Achievements Unlocked</Text>
            </View>
            <View style={styles(theme).progressBarContainer}>
              <View style={styles(theme).progressBarBackground}>
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={[
                    styles(theme).progressBarFill,
                    { width: `${(unlockedCount / totalCount) * 100}%` },
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>
          </GlassView>

          {/* Stats Row */}
          <View style={styles(theme).statsRow}>
            <GlassView intensity={15} tint="dark" style={styles(theme).statCard}>
              <Text style={styles(theme).statEmoji}>🔥</Text>
              <Text style={styles(theme).statValue}>{currentStreak}</Text>
              <Text style={styles(theme).statLabel}>Day Streak</Text>
            </GlassView>
            <GlassView intensity={15} tint="dark" style={styles(theme).statCard}>
              <Text style={styles(theme).statEmoji}>⭐</Text>
              <Text style={styles(theme).statValue}>{goodNightStreak}</Text>
              <Text style={styles(theme).statLabel}>Good Nights</Text>
            </GlassView>
            <GlassView intensity={15} tint="dark" style={styles(theme).statCard}>
              <Text style={styles(theme).statEmoji}>📊</Text>
              <Text style={styles(theme).statValue}>{sleepHistory.length}</Text>
              <Text style={styles(theme).statLabel}>Sessions</Text>
            </GlassView>
          </View>

          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles(theme).categoryScroll}
            contentContainerStyle={styles(theme).categoryContainer}
          >
            <TouchableOpacity
              style={[
                styles(theme).categoryChip,
                !selectedCategory && styles(theme).categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles(theme).categoryChipText,
                  !selectedCategory && styles(theme).categoryChipTextActive,
                ]}
              >
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
                  style={[
                    styles(theme).categoryChip,
                    isActive && { backgroundColor: info.color + '30', borderColor: info.color },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Icon size={16} color={isActive ? info.color : '#A0AEC0'} />
                  <Text
                    style={[
                      styles(theme).categoryChipText,
                      isActive && { color: info.color },
                    ]}
                  >
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Achievements Grid */}
          <View style={styles(theme).achievementsGrid}>
            {filteredAchievements.map(achievement => {
              const isUnlocked = !!achievement.unlockedAt;
              const { progress, target } = achievementsService.getAchievementProgress(
                achievement,
                sleepHistory,
                currentStreak,
                goodNightStreak
              );
              const progressPercent = (progress / target) * 100;
              const categoryInfo = CATEGORY_INFO[achievement.category];

              return (
                <GlassView
                  key={achievement.id}
                  intensity={15}
                  tint="dark"
                  style={[
                    styles(theme).achievementCard,
                    isUnlocked && styles(theme).achievementCardUnlocked,
                  ]}
                >
                  <View style={styles(theme).achievementHeader}>
                    <View
                      style={[
                        styles(theme).achievementIcon,
                        isUnlocked && { backgroundColor: categoryInfo.color + '30' },
                      ]}
                    >
                      {isUnlocked ? (
                        <Text style={styles(theme).achievementEmoji}>{achievement.icon}</Text>
                      ) : (
                        <Lock size={24} color="#4A4A5A" />
                      )}
                    </View>
                    {isUnlocked && (
                      <View style={[styles(theme).unlockedBadge, { backgroundColor: categoryInfo.color }]}>
                        <Text style={styles(theme).unlockedBadgeText}>Unlocked</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles(theme).achievementName,
                      !isUnlocked && styles(theme).achievementNameLocked,
                    ]}
                  >
                    {achievement.name}
                  </Text>
                  <Text style={styles(theme).achievementDesc}>{achievement.description}</Text>

                  {/* Progress Bar */}
                  {!isUnlocked && (
                    <View style={styles(theme).achievementProgressContainer}>
                      <View style={styles(theme).achievementProgressBg}>
                        <View
                          style={[
                            styles(theme).achievementProgressFill,
                            { width: `${progressPercent}%`, backgroundColor: categoryInfo.color },
                          ]}
                        />
                      </View>
                      <Text style={styles(theme).achievementProgressText}>
                        {progress}/{target}
                      </Text>
                    </View>
                  )}
                </GlassView>
              );
            })}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0F0F1E',
    },
    gradient: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    progressCard: {
      borderRadius: 24,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(139, 92, 246, 0.3)',
      overflow: 'hidden',
    },
    trophyContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    trophyGradient: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressInfo: {
      alignItems: 'center',
      marginBottom: 16,
    },
    progressTitle: {
      fontSize: 14,
      color: '#A0AEC0',
      marginBottom: 4,
    },
    progressCount: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    progressSubtext: {
      fontSize: 12,
      color: '#A0AEC0',
      marginTop: 4,
    },
    progressBarContainer: {
      width: '100%',
    },
    progressBarBackground: {
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 4,
    },
    statsRow: {
      flexDirection: 'row',
      rowGap: 12, columnGap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
    },
    statEmoji: {
      fontSize: 24,
      marginBottom: 8,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    statLabel: {
      fontSize: 11,
      color: '#A0AEC0',
      marginTop: 4,
      textAlign: 'center',
    },
    categoryScroll: {
      marginBottom: 20,
      marginHorizontal: -20,
    },
    categoryContainer: {
      paddingHorizontal: 20,
      rowGap: 10, columnGap: 10,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      rowGap: 6, columnGap: 6,
    },
    categoryChipActive: {
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: '#8B5CF6',
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#A0AEC0',
    },
    categoryChipTextActive: {
      color: '#8B5CF6',
    },
    achievementsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 12, columnGap: 12,
    },
    achievementCard: {
      width: '48%',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
      minHeight: 160,
    },
    achievementCardUnlocked: {
      borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    achievementHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    achievementIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    achievementEmoji: {
      fontSize: 28,
    },
    unlockedBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
    },
    unlockedBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    achievementName: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    achievementNameLocked: {
      color: '#6B7280',
    },
    achievementDesc: {
      fontSize: 11,
      color: '#A0AEC0',
      lineHeight: 16,
    },
    achievementProgressContainer: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 8, columnGap: 8,
    },
    achievementProgressBg: {
      flex: 1,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    achievementProgressFill: {
      height: '100%',
      borderRadius: 2,
    },
    achievementProgressText: {
      fontSize: 10,
      color: '#A0AEC0',
      fontWeight: '600',
    },
  });
