import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';

// Queue keys for storing pending operations
const QUEUE_KEYS = {
  SLEEP_RECORDS: '@sync_queue_sleep_records',
  JOURNAL_ENTRIES: '@sync_queue_journal_entries',
  SETTINGS: '@sync_queue_settings',
  LAST_SYNC: '@last_sync_timestamp',
  SYNCED_KEYS: '@sync_completed_idempotency_keys',
};

// Generate unique idempotency key to prevent duplicate syncs
function generateIdempotencyKey(table: string, data: any): string {
  const dataStr = JSON.stringify(data);
  const hash = dataStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${table}_${hash}_${data.user_id || 'unknown'}`;
}

interface QueuedOperation {
  id: string;
  idempotencyKey: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
  synced?: boolean;
}

/**
 * Offline Sync Manager
 * Handles queueing and syncing data when connection is available
 */
export class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private syncInProgress = false;
  private listeners: Array<(status: SyncStatus) => void> = [];

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager();
    }
    return OfflineSyncManager.instance;
  }

  /**
   * Initialize network listener to auto-sync when connection is restored
   */
  private initializeNetworkListener() {
    NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.syncInProgress) {
        this.syncAll();
      }
    });
  }

  /**
   * Add sync status listener
   */
  addListener(callback: (status: SyncStatus) => void) {
    this.listeners.push(callback);
  }

  /**
   * Remove sync status listener
   */
  removeListener(callback: (status: SyncStatus) => void) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  /**
   * Notify all listeners about sync status
   */
  private notifyListeners(status: SyncStatus) {
    this.listeners.forEach((callback) => callback(status));
  }

  /**
   * Queue an operation for later sync
   */
  async queueOperation(
    table: string,
    type: 'insert' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    const idempotencyKey = generateIdempotencyKey(table, data);
    
    // Check if this operation was already synced
    try {
      const syncedKeys = await AsyncStorage.getItem(QUEUE_KEYS.SYNCED_KEYS);
      const syncedKeysArray = syncedKeys ? JSON.parse(syncedKeys) : [];
      
      if (syncedKeysArray.includes(idempotencyKey)) {
        console.log(`Operation already synced, skipping: ${idempotencyKey}`);
        return;
      }
    } catch (error) {
      console.error('Error checking synced keys:', error);
    }

    const operation: QueuedOperation = {
      id: `${table}_${Date.now()}_${Math.random()}`,
      idempotencyKey,
      type,
      table,
      data,
      timestamp: Date.now(),
    };

    let queueKey = QUEUE_KEYS.SLEEP_RECORDS;
    if (table.includes('journal')) queueKey = QUEUE_KEYS.JOURNAL_ENTRIES;
    if (table.includes('settings')) queueKey = QUEUE_KEYS.SETTINGS;

    try {
      const existing = await AsyncStorage.getItem(queueKey);
      const queue: QueuedOperation[] = existing ? JSON.parse(existing) : [];
      queue.push(operation);
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));

      console.log(`Queued ${type} operation for ${table}:`, operation.id);
    } catch (error) {
      console.error('Error queueing operation:', error);
      throw error;
    }
  }

  /**
   * Get pending operations count
   */
  async getPendingCount(): Promise<number> {
    try {
      const sleepQueue = await AsyncStorage.getItem(QUEUE_KEYS.SLEEP_RECORDS);
      const journalQueue = await AsyncStorage.getItem(QUEUE_KEYS.JOURNAL_ENTRIES);
      const settingsQueue = await AsyncStorage.getItem(QUEUE_KEYS.SETTINGS);

      const sleepOps: QueuedOperation[] = sleepQueue ? JSON.parse(sleepQueue) : [];
      const journalOps: QueuedOperation[] = journalQueue ? JSON.parse(journalQueue) : [];
      const settingsOps: QueuedOperation[] = settingsQueue ? JSON.parse(settingsQueue) : [];

      return sleepOps.length + journalOps.length + settingsOps.length;
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  }

  /**
   * Sync all queued operations
   */
  async syncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('Sync already in progress, skipping...');
      return { success: true, synced: 0, failed: 0 };
    }

    this.syncInProgress = true;
    this.notifyListeners({ status: 'syncing', progress: 0 });

    let totalSynced = 0;
    let totalFailed = 0;

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('No network connection, skipping sync');
        this.notifyListeners({ status: 'offline' });
        return { success: false, synced: 0, failed: 0, error: 'No network connection' };
      }

      // Sync each queue
      const results = await Promise.allSettled([
        this.syncQueue(QUEUE_KEYS.SLEEP_RECORDS, 'sleep_records'),
        this.syncQueue(QUEUE_KEYS.JOURNAL_ENTRIES, 'sleep_journals'),
        this.syncQueue(QUEUE_KEYS.SETTINGS, 'user_settings'),
      ]);

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          totalSynced += result.value.synced;
          totalFailed += result.value.failed;
        }
      });

      // Update last sync timestamp
      await AsyncStorage.setItem(QUEUE_KEYS.LAST_SYNC, new Date().toISOString());

      const syncResult: SyncResult = {
        success: totalFailed === 0,
        synced: totalSynced,
        failed: totalFailed,
      };

      this.notifyListeners({
        status: totalFailed === 0 ? 'completed' : 'completed_with_errors',
        progress: 100,
        result: syncResult,
      });

      console.log('Sync completed:', syncResult);
      return syncResult;
    } catch (error: any) {
      console.error('Sync error:', error);
      this.notifyListeners({ status: 'error', error: error.message });
      return {
        success: false,
        synced: totalSynced,
        failed: totalFailed,
        error: error.message,
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a specific queue
   */
  private async syncQueue(
    queueKey: string,
    tableName: string
  ): Promise<{ synced: number; failed: number }> {
    try {
      const queueData = await AsyncStorage.getItem(queueKey);
      if (!queueData) return { synced: 0, failed: 0 };

      const queue: QueuedOperation[] = JSON.parse(queueData);
      if (queue.length === 0) return { synced: 0, failed: 0 };

      console.log(`Syncing ${queue.length} operations for ${tableName}...`);

      let synced = 0;
      let failed = 0;
      const failedOps: QueuedOperation[] = [];

      for (const operation of queue) {
        try {
          await this.executeOperation(tableName, operation);
          
          // Mark operation as synced in idempotency key storage
          const syncedKeys = await AsyncStorage.getItem(QUEUE_KEYS.SYNCED_KEYS);
          const syncedKeysArray = syncedKeys ? JSON.parse(syncedKeys) : [];
          if (!syncedKeysArray.includes(operation.idempotencyKey)) {
            syncedKeysArray.push(operation.idempotencyKey);
            await AsyncStorage.setItem(QUEUE_KEYS.SYNCED_KEYS, JSON.stringify(syncedKeysArray));
          }
          
          synced++;
        } catch (error) {
          console.error(`Failed to sync operation ${operation.id}:`, error);
          failedOps.push(operation);
          failed++;
        }
      }

      // Update queue with only failed operations
      if (failedOps.length > 0) {
        await AsyncStorage.setItem(queueKey, JSON.stringify(failedOps));
      } else {
        await AsyncStorage.removeItem(queueKey);
      }

      return { synced, failed };
    } catch (error) {
      console.error(`Error syncing queue ${queueKey}:`, error);
      return { synced: 0, failed: 0 };
    }
  }

  /**
   * Execute a queued operation
   */
  private async executeOperation(
    tableName: string,
    operation: QueuedOperation
  ): Promise<void> {
    const { type, data } = operation;

    // Validate and clean data before sync
    const cleanedData = this.validateAndCleanData(tableName, data);

    switch (type) {
      case 'insert':
        const { error: insertError } = await supabase.from(tableName).insert(cleanedData);
        if (insertError) throw insertError;
        break;

      case 'update':
        const { id, ...updateData } = cleanedData;
        const { error: updateError } = await supabase
          .from(tableName)
          .update(updateData)
          .eq('id', id);
        if (updateError) throw updateError;
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', cleanedData.id);
        if (deleteError) throw deleteError;
        break;

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Validate and clean data before syncing
   */
  private validateAndCleanData(tableName: string, data: any): any {
    const cleaned = { ...data };

    // Remove invalid fields for sleep_records
    if (tableName === 'sleep_records') {
      // Remove 'id' field if it's a timestamp string (not UUID)
      // Supabase will auto-generate UUID
      if (cleaned.id && typeof cleaned.id === 'string') {
        // Check if it looks like a timestamp (only digits)
        if (/^\d+$/.test(cleaned.id)) {
          delete cleaned.id;
        }
      }

      // Ensure sleep_quality is an integer (0-10) - properly type cast
      if (cleaned.sleep_quality !== null && cleaned.sleep_quality !== undefined) {
        // Convert string or number to integer
        const qualityNum = typeof cleaned.sleep_quality === 'string' ? parseInt(cleaned.sleep_quality, 10) : Number(cleaned.sleep_quality);
        const qualityInt = Math.round(qualityNum);
        cleaned.sleep_quality = Math.max(0, Math.min(10, qualityInt));
      }

      // Ensure wake_ups is an integer
      if (cleaned.wake_ups !== null && cleaned.wake_ups !== undefined) {
        cleaned.wake_ups = Math.round(Number(cleaned.wake_ups));
      }

      // Add sleep_date if missing (required field in database)
      if (!cleaned.sleep_date) {
        // Extract date from start_time or end_time
        if (cleaned.start_time) {
          const startDate = new Date(cleaned.start_time);
          cleaned.sleep_date = startDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        } else if (cleaned.end_time) {
          const endDate = new Date(cleaned.end_time);
          cleaned.sleep_date = endDate.toISOString().split('T')[0];
        }
      }
    }

    // Remove invalid fields for user_settings
    if (tableName === 'user_settings') {
      // Ensure only valid columns are included
      const validColumns = ['user_id', 'notifications', 'sleep_reminder', 'reminder_time', 'theme_mode'];
      Object.keys(cleaned).forEach(key => {
        if (!validColumns.includes(key) && key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
          console.log(`Removing invalid column from user_settings sync: ${key}`);
          delete cleaned[key];
        }
      });
    }

    return cleaned;
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime(): Promise<Date | null> {
    try {
      const timestamp = await AsyncStorage.getItem(QUEUE_KEYS.LAST_SYNC);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Clear all sync queues (use with caution!)
   */
  async clearAllQueues(): Promise<void> {
    await AsyncStorage.multiRemove([
      QUEUE_KEYS.SLEEP_RECORDS,
      QUEUE_KEYS.JOURNAL_ENTRIES,
      QUEUE_KEYS.SETTINGS,
    ]);
    console.log('All sync queues cleared');
  }
}

/**
 * Sync result type
 */
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  error?: string;
}

/**
 * Sync status type
 */
export interface SyncStatus {
  status: 'syncing' | 'completed' | 'completed_with_errors' | 'error' | 'offline';
  progress?: number;
  result?: SyncResult;
  error?: string;
}

/**
 * Hook for offline sync operations
 */
export const useOfflineSync = () => {
  const syncManager = OfflineSyncManager.getInstance();

  return {
    queueOperation: (table: string, type: 'insert' | 'update' | 'delete', data: any) =>
      syncManager.queueOperation(table, type, data),
    syncAll: () => syncManager.syncAll(),
    getPendingCount: () => syncManager.getPendingCount(),
    getLastSyncTime: () => syncManager.getLastSyncTime(),
    addListener: (callback: (status: SyncStatus) => void) =>
      syncManager.addListener(callback),
    removeListener: (callback: (status: SyncStatus) => void) =>
      syncManager.removeListener(callback),
  };
};

// Singleton export
export default OfflineSyncManager.getInstance();
