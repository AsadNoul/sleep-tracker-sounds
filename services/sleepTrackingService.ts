import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

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

class SleepTrackingService {
  private static instance: SleepTrackingService;
  private subscription: any = null;
  private movementData: MovementData[] = [];
  private lastX = 0;
  private lastY = 0;
  private lastZ = 0;
  private isTracking = false;
  private updateInterval = 1000; // 1 second

  private constructor() {}

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
    this.isTracking = true;
    Accelerometer.setUpdateInterval(this.updateInterval);

    this.subscription = Accelerometer.addListener(data => {
      const { x, y, z } = data;
      
      // Calculate movement intensity (delta from last position)
      const delta = Math.sqrt(
        Math.pow(x - this.lastX, 2) +
        Math.pow(y - this.lastY, 2) +
        Math.pow(z - this.lastZ, 2)
      );

      this.lastX = x;
      this.lastY = y;
      this.lastZ = z;

      // Only record significant movements or every minute to save memory
      // For MVP, we'll record intensity every second and aggregate later
      this.movementData.push({
        timestamp: Date.now(),
        intensity: delta
      });
    });
  }

  stopTracking(): MovementData[] {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    this.isTracking = false;
    return this.movementData;
  }

  getCurrentStage(): SleepStage {
    if (this.movementData.length < 60) return 'awake'; // Not enough data yet

    const last5Minutes = this.movementData.slice(-300); // Last 5 mins (at 1s interval)
    const avgIntensity = last5Minutes.reduce((acc, d) => acc + d.intensity, 0) / last5Minutes.length;

    if (avgIntensity > 0.15) return 'awake';
    if (avgIntensity > 0.05) return 'light';
    if (avgIntensity > 0.02) return 'rem';
    return 'deep';
  }

  getActivityLevel(): number {
    if (this.movementData.length < 10) return 0;
    const last10Seconds = this.movementData.slice(-10);
    return last10Seconds.reduce((acc, d) => acc + d.intensity, 0) / last10Seconds.length;
  }

  /**
   * Basic Sleep Stage Classification Algorithm
   * Based on movement intensity over time windows
   */
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
      
      // Simple threshold-based classification
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
    if (this.movementData.length === 0) return 0;
    // Return average intensity of last 2 minutes
    const now = Date.now();
    const recentData = this.movementData.filter(d => d.timestamp > now - 120000);
    if (recentData.length === 0) return 0;
    return recentData.reduce((acc, d) => acc + d.intensity, 0) / recentData.length;
  }
}

export default SleepTrackingService.getInstance();
