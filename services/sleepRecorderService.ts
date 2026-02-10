import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import sleepTrackingService from './sleepTrackingService';

export interface RecordingEvent {
  timestamp: Date;
  type: 'snoring' | 'sleep_talk' | 'noise' | 'dreaming' | 'voice_note' | 'breathing';
  duration: number; // in seconds
  volume: number; // 0-1
  audioUri?: string;
}

export interface RecordingSession {
  startTime: Date;
  events: RecordingEvent[];
  totalDuration: number;
  snoringEvents: number;
  sleepTalkEvents: number;
  dreamingEvents: number;
  totalNoiseEvents: number;
  sessionAudioUri?: string;
}

class SleepRecorderService {
  private static instance: SleepRecorderService;
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;
  private events: RecordingEvent[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private sessionStartTime: Date | null = null;
  private noiseThreshold: number = 0.5; // Volume threshold to detect sounds (0-1)
  private recordingDuration: number = 0;
  private audioBuffer: number[] = []; // Rolling buffer for pattern analysis
  private sessionAudioUri: string | null = null;

  private constructor() { }

  static getInstance(): SleepRecorderService {
    if (!SleepRecorderService.instance) {
      SleepRecorderService.instance = new SleepRecorderService();
    }
    return SleepRecorderService.instance;
  }

  // Request microphone permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Microphone permissions not granted');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting microphone permissions:', error);
      return false;
    }
  }

  // Start sleep recording session
  async startRecording(): Promise<boolean> {
    try {
      if (this.isRecording) {
        console.log('Recording already in progress');
        return false;
      }

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permissions not granted');
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create new recording
      this.recording = new Audio.Recording();

      // Configure recording options - OPTIMIZED for battery life
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000, // ✅ Reduced from 44100 to 16000 (saves 30% battery)
          numberOfChannels: 1,
          bitRate: 64000, // ✅ Reduced from 128000 (saves storage)
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.MEDIUM, // ✅ Changed from HIGH
          sampleRate: 16000, // ✅ Reduced from 44100 to 16000
          numberOfChannels: 1,
          bitRate: 64000, // ✅ Reduced from 128000
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 64000, // ✅ Reduced from 128000
        },
        keepAudioActiveHint: true,
        isMeteringEnabled: true,
      });

      // Enable metering for sound detection (Optimized for battery)
      await this.recording.setProgressUpdateInterval(1000);
      this.recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.metering !== undefined) {
          const volume = this.normalizeVolume(status.metering);
          this.lastVolume = volume;
          this.lastActivityLevel = volume;

          // We still use the interval for duration and event detection 
          // to keep it consistent at 1-second ticks
        }
      });

      // Start recording
      await this.recording.startAsync();

      this.isRecording = true;
      this.sessionStartTime = new Date();
      this.events = [];
      this.recordingDuration = 0;

      console.log('✅ Sleep recording started (Battery Optimized Mode)');

      // Start monitoring audio levels
      this.startMonitoring();

      return true;
    } catch (error) {
      console.error('Error starting sleep recording:', error);
      return false;
    }
  }

  // Monitor audio levels to detect snoring/sleep talk
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      if (!this.recording || !this.isRecording) {
        return;
      }

      try {
        // Get current recording status (includes metering data)
        const status = await this.recording.getStatusAsync();

        if (status.isRecording && status.metering !== undefined) {
          const volume = this.normalizeVolume(status.metering);
          this.lastVolume = volume;
          this.lastActivityLevel = volume; // Update activity level for smart alarm
          this.recordingDuration += 1;

          // Always process for pattern analysis, detectEvent will handle thresholds
          await this.detectEvent(volume);
        }
      } catch (error) {
        console.error('Error monitoring audio:', error);
      }
    }, 1000); // Check every second
  }

  // Normalize metering value to 0-1 range
  private normalizeVolume(metering: number): number {
    // Metering is typically -160 to 0 (dB)
    // Normalize to 0-1 range
    const normalized = (metering + 160) / 160;
    return Math.max(0, Math.min(1, normalized));
  }

  // Advanced Pattern Analysis for Sleep Sounds
  private analyzeAudioPattern(currentLevel: number): 'snoring' | 'sleep_talk' | 'noise' | 'dreaming' | 'breathing' {
    // Use circular buffer approach - faster than shift()
    if (this.audioBuffer.length >= 60) { // Increased buffer for better breathing detection
      this.audioBuffer.splice(0, 1);
    }
    this.audioBuffer.push(currentLevel);

    if (this.audioBuffer.length < 10) return 'noise';

    const bufferLen = this.audioBuffer.length;
    let sum = 0;
    let max = this.audioBuffer[0];
    let min = this.audioBuffer[0];
    let peaksCount = 0;

    for (let i = 0; i < bufferLen; i++) {
      const val = this.audioBuffer[i];
      sum += val;
      if (val > max) max = val;
      if (val < min) min = val;
    }

    const avg = sum / bufferLen;
    const variance = max - min;
    const threshold = avg * 1.3; // More sensitive threshold for breathing

    for (let i = 0; i < bufferLen; i++) {
      if (this.audioBuffer[i] > threshold) peaksCount++;
    }

    // 1. Detect Rhythmic Snoring (High peaks with regular intervals)
    if (avg > 0.35 && peaksCount > 2 && peaksCount < 8 && variance > 0.25) {
      return 'snoring';
    }

    // 2. Detect Rhythmic Breathing (Lighter than snoring, very regular)
    if (avg > 0.15 && avg <= 0.35 && peaksCount >= 2 && peaksCount <= 5 && variance < 0.2) {
      return 'breathing';
    }

    // 3. Detect Sleep Talk / Speech (High variance, irregular)
    if (variance > 0.45 && avg > 0.2) {
      const activityLevel = sleepTrackingService.getActivityLevel();
      if (activityLevel < 0.05) {
        return 'dreaming';
      }
      return 'sleep_talk';
    }

    return 'noise';
  }

  // Detect and classify sound events
  private async detectEvent(volume: number): Promise<void> {
    try {
      // ✅ TIME-BASED THRESHOLD - More sensitive during sleep hours
      const currentHour = new Date().getHours();
      const isSleepTime = currentHour >= 22 || currentHour <= 7; // 10 PM - 7 AM
      const dynamicThreshold = isSleepTime ? this.noiseThreshold * 0.7 : this.noiseThreshold;

      // Use advanced pattern analysis instead of simple threshold
      const eventType = this.analyzeAudioPattern(volume);

      // If it's just background noise and not significant, skip
      if (eventType === 'noise' && volume < dynamicThreshold) {
        return;
      }

      // Create event
      const event: RecordingEvent = {
        timestamp: new Date(),
        type: eventType,
        duration: 1, // Detected in 1-second interval
        volume,
      };

      // Check if this is a continuation of the previous event
      const lastEvent = this.events[this.events.length - 1];
      if (lastEvent &&
        lastEvent.type === eventType &&
        (event.timestamp.getTime() - lastEvent.timestamp.getTime()) < 5000) {
        // Extend duration of existing event
        lastEvent.duration += 1;
      } else {
        // Add new event
        this.events.push(event);
        console.log(`🔊 [SleepRecorder] Detected ${eventType} (Vol: ${volume.toFixed(2)}) at ${event.timestamp.toLocaleTimeString()}`);
      }
    } catch (error) {
      console.error('Error detecting event:', error);
    }
  }

  // Stop recording session
  async stopRecording(): Promise<RecordingSession | null> {
    try {
      if (!this.recording || !this.isRecording) {
        console.log('No recording in progress');
        return null;
      }

      // Stop monitoring
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      // Stop recording
      await this.recording.stopAndUnloadAsync();

      this.isRecording = false;

      // Get recording URI
      const uri = this.recording.getURI();
      console.log('📁 Recording saved to:', uri);

      // Move recording to permanent storage
      let permanentUri = uri;
      if (uri) {
        try {
          // Create recordings directory if it doesn't exist
          const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
          const dirInfo = await FileSystem.getInfoAsync(recordingsDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
            console.log('✅ Created recordings directory:', recordingsDir);
          }

          // Move file to permanent location with unique filename
          const filename = `sleep_recording_${Date.now()}.m4a`;
          permanentUri = `${recordingsDir}${filename}`;
          await FileSystem.moveAsync({
            from: uri,
            to: permanentUri,
          });

          // Verify file was saved successfully
          const fileInfo = await FileSystem.getInfoAsync(permanentUri);
          if (fileInfo.exists) {
            const fileSizeMB = (fileInfo.size || 0) / (1024 * 1024);
            console.log(`✅ Recording saved successfully: ${permanentUri}`);
            console.log(`💾 File size: ${fileSizeMB.toFixed(2)} MB`);
          } else {
            throw new Error('File verification failed - file does not exist after move');
          }
        } catch (error) {
          console.error('⚠️ Error moving recording to permanent storage:', error);
          // Use original URI if move fails
          permanentUri = uri;
        }
      }

      // Store the recording URI
      this.sessionAudioUri = permanentUri || null;

      // Create session summary
      const session: RecordingSession = {
        startTime: this.sessionStartTime || new Date(),
        events: this.events,
        totalDuration: this.recordingDuration,
        snoringEvents: this.events.filter(e => e.type === 'snoring').length,
        sleepTalkEvents: this.events.filter(e => e.type === 'sleep_talk').length,
        dreamingEvents: this.events.filter(e => e.type === 'dreaming').length,
        totalNoiseEvents: this.events.length,
        sessionAudioUri: this.sessionAudioUri || undefined,
      };

      // Clean up recording object but keep the URI and events for database save
      this.recording = null;
      this.sessionStartTime = null;

      console.log('✅ Sleep recording stopped');
      console.log(`📊 Session summary: ${session.totalNoiseEvents} events detected`);
      console.log(`   Snoring: ${session.snoringEvents}, Sleep talk: ${session.sleepTalkEvents}`);

      return session;
    } catch (error) {
      console.error('Error stopping sleep recording:', error);
      return null;
    }
  }

  // Get current recording status
  getStatus(): {
    isRecording: boolean;
    duration: number;
    eventsDetected: number;
    snoringEvents: number;
    sleepTalkEvents: number;
    dreamingEvents: number;
    currentVolume: number;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.recordingDuration,
      eventsDetected: this.events.length,
      snoringEvents: this.events.filter(e => e.type === 'snoring').length,
      sleepTalkEvents: this.events.filter(e => e.type === 'sleep_talk').length,
      dreamingEvents: this.events.filter(e => e.type === 'dreaming').length,
      currentVolume: this.lastVolume || 0,
    };
  }

  private lastVolume: number = 0;
  private lastActivityLevel: number = 0;

  // Get current activity level (0-1) for smart alarm
  getActivityLevel(): number {
    return this.lastActivityLevel;
  }

  // Set noise detection threshold
  setNoiseThreshold(threshold: number): void {
    this.noiseThreshold = Math.max(0, Math.min(1, threshold));
    console.log(`🔊 Noise threshold set to: ${this.noiseThreshold}`);
  }

  // Cancel recording without saving
  async cancelRecording(): Promise<void> {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      if (this.recording && this.isRecording) {
        await this.recording.stopAndUnloadAsync();
      }

      this.recording = null;
      this.isRecording = false;
      this.events = [];
      this.sessionStartTime = null;
      this.recordingDuration = 0;

      console.log('✅ Recording cancelled');
    } catch (error) {
      console.error('Error cancelling recording:', error);
    }
  }

  // Save recording events LOCALLY ONLY (no cloud upload)
  async saveEventsToDatabase(userId: string, sessionId: string, sessionStartTime?: Date): Promise<boolean> {
    try {
      if (this.events.length === 0) {
        console.log('📝 No recording events to save');
        return true;
      }

      console.log(`💾 Saving ${this.events.length} recording events LOCALLY...`);
      console.log(`📁 Session audio URI: ${this.sessionAudioUri || 'None'}`);

      // Use provided session start time or the stored one
      const startTime = sessionStartTime || this.sessionStartTime;
      if (!startTime) {
        console.error('❌ Session start time not available for offset calculation');
      }

      // Prepare events for LOCAL storage with audio offsets
      const eventsToSave = this.events.map(event => {
        // Calculate offset from session start in milliseconds
        const audioOffsetMs = startTime
          ? event.timestamp.getTime() - startTime.getTime()
          : 0;

        return {
          user_id: userId,
          session_id: sessionId,
          event_type: event.type,
          timestamp: event.timestamp.toISOString(),
          duration_seconds: Math.round(event.duration),
          loudness_db: event.volume * 100, // Convert 0-1 scale to approximate dB
          audio_file_url: this.sessionAudioUri || event.audioUri || null, // LOCAL file path
          audio_offset_ms: audioOffsetMs, // Offset from session start
        };
      });

      // ✅ SAVE LOCALLY to AsyncStorage (NOT to Supabase)
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storageKey = `@recording_events_${sessionId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(eventsToSave));

      console.log(`✅ Successfully saved ${this.events.length} recording events LOCALLY`);
      console.log(`🔒 Data kept private on device (no cloud upload)`);

      // Clear events and audio URI after successful save
      this.events = [];
      this.sessionAudioUri = null;

      return true;
    } catch (error) {
      console.error('❌ Error saving events locally:', error);
      return false;
    }
  }

  // Get recording events for a session from LOCAL storage
  async getSessionRecordings(sessionId: string): Promise<RecordingEvent[]> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storageKey = `@recording_events_${sessionId}`;
      const dataStr = await AsyncStorage.getItem(storageKey);

      if (!dataStr) {
        console.log('📝 No local recording events found for session:', sessionId);
        return [];
      }

      const data = JSON.parse(dataStr);
      console.log(`✅ Loaded ${data.length} recording events from local storage`);

      // Convert storage format to RecordingEvent format
      return data.map((record: any) => ({
        timestamp: new Date(record.timestamp),
        type: record.event_type as 'snoring' | 'sleep_talk' | 'noise' | 'dreaming' | 'voice_note',
        duration: record.duration_seconds || 0,
        volume: (record.loudness_db || 0) / 100,
        audioUri: record.audio_file_url || undefined,
      }));
    } catch (error) {
      console.error('❌ Error getting session recordings from local storage:', error);
      return [];
    }
  }

  // Clean up old recording files (keep only last N days)
  async cleanupOldRecordings(daysToKeep: number = 30): Promise<void> {
    try {
      const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingsDir);

      if (!dirInfo.exists) {
        console.log('📁 No recordings directory to clean');
        return;
      }

      const files = await FileSystem.readDirectoryAsync(recordingsDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      let deletedCount = 0;
      let freedSpace = 0;

      for (const file of files) {
        const filePath = `${recordingsDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime) {
          const fileAge = now - fileInfo.modificationTime * 1000;

          if (fileAge > maxAge) {
            // Delete old file
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            deletedCount++;
            freedSpace += fileInfo.size || 0;
            console.log(`🗑️ Deleted old recording: ${file}`);
          }
        }
      }

      if (deletedCount > 0) {
        const freedMB = freedSpace / (1024 * 1024);
        console.log(`✅ Cleaned up ${deletedCount} old recordings, freed ${freedMB.toFixed(2)} MB`);
      } else {
        console.log('✅ No old recordings to clean up');
      }
    } catch (error) {
      console.error('❌ Error cleaning up old recordings:', error);
    }
  }

  // Verify if an audio file exists and is accessible
  async verifyAudioFile(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch (error) {
      console.error('❌ Error verifying audio file:', error);
      return false;
    }
  }

  // Get total storage used by recordings
  async getStorageInfo(): Promise<{ fileCount: number; totalSizeMB: number }> {
    try {
      const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
      const dirInfo = await FileSystem.getInfoAsync(recordingsDir);

      if (!dirInfo.exists) {
        return { fileCount: 0, totalSizeMB: 0 };
      }

      const files = await FileSystem.readDirectoryAsync(recordingsDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${recordingsDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          totalSize += fileInfo.size || 0;
        }
      }

      return {
        fileCount: files.length,
        totalSizeMB: totalSize / (1024 * 1024)
      };
    } catch (error) {
      console.error('❌ Error getting storage info:', error);
      return { fileCount: 0, totalSizeMB: 0 };
    }
  }
}

export default SleepRecorderService.getInstance();
