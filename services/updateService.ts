export interface UpdateInfo {
  isAvailable: boolean;
  manifest?: any;
  isEmergency?: boolean;
}

// expo-updates throws "TypeError: property is not configurable" at import time
// in bare workflow when the native module is not set up. We load it lazily so
// a failure here never crashes the app.
// _updatesReady: undefined = not yet probed, null = probed and failed, object = ready
let _updates: any = undefined;
function getUpdates(): any | null {
  if (_updates !== undefined) return _updates;
  try {
    const mod = require('expo-updates');
    // checkForUpdateAsync is the function we actually call — probe it
    if (typeof mod.checkForUpdateAsync !== 'function') {
      _updates = null;
      return null;
    }
    _updates = mod;
    return _updates;
  } catch {
    _updates = null;
    return null;
  }
}

function isUpdatesConfigured(): boolean {
  return getUpdates() !== null;
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

  async checkForUpdates(): Promise<UpdateInfo> {
    if (__DEV__) {
      console.log('🔄 Skipping update check in development mode');
      return { isAvailable: false };
    }

    if (!isUpdatesConfigured()) {
      console.log('⚠️ expo-updates not configured, skipping update check');
      return { isAvailable: false };
    }

    if (this.checkingForUpdate) {
      console.log('⏳ Update check already in progress');
      return { isAvailable: false };
    }

    try {
      this.checkingForUpdate = true;
      console.log('🔍 Checking for updates...');

      const u = getUpdates()!;
      const update = await u.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('✅ Update available!', update.manifest);
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

  async downloadAndApplyUpdate(): Promise<boolean> {
    if (!isUpdatesConfigured()) {
      console.log('⚠️ expo-updates not configured');
      return false;
    }

    try {
      console.log('⬇️ Downloading update...');
      const u = getUpdates()!;
      const result = await u.fetchUpdateAsync();

      if (result.isNew) {
        console.log('✅ Update downloaded successfully');
        await u.reloadAsync();
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

  getCurrentVersion(): string {
    const u = getUpdates();
    if (u?.manifest) return u.manifest.version || 'Unknown';
    return 'Unknown';
  }

  getUpdateChannel(): string {
    return getUpdates()?.channel || 'default';
  }

  isRunningFromUpdate(): boolean {
    return getUpdates()?.isEmbeddedLaunch === false;
  }
}

export default UpdateService.getInstance();
