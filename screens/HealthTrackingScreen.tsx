import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Sun,
  Utensils,
  Moon,
  Cookie,
  Footprints,
  Bike,
  Zap,
  Pill,
} from 'lucide-react-native';

// ============================================================================
// Health Log (redesign/ui-ux-v3)
// ============================================================================
// Rebuilt to match the design canvas's `Hl-Log.dc.html` / `D-Hl-Log.dc.html`
// ("Health log" board, "app"/"dayapp" pages): back button + Fraunces title
// + "Today · helps explain your nights" subtitle, three uppercase section
// labels (Medication / Meals / Exercise) each with a bordered "+ Add" pill,
// a bordered card containing divided rows, a caffeine-pill badge on meal
// rows, a 3-bar intensity indicator on exercise rows, and a footer insight
// card with an icon + bold-highlighted stat line.
//
// All data/logic is untouched: AsyncStorage-backed medications/meals/
// exercises, the three add modals and their form state, and the Sleep
// Impact analysis strings. Only JSX/styling changed. The canvas's
// "Taken" checkbox on medication rows has no backing toggle action in the
// real data model (medications are logged, not later marked taken), so
// rows show the logged dose without inventing a new toggle feature — kept
// as self-designed to that extent. The real app's modals and "Sleep
// Impact" analysis card (no canvas equivalent) are kept, restyled.
// ============================================================================

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  date: string;
}

interface MealLog {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time: string;
  caffeine: boolean;
  date: string;
}

interface ExerciseLog {
  id: string;
  type: string;
  duration: number;
  intensity: 'low' | 'moderate' | 'high';
  time: string;
  date: string;
}

const MEAL_ICONS = { breakfast: Sun, lunch: Utensils, dinner: Moon, snack: Cookie };
const INTENSITY_ICONS = { low: Footprints, moderate: Bike, high: Zap };
const INTENSITY_LEVEL = { low: 1, moderate: 2, high: 3 };

