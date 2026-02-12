import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface CaffeineItem {
  id: string;
  name: string;
  amount: number; // mg of caffeine
  time: Date;
  type: 'coffee' | 'tea' | 'soda' | 'energy' | 'other';
}

const CAFFEINE_PRESETS = {
  'Espresso (1 shot)': { amount: 63, type: 'coffee' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/espresso.png' },
  'Coffee (8oz)': { amount: 95, type: 'coffee' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/espresso.png' },
  'Coffee (12oz)': { amount: 142, type: 'coffee' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/espresso.png' },
  'Coffee (16oz)': { amount: 190, type: 'coffee' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/espresso.png' },
  'Green Tea': { amount: 28, type: 'tea' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/coffee.png' },
  'Black Tea': { amount: 47, type: 'tea' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/greentea.png' },
  'Cola (12oz)': { amount: 34, type: 'soda' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/cocacola.png' },
  'Mountain Dew': { amount: 54, type: 'soda' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/blacktea.png' },
  'Red Bull (8oz)': { amount: 80, type: 'energy' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/mountaindew.png' },
  'Monster (16oz)': { amount: 160, type: 'energy' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/redbull.png' },
  'Dark Chocolate (1oz)': { amount: 12, type: 'other' as const, image: 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/chocolate.png' },
};

const getIconForPreset = (name: string): string => {
  if (name.includes('Espresso')) return '☕'; // Espresso cup
  if (name.includes('Coffee')) return '🥤'; // Coffee cup with lid
  if (name.includes('Green Tea')) return '🍵'; // Green tea cup
  if (name.includes('Black Tea')) return '🫖'; // Black tea with teabag
  if (name.includes('Cola')) return '🥤'; // Cola bottle
  if (name.includes('Mountain Dew')) return '🥤'; // Mountain Dew bottle
  if (name.includes('Red Bull')) return '🥫'; // Energy drink can
  if (name.includes('Monster')) return '🥫'; // Monster energy can
  if (name.includes('Chocolate')) return '🍫'; // Dark chocolate
  return '☕';
};

export default function CaffeineCalculatorScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
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
    const currentLevel = getCurrentCaffeineLevel();
    const bedtimeLevel = getCaffeineAtBedtime();
    const hoursToBedtime = getHoursUntilBedtime();

    if (bedtimeLevel > 50) {
      return {
        text: '⚠️ High caffeine at bedtime. Consider no more caffeine today.',
        color: '#ef4444',
      };
    } else if (bedtimeLevel > 25 && hoursToBedtime < 6) {
      return {
        text: '⚠️ Moderate caffeine. Best to avoid more in next few hours.',
        color: '#fbbf24',
      };
    } else if (hoursToBedtime < 4) {
      return {
        text: '⚠️ Close to bedtime. Avoid caffeine now.',
        color: '#fbbf24',
      };
    } else {
      return {
        text: '✓ Caffeine levels look good for tonight.',
        color: '#4ade80',
      };
    }
  };

  const recommendation = getRecommendation();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Caffeine Calculator</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Track intake & sleep impact
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                {getTotalCaffeine()}mg
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Today</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                {getCurrentCaffeineLevel().toFixed(0)}mg
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Current Level</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                {getCaffeineAtBedtime().toFixed(0)}mg
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>At Bedtime</Text>
            </View>
          </View>

          <View style={[styles.recommendationBox, { backgroundColor: recommendation.color + '20' }]}>
            <Text style={[styles.recommendationText, { color: recommendation.color }]}>
              {recommendation.text}
            </Text>
          </View>
        </View>

        <View style={[styles.addCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Quick Add</Text>
          <View style={styles.presetGrid}>
            {Object.keys(CAFFEINE_PRESETS).map((presetName) => {
              const preset = CAFFEINE_PRESETS[presetName as keyof typeof CAFFEINE_PRESETS];
              return (
                <TouchableOpacity
                  key={presetName}
                  style={[styles.presetButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                  onPress={() => addPreset(presetName)}
                >
                  <View style={styles.imageContainer}>
                    <Image 
                      source={{ uri: preset.image }} 
                      style={styles.presetImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.presetName, { color: theme.colors.textPrimary }]}>{presetName}</Text>
                  <Text style={[styles.presetAmount, { color: theme.colors.textSecondary }]}>
                    {preset.amount}mg
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.customButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => setShowCustom(!showCustom)}
          >
            <Text style={styles.customButtonText}>+ Custom Item</Text>
          </TouchableOpacity>

          {showCustom && (
            <View style={styles.customForm}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary }]}
                value={customName}
                onChangeText={setCustomName}
                placeholder="Item name"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.background, color: theme.colors.textPrimary }]}
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="Caffeine (mg)"
                keyboardType="numeric"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.colors.accent }]}
                onPress={addCustom}
              >
                <Text style={styles.submitButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={[styles.logCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Today's Log</Text>
          {todayCaffeine.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No caffeine logged today
            </Text>
          ) : (
            todayCaffeine.map((item) => (
              <View key={item.id} style={styles.logItem}>
                <View style={styles.logLeft}>
                  <Text style={[styles.logName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.logTime, { color: theme.colors.textSecondary }]}>
                    {item.time.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Text style={[styles.logAmount, { color: theme.colors.accent }]}>{item.amount}mg</Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Caffeine & Sleep</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>⏰</Text>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.textPrimary }]}>Half-Life: 5 Hours</Text>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                After 5 hours, 50% of caffeine is still in your system
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🚫</Text>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.textPrimary }]}>Cutoff Time</Text>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Stop caffeine 6-8 hours before bed for best sleep
              </Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>💊</Text>
            <View style={styles.infoContent}>
              <Text style={[styles.infoTitle, { color: theme.colors.textPrimary }]}>Daily Limit</Text>
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                400mg per day is safe for most adults
              </Text>
            </View>
          </View>
        </View>
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
  statsCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
    fontSize: 11,
    textAlign: 'center',
  },
  recommendationBox: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  addCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    padding: 12,
    borderRadius: 12,
    minWidth: '48%',
    alignItems: 'center',
  },
  imageContainer: {
    width: 70,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  presetImage: {
    width: 60,
    height: 60,
  },
  presetName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  presetAmount: {
    fontSize: 12,
    textAlign: 'center',
  },
  customButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  customButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  customForm: {
    marginTop: 16,
    gap: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  submitButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logLeft: {
    flex: 1,
  },
  logName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  logTime: {
    fontSize: 12,
  },
  logAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

