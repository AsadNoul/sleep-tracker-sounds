import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure how notifications should behave
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface AlarmConfig {
  alarmTime: Date;
  sessionId: string;
  smartAlarm?: boolean;
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alarm', {
          name: 'Sleep Alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Sleep Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Send immediate notification
  async sendImmediateNotification(title: string, body: string, data?: any): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // null means immediate
      });
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      return null;
    }
  }

  // Schedule alarm notification
  async scheduleAlarm(config: AlarmConfig): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Notification permissions not granted');
      }

      // Cancel any existing alarms
      await this.cancelAlarm();

      // Calculate trigger time
      const now = new Date();
      const trigger = new Date(config.alarmTime);

      if (trigger <= now) {
        // If alarm time is in the past, schedule for tomorrow
        trigger.setDate(trigger.getDate() + 1);
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Wake Up!',
          body: 'Time to wake up and end your sleep session',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data: { type: 'alarm', sessionId: config.sessionId },
        },
        trigger: trigger as any,
      });

      // Store alarm ID for later cancellation
      await AsyncStorage.setItem('@alarm_notification_id', notificationId);
      await AsyncStorage.setItem('@alarm_time', trigger.toISOString());

      console.log(`✅ Alarm scheduled for ${trigger.toLocaleString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling alarm:', error);
      return null;
    }
  }

  // Cancel alarm
  async cancelAlarm(): Promise<void> {
    try {
      const notificationId = await AsyncStorage.getItem('@alarm_notification_id');
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await AsyncStorage.removeItem('@alarm_notification_id');
        await AsyncStorage.removeItem('@alarm_time');
        console.log('✅ Alarm cancelled');
      }
    } catch (error) {
      console.error('Error cancelling alarm:', error);
    }
  }

  // Get scheduled alarm time
  async getScheduledAlarmTime(): Promise<Date | null> {
    try {
      const alarmTime = await AsyncStorage.getItem('@alarm_time');
      return alarmTime ? new Date(alarmTime) : null;
    } catch (error) {
      return null;
    }
  }

  // Schedule bedtime reminder (timezone-aware, repeats daily)
  async scheduleBedtimeReminder(bedtime: Date): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      // Cancel existing bedtime reminder
      await this.cancelBedtimeReminder();

      // Schedule reminder 30 minutes before bedtime
      const reminderTime = new Date(bedtime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 30);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for bed soon! 🌙',
          body: 'Your bedtime is in 30 minutes. Start winding down.',
          sound: 'default',
          data: { type: 'bedtime_reminder' },
        },
        trigger: {
          type: 'calendar',
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          repeats: true, // Repeats daily automatically in user's timezone
        } as any,
      });

      await AsyncStorage.setItem('@bedtime_reminder_id', notificationId);
      console.log('✅ Bedtime reminder scheduled for', reminderTime.toLocaleTimeString());
    } catch (error) {
      console.error('Error scheduling bedtime reminder:', error);
    }
  }

  // Cancel bedtime reminder
  async cancelBedtimeReminder(): Promise<void> {
    try {
      const notificationId = await AsyncStorage.getItem('@bedtime_reminder_id');
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await AsyncStorage.removeItem('@bedtime_reminder_id');
      }
    } catch (error) {
      console.error('Error cancelling bedtime reminder:', error);
    }
  }

  // Schedule smart wake up alarm (wakes user in light sleep)
  async scheduleSmartAlarm(config: AlarmConfig): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Notification permissions not granted');
      }

      // Cancel any existing alarms
      await this.cancelAlarm();

      // Smart alarm: 30-minute window before target time
      const targetTime = new Date(config.alarmTime);
      const smartWindowStart = new Date(targetTime);
      smartWindowStart.setMinutes(smartWindowStart.getMinutes() - 30);

      // Schedule at the START of smart window
      // In production, this would analyze sleep stages and wake during light sleep
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Smart Wake Up',
          body: 'Waking you during light sleep for better rest',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data: {
            type: 'smart_alarm',
            sessionId: config.sessionId,
            targetTime: targetTime.toISOString()
          },
        },
        trigger: smartWindowStart as any,
      });

      await AsyncStorage.setItem('@alarm_notification_id', notificationId);
      await AsyncStorage.setItem('@alarm_time', smartWindowStart.toISOString());
      await AsyncStorage.setItem('@alarm_smart', 'true');

      console.log(`✅ Smart alarm scheduled for ${smartWindowStart.toLocaleString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling smart alarm:', error);
      return null;
    }
  }

  // Send milestone notification
  async sendMilestoneNotification(type: 'streak' | 'quality', data: any): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      let title = '';
      let body = '';

      switch (type) {
        case 'streak':
          title = `🔥 ${data.days}-Day Streak!`;
          body = `Amazing! You've tracked ${data.days} nights in a row!`;
          break;
        case 'quality':
          title = '⭐ Great Sleep!';
          body = `Excellent sleep quality last night: ${data.quality}/10`;
          break;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { type: 'milestone', ...data },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending milestone notification:', error);
    }
  }

  // Send sync success notification
  async sendSyncNotification(syncedCount: number): Promise<void> {
    try {
      if (syncedCount === 0) return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '☁️ Data Synced',
          body: `${syncedCount} sleep ${syncedCount === 1 ? 'session' : 'sessions'} synced successfully`,
          sound: undefined, // Silent notification
          data: { type: 'sync', count: syncedCount },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending sync notification:', error);
    }
  }

  // Add notification response listener
  addNotificationResponseListener(handler: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem('@alarm_notification_id');
      await AsyncStorage.removeItem('@alarm_time');
      console.log('✅ All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Test notification - send immediately
  async sendTestNotification(): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Notification permissions not granted');
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from your Sleep Tracker app!',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          vibrate: [0, 250, 250, 250],
          data: { type: 'test' },
        },
        trigger: null, // Send immediately
      });

      console.log('✅ Test notification sent');
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }

  // Test alarm - schedule for X seconds from now
  async sendTestAlarm(delayInSeconds: number = 10): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Notification permissions not granted');
      }

      const trigger = new Date();
      trigger.setSeconds(trigger.getSeconds() + delayInSeconds);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Test Alarm!',
          body: `This test alarm was scheduled ${delayInSeconds} seconds ago`,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data: { type: 'test_alarm' },
        },
        trigger: trigger as any,
      });

      console.log(`✅ Test alarm scheduled for ${delayInSeconds} seconds from now`);
    } catch (error) {
      console.error('Error sending test alarm:', error);
      throw error;
    }
  }
}

export default NotificationService.getInstance();
