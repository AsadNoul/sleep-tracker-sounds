import React, { createContext, useState, useContext, useEffect, ReactNode, useRef, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useOfflineSync } from '../lib/offlineSync';
import * as Device from 'expo-device';
import sleepRecorderService from '../services/sleepRecorderService';
import sleepTrackingService, { SleepStageSegment } from '../services/sleepTrackingService';
import notificationService from '../services/notificationService';
import aiInsightService from '../services/aiInsightService';
import analyticsService from '../services/analyticsService';
import alarmService from '../services/alarmService';
import { calculateSleepScore } from '../utils/sleepScoreCalculator';
import { scheduleMorningNotification, sendImmediateSleepSummary } from '../services/morningNotificationService';
import { Alert } from 'react-native';

export interface SleepSession {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // in minutes
  quality: number; // 0-10
  sleepScore?: number; // 0-100
  userRating?: number; // 1-5 stars
  sleepStages?: SleepStageSegment[];
  wakeUps: number;
  sleepSoundsEnabled: boolean;
  smartAlarmEnabled: boolean;
  notes?: string;
  tags?: string[];
  snoringDetected?: boolean;
  snoringDuration?: number;
  apneaRisk?: 'low' | 'moderate' | 'high';
  efficiency?: number;
  movementScore?: number;
  movementEvents?: number;
  avgSpo2?: number;          // biometric - requires external sensor
  respiratoryRate?: number;  // biometric - requires external sensor
  ambientNoise?: number;      // environment - from microphone
  lightLevel?: number;        // environment - from light sensor
  chronotype?: string;        // circadian - calculated from bedtime patterns

  // ✨ NEW: Calculated metrics from enhanced features
  deepSleepQuality?: number;     // 0-100 score - calculated from sleep stages
  snoringIntensity?: string;     // 'None' | 'Low' | 'Moderate' | 'High'
  disruptionScore?: string;      // 'Low' | 'Moderate' | 'High'
  isNap?: boolean;
}

interface SleepContextType {
  currentSession: SleepSession | null;
  sleepHistory: SleepSession[];
  isTracking: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  startSleepSession: (sleepSoundsEnabled: boolean, smartAlarmEnabled: boolean, sleepRecorderEnabled: boolean, targetAlarmTime?: Date, tags?: string[], isNap?: boolean) => Promise<void>;
  endSleepSession: (wakeUps: number, notes?: string, userRating?: number) => Promise<void>;
  getSleepStats: () => {
    averageQuality: number;
    averageDuration: number;
    totalSessions: number;
    lastNightQuality: number;
    lastNightDuration: number;
    lastNightWakeUps: number;
    previousDuration: number;
    previousQuality: number;
  };
  loadSleepHistory: () => Promise<void>;
  getLatestInsight: () => Promise<{ insight: string; recommendation: string } | null>;
  getCurrentStreak: () => number;
  getGoodNightStreak: () => number;
  getSleepDebt: () => number;
  getReadinessScore: () => number;
  getSmartBedtime: (wakeTime: Date) => Date;
  getSessionForDate: (date: Date) => Promise<SleepSession | null>;
  getSessionRecordings: (sessionId: string) => Promise<any[]>;
}

const SleepContext = createContext<SleepContextType | undefined>(undefined);

