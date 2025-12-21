import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export interface RecordingEvent {
  timestamp: Date;
  type: 'snoring' | 'sleep_talk' | 'noise';
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
  totalNoiseEvents: number;
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

  private constructor() {}

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

      // Configure recording options
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
        keepAudioActiveHint: true,
        isMeteringEnabled: true,
      });

      // Enable metering for sound detection
      await this.recording.setProgressUpdateInterval(500);
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

      console.log('✅ Sleep recording started');

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

          // Detect noise events based on volume threshold
          if (volume > this.noiseThreshold) {
            await this.detectEvent(volume);
          }
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

  // Detect and classify sound events
  private async detectEvent(volume: number): Promise<void> {
    try {
      // Classify event based on volume and duration
      let eventType: 'snoring' | 'sleep_talk' | 'noise' = 'noise';

      // Improved classification logic
      // volume is 0-1 (normalized from -160 to 0 dB)
      if (volume > 0.8) {
        eventType = 'snoring';
      } else if (volume > 0.65) {
        eventType = 'sleep_talk';
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

      // Create session summary
      const session: RecordingSession = {
        startTime: this.sessionStartTime || new Date(),
        events: this.events,
        totalDuration: this.recordingDuration,
        snoringEvents: this.events.filter(e => e.type === 'snoring').length,
        sleepTalkEvents: this.events.filter(e => e.type === 'sleep_talk').length,
        totalNoiseEvents: this.events.length,
      };

      // Clean up
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
    currentVolume: number;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.recordingDuration,
      eventsDetected: this.events.length,
      snoringEvents: this.events.filter(e => e.type === 'snoring').length,
      sleepTalkEvents: this.events.filter(e => e.type === 'sleep_talk').length,
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

  // Save recording events to database
  async saveEventsToDatabase(userId: string, sessionId: string): Promise<boolean> {
    try {
      if (this.events.length === 0) {
        console.log('📝 No recording events to save');
        return true;
      }

      console.log(`📤 Saving ${this.events.length} recording events to database...`);

      // Prepare events for database
      const eventsToSave = this.events.map(event => ({
        user_id: userId,
        session_id: sessionId,
        event_type: event.type,
        timestamp: event.timestamp.toISOString(),
        duration_seconds: Math.round(event.duration),
        loudness_db: event.volume * 100, // Convert 0-1 scale to approximate dB
        audio_file_url: event.audioUri || null,
      }));

      // Insert events into database
      const { error } = await supabase
        .from('sleep_recordings')
        .insert(eventsToSave);

      if (error) {
        console.error('❌ Error saving recording events:', error);
        return false;
      }

      console.log(`✅ Successfully saved ${this.events.length} recording events`);

      // Clear events after successful save
      this.events = [];

      return true;
    } catch (error) {
      console.error('❌ Error saving events to database:', error);
      return false;
    }
  }

  // Get recording events for a session
  async getSessionRecordings(sessionId: string): Promise<RecordingEvent[]> {
    try {
      const { data, error } = await supabase
        .from('sleep_recordings')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('❌ Error fetching session recordings:', error);
        return [];
      }

      // Convert database format to RecordingEvent format
      return (data || []).map(record => ({
        timestamp: new Date(record.timestamp),
        type: record.event_type as 'snoring' | 'sleep_talk' | 'noise',
        duration: record.duration_seconds || 0,
        volume: (record.loudness_db || 0) / 100,
        audioUri: record.audio_file_url || undefined,
      }));
    } catch (error) {
      console.error('❌ Error getting session recordings:', error);
      return [];
    }
  }
}

export default SleepRecorderService.getInstance();
