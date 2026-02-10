import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

class AlarmService {
  private sound: Audio.Sound | null = null;
  private alarmCheckInterval: NodeJS.Timeout | null = null;
  private autoStopTimeout: NodeJS.Timeout | null = null;

  async initialize() {
    // Set audio mode for alarm
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
    });

    // Start checking for alarms every minute
    this.startAlarmChecker();
  }

  private startAlarmChecker() {
    // Check every 30 seconds for alarms
    this.alarmCheckInterval = setInterval(async () => {
      await this.checkAndTriggerAlarms();
    }, 30000);

    // Also check immediately
    this.checkAndTriggerAlarms();
  }

  private async checkAndTriggerAlarms() {
    try {
      const alarmsData = await AsyncStorage.getItem('@alarms');
      if (!alarmsData) return;

      const alarms = JSON.parse(alarmsData);
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      for (const alarm of alarms) {
        if (alarm.enabled && alarm.time === currentTime && !alarm.triggered) {
          // Trigger alarm
          await this.triggerAlarm(alarm);

          // Mark as triggered
          alarm.triggered = true;
          await AsyncStorage.setItem('@alarms', JSON.stringify(alarms));
        }
      }

      // Reset triggered status at the start of each day
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      if (now.getTime() - midnight.getTime() < 60000) {
        alarms.forEach((a: any) => a.triggered = false);
        await AsyncStorage.setItem('@alarms', JSON.stringify(alarms));
      }
    } catch (error) {
      console.error('Error checking alarms:', error);
    }
  }

  async triggerAlarm(alarm: any) {
    console.log('🔔 Triggering alarm:', alarm.name);

    // Play alarm sound
    await this.playAlarmSound(alarm.soundUri);

    // Send notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Alarm!',
        body: alarm.name || 'Wake up!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Immediate
    });
  }

  async playAlarmSound(soundUri?: string) {
    try {
      // Stop any existing alarm
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      }

      // If a soundUri is provided, use it. Otherwise use the default beep.
      const source = soundUri ? { uri: soundUri } : { uri: 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA' };

      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
          rate: 1.0,
          shouldCorrectPitch: false
        }
      );

      this.sound = sound;

      // Auto-stop after 1 minute
      this.autoStopTimeout = setTimeout(async () => {
        await this.stopAlarm();
      }, 60000);
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }

  async stopAlarm() {
    // Clear auto-stop timeout
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }

    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      } catch (error) {
        console.error('Error stopping alarm:', error);
      }
    }
  }

  async setAlarm(time: string, name: string, soundUri?: string) {
    try {
      const alarmsData = await AsyncStorage.getItem('@alarms');
      const alarms = alarmsData ? JSON.parse(alarmsData) : [];

      alarms.push({
        id: Date.now().toString(),
        time,
        name,
        soundUri,
        enabled: true,
        triggered: false,
      });

      await AsyncStorage.setItem('@alarms', JSON.stringify(alarms));
      console.log('✅ Alarm set for', time, soundUri ? 'with custom sound' : 'with default sound');
    } catch (error) {
      console.error('Error setting alarm:', error);
    }
  }

  async getAlarms() {
    try {
      const alarmsData = await AsyncStorage.getItem('@alarms');
      return alarmsData ? JSON.parse(alarmsData) : [];
    } catch (error) {
      console.error('Error getting alarms:', error);
      return [];
    }
  }

  async deleteAlarm(id: string) {
    try {
      const alarmsData = await AsyncStorage.getItem('@alarms');
      if (!alarmsData) return;

      let alarms = JSON.parse(alarmsData);
      alarms = alarms.filter((a: any) => a.id !== id);

      await AsyncStorage.setItem('@alarms', JSON.stringify(alarms));
    } catch (error) {
      console.error('Error deleting alarm:', error);
    }
  }

  async toggleAlarm(id: string, enabled: boolean) {
    try {
      const alarmsData = await AsyncStorage.getItem('@alarms');
      if (!alarmsData) return;

      const alarms = JSON.parse(alarmsData);
      const alarm = alarms.find((a: any) => a.id === id);

      if (alarm) {
        alarm.enabled = enabled;
        alarm.triggered = false; // Reset triggered status
        await AsyncStorage.setItem('@alarms', JSON.stringify(alarms));
      }
    } catch (error) {
      console.error('Error toggling alarm:', error);
    }
  }

  cleanup() {
    if (this.alarmCheckInterval) {
      clearInterval(this.alarmCheckInterval);
      this.alarmCheckInterval = null;
    }
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
    this.stopAlarm();
  }
}

export default new AlarmService();
