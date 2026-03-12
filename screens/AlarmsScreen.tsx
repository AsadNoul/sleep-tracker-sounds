import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  TextInput,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { ChevronLeft, Plus, Trash2, Bell, Clock, Music } from 'lucide-react-native';
import alarmService from '../services/alarmService';
import { useRoute } from '@react-navigation/native';

export default function AlarmsScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();

  const [alarms, setAlarms] = useState<any[]>([]);
  const [showAddAlarm, setShowAddAlarm] = useState(false);
  const [newAlarmTime, setNewAlarmTime] = useState('07:00');
  const [newAlarmName, setNewAlarmName] = useState('Morning Alarm');
  const [newAlarmSound, setNewAlarmSound] = useState<string | undefined>(undefined);
  const [newAlarmSoundName, setNewAlarmSoundName] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadAlarms();

    // Check for params from SoundsScreen
    if (route.params?.soundUri) {
      setNewAlarmSound(route.params.soundUri);
      setNewAlarmSoundName(route.params.soundName);
      setNewAlarmName(`Alarm: ${route.params.soundName}`);
      setShowAddAlarm(true);
    }
  }, [route.params]);

  const loadAlarms = async () => {
    const loadedAlarms = await alarmService.getAlarms();
    setAlarms(loadedAlarms);
  };

  const handleAddAlarm = async () => {
    if (!newAlarmTime || !newAlarmName) {
      Alert.alert('Error', 'Please enter both time and name for the alarm');
      return;
    }

    await alarmService.setAlarm(newAlarmTime, newAlarmName, newAlarmSound);
    setNewAlarmTime('07:00');
    setNewAlarmName('Morning Alarm');
    setNewAlarmSound(undefined);
    setNewAlarmSoundName(undefined);
    setShowAddAlarm(false);
    await loadAlarms();
    Alert.alert('Success', `Alarm set for ${newAlarmTime}`);
  };

  const handleDeleteAlarm = async (id: string) => {
    Alert.alert(
      'Delete Alarm',
      'Are you sure you want to delete this alarm?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await alarmService.deleteAlarm(id);
            await loadAlarms();
          },
        },
      ]
    );
  };

  const handleToggleAlarm = async (id: string, enabled: boolean) => {
    await alarmService.toggleAlarm(id, enabled);
    await loadAlarms();
  };

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        style={styles(theme).gradient}
      >
        {/* Header */}
        <View style={[styles(theme).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles(theme).backButton}>
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme).headerTitle}>Alarms</Text>
          <TouchableOpacity onPress={() => setShowAddAlarm(true)} style={styles(theme).addButton}>
            <Plus size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles(theme).content} showsVerticalScrollIndicator={false}>
          {/* Add Alarm Form */}
          {showAddAlarm && (
            Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="dark" style={styles(theme).addAlarmCard}>
                <Text style={styles(theme).addAlarmTitle}>New Alarm</Text>

                <View style={styles(theme).inputGroup}>
                  <Text style={styles(theme).inputLabel}>Time (HH:MM)</Text>
                  <TextInput
                    style={styles(theme).input}
                    value={newAlarmTime}
                    onChangeText={setNewAlarmTime}
                    placeholder="07:00"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={styles(theme).inputGroup}>
                  <Text style={styles(theme).inputLabel}>Name</Text>
                  <TextInput
                    style={styles(theme).input}
                    value={newAlarmName}
                    onChangeText={setNewAlarmName}
                    placeholder="Morning Alarm"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                {newAlarmSoundName && (
                  <View style={styles(theme).inputGroup}>
                    <Text style={styles(theme).inputLabel}>Selected Sound</Text>
                    <View style={styles(theme).soundBadge}>
                      <Music size={16} color={theme.colors.accent} />
                      <Text style={styles(theme).soundBadgeText}>{newAlarmSoundName}</Text>
                    </View>
                  </View>
                )}

                <View style={styles(theme).buttonRow}>
                  <TouchableOpacity
                    style={styles(theme).cancelButton}
                    onPress={() => setShowAddAlarm(false)}
                  >
                    <Text style={styles(theme).cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles(theme).saveButton} onPress={handleAddAlarm}>
                    <Text style={styles(theme).saveButtonText}>Add Alarm</Text>
                  </TouchableOpacity>
                </View>
              </BlurView>
            ) : (
              <View style={styles(theme).addAlarmCard}>
                <Text style={styles(theme).addAlarmTitle}>New Alarm</Text>

                <View style={styles(theme).inputGroup}>
                  <Text style={styles(theme).inputLabel}>Time (HH:MM)</Text>
                  <TextInput
                    style={styles(theme).input}
                    value={newAlarmTime}
                    onChangeText={setNewAlarmTime}
                    placeholder="07:00"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>

                <View style={styles(theme).inputGroup}>
                  <Text style={styles(theme).inputLabel}>Name</Text>
                  <TextInput
                    style={styles(theme).input}
                    value={newAlarmName}
                    onChangeText={setNewAlarmName}
                    placeholder="Morning Alarm"
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <View style={styles(theme).buttonRow}>
                  <TouchableOpacity
                    style={styles(theme).cancelButton}
                    onPress={() => setShowAddAlarm(false)}
                  >
                    <Text style={styles(theme).cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles(theme).saveButton} onPress={handleAddAlarm}>
                    <Text style={styles(theme).saveButtonText}>Add Alarm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          )}

          {/* Alarms List */}
          {alarms.length === 0 && !showAddAlarm ? (
            Platform.OS === 'ios' ? (
              <BlurView intensity={20} tint="dark" style={styles(theme).emptyCard}>
                <Bell size={48} color={theme.colors.textSecondary} />
                <Text style={styles(theme).emptyTitle}>No Alarms Set</Text>
                <Text style={styles(theme).emptyText}>
                  Tap the + button to create your first alarm
                </Text>
              </BlurView>
            ) : (
              <View style={styles(theme).emptyCard}>
                <Bell size={48} color={theme.colors.textSecondary} />
                <Text style={styles(theme).emptyTitle}>No Alarms Set</Text>
                <Text style={styles(theme).emptyText}>
                  Tap the + button to create your first alarm
                </Text>
              </View>
            )
          ) : (
            alarms.map((alarm) => (
              Platform.OS === 'ios' ? (
                <BlurView key={alarm.id} intensity={20} tint="dark" style={styles(theme).alarmCard}>
                  <View style={styles(theme).alarmInfo}>
                    <View style={styles(theme).alarmIconContainer}>
                      <Clock size={24} color={theme.colors.accent} />
                    </View>
                    <View style={styles(theme).alarmDetails}>
                      <Text style={styles(theme).alarmTime}>{alarm.time}</Text>
                      <Text style={styles(theme).alarmName}>{alarm.name}</Text>
                    </View>
                  </View>

                  <View style={styles(theme).alarmActions}>
                    <Switch
                      value={alarm.enabled}
                      onValueChange={(enabled) => handleToggleAlarm(alarm.id, enabled)}
                      trackColor={{ false: '#444', true: theme.colors.accent }}
                      thumbColor={alarm.enabled ? '#FFF' : '#999'}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteAlarm(alarm.id)}
                      style={styles(theme).deleteButton}
                    >
                      <Trash2 size={20} color="#FF6B9D" />
                    </TouchableOpacity>
                  </View>
                </BlurView>
              ) : (
                <View key={alarm.id} style={styles(theme).alarmCard}>
                  <View style={styles(theme).alarmInfo}>
                    <View style={styles(theme).alarmIconContainer}>
                      <Clock size={24} color={theme.colors.accent} />
                    </View>
                    <View style={styles(theme).alarmDetails}>
                      <Text style={styles(theme).alarmTime}>{alarm.time}</Text>
                      <Text style={styles(theme).alarmName}>{alarm.name}</Text>
                    </View>
                  </View>

                  <View style={styles(theme).alarmActions}>
                    <Switch
                      value={alarm.enabled}
                      onValueChange={(enabled) => handleToggleAlarm(alarm.id, enabled)}
                      trackColor={{ false: '#444', true: theme.colors.accent }}
                      thumbColor={alarm.enabled ? '#FFF' : '#999'}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteAlarm(alarm.id)}
                      style={styles(theme).deleteButton}
                    >
                      <Trash2 size={20} color="#FF6B9D" />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradient: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.textPrimary,
    },
    addButton: {
      padding: 8,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    addAlarmCard: {
      backgroundColor: 'rgba(27, 29, 42, 0.7)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 0,
    },
    addAlarmTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      padding: 14,
      color: theme.colors.textPrimary,
      fontSize: 16,
      borderWidth: 0,
    },
    buttonRow: {
      flexDirection: 'row',
      rowGap: 12, columnGap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    cancelButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      backgroundColor: theme.colors.accent,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#000',
      fontSize: 16,
      fontWeight: '700',
    },
    emptyCard: {
      backgroundColor: 'rgba(27, 29, 42, 0.7)',
      borderRadius: 16,
      padding: 40,
      alignItems: 'center',
      marginTop: 20,
      borderWidth: 0,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    alarmCard: {
      backgroundColor: 'rgba(27, 29, 42, 0.7)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 0,
    },
    alarmInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    alarmIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    alarmDetails: {
      flex: 1,
    },
    alarmTime: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    alarmName: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    alarmActions: {
      flexDirection: 'row',
      alignItems: 'center',
      rowGap: 12, columnGap: 12,
    },
    deleteButton: {
      padding: 8,
    },
    soundBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 8,
      padding: 10,
      rowGap: 8, columnGap: 8,
    },
    soundBadgeText: {
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
  });
