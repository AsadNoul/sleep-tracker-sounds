import * as Updates from 'expo-updates';

export interface UpdateInfo {
  isAvailable: boolean;
  manifest?: Updates.Manifest;
  isEmergency?: boolean;
}

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
