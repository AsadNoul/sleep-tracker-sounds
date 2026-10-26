import { useAppTheme } from '../hooks/useAppTheme';
import { getSubscriptionLabel, isPremiumActive } from '../utils/subscriptionHelpers';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
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
  Smartphone,
  Check,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format24hTo12h } from '../utils/dateFormatting';

// Canvas (`Ac-Profile.dc.html` / `D-Ac-Profile.dc.html`): avatar-initial circle +
// Fraunces name + "plan · member since" line, a 3-stat row, a premium CTA card,
// and grouped list rows with trailing chevrons. This screen keeps that visual
// language (avatar, Fraunces display name, grouped `row` list pattern lifted
// from the rebuilt SettingsScreen) but is a back-button detail screen (not a
// tab root), so the bottom nav / achievements / habits grid from the canvas
// don't apply here — the Account + Sleep Profile sections below are
// self-designed in the same system per the standing project instruction,
// since the canvas's Profile page doesn't cover an edit-name flow or an
// onboarding-data summary at all.

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
  const { theme } = useAppTheme();
  const s = styles(theme);
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

  const getSignInLabel = () => {
    if (signInMethod === 'google') {
      return 'Google';
    }
    return 'Email/Password';
  };

  const avatarInitial = (user?.full_name || user?.email || 'U').trim().charAt(0).toUpperCase();
  const isPremium = isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email);

  const renderProfileHeader = () => {
    return (
      <View style={s.profileHeaderRow}>
        <View style={s.avatarCircle}>
          <Text style={s.avatarInitial}>{avatarInitial}</Text>
        </View>
        <View style={s.profileHeaderText}>
          <Text style={s.profileHeaderName} numberOfLines={1}>{user?.full_name || 'User'}</Text>
          <View style={s.profileHeaderMetaRow}>
            <Text style={s.profileHeaderMeta}>{getSubscriptionLabel(user?.subscription_status)}</Text>
            {isPremium && (
              <View style={s.premiumBadge}>
                <Star size={10} color={theme.colors.premium} fill={theme.colors.premium} />
                <Text style={s.premiumBadgeText}>VIP</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSleepProfileSection = () => {
    if (!onboardingProfile || !onboardingProfile.onboarding_completed_at) {
      return (
        <View style={s.emptyCard}>
          <Moon size={40} color={theme.colors.textTertiary} />
          <Text style={s.emptyCardTitle}>No Sleep Profile Yet</Text>
          <Text style={s.emptyCardText}>
            Complete the onboarding to set up your personalized sleep profile
          </Text>
        </View>
      );
    }

    return (
      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>Sleep Profile</Text>

        {/* Sleep Goals */}
        {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.accentLight }]}>
                <Flag size={18} color={theme.colors.accent} />
              </View>
              <Text style={s.cardTitle}>Sleep Goals</Text>
            </View>
            <View style={s.tagContainer}>
              {onboardingProfile.sleep_goals.map((goal) => (
                <View key={goal} style={s.tag}>
                  <Text style={s.tagText}>{SLEEP_GOAL_LABELS[goal] || goal}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sleep Troubles */}
        {onboardingProfile.sleep_troubles && onboardingProfile.sleep_troubles.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.cardOverlay }]}>
                <AlertCircle size={18} color={theme.colors.danger} />
              </View>
              <Text style={s.cardTitle}>Sleep Troubles</Text>
            </View>
            <View style={s.tagContainer}>
              {onboardingProfile.sleep_troubles.map((trouble) => (
                <View key={trouble} style={[s.tag, s.troubleTag]}>
                  <Text style={[s.tagText, { color: theme.colors.danger }]}>{SLEEP_TROUBLE_LABELS[trouble] || trouble}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sleep Pattern */}
        {onboardingProfile.sleep_pattern && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.highlightLight }]}>
                <Calendar size={18} color={theme.colors.highlight} />
              </View>
              <Text style={s.cardTitle}>Sleep Pattern</Text>
            </View>
            <View style={s.infoRow}>
              <Activity size={16} color={theme.colors.highlight} />
              <Text style={s.infoText}>
                {SLEEP_PATTERN_LABELS[onboardingProfile.sleep_pattern]}
              </Text>
            </View>
          </View>
        )}

        {/* Average Sleep Hours */}
        {onboardingProfile.average_sleep_hours && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.accentLight }]}>
                <Clock size={18} color={theme.colors.accent} />
              </View>
              <Text style={s.cardTitle}>Average Sleep Hours</Text>
            </View>
            <View style={s.statHighlight}>
              <Text style={s.statHighlightValue}>{onboardingProfile.average_sleep_hours}</Text>
              <Text style={s.statHighlightLabel}>hours per night</Text>
            </View>
          </View>
        )}

        {/* Wake Up Feeling */}
        {onboardingProfile.wake_up_feeling && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.premiumBadgeBackground }]}>
                <Sun size={18} color={theme.colors.premium} />
              </View>
              <Text style={s.cardTitle}>Wake Up Feeling</Text>
            </View>
            <View style={s.infoRow}>
              <Sun size={16} color={theme.colors.premium} />
              <Text style={s.infoText}>
                {WAKE_FEELING_LABELS[onboardingProfile.wake_up_feeling]}
              </Text>
            </View>
          </View>
        )}

        {/* Health Conditions */}
        {onboardingProfile.health_conditions && onboardingProfile.health_conditions.length > 0 && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.cardOverlay }]}>
                <Stethoscope size={18} color={theme.colors.danger} />
              </View>
              <Text style={s.cardTitle}>Health Conditions</Text>
            </View>
            <View style={s.tagContainer}>
              {onboardingProfile.health_conditions.map((condition) => (
                <View key={condition} style={[s.tag, s.healthTag]}>
                  <Text style={[s.tagText, { color: theme.colors.danger }]}>{HEALTH_CONDITION_LABELS[condition] || condition}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sleep Schedule */}
        {(onboardingProfile.preferred_bed_time || onboardingProfile.preferred_wake_time) && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.highlightLight }]}>
                <Bell size={18} color={theme.colors.highlight} />
              </View>
              <Text style={s.cardTitle}>Sleep Schedule</Text>
            </View>
            {onboardingProfile.preferred_bed_time && (
              <View style={s.infoRow}>
                <Moon size={16} color={theme.colors.accent} />
                <Text style={s.infoText}>
                  Bedtime: {format24hTo12h(onboardingProfile.preferred_bed_time)}
                </Text>
              </View>
            )}
            {onboardingProfile.preferred_wake_time && (
              <View style={s.infoRow}>
                <Sun size={16} color={theme.colors.premium} />
                <Text style={s.infoText}>
                  Wake time: {format24hTo12h(onboardingProfile.preferred_wake_time)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderAccountSection = () => {
    return (
      <View style={s.sectionBlock}>
        <Text style={s.sectionLabel}>Account Details</Text>

        {editMode ? (
          <View style={s.card}>
            <Text style={s.inputLabel}>Full Name</Text>
            <TextInput
              style={s.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textTertiary}
              accessibilityLabel="Name input field"
              accessibilityHint="Enter your full name"
            />
            <View style={s.editButtonRow}>
              <TouchableOpacity
                style={[s.primaryButton, isSaving && s.disabledButton]}
                onPress={saveProfileData}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.ctaText} size="small" />
                ) : (
                  <>
                    <Check size={16} color={theme.colors.ctaText} />
                    <Text style={s.primaryButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={s.secondaryButton}
                onPress={cancelEditProfile}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                <X size={16} color={theme.colors.textPrimary} />
                <Text style={s.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={s.groupCard}>
            <View style={s.row}>
              <View style={s.rowIconWrapper}>
                <User size={18} color={theme.colors.accent} />
              </View>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Full Name</Text>
                <Text style={s.rowValue}>{user?.full_name || 'Not set'}</Text>
              </View>
              <TouchableOpacity onPress={startEditProfile} style={s.rowEditButton} accessibilityLabel="Edit profile">
                <Edit2 size={16} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>
            <View style={s.rowDivider} />

            <View style={s.row}>
              <View style={s.rowIconWrapper}>
                <Mail size={18} color={theme.colors.highlight} />
              </View>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Email</Text>
                <Text style={s.rowValue}>{user?.email || 'Not set'}</Text>
              </View>
            </View>
            <View style={s.rowDivider} />

            <View style={s.row}>
              <View style={s.rowIconWrapper}>
                <LogIn size={18} color={theme.colors.highlight} />
              </View>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Sign-in Method</Text>
                <Text style={s.rowValue}>{getSignInLabel()}</Text>
              </View>
            </View>
            <View style={s.rowDivider} />

            <View style={[s.row, s.rowLast]}>
              <View style={s.rowIconWrapper}>
                <ShieldCheck size={18} color={theme.colors.premium} />
              </View>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Subscription</Text>
                <View style={s.subscriptionValueRow}>
                  <Text style={s.rowValue}>
                    {getSubscriptionLabel(user?.subscription_status)}
                  </Text>
                  {isPremium && (
                    <View style={s.premiumBadge}>
                      <Star size={10} color={theme.colors.premium} fill={theme.colors.premium} />
                      <Text style={s.premiumBadgeText}>VIP</Text>
                    </View>
                  )}
                </View>
                {user?.subscription_end_date && isPremium && (
                  <Text style={s.expiryDateText}>
                    Valid until: {new Date(user.subscription_end_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Recent Login Session */}
        {sessionInfo && sessionInfo.last_sign_in_at && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.cardIconWrapper, { backgroundColor: theme.colors.highlightLight }]}>
                <Clock size={18} color={theme.colors.highlight} />
              </View>
              <Text style={s.cardTitle}>Recent Activity</Text>
            </View>
            <View style={s.infoRow}>
              <LogIn size={16} color={theme.colors.accent} />
              <Text style={s.infoText}>
                Last login: {formatLastSignIn(sessionInfo.last_sign_in_at)}
              </Text>
            </View>
            {sessionInfo.platform && (
              <View style={s.infoRow}>
                <Smartphone size={16} color={theme.colors.highlight} />
                <Text style={s.infoText}>
                  Device: {sessionInfo.platform}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity style={s.backButton} onPress={() => navigation.goBack()} accessibilityLabel="Back">
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Profile</Text>
        <View style={s.placeholder} />
      </View>

      <ScrollView
        style={s.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
      >
        {!user ? (
          <View style={s.emptyCard}>
            <User size={40} color={theme.colors.textTertiary} />
            <Text style={s.emptyCardTitle}>Sign In Required</Text>
            <Text style={s.emptyCardText}>
              Please sign in to view and edit your profile
            </Text>
          </View>
        ) : (
          <>
            {/* Profile Header with Avatar */}
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
    columnGap: 12,
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    letterSpacing: -0.2,
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Profile header (canvas-matched: avatar initial + Fraunces name + plan line)
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.navActiveBackground,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    color: theme.colors.textPrimary,
  },
  profileHeaderText: {
    flex: 1,
    rowGap: 2,
  },
  profileHeaderName: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 22,
    letterSpacing: -0.2,
    color: theme.colors.textPrimary,
  },
  profileHeaderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  profileHeaderMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
  },

  // Section wrapper (self-designed, matches SettingsScreen's sectionBlock/sectionLabel)
  sectionBlock: {
    rowGap: 12,
    marginBottom: 20,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textTertiary,
  },

  // Grouped list rows (lifted from SettingsScreen's groupCard/row pattern)
  groupCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingVertical: 12,
  },
  rowLast: {},
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  rowIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowTextBlock: {
    flex: 1,
    rowGap: 2,
  },
  rowLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  rowValue: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  rowEditButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },

  // Generic card (sleep profile + recent activity + edit form)
  card: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginBottom: 14,
  },
  cardIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },

  // Edit-name form
  inputLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 16,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  editButtonRow: {
    flexDirection: 'row',
    columnGap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: theme.colors.ctaBackground,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.ctaText,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: theme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryButtonText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Tags (sleep goals / troubles / health conditions)
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 8,
  },
  tag: {
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  troubleTag: {
    backgroundColor: theme.colors.cardOverlay,
    borderColor: theme.colors.danger,
  },
  healthTag: {
    backgroundColor: theme.colors.cardOverlay,
    borderColor: theme.colors.danger,
  },
  tagText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.accent,
  },

  // Info row (single stat / fact line within a card)
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },

  // Average sleep hours highlight
  statHighlight: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statHighlightValue: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 40,
    color: theme.colors.accent,
    marginBottom: 2,
  },
  statHighlightLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
  },

  // Empty states (no user / no onboarding profile)
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyCardTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCardText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Premium / VIP badge (canvas-matched color system)
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.premiumBadgeBackground,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    columnGap: 3,
  },
  premiumBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.premiumBadgeText,
    letterSpacing: 0.4,
  },
  expiryDateText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.accent,
    marginTop: 4,
  },
});
