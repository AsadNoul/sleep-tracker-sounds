import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function HealthTrackingScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Health Tracking</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Track factors affecting sleep
          </Text>
        </View>
      </View>

      {/* Medications */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Medications</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => setShowMedModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        
        {todayMedications.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No medications logged today
          </Text>
        ) : (
          todayMedications.map((med) => (
            <View key={med.id} style={[styles.itemRow, { borderBottomColor: theme.colors.backgroundSecondary }]}>
              <View>
                <Text style={[styles.itemName, { color: theme.colors.textPrimary }]}>{med.name}</Text>
                <Text style={[styles.itemDetail, { color: theme.colors.textSecondary }]}>
                  {med.dosage} · {med.time}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Meals & Caffeine */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Meals & Caffeine</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => setShowMealModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {todayMeals.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No meals logged today
          </Text>
        ) : (
          todayMeals.map((meal) => (
            <View key={meal.id} style={[styles.itemRow, { borderBottomColor: theme.colors.backgroundSecondary }]}>
              <View>
                <Text style={[styles.itemName, { color: theme.colors.textPrimary }]}>
                  {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
                </Text>
                <Text style={[styles.itemDetail, { color: theme.colors.textSecondary }]}>
                  {meal.time} {meal.caffeine && '☕ Caffeine'}
                </Text>
              </View>
            </View>
          ))
        )}

        {meals.filter(m => m.caffeine).length > 0 && (
          <View style={[styles.warningBox, { backgroundColor: 'rgba(255, 193, 7, 0.15)', borderColor: 'rgba(255, 193, 7, 0.3)', borderWidth: 1 }]}>
            <Text style={[styles.warningText, { color: '#FFC107' }]}>
              ⚠️ Caffeine after 2 PM may affect sleep quality
            </Text>
          </View>
        )}
      </View>

      {/* Exercise */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Exercise</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => setShowExerciseModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {todayExercises.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No exercise logged today
          </Text>
        ) : (
          todayExercises.map((exercise) => (
            <View key={exercise.id} style={[styles.itemRow, { borderBottomColor: theme.colors.backgroundSecondary }]}>
              <View>
                <Text style={[styles.itemName, { color: theme.colors.textPrimary }]}>{exercise.type}</Text>
                <Text style={[styles.itemDetail, { color: theme.colors.textSecondary }]}>
                  {exercise.duration} min · {exercise.intensity} · {exercise.time}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Impact Analysis */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Sleep Impact</Text>
        <Text style={[styles.analysisText, { color: theme.colors.textSecondary }]}>
          {todayExercises.length > 0 
            ? '✓ Exercise improves sleep quality by 45%'
            : '○ No exercise logged - add activity for better sleep'}
        </Text>
        <Text style={[styles.analysisText, { color: theme.colors.textSecondary }]}>
          {todayMeals.some(m => m.caffeine)
            ? '⚠ Caffeine can reduce sleep quality'
            : '✓ No caffeine detected today'}
        </Text>
        <Text style={[styles.analysisText, { color: theme.colors.textSecondary }]}>
          {todayMedications.length > 0
            ? `${todayMedications.length} medication(s) logged`
            : '○ No medications logged'}
        </Text>
      </View>
    </ScrollView>

      {/* Medication Modal */}
      <Modal visible={showMedModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Add Medication</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary }]}
              placeholder="Medication name"
              placeholderTextColor={theme.colors.textSecondary}
              value={medName}
              onChangeText={setMedName}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary }]}
              placeholder="Dosage (e.g., 10mg)"
              placeholderTextColor={theme.colors.textSecondary}
              value={medDosage}
              onChangeText={setMedDosage}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary }]}
              placeholder="Time (e.g., 8:00 AM)"
              placeholderTextColor={theme.colors.textSecondary}
              value={medTime}
              onChangeText={setMedTime}
            />
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.accent, opacity: medName && medDosage && medTime ? 1 : 0.5 }]}
              onPress={() => {
                if (medName && medDosage && medTime) {
                  addMedication(medName, medDosage, medTime);
                  setMedName('');
                  setMedDosage('');
                  setMedTime('');
                }
              }}
              disabled={!medName || !medDosage || !medTime}
            >
              <Text style={styles.modalButtonText}>Add Medication</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.backgroundSecondary }]}
              onPress={() => {
                setShowMedModal(false);
                setMedName('');
                setMedDosage('');
                setMedTime('');
              }}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Meal Modal */}
      <Modal visible={showMealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Add Meal</Text>
            
            <View style={styles.mealTypeContainer}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => {
                const mealIcons = {
                  breakfast: 'sunny',
                  lunch: 'restaurant',
                  dinner: 'moon',
                  snack: 'fast-food'
                };
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.mealTypeButton, 
                      mealType === type && { backgroundColor: theme.colors.accent },
                      { borderColor: theme.colors.backgroundSecondary, borderWidth: 1 }
                    ]}
                    onPress={() => setMealType(type)}
                  >
                    <Ionicons 
                      name={mealIcons[type]} 
                      size={20} 
                      color={mealType === type ? '#fff' : theme.colors.textSecondary} 
                    />
                    <Text style={[styles.mealTypeText, 
                      { color: mealType === type ? '#fff' : theme.colors.textSecondary }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary }]}
              placeholder="Time (e.g., 12:30 PM)"
              placeholderTextColor={theme.colors.textSecondary}
              value={mealTime}
              onChangeText={setMealTime}
            />
            
            <TouchableOpacity
              style={[styles.caffeineToggle, { backgroundColor: mealHasCaffeine ? theme.colors.accent : theme.colors.backgroundSecondary }]}
              onPress={() => setMealHasCaffeine(!mealHasCaffeine)}
            >
              <Text style={[styles.caffeineText, { color: mealHasCaffeine ? '#fff' : theme.colors.textPrimary }]}>☕ Contains Caffeine</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.accent, opacity: mealTime ? 1 : 0.5 }]}
              onPress={() => {
                if (mealTime) {
                  addMeal(mealType, mealTime, mealHasCaffeine);
                  setMealTime('');
                  setMealHasCaffeine(false);
                }
              }}
              disabled={!mealTime}
            >
              <Text style={styles.modalButtonText}>Add Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.backgroundSecondary }]}
              onPress={() => {
                setShowMealModal(false);
                setMealTime('');
                setMealHasCaffeine(false);
              }}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Exercise Modal */}
      <Modal visible={showExerciseModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Add Exercise</Text>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary }]}
              placeholder="Exercise type (e.g., Running, Yoga)"
              placeholderTextColor={theme.colors.textSecondary}
              value={exerciseType}
              onChangeText={setExerciseType}
            />
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary }]}
              placeholder="Duration (minutes)"
              placeholderTextColor={theme.colors.textSecondary}
              value={exerciseDuration}
              onChangeText={setExerciseDuration}
              keyboardType="numeric"
            />
            
            <View style={styles.intensityContainer}>
              {(['low', 'moderate', 'high'] as const).map((intensity) => {
                const intensityIcons = {
                  low: 'walk',
                  moderate: 'bicycle',
                  high: 'flash'
                };
                return (
                  <TouchableOpacity
                    key={intensity}
                    style={[styles.intensityButton, 
                      exerciseIntensity === intensity && { backgroundColor: theme.colors.accent },
                      { borderColor: theme.colors.backgroundSecondary, borderWidth: 1 }
                    ]}
                    onPress={() => setExerciseIntensity(intensity)}
                  >
                    <Ionicons 
                      name={intensityIcons[intensity]} 
                      size={20} 
                      color={exerciseIntensity === intensity ? '#fff' : theme.colors.textSecondary} 
                    />
                    <Text style={[styles.intensityText, 
                      { color: exerciseIntensity === intensity ? '#fff' : theme.colors.textSecondary }
                    ]}>
                      {intensity.charAt(0).toUpperCase() + intensity.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.textPrimary }]}
              placeholder="Time (e.g., 6:00 PM)"
              placeholderTextColor={theme.colors.textSecondary}
              value={exerciseTime}
              onChangeText={setExerciseTime}
            />
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.accent, opacity: exerciseType && exerciseDuration && exerciseTime ? 1 : 0.5 }]}
              onPress={() => {
                if (exerciseType && exerciseDuration && exerciseTime) {
                  addExercise(exerciseType, parseInt(exerciseDuration), exerciseIntensity, exerciseTime);
                  setExerciseType('');
                  setExerciseDuration('');
                  setExerciseTime('');
                }
              }}
              disabled={!exerciseType || !exerciseDuration || !exerciseTime}
            >
              <Text style={styles.modalButtonText}>Add Exercise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: theme.colors.backgroundSecondary }]}
              onPress={() => {
                setShowExerciseModal(false);
                setExerciseType('');
                setExerciseDuration('');
                setExerciseTime('');
              }}
            >
              <Text style={[styles.modalCloseText, { color: theme.colors.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  section: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  itemRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 14,
  },
  warningBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8, columnGap: 8,
    marginBottom: 12,
  },
  mealTypeButton: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    rowGap: 6, columnGap: 6,
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  caffeineToggle: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  caffeineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  intensityContainer: {
    flexDirection: 'row',
    rowGap: 8, columnGap: 8,
    marginBottom: 12,
  },
  intensityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    rowGap: 6, columnGap: 6,
  },
  intensityText: {
    fontSize: 14,
    fontWeight: '600',
  },
});


