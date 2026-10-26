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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import { ChevronLeft, Plus, Trash2, Bell, Clock, Music, X, Check } from 'lucide-react-native';
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
      {/* Header */}
      <View style={[styles(theme).header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles(theme).headerActionFab}>
          <ChevronLeft size={22} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles(theme).headerTitleBlock}>
          <Text style={styles(theme).headerLargeTitle}>Alarms</Text>
          <Text style={styles(theme).headerSubtitleText}>
            {alarms.length > 0 ? `${alarms.length} ${alarms.length === 1 ? 'alarm' : 'alarms'} set` : 'Wake up on your terms'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddAlarm(!showAddAlarm)} style={styles(theme).headerActionFab}>
          {showAddAlarm ? (
            <X size={22} color={theme.colors.textPrimary} strokeWidth={2.2} />
          ) : (
            <Plus size={22} color={theme.colors.accent} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles(theme).content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(theme).scrollContent}
      >
        {/* Add Alarm Form */}
        {showAddAlarm && (
          <View style={styles(theme).addAlarmCard}>
            <Text style={styles(theme).addAlarmTitle}>New alarm</Text>

            <View style={styles(theme).inputGroup}>
              <Text style={styles(theme).inputLabel}>Time (HH:MM)</Text>
              <TextInput
                style={styles(theme).input}
                value={newAlarmTime}
                onChangeText={setNewAlarmTime}
                placeholder="07:00"
                placeholderTextColor={theme.colors.textTertiary}
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
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>

            {newAlarmSoundName && (
              <View style={styles(theme).inputGroup}>
                <Text style={styles(theme).inputLabel}>Selected sound</Text>
                <View style={styles(theme).soundBadge}>
                  <Music size={16} color={theme.colors.accent} strokeWidth={2.2} />
                  <Text style={styles(theme).soundBadgeText}>{newAlarmSoundName}</Text>
                </View>
              </View>
            )}

            <View style={styles(theme).buttonRow}>
              <TouchableOpacity
                style={styles(theme).cancelButton}
                onPress={() => setShowAddAlarm(false)}
                activeOpacity={0.85}
              >
                <Text style={styles(theme).cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles(theme).saveButton} onPress={handleAddAlarm} activeOpacity={0.9}>
                <Check size={18} color={theme.colors.ctaText} strokeWidth={2.4} />
                <Text style={styles(theme).saveButtonText}>Add alarm</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Alarms List */}
        {alarms.length === 0 && !showAddAlarm ? (
          <View style={styles(theme).emptyCard}>
            <Bell size={44} color={theme.colors.textTertiary} style={{ opacity: 0.6 }} />
            <Text style={styles(theme).emptyTitle}>No alarms set</Text>
            <Text style={styles(theme).emptyText}>
              Tap the + button to create your first alarm
            </Text>
          </View>
        ) : (
          alarms.map((alarm) => (
            <View key={alarm.id} style={styles(theme).alarmCard}>
              <View style={styles(theme).alarmInfo}>
                <View style={styles(theme).alarmIconContainer}>
                  <Clock size={22} color={theme.colors.accent} strokeWidth={2.2} />
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
                  trackColor={{ false: theme.colors.disabled, true: theme.colors.accent }}
                  thumbColor={theme.colors.ctaText}
                />
                <TouchableOpacity
                  onPress={() => handleDeleteAlarm(alarm.id)}
                  style={styles(theme).deleteButton}
                >
                  <Trash2 size={18} color={theme.colors.danger} strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <View style={styles(theme).bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 14,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerActionFab: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    headerTitleBlock: {
      flex: 1,
    },
    headerLargeTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 22,
      color: theme.colors.textPrimary,
      letterSpacing: -0.3,
    },
    headerSubtitleText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    addAlarmCard: {
      borderRadius: theme.borderRadius.card,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
    },
    addAlarmTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 18,
      color: theme.colors.textPrimary,
      marginBottom: 18,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 10,
    },
    input: {
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.lg,
      padding: 14,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 16,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    buttonRow: {
      flexDirection: 'row',
      columnGap: 12,
      marginTop: 8,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.lg,
      padding: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    cancelButtonText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.textSecondary,
      fontSize: 16,
    },
    saveButton: {
      flex: 1,
      flexDirection: 'row',
      backgroundColor: theme.colors.ctaBackground,
      borderRadius: theme.borderRadius.lg,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: 8,
    },
    saveButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.ctaText,
      fontSize: 16,
    },
    emptyCard: {
      borderRadius: theme.borderRadius.card,
      padding: 40,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      rowGap: 8,
    },
    emptyTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 18,
      color: theme.colors.textPrimary,
      marginTop: 8,
    },
    emptyText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textTertiary,
      textAlign: 'center',
    },
    alarmCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    alarmInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      columnGap: 12,
    },
    alarmIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alarmDetails: {
      flex: 1,
    },
    alarmTime: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 22,
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    alarmName: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    alarmActions: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
    },
    deleteButton: {
      padding: 8,
    },
    soundBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.md,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      columnGap: 8,
    },
    soundBadgeText: {
      fontFamily: theme.typography.fontFamily.bodyMedium,
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
    bottomSpacing: {
      height: 100,
    },
  });