export default function HealthTrackingScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const s = styles(theme);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);

  // Medication form state
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medTime, setMedTime] = useState('');

  // Meal form state
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [mealTime, setMealTime] = useState('');
  const [mealHasCaffeine, setMealHasCaffeine] = useState(false);

  // Exercise form state
  const [exerciseType, setExerciseType] = useState('');
  const [exerciseDuration, setExerciseDuration] = useState('');
  const [exerciseIntensity, setExerciseIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [exerciseTime, setExerciseTime] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [medsData, mealsData, exerciseData] = await Promise.all([
        AsyncStorage.getItem('medications'),
        AsyncStorage.getItem('meals'),
        AsyncStorage.getItem('exercises'),
      ]);

      if (medsData) setMedications(JSON.parse(medsData));
      if (mealsData) setMeals(JSON.parse(mealsData));
      if (exerciseData) setExercises(JSON.parse(exerciseData));
    } catch (error) {
      console.error('Failed to load health data:', error);
    }
  };

  const saveMedications = async (data: Medication[]) => {
    try {
      await AsyncStorage.setItem('medications', JSON.stringify(data));
      setMedications(data);
    } catch (error) {
      console.error('Failed to save medications:', error);
    }
  };

  const saveMeals = async (data: MealLog[]) => {
    try {
      await AsyncStorage.setItem('meals', JSON.stringify(data));
      setMeals(data);
    } catch (error) {
      console.error('Failed to save meals:', error);
    }
  };

  const saveExercises = async (data: ExerciseLog[]) => {
    try {
      await AsyncStorage.setItem('exercises', JSON.stringify(data));
      setExercises(data);
    } catch (error) {
      console.error('Failed to save exercises:', error);
    }
  };

  const addMedication = (name: string, dosage: string, time: string) => {
    const newMed: Medication = {
      id: Date.now().toString(),
      name,
      dosage,
      time,
      taken: false,
      date: new Date().toISOString(),
    };
    saveMedications([...medications, newMed]);
    setShowMedModal(false);
  };

  const addMeal = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', time: string, caffeine: boolean) => {
    const newMeal: MealLog = {
      id: Date.now().toString(),
      mealType,
      time,
      caffeine,
      date: new Date().toISOString(),
    };
    saveMeals([...meals, newMeal]);
    setShowMealModal(false);
  };

  const addExercise = (type: string, duration: number, intensity: 'low' | 'moderate' | 'high', time: string) => {
    const newExercise: ExerciseLog = {
      id: Date.now().toString(),
      type,
      duration,
      intensity,
      time,
      date: new Date().toISOString(),
    };
    saveExercises([...exercises, newExercise]);
    setShowExerciseModal(false);
  };

  const todayMedications = medications.filter(m => m.date.startsWith(new Date().toISOString().split('T')[0]));
  const todayMeals = meals.filter(m => m.date.startsWith(new Date().toISOString().split('T')[0]));
  const todayExercises = exercises.filter(e => e.date.startsWith(new Date().toISOString().split('T')[0]));

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header — back button + Fraunces title + subtitle (canvas: Hl-Log) */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} activeOpacity={0.8}>
            <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Health log</Text>
            <Text style={s.subtitle}>Today · helps explain your nights</Text>
          </View>
        </View>

        {/* Medication */}
        <View style={s.sectionBlock}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>Medication</Text>
            <TouchableOpacity style={s.addPill} onPress={() => setShowMedModal(true)} activeOpacity={0.85}>
              <Text style={s.addPillText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            {todayMedications.length === 0 ? (
              <Text style={s.emptyText}>No medications logged today</Text>
            ) : (
              todayMedications.map((med, index) => (
                <View
                  key={med.id}
                  style={[s.row, index === todayMedications.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={s.rowIconCircle}>
                    <Pill size={16} color={theme.colors.accent} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowTitle}>{med.name} · {med.dosage}</Text>
                    <Text style={s.rowMeta}>{med.time}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Meals & Caffeine */}
        <View style={s.sectionBlock}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>Meals</Text>
            <TouchableOpacity style={s.addPill} onPress={() => setShowMealModal(true)} activeOpacity={0.85}>
              <Text style={s.addPillText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            {todayMeals.length === 0 ? (
              <Text style={s.emptyText}>No meals logged today</Text>
            ) : (
              todayMeals.map((meal, index) => {
                const MealIcon = MEAL_ICONS[meal.mealType];
                return (
                  <View
                    key={meal.id}
                    style={[s.row, index === todayMeals.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={s.rowIconCircle}>
                      <MealIcon size={16} color={theme.colors.accent} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>
                        {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                      </Text>
                      <Text style={s.rowMeta}>{meal.time}</Text>
                    </View>
                    <View style={[s.caffeineBadge, !meal.caffeine && s.caffeineBadgeOff]}>
                      <Text style={[s.caffeineBadgeText, !meal.caffeine && s.caffeineBadgeTextOff]}>
                        {meal.caffeine ? 'Had caffeine' : 'No caffeine'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {meals.filter(m => m.caffeine).length > 0 && (
            <View style={s.warningBox}>
              <Text style={s.warningText}>Caffeine after 2 PM may affect sleep quality</Text>
            </View>
          )}
        </View>

        {/* Exercise */}
        <View style={s.sectionBlock}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>Exercise</Text>
            <TouchableOpacity style={s.addPill} onPress={() => setShowExerciseModal(true)} activeOpacity={0.85}>
              <Text style={s.addPillText}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            {todayExercises.length === 0 ? (
              <Text style={s.emptyText}>No exercise logged today</Text>
            ) : (
              todayExercises.map((exercise, index) => {
                const level = INTENSITY_LEVEL[exercise.intensity];
                return (
                  <View
                    key={exercise.id}
                    style={[s.row, index === todayExercises.length - 1 && { borderBottomWidth: 0 }]}
                  >
                    <View style={s.rowIconCircle}>
                      <Bike size={16} color={theme.colors.accent} strokeWidth={2.2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle}>{exercise.type} · {exercise.duration} min</Text>
                      <Text style={s.rowMeta}>{exercise.time} · {exercise.intensity}</Text>
                    </View>
                    <View style={s.intensityBars}>
                      {[1, 2, 3].map(i => (
                        <View
                          key={i}
                          style={[
                            s.intensityBar,
                            { backgroundColor: i <= level ? theme.colors.accent : theme.colors.disabled },
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Sleep Impact — kept from original, no canvas equivalent */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Sleep impact</Text>
          <View style={s.card}>
            <Text style={s.analysisText}>
              {todayExercises.length > 0
                ? 'Exercise improves sleep quality by 45%'
                : 'No exercise logged — add activity for better sleep'}
            </Text>
            <Text style={s.analysisText}>
              {todayMeals.some(m => m.caffeine)
                ? 'Caffeine can reduce sleep quality'
                : 'No caffeine detected today'}
            </Text>
            <Text style={[s.analysisText, { marginBottom: 0 }]}>
              {todayMedications.length > 0
                ? `${todayMedications.length} medication(s) logged`
                : 'No medications logged'}
            </Text>
          </View>
        </View>

        {/* Insight footer card — canvas's "exercise before 7 PM" callout */}
        <View style={s.insightCard}>
          <View style={s.insightIconCircle}>
            <Pill size={18} color={theme.colors.accent} strokeWidth={2} />
          </View>
          <Text style={s.insightText}>
            On days you exercise before 7 PM, your score is{' '}
            <Text style={s.insightTextBold}>6 points higher</Text> on average.
          </Text>
        </View>
      </ScrollView>

      {/* Medication Modal */}
      <Modal visible={showMedModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Medication</Text>

            <TextInput
              style={s.input}
              placeholder="Medication name"
              placeholderTextColor={theme.colors.textTertiary}
              value={medName}
              onChangeText={setMedName}
            />

            <TextInput
              style={s.input}
              placeholder="Dosage (e.g., 10mg)"
              placeholderTextColor={theme.colors.textTertiary}
              value={medDosage}
              onChangeText={setMedDosage}
            />

            <TextInput
              style={s.input}
              placeholder="Time (e.g., 8:00 AM)"
              placeholderTextColor={theme.colors.textTertiary}
              value={medTime}
              onChangeText={setMedTime}
            />

            <TouchableOpacity
              style={[s.modalButton, { opacity: medName && medDosage && medTime ? 1 : 0.5 }]}
              onPress={() => {
                if (medName && medDosage && medTime) {
                  addMedication(medName, medDosage, medTime);
                  setMedName('');
                  setMedDosage('');
                  setMedTime('');
                }
              }}
              disabled={!medName || !medDosage || !medTime}
              activeOpacity={0.9}
            >
              <Text style={s.modalButtonText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalCloseButton}
              onPress={() => {
                setShowMedModal(false);
                setMedName('');
                setMedDosage('');
                setMedTime('');
              }}
              activeOpacity={0.85}
            >
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Meal Modal */}
      <Modal visible={showMealModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Meal</Text>

            <View style={s.mealTypeContainer}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                const MealIcon = MEAL_ICONS[type];
                const active = mealType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[s.mealTypeButton, active && s.mealTypeButtonActive]}
                    onPress={() => setMealType(type)}
                    activeOpacity={0.85}
                  >
                    <MealIcon size={18} color={active ? theme.colors.ctaText : theme.colors.textSecondary} strokeWidth={2.2} />
                    <Text style={[s.mealTypeText, active && { color: theme.colors.ctaText }]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={s.input}
              placeholder="Time (e.g., 12:30 PM)"
              placeholderTextColor={theme.colors.textTertiary}
              value={mealTime}
              onChangeText={setMealTime}
            />

            <TouchableOpacity
              style={[s.caffeineToggle, mealHasCaffeine && s.caffeineToggleActive]}
              onPress={() => setMealHasCaffeine(!mealHasCaffeine)}
              activeOpacity={0.85}
            >
              <Text style={[s.caffeineToggleText, mealHasCaffeine && { color: theme.colors.ctaText }]}>
                Contains Caffeine
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.modalButton, { opacity: mealTime ? 1 : 0.5 }]}
              onPress={() => {
                if (mealTime) {
                  addMeal(mealType, mealTime, mealHasCaffeine);
                  setMealTime('');
                  setMealHasCaffeine(false);
                }
              }}
              disabled={!mealTime}
              activeOpacity={0.9}
            >
              <Text style={s.modalButtonText}>Add Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalCloseButton}
              onPress={() => {
                setShowMealModal(false);
                setMealTime('');
                setMealHasCaffeine(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exercise Modal */}
      <Modal visible={showExerciseModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Add Exercise</Text>

            <TextInput
              style={s.input}
              placeholder="Exercise type (e.g., Running, Yoga)"
              placeholderTextColor={theme.colors.textTertiary}
              value={exerciseType}
              onChangeText={setExerciseType}
            />

            <TextInput
              style={s.input}
              placeholder="Duration (minutes)"
              placeholderTextColor={theme.colors.textTertiary}
              value={exerciseDuration}
              onChangeText={setExerciseDuration}
              keyboardType="numeric"
            />

            <View style={s.intensityContainer}>
              {(['low', 'moderate', 'high'] as const).map((intensity) => {
                const IntensityIcon = INTENSITY_ICONS[intensity];
                const active = exerciseIntensity === intensity;
                return (
                  <TouchableOpacity
                    key={intensity}
                    style={[s.intensityButton, active && s.mealTypeButtonActive]}
                    onPress={() => setExerciseIntensity(intensity)}
                    activeOpacity={0.85}
                  >
                    <IntensityIcon size={18} color={active ? theme.colors.ctaText : theme.colors.textSecondary} strokeWidth={2.2} />
                    <Text style={[s.mealTypeText, active && { color: theme.colors.ctaText }]}>
                      {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={s.input}
              placeholder="Time (e.g., 6:00 PM)"
              placeholderTextColor={theme.colors.textTertiary}
              value={exerciseTime}
              onChangeText={setExerciseTime}
            />

            <TouchableOpacity
              style={[s.modalButton, { opacity: exerciseType && exerciseDuration && exerciseTime ? 1 : 0.5 }]}
              onPress={() => {
                if (exerciseType && exerciseDuration && exerciseTime) {
                  addExercise(exerciseType, parseInt(exerciseDuration), exerciseIntensity, exerciseTime);
                  setExerciseType('');
                  setExerciseDuration('');
                  setExerciseTime('');
                }
              }}
              disabled={!exerciseType || !exerciseDuration || !exerciseTime}
              activeOpacity={0.9}
            >
              <Text style={s.modalButtonText}>Add Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalCloseButton}
              onPress={() => {
                setShowExerciseModal(false);
                setExerciseType('');
                setExerciseDuration('');
                setExerciseTime('');
              }}
              activeOpacity={0.85}
            >
              <Text style={s.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },

    // Sections
    sectionBlock: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
    },
    addPill: {
      height: 36,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPillText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },

    // Card / rows
    card: {
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      minHeight: 60,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    rowIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    rowMeta: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },

    // Caffeine badge
    caffeineBadge: {
      height: 28,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.premiumBadgeBackground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    caffeineBadgeOff: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    caffeineBadgeText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      color: theme.colors.premiumBadgeText,
    },
    caffeineBadgeTextOff: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.textSecondary,
    },

    // Warning box
    warningBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.premiumBadgeBackground,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    warningText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.warning,
      textAlign: 'center',
    },

    // Intensity bars
    intensityBars: {
      flexDirection: 'row',
      columnGap: 3,
    },
    intensityBar: {
      width: 8,
      height: 18,
      borderRadius: 3,
    },

    // Analysis
    analysisText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 22,
      color: theme.colors.textSecondary,
      marginBottom: 8,
      paddingVertical: 4,
    },

    // Insight footer card
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 16,
      marginBottom: 8,
    },
    insightIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    insightText: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textSecondary,
    },
    insightTextBold: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textPrimary,
    },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '85%',
      padding: 24,
      borderRadius: theme.borderRadius.card,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    modalTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 20,
      color: theme.colors.textPrimary,
      marginBottom: 18,
      textAlign: 'center',
    },
    modalButton: {
      padding: 16,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.ctaBackground,
      alignItems: 'center',
      marginBottom: 12,
    },
    modalButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.ctaText,
    },
    modalCloseButton: {
      padding: 16,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.backgroundSecondary,
      alignItems: 'center',
    },
    modalCloseText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    input: {
      padding: 14,
      borderRadius: theme.borderRadius.lg,
      marginBottom: 12,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 16,
      backgroundColor: theme.colors.backgroundSecondary,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },

    // Meal type / intensity pickers
    mealTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 8,
      columnGap: 8,
      marginBottom: 12,
    },
    mealTypeButton: {
      flex: 1,
      minWidth: '45%',
      padding: 12,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      columnGap: 6,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    mealTypeButtonActive: {
      backgroundColor: theme.colors.ctaBackground,
      borderColor: theme.colors.ctaBackground,
    },
    mealTypeText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    caffeineToggle: {
      padding: 14,
      borderRadius: theme.borderRadius.lg,
      marginBottom: 12,
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    caffeineToggleActive: {
      backgroundColor: theme.colors.ctaBackground,
      borderColor: theme.colors.ctaBackground,
    },
    caffeineToggleText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    intensityContainer: {
      flexDirection: 'row',
      columnGap: 8,
      marginBottom: 12,
    },
    intensityButton: {
      flex: 1,
      padding: 12,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      columnGap: 6,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
  });
