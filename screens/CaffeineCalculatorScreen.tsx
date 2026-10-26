import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Coffee, Leaf, Zap, Plus, Clock, Ban, Pill } from 'lucide-react-native';

// ============================================================================
// Caffeine Calculator (redesign/ui-ux-v3)
// ============================================================================
// Rebuilt to match the design canvas's `Hl-Caffeine.dc.html` / `D-Hl-Caffeine.dc.html`
// ("Caffeine" board, "app"/"dayapp" pages): back button + Fraunces title,
// a hero card with "Estimated in your body now" + big mg number + a 16-bar
// level chart with a dashed bedtime line + a one-line recommendation, a
// "Quick add" 2-column grid of preset buttons + dashed Custom button, and a
// "Today · total mg" log list.
//
// All data/logic is untouched from the original file: AsyncStorage-backed
// caffeine log, half-life decay math, bedtime projection, and the
// recommendation copy/thresholds. Only JSX/styling changed. The original
// preset grid (11 presets with remote images) and info card are kept as
// self-designed sections below the canvas-matched hero/quick-add/log, since
// the canvas only shows 3 illustrative quick-add presets + a custom button
// but the real app's feature set (11 presets, caffeine/sleep info) is larger.
// ============================================================================

interface CaffeineItem {
  id: string;
  name: string;
  amount: number; // mg of caffeine
  time: Date;
  type: 'coffee' | 'tea' | 'soda' | 'energy' | 'other';
}

const CAFFEINE_PRESETS = {
  'Espresso (1 shot)': { amount: 63, type: 'coffee' as const },
  'Coffee (8oz)': { amount: 95, type: 'coffee' as const },
  'Coffee (12oz)': { amount: 142, type: 'coffee' as const },
  'Coffee (16oz)': { amount: 190, type: 'coffee' as const },
  'Green Tea': { amount: 28, type: 'tea' as const },
  'Black Tea': { amount: 47, type: 'tea' as const },
  'Cola (12oz)': { amount: 34, type: 'soda' as const },
  'Mountain Dew': { amount: 54, type: 'soda' as const },
  'Red Bull (8oz)': { amount: 80, type: 'energy' as const },
  'Monster (16oz)': { amount: 160, type: 'energy' as const },
  'Dark Chocolate (1oz)': { amount: 12, type: 'other' as const },
};

const getIconForType = (type: CaffeineItem['type']) => {
  switch (type) {
    case 'coffee':
      return Coffee;
    case 'tea':
      return Leaf;
    case 'soda':
    case 'energy':
      return Zap;
    default:
      return Coffee;
  }
};

