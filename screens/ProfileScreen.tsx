import { useAppTheme } from '../hooks/useAppTheme';
import { getSubscriptionLabel, isPremiumActive } from '../utils/subscriptionHelpers';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  User,
  Moon,
  Flag,
  AlertCircle,
  Calendar,
  Activity,
  Clock,
  Sun,
  Stethoscope,
  Bell,
  Mail,
  ShieldCheck,
  Star,
  Edit2,
  LogIn,
  Smartphone
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format24hTo12h } from '../utils/dateFormatting';


interface OnboardingProfile {
  age?: number;
  gender?: string;
  sleep_goals?: string[];
  sleep_troubles?: string[];
  sleep_pattern?: string;
  average_sleep_hours?: number;
  wake_up_feeling?: string;
  health_conditions?: string[];
  preferred_bed_time?: string;
  preferred_wake_time?: string;
  onboarding_completed_at?: string;
}

interface AuthMetadata {
  provider?: string;
  providers?: string[];
}

interface SessionInfo {
  last_sign_in_at?: string;
  device?: string;
  platform?: string;
}

const SLEEP_GOAL_LABELS: Record<string, string> = {
  fall_asleep_faster: 'Fall asleep faster',
  sleep_longer: 'Sleep longer',
  reduce_stress: 'Reduce stress',
  improve_quality: 'Improve sleep quality',
  wake_refreshed: 'Wake up refreshed',
  establish_routine: 'Establish routine',
};

const SLEEP_TROUBLE_LABELS: Record<string, string> = {
  trouble_falling_asleep: 'Trouble falling asleep',
  wake_during_night: 'Wake up during night',
  wake_too_early: 'Wake up too early',
  not_refreshed: 'Don\'t feel refreshed',
  snoring: 'Snoring',
  anxiety: 'Anxiety/Racing thoughts',
};

const SLEEP_PATTERN_LABELS: Record<string, string> = {
  consistent: 'Very consistent',
  somewhat_consistent: 'Somewhat consistent',
  irregular: 'Irregular schedule',
};

const WAKE_FEELING_LABELS: Record<string, string> = {
  refreshed: 'Refreshed & energized',
  okay: 'Okay, but not great',
  tired: 'Tired & groggy',
  exhausted: 'Exhausted',
};

const HEALTH_CONDITION_LABELS: Record<string, string> = {
  none: 'None',
  sleep_apnea: 'Sleep apnea',
  insomnia: 'Insomnia',
  anxiety: 'Anxiety',
  depression: 'Depression',
  chronic_pain: 'Chronic pain',
  other: 'Other',
};

