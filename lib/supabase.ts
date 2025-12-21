import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Fallback to hardcoded values if .env fails to load in production builds
const supabaseUrl = SUPABASE_URL || 'https://wdcgvzeolhpfkuozickj.supabase.co';
const supabaseAnonKey = SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkY2d2emVvbGhwZmt1b3ppY2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDU1MjUsImV4cCI6MjA2OTUyMTUyNX0.ajRMS_q7hoFQgnjXeKMEZoTFYm_jHsKW-xUxXUNBdWk';

// Validate before creating client
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Supabase configuration is missing!');
  throw new Error('Supabase URL and Anon Key are required. Check your build configuration.');
}

console.log('✅ Supabase configured:', supabaseUrl.substring(0, 30) + '...');

// Supabase client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types based on your Supabase schema
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  subscription_status: 'free' | 'premium_monthly' | 'premium_yearly';
  subscription_id: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  preferred_theme: string;
  notifications_enabled: boolean;
  sleep_reminders_enabled: boolean;
  data_export_format: string;
  privacy_analytics: boolean;
  created_at: string;
  updated_at: string;
}

export interface SleepRecord {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  sleep_quality: number | null;
  sleep_sounds_enabled: boolean;
  smart_alarm_enabled: boolean;
  wake_ups: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  notifications: boolean;
  sleep_reminder: boolean;
  reminder_time: string | null;
  sound_notifications: boolean;
  privacy_analytics: boolean;
  data_export_format: string | null;
  theme_mode: string | null;
  created_at: string;
  updated_at: string;
}

export interface SleepJournal {
  id: string;
  user_id: string;
  date: string;
  mood: number | null;
  energy_level: number | null;
  stress_level: number | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'expired' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface MusicCollection {
  id: string;
  name: string;
  description: string | null;
  is_premium: boolean;
  category: string;
  track_count: number;
  is_promotion: boolean;
  created_at: string;
}

export interface MusicTrack {
  id: string;
  collection_id: string;
  name: string;
  description: string | null;
  duration_seconds: number;
  file_url: string;
  is_premium: boolean;
  play_count: number;
  created_at: string;
}

export interface UserMusicFavorite {
  id: string;
  user_id: string;
  track_id: string;
  created_at: string;
}

// Helper functions
export const isPremiumUser = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  return profile.subscription_status === 'premium_monthly' ||
         profile.subscription_status === 'premium_yearly';
};

export const canAccessPremiumContent = (profile: UserProfile | null): boolean => {
  if (!profile) return false;

  // Check if user is premium
  if (!isPremiumUser(profile)) return false;

  // Check if subscription is still valid
  if (profile.subscription_end_date) {
    const endDate = new Date(profile.subscription_end_date);
    return endDate > new Date();
  }

  return false;
};
