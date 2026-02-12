import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

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
   * Check if a new update is available from EAS
   */
  async checkForUpdates(): Promise<UpdateInfo> {
    // Skip in development mode
    if (__DEV__) {
      console.log('🔄 Skipping update check in development mode');
      return { isAvailable: false };
    }

    // Prevent multiple simultaneous checks
    if (this.checkingForUpdate) {
      console.log('⏳ Update check already in progress');
      return { isAvailable: false };
    }

    try {
      this.checkingForUpdate = true;
      console.log('🔍 Checking for updates...');

      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('✅ Update available!', update.manifest);

        // Check if this is an emergency update (you can add metadata in your EAS updates)
        const isEmergency = update.manifest?.metadata?.emergency === true;

        return {
          isAvailable: true,
          manifest: update.manifest,
          isEmergency,
        };
      } else {
        console.log('✅ App is up to date');
        return { isAvailable: false };
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
      return { isAvailable: false };
    } finally {
      this.checkingForUpdate = false;
    }
  }

  /**
   * Download and apply the update
   */
  async downloadAndApplyUpdate(
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    try {
      console.log('⬇️ Downloading update...');

      // Fetch the update with progress tracking
      const result = await Updates.fetchUpdateAsync();

      if (result.isNew) {
        console.log('✅ Update downloaded successfully');

        // Reload the app to apply the update
        await Updates.reloadAsync();
        return true;
      } else {
        console.log('ℹ️ No new update to apply');
        return false;
      }
    } catch (error) {
      console.error('❌ Error downloading update:', error);
      throw error;
    }
  }

  /**
   * Get current app version info
   */
  getCurrentVersion(): string {
    if (Updates.manifest) {
      return Updates.manifest.version || 'Unknown';
    }
    return 'Unknown';
  }

  /**
   * Get update channel (production, preview, development)
   */
  getUpdateChannel(): string {
    return Updates.channel || 'default';
  }

  /**
   * Check if app is running from an update
   */
  isRunningFromUpdate(): boolean {
    return Updates.isEmbeddedLaunch === false;
  }
}

export default UpdateService.getInstance();