export default function ProfileScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, reloadProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);
  const [signInMethod, setSignInMethod] = useState<string>('');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  // Load profile data from auth context
  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
      loadOnboardingData();
      loadAuthMetadata();
      loadSessionInfo();
    }
  }, [user]);

  const loadOnboardingData = async () => {
    if (!user || user.id === 'guest') {
      setOnboardingProfile(null);
      setIsLoadingOnboarding(false);
      return;
    }

    setIsLoadingOnboarding(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('age, gender, sleep_goals, sleep_troubles, sleep_pattern, average_sleep_hours, wake_up_feeling, health_conditions, preferred_bed_time, preferred_wake_time, onboarding_completed_at')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading onboarding data:', error);
      } else {
        setOnboardingProfile(data);
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    } finally {
      setIsLoadingOnboarding(false);
    }
  };

  const loadAuthMetadata = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const metadata = session.user.app_metadata as AuthMetadata;
        const provider = metadata?.provider || metadata?.providers?.[0] || 'email';
        setSignInMethod(provider);
      }
    } catch (error) {
      console.error('Error loading auth metadata:', error);
    }
  };

  const loadSessionInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const lastSignIn = session.user.last_sign_in_at;
        setSessionInfo({
          last_sign_in_at: lastSignIn,
          platform: 'Mobile App',
        });
      }
    } catch (error) {
      console.error('Error loading session info:', error);
    }
  };

  const startEditProfile = () => {
    setEditName(user?.full_name || '');
    setEditMode(true);
  };

  const cancelEditProfile = () => {
    setEditName(user?.full_name || '');
    setEditMode(false);
  };

  const saveProfileData = async () => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to update your profile');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: trimmedName })
        .eq('id', user.id);

      if (error) throw error;

      await reloadProfile();

      setEditMode(false);
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatLastSignIn = (timestamp: string | undefined) => {
    if (!timestamp) return 'Unknown';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSignInIcon = () => {
    return Mail;
  };

  const getSignInLabel = () => {
    if (signInMethod === 'google') {
      return 'Google';
    }
    return 'Email/Password';
  };

  const renderProfileHeader = () => {
    return (
      <View style={styles(theme).profileHeader}>
        <View style={styles(theme).profileImageContainer}>
          <View style={styles(theme).profileImagePlaceholder}>
            <User size={50} color={theme.colors.accent} />
          </View>
          <View style={styles(theme).glowRing} />
        </View>
        <Text style={styles(theme).profileHeaderName}>{user?.full_name || 'User'}</Text>
        <Text style={styles(theme).profileHeaderEmail}>{user?.email || ''}</Text>
      </View>
    );
  };

  const renderSleepProfileSection = () => {
    if (!onboardingProfile || !onboardingProfile.onboarding_completed_at) {
      return (
        <BlurView intensity={20} tint="dark" style={styles(theme).emptyCard}>
          <Moon size={48} color={theme.colors.textSecondary} />
          <Text style={styles(theme).emptyCardTitle}>No Sleep Profile Yet</Text>
          <Text style={styles(theme).emptyCardText}>
            Complete the onboarding to set up your personalized sleep profile
          </Text>
        </BlurView>
      );
    }

    return (
      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>Sleep Profile</Text>

        {/* Sleep Goals */}
        {onboardingProfile && onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(0, 255, 209, 0.1)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <Flag size={24} color={theme.colors.accent} />
              <Text style={styles(theme).cardTitle}>Sleep Goals</Text>
            </View>
            <View style={styles(theme).tagContainer}>
              {onboardingProfile.sleep_goals.map((goal) => (
                <View key={goal} style={styles(theme).tag}>
                  <Text style={styles(theme).tagText}>{SLEEP_GOAL_LABELS[goal] || goal}</Text>
                </View>
              ))}
            </View>
          </BlurView>
        )}

        {/* Sleep Troubles */}
        {onboardingProfile.sleep_troubles && onboardingProfile.sleep_troubles.length > 0 && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(255, 107, 157, 0.1)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <AlertCircle size={24} color="#FF6B9D" />
              <Text style={styles(theme).cardTitle}>Sleep Troubles</Text>
            </View>
            <View style={styles(theme).tagContainer}>
              {onboardingProfile.sleep_troubles.map((trouble) => (
                <View key={trouble} style={[styles(theme).tag, styles(theme).troubleTag]}>
                  <Text style={styles(theme).tagText}>{SLEEP_TROUBLE_LABELS[trouble] || trouble}</Text>
                </View>
              ))}
            </View>
          </BlurView>
        )}

        {/* Sleep Pattern */}
        {onboardingProfile.sleep_pattern && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(51, 198, 255, 0.1)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <Calendar size={24} color={theme.colors.highlight} />
              <Text style={styles(theme).cardTitle}>Sleep Pattern</Text>
            </View>
            <View style={styles(theme).infoRow}>
              <Activity size={20} color={theme.colors.highlight} />
              <Text style={styles(theme).infoText}>
                {SLEEP_PATTERN_LABELS[onboardingProfile.sleep_pattern]}
              </Text>
            </View>
          </BlurView>
        )}

        {/* Average Sleep Hours */}
        {onboardingProfile.average_sleep_hours && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(0, 255, 209, 0.1)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <Clock size={24} color={theme.colors.accent} />
              <Text style={styles(theme).cardTitle}>Average Sleep Hours</Text>
            </View>
            <View style={styles(theme).statHighlight}>
              <Text style={styles(theme).statHighlightValue}>{onboardingProfile.average_sleep_hours}</Text>
              <Text style={styles(theme).statHighlightLabel}>hours per night</Text>
            </View>
          </BlurView>
        )}

        {/* Wake Up Feeling */}
        {onboardingProfile.wake_up_feeling && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.1)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <Sun size={24} color={theme.colors.premium} />
              <Text style={styles(theme).cardTitle}>Wake Up Feeling</Text>
            </View>
            <View style={styles(theme).infoRow}>
              <Sun size={20} color={theme.colors.premium} />
              <Text style={styles(theme).infoText}>
                {WAKE_FEELING_LABELS[onboardingProfile.wake_up_feeling]}
              </Text>
            </View>
          </BlurView>
        )}

        {/* Health Conditions */}
        {onboardingProfile.health_conditions && onboardingProfile.health_conditions.length > 0 && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(255, 107, 107, 0.1)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <Stethoscope size={24} color={theme.colors.danger} />
              <Text style={styles(theme).cardTitle}>Health Conditions</Text>
            </View>
            <View style={styles(theme).tagContainer}>
              {onboardingProfile.health_conditions.map((condition) => (
                <View key={condition} style={[styles(theme).tag, styles(theme).healthTag]}>
                  <Text style={styles(theme).tagText}>{HEALTH_CONDITION_LABELS[condition] || condition}</Text>
                </View>
              ))}
            </View>
          </BlurView>
        )}

        {/* Sleep Schedule */}
        {(onboardingProfile.preferred_bed_time || onboardingProfile.preferred_wake_time) && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(51, 198, 255, 0.1)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <Bell size={24} color={theme.colors.highlight} />
              <Text style={styles(theme).cardTitle}>Sleep Schedule</Text>
            </View>
            {onboardingProfile.preferred_bed_time && (
              <View style={styles(theme).infoRow}>
                <Moon size={20} color={theme.colors.accent} />
                <Text style={styles(theme).infoText}>
                  Bedtime: {format24hTo12h(onboardingProfile.preferred_bed_time)}
                </Text>
              </View>
            )}
            {onboardingProfile.preferred_wake_time && (
              <View style={styles(theme).infoRow}>
                <Sun size={20} color={theme.colors.premium} />
                <Text style={styles(theme).infoText}>
                  Wake time: {format24hTo12h(onboardingProfile.preferred_wake_time)}
                </Text>
              </View>
            )}
          </BlurView>
        )}
      </View>
    );
  };

  const renderAccountSection = () => {
    return (
      <View style={styles(theme).section}>
        <Text style={styles(theme).sectionTitle}>Account Details</Text>

        <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
          <LinearGradient
            colors={['rgba(0, 255, 209, 0.05)', 'transparent']}
            style={styles(theme).cardGradient}
          />

          {editMode ? (
            <>
              <TextInput
                style={styles(theme).input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor={theme.colors.textSecondary}
                accessibilityLabel="Name input field"
                accessibilityHint="Enter your full name"
              />
              <View style={styles(theme).profileButtonRow}>
                <TouchableOpacity
                  style={[styles(theme).profileButton, isSaving && styles(theme).disabledButton]}
                  onPress={saveProfileData}
                  disabled={isSaving}
                >
                  <Text style={styles(theme).profileButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles(theme).profileButton, styles(theme).cancelButton]}
                  onPress={cancelEditProfile}
                  disabled={isSaving}
                >
                  <Text style={styles(theme).cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles(theme).profileInfoRow}>
                <User size={24} color={theme.colors.accent} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles(theme).profileLabel}>Full Name</Text>
                  <Text style={styles(theme).profileValue}>{user?.full_name || 'Not set'}</Text>
                </View>
              </View>

              <View style={styles(theme).profileInfoRow}>
                <Mail size={24} color={theme.colors.highlight} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles(theme).profileLabel}>Email</Text>
                  <Text style={styles(theme).profileValue}>{user?.email || 'Not set'}</Text>
                </View>
              </View>

              {/* Sign-in Method */}
              <View style={styles(theme).profileInfoRow}>
                <Mail size={24} color="#9D4EDD" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles(theme).profileLabel}>Sign-in Method</Text>
                  <Text style={styles(theme).profileValue}>{getSignInLabel()}</Text>
                </View>
              </View>

              <View style={styles(theme).profileInfoRow}>
                <ShieldCheck size={24} color={theme.colors.premium} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles(theme).profileLabel}>Subscription</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={styles(theme).profileValue}>
                      {getSubscriptionLabel(user?.subscription_status)}
                    </Text>
                    {isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email) && (
                      <LinearGradient
                        colors={[theme.colors.accent, theme.colors.highlight, '#9D4EDD']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles(theme).premiumBadge}
                      >
                        <Star size={12} color={theme.colors.textPrimary} />
                        <Text style={styles(theme).premiumBadgeText}>PREMIUM</Text>
                      </LinearGradient>
                    )}
                  </View>
                  {user?.subscription_end_date && isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email) && (
                    <Text style={styles(theme).expiryDateText}>
                      Valid until: {new Date(user.subscription_end_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity style={styles(theme).editButton} onPress={startEditProfile}>
                <Edit2 size={20} color="#0F111A" />
                <Text style={styles(theme).editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </BlurView>

        {/* Recent Login Session */}
        {sessionInfo && sessionInfo.last_sign_in_at && (
          <BlurView intensity={20} tint="dark" style={[styles(theme).card, styles(theme).glowCard]}>
            <LinearGradient
              colors={['rgba(51, 198, 255, 0.05)', 'transparent']}
              style={styles(theme).cardGradient}
            />
            <View style={styles(theme).cardHeader}>
              <Clock size={24} color={theme.colors.highlight} />
              <Text style={styles(theme).cardTitle}>Recent Activity</Text>
            </View>
            <View style={styles(theme).infoRow}>
              <LogIn size={20} color={theme.colors.accent} />
              <Text style={styles(theme).infoText}>
                Last login: {formatLastSignIn(sessionInfo.last_sign_in_at)}
              </Text>
            </View>
            {sessionInfo.platform && (
              <View style={styles(theme).infoRow}>
                <Smartphone size={20} color={theme.colors.highlight} />
                <Text style={styles(theme).infoText}>
                  Device: {sessionInfo.platform}
                </Text>
              </View>
            )}
          </BlurView>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(theme).container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.background, '#0A0C14']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles(theme).header}>
        <TouchableOpacity style={styles(theme).backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles(theme).title}>Profile</Text>
        <View style={styles(theme).placeholder} />
      </View>

      <ScrollView
        style={styles(theme).scrollView}
        contentContainerStyle={[
          styles(theme).scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
      >
        {!user ? (
          <BlurView intensity={20} tint="dark" style={styles(theme).emptyCard}>
            <User size={48} color={theme.colors.textSecondary} />
            <Text style={styles(theme).emptyCardTitle}>Sign In Required</Text>
            <Text style={styles(theme).emptyCardText}>
              Please sign in to view and edit your profile
            </Text>
          </BlurView>
        ) : (
          <>
            {/* Profile Header with Image */}
            {renderProfileHeader()}

            {/* Account Section - FIRST */}
            {renderAccountSection()}

            {/* Sleep Profile Section - SECOND (BOTTOM) */}
            {!isLoadingOnboarding && renderSleepProfileSection()}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 10,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.accent,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(27, 29, 42, 0.9)',
    borderWidth: 3,
    borderColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    top: -5,
    left: -5,
    borderWidth: 2,
    borderColor: theme.colors.accent,
    opacity: 0.3,
  },
  profileHeaderName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  profileHeaderEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0,
    overflow: 'hidden',
  },
  glowCard: {
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 1,
  },
  profileLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  profileValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 209, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    backgroundColor: 'rgba(35, 36, 58, 0.5)',
    zIndex: 1,
  },
  profileButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    zIndex: 1,
  },
  profileButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButtonText: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
  editButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    zIndex: 1,
  },
  editButtonText: {
    color: theme.colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    zIndex: 1,
  },
  tag: {
    backgroundColor: 'rgba(0, 255, 209, 0.08)',
    borderWidth: 0,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  troubleTag: {
    backgroundColor: 'rgba(255, 107, 157, 0.08)',
    borderColor: 'rgba(255, 107, 157, 0.15)',
  },
  healthTag: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderColor: 'rgba(255, 107, 107, 0.15)',
  },
  tagText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    zIndex: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  statHighlight: {
    alignItems: 'center',
    paddingVertical: 12,
    zIndex: 1,
  },
  statHighlightValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  statHighlightLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 40,
    borderWidth: 0,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCardText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  expiryDateText: {
    fontSize: 13,
    color: theme.colors.accent,
    marginTop: 6,
    fontWeight: '500',
  },
});
