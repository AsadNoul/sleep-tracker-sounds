// IMPORTANT: Do NOT statically `import * as Notifications from 'expo-notifications'`.
// That import statement alone (not any function call) crashes Expo Go on
// Android: expo-notifications' own entry file re-exports from
// NotificationsHandler.ts, which runs `subscribe(defaultNotificationHandler)`
// at module-evaluation time, which calls `NotificationsHandlerModule.addListener`
// on a module object produced by `requireNativeModule('ExpoNotificationsHandlerModule')`
// (the throwing variant) — all before any of our own guard code ever runs.
// See utils/notificationAvailability.ts for the full trace.
//
// Fix: lazily `require()` the package only after confirming the native module
// is actually registered. `import type` is erased at compile time (zero
// runtime code), so it's safe to use for typing while avoiding the real import.
import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isExpoNotificationsAvailable } from '../utils/notificationAvailability';

let Notifications: typeof NotificationsType | null = null;

function getNotifications(): typeof NotificationsType | null {
  if (Notifications) return Notifications;
  if (!isExpoNotificationsAvailable()) return null;
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.warn('[notifications] Failed to load expo-notifications module:', error);
    Notifications = null;
  }
  return Notifications;
}

// Configure how notifications should behave.
// Guarded: this used to run unconditionally at module scope, which crashes
// the whole app in Expo Go on Android (native module missing since SDK 53).
// See utils/notificationAvailability.ts for details.
{
  const N = getNotifications();
  if (N) {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
}

export interface AlarmConfig {
  alarmTime: Date;
  sessionId: string;
  smartAlarm?: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private permissionGranted: boolean | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Request notification permissions (with caching)
  async requestPermissions(): Promise<boolean> {
    const N = getNotifications();
    if (!N) return false;
    try {
      // Return cached result if already granted
      if (this.permissionGranted === true) return true;

      const { status: existingStatus } = await N.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await N.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        this.permissionGranted = false;
        return false;
      }

      this.permissionGranted = true;

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync('alarm', {
          name: 'Sleep Alarms',
          importance: N.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
        });

        await N.setNotificationChannelAsync('reminders', {
          name: 'Sleep Reminders',
          importance: N.AndroidImportance.DEFAULT,
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
      const N = getNotifications();
      if (!N) return null;

      return await N.scheduleNotificationAsync({
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
      const N = getNotifications();
      if (!N) return null;

      // Cancel any existing alarms
      await this.cancelAlarm();

      // Calculate trigger time
      const now = new Date();
      const trigger = new Date(config.alarmTime);

      if (trigger <= now) {
        // If alarm time is in the past, schedule for tomorrow
        trigger.setDate(trigger.getDate() + 1);
      }

      const notificationId = await N.scheduleNotificationAsync({
        content: {
          title: '⏰ Wake Up!',
          body: 'Time to wake up and end your sleep session',
          sound: 'default',
          ...(Platform.OS === 'android' ? {
            priority: N.AndroidNotificationPriority.MAX,
          } : {}),
          data: { type: 'alarm', sessionId: config.sessionId },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: trigger },
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
        const N = getNotifications();
        if (N) {
          await N.cancelScheduledNotificationAsync(notificationId);
        }
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
      const N = getNotifications();
      if (!N) return;

      // Cancel existing bedtime reminder
      await this.cancelBedtimeReminder();

      // Schedule reminder 30 minutes before bedtime
      const reminderTime = new Date(bedtime);
      reminderTime.setMinutes(reminderTime.getMinutes() - 30);

      const notificationId = await N.scheduleNotificationAsync({
        content: {
          title: 'Time for bed soon! 🌙',
          body: 'Your bedtime is in 30 minutes. Start winding down.',
          sound: 'default',
          data: { type: 'bedtime_reminder' },
        },
        trigger: {
          type: N.SchedulableTriggerInputTypes.CALENDAR,
          hour: reminderTime.getHours(),
          minute: reminderTime.getMinutes(),
          repeats: true,
        },
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
        const N = getNotifications();
        if (N) {
          await N.cancelScheduledNotificationAsync(notificationId);
        }
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
      const N = getNotifications();
      if (!N) return null;

      // Cancel any existing alarms
      await this.cancelAlarm();

      // Smart alarm: 30-minute window before target time
      const targetTime = new Date(config.alarmTime);
      const smartWindowStart = new Date(targetTime);
      smartWindowStart.setMinutes(smartWindowStart.getMinutes() - 30);

      // Schedule at the START of smart window
      // In production, this would analyze sleep stages and wake during light sleep
      const notificationId = await N.scheduleNotificationAsync({
        content: {
          title: '⏰ Smart Wake Up',
          body: 'Waking you during light sleep for better rest',
          sound: 'default',
          ...(Platform.OS === 'android' ? {
            priority: N.AndroidNotificationPriority.MAX,
          } : {}),
          data: {
            type: 'smart_alarm',
            sessionId: config.sessionId,
            targetTime: targetTime.toISOString()
          },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: smartWindowStart },
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
      const N = getNotifications();
      if (!N) return;

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

      await N.scheduleNotificationAsync({
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
    const N = getNotifications();
    if (!N) return;
    try {
      if (syncedCount === 0) return;

      await N.scheduleNotificationAsync({
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
  addNotificationResponseListener(handler: (response: NotificationsType.NotificationResponse) => void) {
    const N = getNotifications();
    if (!N) {
      // Return a no-op "subscription" so callers that do
      // `const sub = addNotificationResponseListener(...); sub.remove()`
      // don't crash when they later clean up.
      return { remove: () => {} };
    }
    return N.addNotificationResponseReceivedListener(handler);
  }

  // Fires whenever a notification is actually delivered while the app is
  // running (foreground or backgrounded-but-alive) — this, not schedule
  // time, is when it belongs in the in-app notification history/inbox.
  addNotificationReceivedListener(handler: (notification: NotificationsType.Notification) => void) {
    const N = getNotifications();
    if (!N) {
      return { remove: () => {} };
    }
    return N.addNotificationReceivedListener(handler);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    try {
      const N = getNotifications();
      if (N) {
        await N.cancelAllScheduledNotificationsAsync();
      }
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
      const N = getNotifications();
      if (!N) return;

      await N.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'This is a test notification from your Sleep Tracker app!',
          sound: 'default',
          ...(Platform.OS === 'android' ? {
            priority: N.AndroidNotificationPriority.HIGH,
          } : {}),
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
      const N = getNotifications();
      if (!N) return;

      const trigger = new Date();
      trigger.setSeconds(trigger.getSeconds() + delayInSeconds);

      await N.scheduleNotificationAsync({
        content: {
          title: '⏰ Test Alarm!',
          body: `This test alarm was scheduled ${delayInSeconds} seconds ago`,
          sound: 'default',
          ...(Platform.OS === 'android' ? {
            priority: N.AndroidNotificationPriority.MAX,
          } : {}),
          data: { type: 'test_alarm' },
        },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: trigger },
      });

      console.log(`✅ Test alarm scheduled for ${delayInSeconds} seconds from now`);
    } catch (error) {
      console.error('Error sending test alarm:', error);
      throw error;
    }
  }
}

export default NotificationService.getInstance();
