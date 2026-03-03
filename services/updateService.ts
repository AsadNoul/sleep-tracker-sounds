import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UpdateInfo {
  isAvailable: boolean;
  manifest?: Updates.Manifest;
  isEmergency?: boolean;
}

export interface AutoUpdateResult {
  checked: boolean;
  updateAvailable: boolean;
  downloaded: boolean;
  applied: boolean;
  reason?: 'dev' | 'throttled' | 'up-to-date' | 'error';
}

const LAST_AUTO_CHECK_KEY = '@ota_last_auto_check_at';
const PENDING_AUTO_APPLY_KEY = '@ota_pending_auto_apply';
const AUTO_CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

export class UpdateService {
  private static instance: UpdateService;
  private checkingForUpdate = false;

  private constructor() {}

  static getInstance(): UpdateService {
    if (!UpdateService.instance) {
      UpdateService.instance = new UpdateService();
    }
    return UpdateService.instance;
  }

  /**
   * Check if a new OTA update is available from EAS.
   * - Skipped in __DEV__ mode (Metro bundler / Expo Go)
   * - Retries once on network failure
   * - Returns isAvailable: false on any unrecoverable error so the app keeps running
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    if (__DEV__) {
      console.log('[OTA] Skipping update check in development mode');
      return { isAvailable: false };
    }

    if (this.checkingForUpdate) {
      console.log('[OTA] Update check already in progress, skipping');
      return { isAvailable: false };
    }

    this.checkingForUpdate = true;
    console.log('[OTA] Checking for updates from EAS...');

    let lastError: any = null;

    // Try up to 2 times (initial + 1 retry on network failure)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          const isEmergency = update.manifest?.metadata?.emergency === true;
          console.log(`[OTA] Update available! emergency=${isEmergency}`);
          this.checkingForUpdate = false;
          return {
            isAvailable: true,
            manifest: update.manifest,
            isEmergency,
          };
        }

        console.log('[OTA] App is up to date');
        this.checkingForUpdate = false;
        return { isAvailable: false };
      } catch (error: any) {
        lastError = error;
        const isNetworkError =
          error?.message?.toLowerCase().includes('network') ||
          error?.message?.toLowerCase().includes('fetch') ||
          error?.message?.toLowerCase().includes('timeout') ||
          error?.code === 'ERR_UPDATES_CHECK';

        if (attempt === 1 && isNetworkError) {
          console.warn(`[OTA] Attempt ${attempt} failed (network), retrying in 3s...`);
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }

        // Not a network error, or second attempt also failed — give up
        break;
      }
    }

    console.error('[OTA] Update check failed after retries:', lastError?.message);
    this.checkingForUpdate = false;
    return { isAvailable: false };
  }

  private async markAutoCheckTimestamp(): Promise<void> {
    await AsyncStorage.setItem(LAST_AUTO_CHECK_KEY, String(Date.now()));
  }

  private async isAutoCheckThrottled(): Promise<boolean> {
    try {
      const last = await AsyncStorage.getItem(LAST_AUTO_CHECK_KEY);
      if (!last) return false;
      const elapsed = Date.now() - Number(last);
      return elapsed < AUTO_CHECK_INTERVAL_MS;
    } catch {
      return false;
    }
  }

  private async setPendingAutoApply(value: boolean): Promise<void> {
    if (value) {
      await AsyncStorage.setItem(PENDING_AUTO_APPLY_KEY, '1');
      return;
    }
    await AsyncStorage.removeItem(PENDING_AUTO_APPLY_KEY);
  }

  async hasPendingAutoUpdate(): Promise<boolean> {
    try {
      const pending = await AsyncStorage.getItem(PENDING_AUTO_APPLY_KEY);
      return pending === '1';
    } catch {
      return false;
    }
  }

  async autoCheckAndPrepareUpdate(opts?: { force?: boolean; applyImmediately?: boolean }): Promise<AutoUpdateResult> {
    if (__DEV__) {
      return { checked: false, updateAvailable: false, downloaded: false, applied: false, reason: 'dev' };
    }

    try {
      const force = opts?.force === true;
      if (!force && await this.isAutoCheckThrottled()) {
        return { checked: false, updateAvailable: false, downloaded: false, applied: false, reason: 'throttled' };
      }

      await this.markAutoCheckTimestamp();
      const updateInfo = await this.checkForUpdates();
      if (!updateInfo.isAvailable) {
        return { checked: true, updateAvailable: false, downloaded: false, applied: false, reason: 'up-to-date' };
      }

      const fetchResult = await Updates.fetchUpdateAsync();
      if (!fetchResult.isNew) {
        return { checked: true, updateAvailable: true, downloaded: false, applied: false };
      }

      if (opts?.applyImmediately) {
        await this.setPendingAutoApply(false);
        await Updates.reloadAsync();
        return { checked: true, updateAvailable: true, downloaded: true, applied: true };
      }

      await this.setPendingAutoApply(true);
      return { checked: true, updateAvailable: true, downloaded: true, applied: false };
    } catch (error) {
      console.error('[OTA] autoCheckAndPrepareUpdate failed:', error);
      return { checked: true, updateAvailable: false, downloaded: false, applied: false, reason: 'error' };
    }
  }

  async applyPendingAutoUpdateIfAny(): Promise<boolean> {
    if (__DEV__) return false;

    try {
      const pending = await AsyncStorage.getItem(PENDING_AUTO_APPLY_KEY);
      if (pending !== '1') return false;

      await this.setPendingAutoApply(false);
      await Updates.reloadAsync();
      return true;
    } catch (error) {
      console.error('[OTA] applyPendingAutoUpdateIfAny failed:', error);
      return false;
    }
  }

  /**
   * Download the OTA update and reload the app.
   * Throws on failure so the caller can show an error state.
   */
  async downloadAndApplyUpdate(): Promise<void> {
    console.log('[OTA] Downloading update...');
    try {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        console.log('[OTA] Update downloaded — reloading app');
        await Updates.reloadAsync();
      } else {
        // Already running latest — just reload to be safe
        console.log('[OTA] No new bundle fetched — reloading anyway');
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.error('[OTA] Download/apply failed:', error);
      throw error;
    }
  }

  getCurrentVersion(): string {
    return Updates.manifest?.version ?? 'Unknown';
  }

  getUpdateChannel(): string {
    return Updates.channel ?? 'default';
  }

  isRunningFromUpdate(): boolean {
    return Updates.isEmbeddedLaunch === false;
  }
}

export default UpdateService.getInstance();
