import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
  createdAt: string; // ISO timestamp
  read: boolean;
}

const STORAGE_KEY = '@notification_history';
const MAX_ENTRIES = 100;

async function getHistory(): Promise<NotificationHistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[notificationHistory] Failed to load history:', error);
    return [];
  }
}

/** Called from every place a notification is actually scheduled/sent, so the
 * in-app inbox reflects reality regardless of trigger type (immediate,
 * scheduled, or push-delivered). */
async function logNotification(
  title: string,
  body: string,
  type: string,
  data?: Record<string, any>
): Promise<void> {
  try {
    const history = await getHistory();
    const entry: NotificationHistoryEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title,
      body,
      type,
      data,
      createdAt: new Date().toISOString(),
      read: false,
    };
    const updated = [entry, ...history].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[notificationHistory] Failed to log notification:', error);
  }
}

async function getUnreadCount(): Promise<number> {
  const history = await getHistory();
  return history.filter(e => !e.read).length;
}

async function markAsRead(id: string): Promise<void> {
  try {
    const history = await getHistory();
    const updated = history.map(e => (e.id === id ? { ...e, read: true } : e));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[notificationHistory] Failed to mark as read:', error);
  }
}

async function markAllAsRead(): Promise<void> {
  try {
    const history = await getHistory();
    const updated = history.map(e => ({ ...e, read: true }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[notificationHistory] Failed to mark all as read:', error);
  }
}

async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[notificationHistory] Failed to clear history:', error);
  }
}

export default {
  getHistory,
  logNotification,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearHistory,
};
