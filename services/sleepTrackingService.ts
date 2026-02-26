import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SleepStage = 'awake' | 'light' | 'deep' | 'rem';

export interface MovementData {
  timestamp: number;
  intensity: number;
}

export interface SleepStageSegment {
  startTime: number;
  endTime: number;
  stage: SleepStage;
}

const STORAGE_KEY_RECOVERY = '@sleep_tracking_recovery_data';

class SleepTrackingService {
  private static instance: SleepTrackingService;
  private subscription: any = null;
  private movementData: MovementData[] = [];
  private aggregatedData: MovementData[] = [];
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private isTracking = false;
  private updateInterval = 1000; // 1 second
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() { }

  static getInstance(): SleepTrackingService {
    if (!SleepTrackingService.instance) {
      SleepTrackingService.instance = new SleepTrackingService();
    }
    return SleepTrackingService.instance;
  }

  async startTracking() {
    if (this.isTracking) return;

    const { status } = await Accelerometer.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Accelerometer permissions not granted');
      return;
    }

    this.movementData = [];
    this.aggregatedData = [];
    this.isTracking = true;
    Accelerometer.setUpdateInterval(this.updateInterval);

    // Try to load recovery data if it exists (in case of crash)
    const recovery = await AsyncStorage.getItem(STORAGE_KEY_RECOVERY);
    if (recovery) {
      try {
        this.aggregatedData = JSON.parse(recovery);
        console.log(`✅ Recovered ${this.aggregatedData.length} minutes of tracking data`);
      } catch (e) {
        console.error('Failed to parse recovery data', e);
      }
    }

    this.subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;

      const delta = Math.sqrt(
        Math.pow(x - this.lastX, 2) +
        Math.pow(y - this.lastY, 2) +
        Math.pow(z - this.lastZ, 2)
      );

      this.lastX = x;
      this.lastY = y;
      this.lastZ = z;

      this.movementData.push({
        timestamp: Date.now(),
        intensity: delta
      });

      // Every 60 seconds, aggregate raw data into 1 summary point to save memory
      if (this.movementData.length >= 60) {
        this.aggregateLastMinute();
      }
    });

    // Periodically save aggregated data to storage for crash recovery
    this.flushInterval = setInterval(() => {
      this.saveRecoveryData();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private aggregateLastMinute() {
    if (this.movementData.length === 0) return;

    const avgIntensity = this.movementData.reduce((acc, d) => acc + d.intensity, 0) / this.movementData.length;
    const midTimestamp = this.movementData[Math.floor(this.movementData.length / 2)].timestamp;

    this.aggregatedData.push({
      timestamp: midTimestamp,
      intensity: avgIntensity
    });

    this.movementData = []; // Clear raw buffer
  }

  private async saveRecoveryData() {
    if (this.aggregatedData.length > 0) {
      await AsyncStorage.setItem(STORAGE_KEY_RECOVERY, JSON.stringify(this.aggregatedData));
    }
  }

  async stopTracking(): Promise<MovementData[]> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    this.aggregateLastMinute(); // Final aggregation
    this.isTracking = false;

    const finalData = [...this.aggregatedData];

    // Clear recovery data on clean stop
    await AsyncStorage.removeItem(STORAGE_KEY_RECOVERY);
    this.aggregatedData = [];

    return finalData;
  }

  getCurrentStage(): SleepStage {
    const data = this.aggregatedData.length > 0 ? this.aggregatedData : this.movementData;
    if (data.length < 5) return 'awake';

    const lastRange = data.slice(-10);
    const avgIntensity = lastRange.reduce((acc, d) => acc + d.intensity, 0) / (lastRange.length || 1);

    if (avgIntensity > 0.15) return 'awake';
    if (avgIntensity > 0.05) return 'light';
    if (avgIntensity > 0.02) return 'rem';
    return 'deep';
  }

  calculateSleepStages(data: MovementData[]): SleepStageSegment[] {
    if (data.length === 0) return [];

    const segments: SleepStageSegment[] = [];
    const windowSize = 5 * 60 * 1000; // 5 minute windows
    const startTime = data[0].timestamp;
    const endTime = data[data.length - 1].timestamp;

    for (let t = startTime; t < endTime; t += windowSize) {
      const windowData = data.filter(d => d.timestamp >= t && d.timestamp < t + windowSize);
      const avgIntensity = windowData.reduce((acc, d) => acc + d.intensity, 0) / (windowData.length || 1);

      let stage: SleepStage = 'light';

      if (avgIntensity > 0.15) {
        stage = 'awake';
      } else if (avgIntensity > 0.05) {
        stage = 'light';
      } else if (avgIntensity > 0.01) {
        stage = 'rem';
      } else {
        stage = 'deep';
      }

      segments.push({
        startTime: t,
        endTime: Math.min(t + windowSize, endTime),
        stage
      });
    }

    return segments;
  }

  getActivityLevel(): number {
    const data = this.movementData.length > 0 ? this.movementData : this.aggregatedData;
    if (data.length === 0) return 0;

    const recentData = data.slice(-60);
    return recentData.reduce((acc, d) => acc + d.intensity, 0) / (recentData.length || 1);
  }
}

export default SleepTrackingService.getInstance();