export function SleepProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { queueOperation } = useOfflineSync();
  const [currentSession, setCurrentSession] = useState<SleepSession | null>(null);
  const [sleepHistory, setSleepHistory] = useState<SleepSession[]>([]);
  const [historyLimit, setHistoryLimit] = useState(90); // Increased to 90 days for better historical data
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [alarmTime, setAlarmTime] = useState<Date | null>(null);
  const smartAlarmInterval = useRef<NodeJS.Timeout | null>(null);
  const autoStopTimeout = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false); // Prevent concurrent saves
  const loadDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadedUserRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
      if (smartAlarmInterval.current) clearInterval(smartAlarmInterval.current);
    };
  }, []);

  // Smart Alarm Logic
  useEffect(() => {
    if (isTracking && currentSession?.smartAlarmEnabled && alarmTime) {
      // Check every 30 seconds
      smartAlarmInterval.current = setInterval(checkSmartAlarm, 30000);
    } else {
      if (smartAlarmInterval.current) {
        clearInterval(smartAlarmInterval.current);
        smartAlarmInterval.current = null;
      }
    }

    return () => {
      if (smartAlarmInterval.current) clearInterval(smartAlarmInterval.current);
    };
  }, [isTracking, currentSession?.smartAlarmEnabled, alarmTime]);

  const checkSmartAlarm = async () => {
    if (!alarmTime || !currentSession) return;

    const now = new Date();
    const timeToAlarm = alarmTime.getTime() - now.getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    // If we are within 30 minutes of the alarm time
    if (timeToAlarm > 0 && timeToAlarm <= thirtyMinutes) {
      const activityLevel = sleepTrackingService.getActivityLevel();

      // If activity level is high (indicating light sleep phase)
      if (activityLevel > 0.08) { // Lowered threshold for accelerometer
        console.log('⏰ [Smart Alarm] Light sleep detected via accelerometer! Triggering early wake-up.');
        triggerAlarm('Smart Wake-up: You are in a light sleep phase.');
      }
    }
    // If it's exactly alarm time or past it
    else if (timeToAlarm <= 0) {
      triggerAlarm('Wake up! It is time to start your day.');
    }
  };

  const triggerAlarm = (message: string) => {
    notificationService.sendImmediateNotification(
      'Sleep App Alarm',
      message
    );

    if (smartAlarmInterval.current) {
      clearInterval(smartAlarmInterval.current);
      smartAlarmInterval.current = null;
    }

    Alert.alert(
      'Alarm',
      message,
      [{ text: 'Stop Alarm', onPress: () => endSleepSession(0) }]
    );
  };

  const generateAIInsights = async (session: SleepSession) => {
    if (!user || user.id === 'guest') return;

    try {
      console.log('🤖 Generating AI Sleep Architect insights...');

      let insight = '';
      let recommendation = '';
      const status = sleepRecorderService.getStatus();

      // 1. Analyze Quality & Duration
      if (session.quality >= 9) {
        insight = 'Peak performance! Your sleep architecture was nearly perfect.';
        recommendation = 'Your current environment is optimal. Avoid changing your routine.';
      } else if (session.duration < 360) {
        insight = 'Sleep deprivation detected. You are significantly below the recommended 7-9 hours.';
        recommendation = 'Prioritize an earlier bedtime tonight to pay off your sleep debt.';
      } else if (session.wakeUps > 3) {
        insight = 'Fragmented sleep detected. Multiple wake-ups are disrupting your REM cycles.';
        recommendation = 'Check for light or noise disturbances in your room.';
      } else {
        insight = 'Stable sleep session, but efficiency could be higher.';
        recommendation = 'Try a 5-minute mindfulness session before bed to lower your heart rate.';
      }

      // 2. Analyze Acoustic Data (Biometrics)
      if (status.snoringEvents > 10) {
        insight += ' Heavy snoring detected throughout the night.';
        recommendation += ' Consider using a wedge pillow or sleeping on your side to keep airways clear.';
      } else if (status.sleepTalkEvents > 2) {
        insight += ' Sleep talking episodes were recorded.';
        recommendation += ' This often indicates high stress or late-night brain activity. Try journaling before bed.';
      }

      // 3. Analyze Consistency (if history exists)
      if (sleepHistory.length > 0) {
        const lastSession = sleepHistory[0];
        const timeDiff = Math.abs(session.startTime.getTime() - lastSession.startTime.getTime());
        const oneHour = 60 * 60 * 1000;

        if (timeDiff > oneHour) {
          insight += ' Circadian rhythm shift detected.';
          recommendation += ' Try to go to bed within 30 minutes of the same time every night.';
        }
      }

      const { error } = await supabase
        .from('sleep_insights')
        .insert({
          user_id: user.id,
          session_id: session.id,
          insight_text: insight,
          recommendation_text: recommendation,
          generated_at: new Date().toISOString()
        });

      if (error) console.error('Error saving AI insights:', error);
      else console.log('✅ AI Insights generated and saved.');

    } catch (error) {
      console.error('Error generating AI insights:', error);
    }
  };

  // Load sleep data on mount and when user changes (debounced to prevent rapid re-fetches)
  useEffect(() => {
    // Skip if same user already loaded
    if (lastLoadedUserRef.current === (user?.id || null) && sleepHistory.length > 0) {
      return;
    }

    if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
    loadDebounceRef.current = setTimeout(() => {
      lastLoadedUserRef.current = user?.id || null;
      loadSleepHistory();
      loadCurrentSession();
    }, 300); // 300ms debounce

    return () => {
      if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
    };
  }, [user?.id]);

  // Real-time subscription for sleep_records changes (other devices, sync, etc.)
  useEffect(() => {
    if (!user || user.id === 'guest' || !session) {
      // Clean up subscription for guest/logged-out users
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel('sleep_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'sleep_records',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('🔄 Real-time sleep_records change:', payload.eventType);
          // Debounce the reload to avoid rapid repeated fetches
          if (loadDebounceRef.current) clearTimeout(loadDebounceRef.current);
          loadDebounceRef.current = setTimeout(() => {
            loadSleepHistory();
          }, 1000);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [user?.id, session]);

  const getDeviceId = async (): Promise<string> => {
    try {
      // Try to get existing device ID
      let deviceId = await AsyncStorage.getItem('@device_id');

      if (!deviceId) {
        // Generate unique device ID for guest users
        const deviceName = Device.deviceName || 'Unknown';
        const modelName = Device.modelName || 'Unknown';
        const timestamp = Date.now();
        deviceId = `guest_${deviceName}_${modelName}_${timestamp}`.replace(/[^a-zA-Z0-9_]/g, '_');
        await AsyncStorage.setItem('@device_id', deviceId);
      }

      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `guest_${Date.now()}`;
    }
  };

  const loadCurrentSession = async () => {
    try {
      const sessionData = await AsyncStorage.getItem('@current_sleep_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.startTime = new Date(session.startTime);
        session.endTime = session.endTime ? new Date(session.endTime) : null;

        // 🛡️ SECURITY: Maximum Duration Check (Prevent Zombie Sessions)
        // If the session started > 16 hours ago and has no end time, it's likely a "ghost" tracking
        // session that was never stopped. We should clear it to prevent the UI from being stuck.
        const now = new Date();
        const sessionAgeHours = (now.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);

        if (session.endTime === null && sessionAgeHours > 16) {
          console.warn(`🕒 [Session Recovery] Stale session detected (${Math.round(sessionAgeHours)}h old). Clearing zombie session.`);
          await AsyncStorage.removeItem('@current_sleep_session');
          setCurrentSession(null);
          setIsTracking(false);
          return;
        }

        setCurrentSession(session);
        setIsTracking(session.endTime === null);
      }
    } catch (error) {
      console.error('Error loading current session:', error);
    }
  };

  const loadSleepHistory = async () => {
    try {
      setIsLoading(true);

      // Check if user is authenticated (not guest)
      if (user && user.id !== 'guest' && session) {
        // Load from Supabase for authenticated users
        const { data, error } = await supabase
          .from('sleep_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(historyLimit);

        if (error) {
          console.error('Error loading sleep history from Supabase:', error);
          // Fallback to local storage
          await loadLocalSleepHistory();
        } else if (data) {
          // Transform Supabase data to SleepSession format
          const history: SleepSession[] = data.map((record: any) => ({
            id: record.id,
            startTime: new Date(record.start_time),
            endTime: new Date(record.end_time),
            duration: record.duration || 0,
            quality: record.sleep_quality || 0,
            wakeUps: record.wake_ups || 0,
            sleepSoundsEnabled: record.sleep_sounds_enabled || false,
            smartAlarmEnabled: record.smart_alarm_enabled || false,
            notes: record.notes || '',
            sleepScore: record.sleep_score,
            userRating: record.user_rating,
            sleepStages: record.sleep_stages,
            tags: record.tags || [],
            efficiency: record.efficiency,
            movementScore: record.movement_score,
            movementEvents: record.movement_events,
            avgSpo2: record.avg_spo2,
            respiratoryRate: record.respiratory_rate,
            ambientNoise: record.ambient_noise,
            lightLevel: record.light_level,
            chronotype: record.chronotype,
            // Calculated metrics from enhanced features
            deepSleepQuality: record.deep_sleep_quality,
            snoringIntensity: record.snoring_intensity,
            disruptionScore: record.disruption_score,
            isNap: record.is_nap,
          }));

          setSleepHistory(history);

          console.log(`✅ Loaded ${history.length} sleep records from Supabase`);
          if (history.length > 0) {
            console.log(`📅 Date range: ${new Date(history[history.length - 1].startTime).toLocaleDateString()} to ${new Date(history[0].startTime).toLocaleDateString()}`);
          }

          // Cache locally for offline access
          await AsyncStorage.setItem('@sleep_history', JSON.stringify(history));
        }
      } else {
        // Load from local storage for guest users
        await loadLocalSleepHistory();
      }
    } catch (error) {
      console.error('Error loading sleep history:', error);
      // Fallback to local storage
      await loadLocalSleepHistory();
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocalSleepHistory = async () => {
    try {
      const historyData = await AsyncStorage.getItem('@sleep_history');
      if (historyData) {
        const history = JSON.parse(historyData);
        const parsedHistory = history.map((session: any) => ({
          ...session,
          startTime: new Date(session.startTime),
          endTime: new Date(session.endTime),
        }));
        setSleepHistory(parsedHistory);
      }
    } catch (error) {
      console.error('Error loading local sleep history:', error);
    }
  };

  const startSleepSession = async (sleepSoundsEnabled: boolean, smartAlarmEnabled: boolean, sleepRecorderEnabled: boolean, targetAlarmTime?: Date, tags: string[] = [], isNap: boolean = false) => {
    try {
      // Use a consistent UUID for the session to link recordings correctly
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const newSession: SleepSession = {
        id: sessionId,
        startTime: new Date(),
        endTime: null,
        duration: 0,
        quality: 0,
        wakeUps: 0,
        sleepSoundsEnabled,
        smartAlarmEnabled,
        tags,
        isNap,
      };

      if (smartAlarmEnabled && targetAlarmTime) {
        setAlarmTime(targetAlarmTime);
        // Set actual alarm that will ring
        const alarmDate = new Date(targetAlarmTime);
        const alarmTimeString = `${alarmDate.getHours().toString().padStart(2, '0')}:${alarmDate.getMinutes().toString().padStart(2, '0')}`;
        await alarmService.setAlarm(alarmTimeString, 'Smart Wake-Up Alarm');
      }

      // Start acoustic recording if enabled
      if (sleepRecorderEnabled) {
        await sleepRecorderService.startRecording();
      }

      // Start accelerometer tracking
      await sleepTrackingService.startTracking();

      setCurrentSession(newSession);
      setIsTracking(true);
      await AsyncStorage.setItem('@current_sleep_session', JSON.stringify(newSession));

      // Track sleep session start
      await analyticsService.trackSleepSessionStart();

      // Auto-stop sleep session after 12 hours (43200000 ms)
      autoStopTimeout.current = setTimeout(async () => {
        const storedSession = await AsyncStorage.getItem('@current_sleep_session');
        if (storedSession) {
          console.log('⏰ Auto-stopping sleep session after 12 hours');
          // Warn the user before auto-stopping
          try {
            await notificationService.sendImmediateNotification(
              '⏰ Sleep Session Auto-Ended',
              'Your sleep session ran for 12 hours and was automatically saved. Open the app to review your data.',
              { type: 'auto_stop' }
            );
          } catch (_) { }
          await endSleepSession(0, 'Auto-stopped after 12 hours');
        }
      }, 12 * 60 * 60 * 1000);
    } catch (error) {
      console.error('Error starting sleep session:', error);
      throw error;
    }
  };

  const endSleepSession = async (wakeUps: number, notes?: string, userRating?: number) => {
    if (!currentSession) return;

    try {
      // Clear auto-stop timeout
      if (autoStopTimeout.current) {
        clearTimeout(autoStopTimeout.current);
        autoStopTimeout.current = null;
      }

      const endTime = new Date();

      // Stop acoustic recording
      const recordingSession = await sleepRecorderService.stopRecording();

      // Stop accelerometer tracking and get data
      const movementData = await sleepTrackingService.stopTracking();
      const stages = sleepTrackingService.calculateSleepStages(movementData);

      // Validate end time is after start time
      if (endTime <= currentSession.startTime) {
        throw new Error('End time cannot be before or equal to start time');
      }

      const durationMinutes = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / (1000 * 60));

      // Validate duration is reasonable (at least 1 minute)
      if (durationMinutes < 1) {
        throw new Error('Sleep session must be at least 1 minute long');
      }

      // Calculate advanced sleep score (0-100)
      const scoreResult = calculateSleepScore(
        currentSession.startTime,
        endTime,
        stages,
        wakeUps
      );

      // Map 0-100 score to 0-10 quality for backward compatibility
      const quality = Math.round(scoreResult.score / 10);

      const completedSession: SleepSession = {
        ...currentSession,
        endTime,
        duration: durationMinutes,
        quality,
        sleepScore: scoreResult.score,
        userRating: userRating || undefined,
        sleepStages: stages,
        wakeUps,
        notes,
      };

      // Save to database or queue for sync
      await saveSleepSession(completedSession);

      // Save acoustic events to database if authenticated
      if (user && user.id !== 'guest' && recordingSession) {
        await sleepRecorderService.saveEventsToDatabase(
          user.id,
          completedSession.id,
          new Date(completedSession.startTime) // Pass session start time for offset calculation
        );
        // Generate AI Insights using the new service
        const insights = await aiInsightService.generateInsights(user.id);
        console.log('🤖 AI Insights generated:', insights.length);
      }

      // Add to local history immediately (optimistic update — instant dashboard refresh)
      const updatedHistory = [completedSession, ...sleepHistory];
      setSleepHistory(updatedHistory);
      // Always persist locally — guests rely on this exclusively
      await AsyncStorage.setItem('@sleep_history', JSON.stringify(updatedHistory));

      // Clear current session
      setCurrentSession(null);
      setIsTracking(false);
      setAlarmTime(null);
      await AsyncStorage.removeItem('@current_sleep_session');

      // Do NOT call loadSleepHistory() here — it races with the Supabase insert and
      // overwrites the optimistic update with stale data, making dashboard show 0.
      // The optimistic update above is already correct. A background refresh happens
      // next time the user opens the app or navigates to the analysis screen.

      // Track sleep session completion
      await analyticsService.trackSleepSessionComplete(durationMinutes, quality, scoreResult.score);

      // Schedule morning notification (skip for naps — no 'Good Morning' for a 20-min power nap)
      if (!completedSession.isNap) {
        await scheduleMorningNotification(completedSession);
      } else {
        // For naps: send a short immediate summary instead
        const napMins = durationMinutes;
        await notificationService.sendImmediateNotification(
          '⚡ Nap Complete!',
          `Your ${napMins}-minute power nap scored ${scoreResult.score}/100. Ready to take on the day!`,
          { type: 'nap_complete', score: scoreResult.score }
        );
      }

      // Schedule weekly summary every 7th session
      const { scheduleWeeklySummary } = await import('../services/morningNotificationService');
      const updatedHistoryForWeekly = [completedSession, ...sleepHistory];
      if (updatedHistoryForWeekly.length % 7 === 0) {
        const lastSevenSessions = updatedHistoryForWeekly.slice(0, 7);
        await scheduleWeeklySummary(lastSevenSessions).catch(() => { });
      }
    } catch (error) {
      console.error('Error ending sleep session:', error);
      throw error;
    }
  };

  const saveSleepSession = async (session: SleepSession) => {
    // Prevent concurrent saves (double-tap, race condition)
    if (isSavingRef.current) {
      console.log('⚠️ Save already in progress, skipping duplicate call');
      return;
    }
    isSavingRef.current = true;

    try {
      // Check if user is authenticated (not guest)
      if (user && user.id !== 'guest' && session) {
        // Check if this session was already saved to prevent duplicates
        const savedSessionsKey = '@saved_session_ids';
        const savedSessionsStr = await AsyncStorage.getItem(savedSessionsKey);
        const savedSessions = savedSessionsStr ? JSON.parse(savedSessionsStr) : [];

        if (savedSessions.includes(session.id)) {
          console.log('Session already saved, skipping duplicate:', session.id);
          return;
        }

        const sleepData = {
          id: session.id, // Include the ID so it matches local recordings
          user_id: user.id,
          start_time: session.startTime.toISOString(),
          end_time: session.endTime?.toISOString(),
          sleep_date: session.startTime.toISOString().split('T')[0], // YYYY-MM-DD format
          duration: session.duration,
          sleep_quality: session.quality,
          sleep_score: session.sleepScore || Math.round(session.quality * 10),
          user_rating: session.userRating || null,
          sleep_stages: session.sleepStages || [],
          wake_ups: session.wakeUps,
          sleep_sounds_enabled: session.sleepSoundsEnabled,
          smart_alarm_enabled: session.smartAlarmEnabled,
          notes: session.notes || '',
          tags: session.tags || [],
          efficiency: session.efficiency || null,
          movement_score: session.movementScore || null,
          movement_events: session.movementEvents || null,
          // Real-time metrics from new features
          avg_spo2: session.avgSpo2 || null,
          respiratory_rate: session.respiratoryRate || null,
          ambient_noise: session.ambientNoise || null,
          light_level: session.lightLevel || null,
          chronotype: session.chronotype || null,
          // Calculated metrics from enhanced features
          deep_sleep_quality: session.deepSleepQuality || null,
          snoring_intensity: session.snoringIntensity || null,
          disruption_score: session.disruptionScore || null,
          is_nap: session.isNap || false,
        };

        if (isOnline) {
          // Save directly to Supabase
          setSyncStatus('syncing');
          setSyncError(null);

          const { data, error } = await supabase.from('sleep_records').insert(sleepData).select();

          if (error) {
            console.error('Error saving to Supabase:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            // Queue for later sync
            await queueOperation('sleep_records', 'insert', sleepData);
            setSyncStatus('error');
            setSyncError('Saved locally. Will sync when online.');
          } else {
            console.log('Successfully saved sleep session to Supabase:', data);
            // Mark this session as saved
            savedSessions.push(session.id);
            await AsyncStorage.setItem(savedSessionsKey, JSON.stringify(savedSessions));
            setSyncStatus('success');

            // Check for milestones (async, don't wait)
            if (user && user.id !== 'guest') {
              const { default: welcomeService } = await import('../services/welcomeService');
              welcomeService.checkAndSendMilestones(user.id).catch(err =>
                console.error('Failed to check milestones:', err)
              );
            }

            // Reset status after 2 seconds
            setTimeout(() => setSyncStatus('idle'), 2000);
          }
        } else {
          // Queue for sync when online
          await queueOperation('sleep_records', 'insert', sleepData);
          setSyncStatus('success');
          setSyncError('Saved locally. Will sync when online.');
          setTimeout(() => setSyncStatus('idle'), 2000);
          console.log('Offline: Sleep session queued for sync');
        }
      } else {
        console.log('Guest user or invalid session - data saved to AsyncStorage only');
      }
      // For guest users, data is already saved to AsyncStorage
    } catch (error) {
      console.error('Error saving sleep session:', error);
      setSyncStatus('error');
      setSyncError(error instanceof Error ? error.message : 'Failed to save sleep session');
    } finally {
      isSavingRef.current = false; // Release save lock
    }
  };

  const getSleepStats = () => {
    if (sleepHistory.length === 0) {
      return {
        averageQuality: 0,
        averageDuration: 0,
        totalSessions: 0,
        napCount: 0,
        lastNightQuality: 0,
        lastNightDuration: 0,
        lastNightWakeUps: 0,
        previousDuration: 0,
        previousQuality: 0,
      };
    }

    const baselineHistory = sleepHistory.filter(s => !s.isNap);
    const naps = sleepHistory.filter(s => s.isNap);

    const totalQuality = baselineHistory.reduce((sum, session) => sum + session.quality, 0);
    const totalDuration = baselineHistory.reduce((sum, session) => sum + session.duration, 0);
    const lastSession = sleepHistory[0]; // Keep the very last session (could be a nap) as the 'last night' record
    const previousSession = sleepHistory[1];

    const baselineCount = baselineHistory.length || 1; // avoid divide by zero

    return {
      averageQuality: Math.round((totalQuality / baselineCount) * 10) / 10,
      averageDuration: Math.round(totalDuration / baselineCount),
      totalSessions: baselineHistory.length,
      napCount: naps.length,
      lastNightQuality: lastSession.quality,
      lastNightDuration: lastSession.duration,
      lastNightWakeUps: lastSession.wakeUps,
      previousDuration: previousSession ? previousSession.duration : lastSession.duration,
      previousQuality: previousSession ? previousSession.quality : lastSession.quality,
    };
  };

  const getLatestInsight = async () => {
    if (!user || user.id === 'guest') return null;

    try {
      const { data, error } = await supabase
        .from('sleep_insights')
        .select('insight_text, recommendation_text')
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Ignore "no rows found" error
          console.error('Error fetching latest insight:', error);
        }
        return null;
      }

      return {
        insight: data.insight_text,
        recommendation: data.recommendation_text,
      };
    } catch (error) {
      console.error('Error in getLatestInsight:', error);
      return null;
    }
  };

  const getCurrentStreak = (): number => {
    if (sleepHistory.length === 0) return 0;

    let streak = 0;
    const sortedHistory = [...sleepHistory].sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    let lastDate = new Date();
    lastDate.setHours(0, 0, 0, 0); // Reset to midnight

    for (const session of sortedHistory) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0); // Reset to midnight

      const daysDiff = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      // Consecutive days (0 or 1 day difference)
      if (daysDiff <= 1) {
        if (streak === 0 || daysDiff === 1) {
          streak++;
          lastDate = sessionDate;
        }
      } else {
        // Streak broken
        break;
      }
    }

    return streak;
  };

  // Calculate streak of consecutive "good nights" (rating >= 3 or quality >= 7)
  const getGoodNightStreak = (): number => {
    if (sleepHistory.length === 0) return 0;

    let streak = 0;
    const sortedHistory = [...sleepHistory].sort((a, b) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    let lastDate = new Date();
    lastDate.setHours(0, 0, 0, 0);

    for (const session of sortedHistory) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      // Check if consecutive day
      if (daysDiff <= 1) {
        // Check if it was a "good night" (user rating >= 3 OR computed quality >= 7)
        const isGoodNight = (session.userRating && session.userRating >= 3) || session.quality >= 7;

        if (isGoodNight) {
          if (streak === 0 || daysDiff === 1) {
            streak++;
            lastDate = sessionDate;
          }
        } else {
          // Good night streak broken
          break;
        }
      } else {
        // Streak broken due to gap
        break;
      }
    }

    return streak;
  };

  // Calculate sleep debt (difference from recommended 8 hours over last 7 days)
  const getSleepDebt = (): number => {
    if (sleepHistory.length === 0) return 0;

    const optimalSleep = 8 * 60; // 8 hours in minutes
    const last7Days = sleepHistory.slice(0, 7);

    const totalDebt = last7Days.reduce((debt, session) => {
      const difference = optimalSleep - session.duration;
      return debt + difference;
    }, 0);

    // Return in hours (negative means surplus, positive means debt)
    return Math.round((totalDebt / 60) * 10) / 10;
  };

  // Calculate readiness score (0-100) based on sleep quality, debt, and consistency
  const getReadinessScore = (): number => {
    if (sleepHistory.length === 0) return 0;

    const lastSession = sleepHistory[0];
    const sleepDebt = getSleepDebt();
    const streak = getCurrentStreak();

    // Components: Last night quality (50%), Sleep debt (30%), Consistency (20%)
    const qualityScore = lastSession.sleepScore || Math.round(lastSession.quality * 10);
    const debtScore = Math.max(0, 100 - Math.abs(sleepDebt) * 10); // Penalty for debt
    const consistencyScore = Math.min(100, streak * 10); // Bonus for streaks

    const readiness = Math.round(
      qualityScore * 0.5 +
      debtScore * 0.3 +
      consistencyScore * 0.2
    );

    return Math.max(0, Math.min(100, readiness));
  };

  // Calculate optimal bedtime based on wake time and sleep needs
  const getSmartBedtime = (wakeTime: Date): Date => {
    const sleepDebt = getSleepDebt();
    const stats = getSleepStats();

    // Base sleep need: 8 hours (480 minutes)
    let recommendedSleep = 480;

    // Adjust for sleep debt (add extra time if in debt)
    if (sleepDebt > 0) {
      recommendedSleep += Math.min(sleepDebt * 60 * 0.3, 90); // Max 90 min extra
    }

    // Adjust based on personal average (if significantly different from 8h)
    if (stats.averageDuration > 0 && Math.abs(stats.averageDuration - 480) > 30) {
      recommendedSleep = (recommendedSleep + stats.averageDuration) / 2;
    }

    // Add buffer for sleep latency (15 minutes average)
    recommendedSleep += 15;

    // Calculate bedtime
    const bedtime = new Date(wakeTime.getTime() - recommendedSleep * 60 * 1000);

    return bedtime;
  };

  const getSessionForDate = async (date: Date): Promise<SleepSession | null> => {
    try {
      if (!user || user.id === 'guest') {
        // Local search only for guest
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const match = sleepHistory.find(s => {
          const time = s.endTime || s.startTime;
          return time >= startOfDay && time <= endOfDay;
        });
        return match || null;
      }

      // Calculate the start and end of the requested day in LOCAL timezone
      // Create new Date objects to avoid mutating the input
      const startStr = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
      const endStr = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

      // Query database for sessions ending on this day
      const { data, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('end_time', startStr.toISOString())
        .lte('end_time', endStr.toISOString())
        .order('duration', { ascending: false }) // Prioritize longest session (main sleep)
        .limit(1);

      if (error) {
        console.error('Error fetching session for date:', error);
        return null;
      }

      if (data && data.length > 0) {
        const record = data[0];
        return {
          id: record.id,
          startTime: new Date(record.start_time),
          endTime: new Date(record.end_time),
          duration: record.duration || 0,
          quality: record.sleep_quality || 0,
          wakeUps: record.wake_ups || 0,
          sleepSoundsEnabled: record.sleep_sounds_enabled || false,
          smartAlarmEnabled: record.smart_alarm_enabled || false,
          notes: record.notes || '',
          sleepScore: record.sleep_score,
          userRating: record.user_rating,
          sleepStages: record.sleep_stages,
          tags: record.tags || [],
          efficiency: record.efficiency,
          movementScore: record.movement_score,
          movementEvents: record.movement_events,
          avgSpo2: record.avg_spo2,
          respiratoryRate: record.respiratory_rate,
          ambientNoise: record.ambient_noise,
          lightLevel: record.light_level,
          chronotype: record.chronotype,
          // Calculated metrics from enhanced features
          deepSleepQuality: record.deep_sleep_quality,
          snoringIntensity: record.snoring_intensity,
          disruptionScore: record.disruption_score,
        };
      }

      return null;
    } catch (err) {
      console.error('Error in getSessionForDate:', err);
      return null;
    }
  };

  const getSessionRecordings = async (sessionId: string) => {
    return await sleepRecorderService.getSessionRecordings(sessionId);
  };

  const value = useMemo(() => ({
    currentSession,
    sleepHistory,
    isTracking,
    isLoading,
    syncStatus,
    syncError,
    startSleepSession,
    endSleepSession,
    getSleepStats,
    loadSleepHistory,
    getLatestInsight,
    getCurrentStreak,
    getGoodNightStreak,
    getSleepDebt,
    getReadinessScore,
    getSmartBedtime,
    getSessionForDate,
    getSessionRecordings,
  }), [
    currentSession,
    sleepHistory,
    isTracking,
    isLoading,
    syncStatus,
    syncError
  ]);

  return (
    <SleepContext.Provider value={value}>
      {children}
    </SleepContext.Provider>
  );
}

export function useSleep() {
  const context = useContext(SleepContext);
  if (context === undefined) {
    throw new Error('useSleep must be used within a SleepProvider');
  }
  return context;
}
