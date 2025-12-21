import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, UserProfile } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { getErrorMessage } from '../utils/errorMessages';
import revenueCatService from '../services/revenueCatService';
import * as Notifications from 'expo-notifications';

WebBrowser.maybeCompleteAuthSession();

interface User {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: 'free' | 'premium_monthly' | 'premium_yearly';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  migrateGuestData: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  saveUserSettings: (settings: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Initialize auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        checkGuestMode();
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        // Reset onboarding state when user signs out
        checkGuestMode();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isExpoGo = () => {
    const anyConstants = Constants as any;
    return (
      anyConstants?.executionEnvironment === 'storeClient' ||
      anyConstants?.appOwnership === 'expo'
    );
  };

  const checkGuestMode = async () => {
    try {
      const onboardingComplete = await AsyncStorage.getItem('@onboarding_complete');
      if (onboardingComplete === 'true') {
        setHasCompletedOnboarding(true);
        // Set a guest user
        const guestUser: User = {
          id: 'guest',
          email: 'guest@local',
          full_name: 'Guest',
          subscription_status: 'free',
        };
        setUser(guestUser);
      }
    } catch (error) {
      console.error('Error checking guest mode:', error);
    }
  };

  const registerPushToken = async (userId: string) => {
    try {
      // Request notification permissions first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('⚠️ Push notification permissions not granted');
        return;
      }

      // Get Expo push token
      const pushTokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      const pushToken = pushTokenData.data;
      console.log('📱 Expo Push Token:', pushToken);

      // Save to database
      const { error } = await supabase
        .from('user_profiles')
        .update({ expo_push_token: pushToken })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error saving push token:', error);
      } else {
        console.log('✅ Push token saved to database');
      }
    } catch (error) {
      console.error('❌ Error registering push token:', error);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
        setUser({
          id: data.id,
          email: data.email || '',
          full_name: data.full_name,
          subscription_status: data.subscription_status,
        });

        // Set RevenueCat user ID so webhooks can identify this user
        try {
          // Only set user ID if RevenueCat is properly configured
          if (revenueCatService.isReady()) {
            await revenueCatService.setUserId(data.id);
            console.log('✅ RevenueCat user ID set:', data.id);
          } else {
            console.warn('⚠️ RevenueCat not configured, skipping user ID set');
          }
        } catch (rcError) {
          console.error('Failed to set RevenueCat user ID:', rcError);
        }

        // Register push notification token
        registerPushToken(data.id).catch(err =>
          console.error('Failed to register push token:', err)
        );

        // Check if user has completed onboarding by checking if onboarding_completed_at exists
        if (data.onboarding_completed_at) {
          setHasCompletedOnboarding(true);
          await AsyncStorage.setItem('@onboarding_complete', 'true');
        } else {
          // Check if there's onboarding data in AsyncStorage to save
          const onboardingDataStr = await AsyncStorage.getItem('@onboarding_data');
          if (onboardingDataStr) {
            const onboardingData = JSON.parse(onboardingDataStr);
            // Save to Supabase - using 'id' column, not 'user_id'
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({
                age: parseInt(onboardingData.age) || null,
                gender: onboardingData.gender,
                sleep_goals: onboardingData.sleepGoals,
                sleep_troubles: onboardingData.sleepTroubles,
                sleep_pattern: onboardingData.sleepPattern,
                average_sleep_hours: onboardingData.averageSleepHours,
                wake_up_feeling: onboardingData.wakeUpFeeling,
                health_conditions: onboardingData.healthConditions,
                preferred_bed_time: onboardingData.bedTime,
                preferred_wake_time: onboardingData.wakeUpTime,
                onboarding_completed_at: new Date().toISOString(),
              })
              .eq('id', userId);

            if (updateError) {
              console.error('Error saving onboarding data to Supabase:', updateError);
            } else {
              // Clear from AsyncStorage only if save was successful
              await AsyncStorage.removeItem('@onboarding_data');
              // Mark as completed
              setHasCompletedOnboarding(true);
              await AsyncStorage.setItem('@onboarding_complete', 'true');
            }
          }
        }
      } else {
        // Profile doesn't exist yet - this can happen for new users
        // The database trigger should create it, but let's wait and retry
        console.log('Profile not found, waiting for database trigger...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Retry loading profile
        const { data: retryData, error: retryError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (retryData) {
          setProfile(retryData);
          setUser({
            id: retryData.id,
            email: retryData.email || '',
            full_name: retryData.full_name,
            subscription_status: retryData.subscription_status,
          });

          // Register push notification token
          registerPushToken(retryData.id).catch(err =>
            console.error('Failed to register push token:', err)
          );
        } else {
          console.error('Profile still not found after retry:', retryError);
          // Get user info from auth session as fallback
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            setUser({
              id: authUser.id,
              email: authUser.email || '',
              full_name: authUser.user_metadata?.full_name || null,
              subscription_status: 'free',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide specific error messages
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email or password is incorrect. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email before signing in. Check your inbox for a verification link.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many login attempts. Please try again in 15 minutes.');
        } else if (error.message.includes('network')) {
          throw new Error('Network error. Please check your internet connection.');
        } else {
          throw new Error(error.message || 'Sign in failed. Please try again.');
        }
      }

      if (data.user) {
        await loadUserProfile(data.user.id);
      }
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      // First, check if there's guest data to migrate
      const hasGuestData = await checkForGuestData();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Profile will be created automatically by the database trigger
        // Wait a bit for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Migrate guest data if exists
        if (hasGuestData) {
          await migrateGuestData();
        }

        await loadUserProfile(data.user.id);
      }
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw new Error(getErrorMessage(error));
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🚀 Starting Google Sign-in...');

      // Auto-detect: Use proxy in Expo Go, custom scheme in production
      const inExpoGo = isExpoGo();
      
      // Use Linking.createURL for the most reliable redirect in Expo Go
      // This avoids the "something went wrong" error on the Expo Proxy page
      const redirectUrl = Linking.createURL('auth/callback');

      console.log('🔍 Environment:', inExpoGo ? 'Expo Go' : 'Production Build');
      console.log('🔍 Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL');

      console.log('🌐 Opening auth session...');

      // This will handle the redirect automatically
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      console.log('📱 Result type:', result.type);

      if (result.type === 'cancel') {
        console.log('👤 User cancelled sign-in');
        return;
      }

      // On Android, 'dismiss' can sometimes be triggered by the redirect itself
      if (result.type === 'dismiss' && Platform.OS === 'ios') {
        console.log('👤 User dismissed sign-in');
        return;
      }

      // Handle the OAuth redirect URL
      if (result.type === 'success' && result.url) {
        console.log('🔗 Got redirect URL:', result.url);

        try {
          // Use expo-linking to parse the URL correctly
          const parsed = Linking.parse(result.url);
          const { access_token, refresh_token } = parsed.queryParams || {};

          // Also check hash fragment (sometimes queryParams doesn't catch it)
          let accessToken = access_token as string;
          let refreshToken = refresh_token as string;

          if (!accessToken || !refreshToken) {
            const hash = result.url.split('#')[1];
            if (hash) {
              const params = new URLSearchParams(hash);
              accessToken = params.get('access_token') || '';
              refreshToken = params.get('refresh_token') || '';
            }
          }

          console.log('🔑 Access token:', accessToken ? 'Found' : 'Missing');
          console.log('🔑 Refresh token:', refreshToken ? 'Found' : 'Missing');

          if (accessToken && refreshToken) {
            console.log('✅ Tokens extracted, setting session...');

            // Set the session manually
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('❌ Error setting session:', sessionError);
              throw sessionError;
            }

            if (sessionData?.session) {
              console.log('✅ Session set successfully!');
              
              // Check if this is a new user (metadata or profile check)
              const isNewUser = sessionData.session.user.last_sign_in_at === sessionData.session.user.created_at;
              console.log('👤 Is new user:', isNewUser);

              if (isNewUser) {
                Alert.alert(
                  'Account Created! 🎉',
                  'Your account has been created successfully. Please complete the onboarding questions so we can personalize the experience for you.',
                  [{ text: 'Let\'s Go' }]
                );
              }

              await loadUserProfile(sessionData.session.user.id);
              return;
            }
          } else {
            console.warn('⚠️ Tokens not found in URL, checking for session via fallback...');
          }
        } catch (urlError) {
          console.error('❌ Error parsing URL:', urlError);
        }
      } else if (result.type === 'dismiss' && Platform.OS === 'android') {
        console.log('🤖 Android dismiss detected, checking for session via fallback...');
      }

      // Fallback: Wait for session (in case it's stored differently)
      console.log('⏳ Waiting for session to appear...');
      for (let i = 0; i < 30; i++) {
        try {
          await new Promise(r => setTimeout(r, 1000));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('✅ Session found via fallback!');
            await loadUserProfile(session.user.id);
            return;
          }
          if (i % 5 === 0) console.log(`⏳ Attempt ${i + 1}/30 - checking for session...`);
        } catch (e) {
          console.error('Error in session fallback check:', e);
        }
      }

      throw new Error('Sign-in timed out. Please ensure you completed the process in the browser. If you are in Expo Go, make sure https://auth.expo.io/@assdalinaul/sleep-tracker-app is in your Supabase Redirect URLs.');
    } catch (error: any) {
      console.error('❌ Google Sign-in Error:', error);
      throw error;
    }
  };

  const signInWithGoogleToken = async (idToken: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserProfile(data.user.id);
      }
    } catch (error: any) {
      console.error('Error signing in with Google token:', error);
      throw new Error(error.message || 'Failed to complete Google sign in');
    }
  };

  const signInWithApple = async () => {
    try {
      // Apple Sign In requires native modules and proper configuration
      // This is a placeholder - full implementation requires Apple Developer setup
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: AuthSession.makeRedirectUri({
            scheme: 'com.sleeptracker.app',
            path: 'auth/callback',
          }),
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error with Apple sign in:', error);
      throw new Error(error.message || 'Failed to sign in with Apple');
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      await AsyncStorage.removeItem('@onboarding_complete');
      setUser(null);
      setProfile(null);
      setSession(null);
      setHasCompletedOnboarding(false);
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_complete', 'true');
      setHasCompletedOnboarding(true);

      // If user is authenticated, mark onboarding as complete in Supabase
      if (session?.user) {
        await supabase
          .from('user_profiles')
          .update({
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('id', session.user.id);

        // Create their settings
        const { error } = await supabase.from('user_settings').upsert({
          user_id: session.user.id,
          notifications: true,
          sleep_reminder: false,
          theme_mode: 'dark',
        }, {
          onConflict: 'user_id'
        });

        if (error) {
          console.error('Error creating settings:', error);
        }
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  const checkForGuestData = async (): Promise<boolean> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      // Check if there's any guest data stored
      const dataKeys = keys.filter(
        key =>
          key.includes('@sleep_sessions') ||
          key.includes('@journal_entries') ||
          key.includes('@settings')
      );
      return dataKeys.length > 0;
    } catch (error) {
      console.error('Error checking guest data:', error);
      return false;
    }
  };

  const migrateGuestData = async () => {
    try {
      if (!session?.user) return;

      // Migrate sleep sessions
      const sleepSessionsData = await AsyncStorage.getItem('@sleep_sessions');
      if (sleepSessionsData) {
        const sessions = JSON.parse(sleepSessionsData);
        const migratedSessions = sessions.map((s: any) => ({
          user_id: session.user.id,
          start_time: s.startTime,
          end_time: s.endTime,
          sleep_quality: s.quality,
          sleep_sounds_enabled: s.sleepSoundsEnabled,
          smart_alarm_enabled: s.smartAlarmEnabled,
          wake_ups: s.wakeUps,
          notes: s.notes,
        }));

        const { error } = await supabase.from('sleep_records').insert(migratedSessions);
        if (error) console.error('Error migrating sleep sessions:', error);
      }

      // Migrate journal entries
      const journalData = await AsyncStorage.getItem('@journal_entries');
      if (journalData) {
        const entries = JSON.parse(journalData);
        const migratedEntries = entries.map((e: any) => ({
          user_id: session.user.id,
          date: e.date,
          mood: e.mood,
          energy_level: e.energyLevel,
          stress_level: e.stressLevel,
          notes: e.notes,
          tags: e.tags || [],
        }));

        const { error } = await supabase.from('sleep_journals').insert(migratedEntries);
        if (error) console.error('Error migrating journal entries:', error);
      }

      // Migrate settings
      const settingsData = await AsyncStorage.getItem('@settings');
      if (settingsData) {
        const settings = JSON.parse(settingsData);
        const { error } = await supabase.from('user_settings').upsert({
          user_id: session.user.id,
          notifications: settings.notifications ?? true,
          sleep_reminder: settings.sleepReminder ?? false,
          reminder_time: settings.reminderTime,
          theme_mode: settings.themeMode || 'dark',
        }, {
          onConflict: 'user_id'
        });

        if (error) {
          console.error('Error migrating settings:', error);
        }
      }

      // Clear old guest data after successful migration
      await AsyncStorage.multiRemove([
        '@sleep_sessions',
        '@journal_entries',
        '@settings',
      ]);

      console.log('Guest data migrated successfully');
    } catch (error) {
      console.error('Error migrating guest data:', error);
    }
  };

  const reloadProfile = async () => {
    if (user && user.id !== 'guest') {
      await loadUserProfile(user.id);
    }
  };

  const saveUserSettings = async (settings: any) => {
    try {
      if (!user || user.id === 'guest' || !session) {
        console.log('Not authenticated - settings saved locally only');
        return;
      }

      // Sync settings to Supabase with correct column names
      const { error } = await supabase.from('user_settings').upsert({
        user_id: session.user.id,
        notifications: settings.notifications ?? true,
        sleep_reminder: settings.sleepReminder ?? false,
        reminder_time: settings.reminderTime,
        theme_mode: settings.themeMode || 'dark',
      }, {
        onConflict: 'user_id'
      });

      if (error) {
        console.error('Error saving user settings to Supabase:', error);
      } else {
        console.log('✅ Settings synced to Supabase successfully');
      }
    } catch (error) {
      console.error('Error saving user settings:', error);
    }
  };

  const value = {
    user,
    profile,
    session,
    isLoading,
    hasCompletedOnboarding,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    completeOnboarding,
    migrateGuestData,
    reloadProfile,
    saveUserSettings,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
