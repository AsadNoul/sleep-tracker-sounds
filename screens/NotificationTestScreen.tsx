import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, ShieldCheck, Trophy, AlarmClock, Moon, Info } from 'lucide-react-native';
import notificationService from '../services/notificationService';

export default function NotificationTestScreen() {
  const { theme, isDark } = useAppTheme();
  const [loading, setLoading] = useState(false);

  const handleTestImmediateNotification = async () => {
    try {
      setLoading(true);
      await notificationService.sendTestNotification();
      Alert.alert('Success', 'Test notification sent immediately! Check your notification tray.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send notification. Make sure you granted permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDelayedAlarm = async (seconds: number) => {
    try {
      setLoading(true);
      await notificationService.sendTestAlarm(seconds);
      Alert.alert(
        'Alarm Scheduled',
        `Test alarm will fire in ${seconds} seconds. Keep the app in background to test.`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule alarm.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMilestone = async () => {
    try {
      setLoading(true);
      await notificationService.sendMilestoneNotification('streak', { days: 7 });
      Alert.alert('Success', 'Milestone notification sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send milestone notification.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestBedtimeReminder = async () => {
    try {
      setLoading(true);
      // Schedule bedtime reminder for 1 minute from now
      const bedtime = new Date();
      bedtime.setMinutes(bedtime.getMinutes() + 1);
      bedtime.setSeconds(30); // 1 min 30 sec from now = reminder in 1 minute

      await notificationService.scheduleBedtimeReminder(bedtime);
      Alert.alert('Success', 'Bedtime reminder scheduled for 1 minute from now!');
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule bedtime reminder.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      setLoading(true);
      const granted = await notificationService.requestPermissions();
      if (granted) {
        Alert.alert('Success', 'Notification permissions granted!');
      } else {
        Alert.alert('Denied', 'Notification permissions were denied. Please enable them in settings.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles(theme).container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.backgroundSecondary]} style={styles(theme).gradient}>
        <ScrollView style={styles(theme).content} showsVerticalScrollIndicator={false}>
          <View style={styles(theme).header}>
            <Bell size={48} color={theme.colors.accent} />
            <Text style={styles(theme).title}>Notification Test</Text>
            <Text style={styles(theme).subtitle}>Test all notification features</Text>
          </View>

          {/* Permissions Button */}
          <TouchableOpacity
            style={styles(theme).button}
            onPress={handleRequestPermissions}
            disabled={loading}
          >
            <LinearGradient colors={[theme.colors.accent, theme.colors.highlight]} style={styles(theme).buttonGradient}>
              <ShieldCheck size={24} color="#0F111A" />
              <Text style={styles(theme).buttonText}>Request Permissions</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles(theme).section}>
            <Text style={styles(theme).sectionTitle}>­ƒº¬ Immediate Notifications</Text>

            <TouchableOpacity
              style={styles(theme).testButton}
              onPress={handleTestImmediateNotification}
              disabled={loading}
            >
              <View style={styles(theme).testButtonContent}>
                <Bell size={24} color={theme.colors.accent} />
                <View style={styles(theme).testButtonText}>
                  <Text style={styles(theme).testButtonTitle}>Test Immediate Notification</Text>
                  <Text style={styles(theme).testButtonSubtitle}>Sends notification right away</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(theme).testButton}
              onPress={handleTestMilestone}
              disabled={loading}
            >
              <View style={styles(theme).testButtonContent}>
                <Trophy size={24} color={theme.colors.premium} />
                <View style={styles(theme).testButtonText}>
                  <Text style={styles(theme).testButtonTitle}>Test Milestone Notification</Text>
                  <Text style={styles(theme).testButtonSubtitle}>7-Day Streak notification</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles(theme).section}>
            <Text style={styles(theme).sectionTitle}>ÔÅ░ Scheduled Alarms</Text>

            <TouchableOpacity
              style={styles(theme).testButton}
              onPress={() => handleTestDelayedAlarm(10)}
              disabled={loading}
            >
              <View style={styles(theme).testButtonContent}>
                <AlarmClock size={24} color={theme.colors.danger} />
                <View style={styles(theme).testButtonText}>
                  <Text style={styles(theme).testButtonTitle}>Test Alarm (10 seconds)</Text>
                  <Text style={styles(theme).testButtonSubtitle}>Quick test - fires in 10 sec</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(theme).testButton}
              onPress={() => handleTestDelayedAlarm(30)}
              disabled={loading}
            >
              <View style={styles(theme).testButtonContent}>
                <AlarmClock size={24} color={theme.colors.danger} />
                <View style={styles(theme).testButtonText}>
                  <Text style={styles(theme).testButtonTitle}>Test Alarm (30 seconds)</Text>
                  <Text style={styles(theme).testButtonSubtitle}>Medium test - fires in 30 sec</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(theme).testButton}
              onPress={() => handleTestDelayedAlarm(60)}
              disabled={loading}
            >
              <View style={styles(theme).testButtonContent}>
                <AlarmClock size={24} color={theme.colors.danger} />
                <View style={styles(theme).testButtonText}>
                  <Text style={styles(theme).testButtonTitle}>Test Alarm (1 minute)</Text>
                  <Text style={styles(theme).testButtonSubtitle}>Full test - fires in 60 sec</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles(theme).section}>
            <Text style={styles(theme).sectionTitle}>­ƒîÖ Bedtime Reminders</Text>

            <TouchableOpacity
              style={styles(theme).testButton}
              onPress={handleTestBedtimeReminder}
              disabled={loading}
            >
              <View style={styles(theme).testButtonContent}>
                <Moon size={24} color="#9B59B6" />
                <View style={styles(theme).testButtonText}>
                  <Text style={styles(theme).testButtonTitle}>Test Bedtime Reminder</Text>
                  <Text style={styles(theme).testButtonSubtitle}>Fires in 1 minute</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles(theme).infoBox}>
            <Info size={20} color={theme.colors.accent} />
            <Text style={styles(theme).infoText}>
              To test scheduled alarms, minimize the app after scheduling. Notifications work best when the app is in the background.
            </Text>
          </View>

          <View style={styles(theme).bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 30,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.background,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: 'rgba(27, 29, 42, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  testButtonText: {
    flex: 1,
  },
  testButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  testButtonSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.2)',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});