export default function CaffeineCalculatorScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const s = styles(theme);
  const [todayCaffeine, setTodayCaffeine] = useState<CaffeineItem[]>([]);
  const [history, setHistory] = useState<{ [date: string]: CaffeineItem[] }>({});
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem('caffeine_log');
      if (data) {
        const parsed = JSON.parse(data);
        const today = new Date().toISOString().split('T')[0];

        // Convert timestamps back to Date objects
        Object.keys(parsed).forEach(date => {
          parsed[date] = parsed[date].map((item: CaffeineItem) => ({
            ...item,
            time: new Date(item.time),
          }));
        });

        setHistory(parsed);
        setTodayCaffeine(parsed[today] || []);
      }
    } catch (error) {
      console.error('Error loading caffeine data:', error);
    }
  };

  const saveData = async (items: CaffeineItem[]) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newHistory = { ...history, [today]: items };
      await AsyncStorage.setItem('caffeine_log', JSON.stringify(newHistory));
      setHistory(newHistory);
      setTodayCaffeine(items);
    } catch (error) {
      console.error('Error saving caffeine data:', error);
    }
  };

  const addCaffeineItem = (name: string, amount: number, type: CaffeineItem['type']) => {
    const newItem: CaffeineItem = {
      id: Date.now().toString(),
      name,
      amount,
      time: new Date(),
      type,
    };
    saveData([...todayCaffeine, newItem]);
  };

  const addPreset = (presetName: string) => {
    const preset = CAFFEINE_PRESETS[presetName as keyof typeof CAFFEINE_PRESETS];
    addCaffeineItem(presetName, preset.amount, preset.type);
  };

  const addCustom = () => {
    if (customName && customAmount) {
      addCaffeineItem(customName, parseInt(customAmount), 'other');
      setCustomName('');
      setCustomAmount('');
      setShowCustom(false);
    }
  };

  const getTotalCaffeine = () => {
    return todayCaffeine.reduce((sum, item) => sum + item.amount, 0);
  };

  const getCurrentCaffeineLevel = () => {
    // Caffeine half-life is about 5 hours
    const now = new Date().getTime();
    return todayCaffeine.reduce((total, item) => {
      const hoursSince = (now - item.time.getTime()) / (1000 * 60 * 60);
      const halfLives = hoursSince / 5;
      const remaining = item.amount * Math.pow(0.5, halfLives);
      return total + remaining;
    }, 0);
  };

  const getHoursUntilBedtime = () => {
    // Assume 10 PM bedtime
    const now = new Date();
    const bedtime = new Date();
    bedtime.setHours(22, 0, 0, 0);

    if (now > bedtime) {
      bedtime.setDate(bedtime.getDate() + 1);
    }

    return (bedtime.getTime() - now.getTime()) / (1000 * 60 * 60);
  };

  const getCaffeineAtBedtime = () => {
    const hoursToBedtime = getHoursUntilBedtime();
    const now = new Date().getTime();

    return todayCaffeine.reduce((total, item) => {
      const hoursSince = (now - item.time.getTime()) / (1000 * 60 * 60);
      const totalHours = hoursSince + hoursToBedtime;
      const halfLives = totalHours / 5;
      const remaining = item.amount * Math.pow(0.5, halfLives);
      return total + remaining;
    }, 0);
  };

  const getRecommendation = () => {
    const bedtimeLevel = getCaffeineAtBedtime();
    const hoursToBedtime = getHoursUntilBedtime();

    if (bedtimeLevel > 50) {
      return {
        text: 'High caffeine at bedtime. Consider no more caffeine today.',
        color: theme.colors.error,
      };
    } else if (bedtimeLevel > 25 && hoursToBedtime < 6) {
      return {
        text: 'Moderate caffeine. Best to avoid more in the next few hours.',
        color: theme.colors.warning,
      };
    } else if (hoursToBedtime < 4) {
      return {
        text: 'Close to bedtime. Avoid caffeine now.',
        color: theme.colors.warning,
      };
    } else {
      return {
        text: 'Caffeine levels look good for tonight.',
        color: theme.colors.success,
      };
    }
  };

  const recommendation = getRecommendation();
  const totalToday = getTotalCaffeine();
  const currentLevel = getCurrentCaffeineLevel();
  const bedtimeLevel = getCaffeineAtBedtime();

  // 16-bar level chart across the day (8 AM → bedtime), canvas's bar graph —
  // built from the same half-life math above, not new business logic.
  const chartBars = React.useMemo(() => {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(8, 0, 0, 0);
    const bedtime = new Date(now);
    bedtime.setHours(22, 0, 0, 0);
    if (bedtime.getTime() <= dayStart.getTime()) bedtime.setDate(bedtime.getDate() + 1);

    const totalSpanMs = bedtime.getTime() - dayStart.getTime();
    const barCount = 16;
    const nowFraction = Math.max(0, Math.min(1, (now.getTime() - dayStart.getTime()) / totalSpanMs));
    const nowIndex = Math.round(nowFraction * (barCount - 1));

    let maxLevel = 1;
    const levels: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const t = dayStart.getTime() + (totalSpanMs * i) / (barCount - 1);
      const level = todayCaffeine.reduce((total, item) => {
        if (item.time.getTime() > t) return total;
        const hoursSince = (t - item.time.getTime()) / (1000 * 60 * 60);
        const halfLives = hoursSince / 5;
        return total + item.amount * Math.pow(0.5, halfLives);
      }, 0);
      levels.push(level);
      if (level > maxLevel) maxLevel = level;
    }

    return levels.map((level, i) => ({
      height: Math.max(4, (level / maxLevel) * 90),
      isNow: i === nowIndex,
      isFuture: i > nowIndex,
    }));
  }, [todayCaffeine]);

  const bedtimeTimeLabel = React.useMemo(() => {
    const bedtime = new Date();
    bedtime.setHours(22, 0, 0, 0);
    if (new Date() > bedtime) bedtime.setDate(bedtime.getDate() + 1);
    return bedtime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }, []);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header — back button + Fraunces title (canvas: Hl-Caffeine) */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} activeOpacity={0.8}>
            <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={s.title}>Caffeine</Text>
        </View>

        {/* Hero card — current level + 16-bar chart + bedtime line + recommendation */}
        <View style={s.heroCard}>
          <View pointerEvents="none" style={s.heroGlow} />
          <Text style={s.heroLabel}>Estimated in your body now</Text>
          <View style={s.heroValueRow}>
            <Text style={s.heroValue}>{currentLevel.toFixed(0)}</Text>
            <Text style={s.heroUnit}>mg</Text>
          </View>

          <View style={s.chartRow}>
            <View pointerEvents="none" style={s.chartBedtimeLine} />
            {chartBars.map((bar, i) => (
              <View
                key={i}
                style={[
                  s.chartBar,
                  {
                    height: bar.height,
                    backgroundColor: bar.isNow
                      ? theme.colors.accent
                      : bar.isFuture
                        ? theme.colors.disabled
                        : theme.colors.accentBorder,
                  },
                ]}
              />
            ))}
          </View>
          <View style={s.chartLabelsRow}>
            <Text style={s.chartLabel}>8 AM</Text>
            <Text style={s.chartLabel}>Now</Text>
            <Text style={s.chartLabel}>Bedtime</Text>
          </View>

          <Text style={[s.recommendationText, { color: recommendation.color }]}>
            {bedtimeLevel <= 50
              ? `Below 50 mg by ${bedtimeTimeLabel}, in time for bed.`
              : recommendation.text}
          </Text>
        </View>

        {/* Quick add — Coffee / Tea / Energy drink / Custom (canvas's primary grid) */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Quick add</Text>
          <View style={s.quickAddGrid}>
            <TouchableOpacity style={s.quickAddButton} onPress={() => addPreset('Coffee (8oz)')} activeOpacity={0.85}>
              <Text style={s.quickAddName}>Coffee</Text>
              <Text style={s.quickAddAmount}>95 mg</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickAddButton} onPress={() => addPreset('Black Tea')} activeOpacity={0.85}>
              <Text style={s.quickAddName}>Tea</Text>
              <Text style={s.quickAddAmount}>47 mg</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickAddButton} onPress={() => addPreset('Red Bull (8oz)')} activeOpacity={0.85}>
              <Text style={s.quickAddName}>Energy drink</Text>
              <Text style={s.quickAddAmount}>80 mg</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.quickAddButtonDashed}
              onPress={() => setShowCustom(!showCustom)}
              activeOpacity={0.85}
            >
              <Text style={s.quickAddName}>Custom</Text>
              <Text style={s.quickAddAmount}>Enter mg</Text>
            </TouchableOpacity>
          </View>

          {showCustom && (
            <View style={s.customForm}>
              <TextInput
                style={s.input}
                value={customName}
                onChangeText={setCustomName}
                placeholder="Item name"
                placeholderTextColor={theme.colors.textTertiary}
              />
              <TextInput
                style={s.input}
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="Caffeine (mg)"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textTertiary}
              />
              <TouchableOpacity style={s.submitButton} onPress={addCustom} activeOpacity={0.9}>
                <Text style={s.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* More presets — self-designed, since the canvas's 3-tile quick add
            doesn't cover the real app's 11 presets; kept in the same card
            system as a secondary "More drinks" section. */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>More drinks</Text>
          <View style={s.presetGrid}>
            {Object.keys(CAFFEINE_PRESETS)
              .filter(name => !['Coffee (8oz)', 'Black Tea', 'Red Bull (8oz)'].includes(name))
              .map((presetName) => {
                const preset = CAFFEINE_PRESETS[presetName as keyof typeof CAFFEINE_PRESETS];
                const Icon = getIconForType(preset.type);
                return (
                  <TouchableOpacity
                    key={presetName}
                    style={s.presetChip}
                    onPress={() => addPreset(presetName)}
                    activeOpacity={0.85}
                  >
                    <View style={s.presetChipIcon}>
                      <Icon size={16} color={theme.colors.accent} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.presetChipName}>{presetName}</Text>
                      <Text style={s.presetChipAmount}>{preset.amount} mg</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </View>
        </View>

        {/* Today's log — canvas's "Today · total mg" list */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Today · {totalToday} mg</Text>
          <View style={s.logCard}>
            {todayCaffeine.length === 0 ? (
              <Text style={s.emptyText}>No caffeine logged today</Text>
            ) : (
              todayCaffeine.map((item, index) => (
                <View
                  key={item.id}
                  style={[s.logRow, index === todayCaffeine.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <Text style={s.logName}>{item.name}</Text>
                  <Text style={s.logMeta}>
                    {item.amount} mg · {item.time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Caffeine & Sleep info — kept from original, restyled */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Caffeine & sleep</Text>
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <View style={s.infoIconCircle}>
                <Clock size={18} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>Half-life: 5 hours</Text>
                <Text style={s.infoText}>After 5 hours, 50% of caffeine is still in your system</Text>
              </View>
            </View>
            <View style={s.infoRow}>
              <View style={s.infoIconCircle}>
                <Ban size={18} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>Cutoff time</Text>
                <Text style={s.infoText}>Stop caffeine 6–8 hours before bed for best sleep</Text>
              </View>
            </View>
            <View style={[s.infoRow, { marginBottom: 0 }]}>
              <View style={s.infoIconCircle}>
                <Pill size={18} color={theme.colors.accent} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoTitle}>Daily limit</Text>
                <Text style={s.infoText}>400mg per day is safe for most adults</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Estimate disclaimer — canvas footer line */}
        <Text style={s.disclaimer}>
          Estimate based on a typical 5-hour half-life. Everyone processes caffeine differently.
        </Text>
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
      paddingTop: 12,
      paddingBottom: 40,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      marginBottom: 18,
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

    // Hero card
    heroCard: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 18,
      marginBottom: 20,
    },
    heroGlow: {
      position: 'absolute',
      left: -40,
      top: -60,
      width: 240,
      height: 200,
      borderRadius: 120,
      backgroundColor: theme.colors.accentLight,
    },
    heroLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 6,
    },
    heroValueRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      columnGap: 6,
      marginBottom: 14,
    },
    heroValue: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 52,
      lineHeight: 54,
      letterSpacing: -1.2,
      color: theme.colors.textPrimary,
    },
    heroUnit: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    chartRow: {
      position: 'relative',
      height: 90,
      flexDirection: 'row',
      alignItems: 'flex-end',
      columnGap: 3,
      marginBottom: 8,
    },
    chartBedtimeLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 22,
      borderTopWidth: 1,
      borderTopColor: theme.colors.cardBorder,
      borderStyle: 'dashed',
    },
    chartBar: {
      flex: 1,
      borderRadius: 4,
      minHeight: 4,
    },
    chartLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    chartLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    recommendationText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
    },

    // Section
    sectionBlock: {
      marginBottom: 20,
    },
    sectionLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
      marginBottom: 10,
    },

    // Quick add grid
    quickAddGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 10,
      columnGap: 10,
    },
    quickAddButton: {
      width: '48%',
      height: 64,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    quickAddButtonDashed: {
      width: '48%',
      height: 64,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    quickAddName: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    quickAddAmount: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    customForm: {
      marginTop: 12,
      rowGap: 10,
    },
    input: {
      height: 48,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.backgroundSecondary,
      paddingHorizontal: 14,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    submitButton: {
      height: 48,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.ctaBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.ctaText,
    },

    // More presets
    presetGrid: {
      rowGap: 8,
    },
    presetChip: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    presetChipIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    presetChipName: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    presetChipAmount: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 1,
    },

    // Log
    logCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      paddingHorizontal: 16,
    },
    emptyText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
      paddingVertical: 16,
    },
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 54,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    logName: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    logMeta: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },

    // Info card
    infoCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 16,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      marginBottom: 16,
    },
    infoIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoTitle: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    infoText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textSecondary,
    },

    disclaimer: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 19,
      color: theme.colors.textTertiary,
      marginBottom: 8,
    },
  });
