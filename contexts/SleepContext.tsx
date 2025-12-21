import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
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
import { calculateSleepScore } from '../utils/sleepScoreCalculator';
import { Alert } from 'react-native';

export interface SleepSession {
  id: string;
  startTime: Date;
  endTime: Date | null;
  duration: number; // in minutes
  quality: number; // 0-10
  sleepScore?: number; // 0-100
  sleepStages?: SleepStageSegment[];
  wakeUps: number;
  sleepSoundsEnabled: boolean;
  smartAlarmEnabled: boolean;
  notes?: string;
  tags?: string[];
}

interface SleepContextType {
  currentSession: SleepSession | null;
  sleepHistory: SleepSession[];
  isTracking: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  startSleepSession: (sleepSoundsEnabled: boolean, smartAlarmEnabled: boolean, sleepRecorderEnabled: boolean, targetAlarmTime?: Date) => Promise<void>;
  endSleepSession: (wakeUps: number, notes?: string) => Promise<void>;
  getSleepStats: () => {
    averageQuality: number;
    averageDuration: number;
    totalSessions: number;
    lastNightQuality: number;
    lastNightDuration: number;
    lastNightWakeUps: number;
  };
  loadSleepHistory: () => Promise<void>;
  getLatestInsight: () => Promise<{ insight: string; recommendation: string } | null>;
}

const SleepContext = createContext<SleepContextType | undefined>(undefined);

export function SleepProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const { queueOperation } = useOfflineSync();
  const [currentSession, setCurrentSession] = useState<SleepSession | null>(null);
  const [sleepHistory, setSleepHistory] = useState<SleepSession[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [alarmTime, setAlarmTime] = useState<Date | null>(null);
  const smartAlarmInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Load sleep data on mount and when user changes
  useEffect(() => {
    loadSleepHistory();
    loadCurrentSession();
  }, [user?.id]);

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
          .limit(50);

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
            sleepStages: record.sleep_stages,
            tags: record.tags || [],
          }));

          setSleepHistory(history);

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

  const startSleepSession = async (sleepSoundsEnabled: boolean, smartAlarmEnabled: boolean, sleepRecorderEnabled: boolean, targetAlarmTime?: Date) => {
    try {
      const newSession: SleepSession = {
        id: Date.now().toString(),
        startTime: new Date(),
        endTime: null,
        duration: 0,
        quality: 0,
        wakeUps: 0,
        sleepSoundsEnabled,
        smartAlarmEnabled,
      };

      if (smartAlarmEnabled && targetAlarmTime) {
        setAlarmTime(targetAlarmTime);
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
    } catch (error) {
      console.error('Error starting sleep session:', error);
      throw error;
    }
  };

  const endSleepSession = async (wakeUps: number, notes?: string) => {
    if (!currentSession) return;

    try {
      const endTime = new Date();

      // Stop acoustic recording
      const recordingSession = await sleepRecorderService.stopRecording();
      
      // Stop accelerometer tracking and get data
      const movementData = sleepTrackingService.stopTracking();
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
        sleepStages: stages,
        wakeUps,
        notes,
      };

      // Save to database or queue for sync
      await saveSleepSession(completedSession);

      // Save acoustic events to database if authenticated
      if (user && user.id !== 'guest' && recordingSession) {
        await sleepRecorderService.saveEventsToDatabase(user.id, completedSession.id);
        // Generate AI Insights using the new service
        const insights = await aiInsightService.generateInsights(user.id);
        console.log('🤖 AI Insights generated:', insights.length);
      }

      // Add to local history
      const updatedHistory = [completedSession, ...sleepHistory];
      setSleepHistory(updatedHistory);
      await AsyncStorage.setItem('@sleep_history', JSON.stringify(updatedHistory));

      // Clear current session
      setCurrentSession(null);
      setIsTracking(false);
      setAlarmTime(null);
      await AsyncStorage.removeItem('@current_sleep_session');

      // Reload sleep history from Supabase to ensure data is fresh
      if (user && user.id !== 'guest') {
        await loadSleepHistory();
      }
    } catch (error) {
      console.error('Error ending sleep session:', error);
      throw error;
    }
  };

  const saveSleepSession = async (session: SleepSession) => {
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
          // Don't include id - let Supabase generate UUID automatically
          user_id: user.id,
          start_time: session.startTime.toISOString(),
          end_time: session.endTime?.toISOString(),
          sleep_date: session.startTime.toISOString().split('T')[0], // YYYY-MM-DD format
          duration: session.duration,
          sleep_quality: session.quality,
          sleep_score: session.sleepScore || Math.round(session.quality * 10),
          sleep_stages: session.sleepStages || [],
          wake_ups: session.wakeUps,
          sleep_sounds_enabled: session.sleepSoundsEnabled,
          smart_alarm_enabled: session.smartAlarmEnabled,
          notes: session.notes || '',
          tags: session.tags || [],
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
    }
  };

  const getSleepStats = () => {
    if (sleepHistory.length === 0) {
      return {
        averageQuality: 0,
        averageDuration: 0,
        totalSessions: 0,
        lastNightQuality: 0,
        lastNightDuration: 0,
        lastNightWakeUps: 0,
      };
    }

    const totalQuality = sleepHistory.reduce((sum, session) => sum + session.quality, 0);
    const totalDuration = sleepHistory.reduce((sum, session) => sum + session.duration, 0);
    const lastSession = sleepHistory[0];

    return {
      averageQuality: Math.round((totalQuality / sleepHistory.length) * 10) / 10,
      averageDuration: Math.round(totalDuration / sleepHistory.length),
      totalSessions: sleepHistory.length,
      lastNightQuality: lastSession.quality,
      lastNightDuration: lastSession.duration,
      lastNightWakeUps: lastSession.wakeUps,
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

  return (
    <SleepContext.Provider
      value={{
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
      }}
    >
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
