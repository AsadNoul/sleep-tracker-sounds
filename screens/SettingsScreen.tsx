import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Share,
    Modal,
    ActivityIndicator,
    Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ChevronLeft,
    ChevronRight,
    Moon,
    User,
    Star,
    Bell,
    Activity,
    Info,
    LogOut,
    Trash2,
    Headphones,
    Heart,
    X,
    CreditCard,
    RotateCcw,
    Shield,
    LifeBuoy,
    BadgeCheck,
    RefreshCw,
    Share2,
    Download,
    LayoutDashboard,
    Cake,
    Clock,
    Sunrise,
    Sunset,
    Target,
    AlertCircle,
    Stethoscope,
    CalendarCheck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../hooks/useAppTheme';
import GuestBanner from '../components/GuestBanner';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import revenueCatService from '../services/revenueCatService';

type RootStackParamList = {
    Main: undefined;
    SleepSession: undefined;
    Subscription: undefined;
    HelpSupport: undefined;
    PrivacySettings: undefined;
    Profile: undefined;
    About: undefined;
    NotificationSettings: undefined;
    TrackingSettings: undefined;
};

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

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
    { mode: 'sunset', label: 'By sunset' },
    { mode: 'night', label: 'Sleep Mode' },
    { mode: 'day', label: 'Day View' },
];

// Onboarding stores raw option ids (e.g. "somewhat_consistent"); map them
// back to their display labels from OnboardingScreen's option lists.
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

const SLEEP_GOAL_LABELS: Record<string, string> = {
    fall_asleep_faster: 'Fall asleep faster',
    sleep_longer: 'Sleep longer',
    reduce_stress: 'Reduce stress',
    improve_quality: 'Improve sleep quality',
    wake_refreshed: 'Wake up refreshed',
    establish_routine: 'Establish routine',
    shift_work_support: 'Manage shift work',
    recovery: 'Better recovery',
};

const SLEEP_TROUBLE_LABELS: Record<string, string> = {
    trouble_falling_asleep: 'Trouble falling asleep',
    wake_during_night: 'Wake up during night',
    wake_too_early: 'Wake up too early',
    not_refreshed: "Don't feel refreshed",
    snoring: 'Snoring',
    anxiety: 'Anxiety/Racing thoughts',
    shift_work: 'Shift work sleep issues',
    irregular_schedule: 'Irregular work schedule',
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

const humanizeId = (id: string) =>
    id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const SettingsScreen = () => {
    const { theme } = useAppTheme();
    const s = styles(theme);
    const insets = useSafeAreaInsets();
    const bottomMargin = useSafeBottomMargin();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    // Real 3-way theme API — 'sunset' follows sunrise/sunset automatically,
    // 'night'/'day' pin the theme. nextSwitchLabel is only populated in
    // 'sunset' mode and describes the next automatic flip.
    const { themeMode, setThemeMode, nextSwitchLabel } = useTheme();
    const { signOut, deleteAccount, user, saveUserSettings } = useAuth();

    const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        onConfirmText?: string;
        isDestructive?: boolean;
    } | null>(null);
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null);
    const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
    const [showSleepProfileModal, setShowSleepProfileModal] = useState(false);
    const [showVipSupportModal, setShowVipSupportModal] = useState(false);

    // Load onboarding profile data
    useEffect(() => {
        if (user) {
            loadOnboardingData();
            fetchSubscriptionExpiry();
        }
    }, [user]);

    const fetchSubscriptionExpiry = async () => {
        try {
            const isAdmin = user?.email === 'admin@naulx.com' || user?.role === 'admin';
            if (isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email) && !isAdmin) {
                const date = await revenueCatService.getExpirationDate();
                if (date) {
                    setSubscriptionExpiry(date.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching subscription expiry:', error);
        }
    };

    const loadOnboardingData = async () => {
        if (!user || user.id === 'guest') {
            setOnboardingProfile(null);
            setIsLoadingProfile(false);
            return;
        }

        setIsLoadingProfile(true);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('age, gender, sleep_goals, sleep_troubles, sleep_pattern, average_sleep_hours, wake_up_feeling, health_conditions, preferred_bed_time, preferred_wake_time, onboarding_completed_at')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error loading onboarding data:', error);
                // Offline fallback: try cached onboarding profile
                const cached = await AsyncStorage.getItem('@cached_onboarding_profile');
                if (cached) setOnboardingProfile(JSON.parse(cached));
            } else {
                setOnboardingProfile(data);
                // Cache for offline use
                AsyncStorage.setItem('@cached_onboarding_profile', JSON.stringify(data)).catch(() => {});
            }
        } catch (error) {
            console.error('Error loading onboarding data:', error);
            // Offline fallback
            try {
                const cached = await AsyncStorage.getItem('@cached_onboarding_profile');
                if (cached) setOnboardingProfile(JSON.parse(cached));
            } catch {}
        } finally {
            setIsLoadingProfile(false);
        }
    };

    const navigateToSubscription = () => navigation.navigate('Subscription');
    const navigateToPrivacySettings = () => navigation.navigate('PrivacySettings');
    const navigateToHelpSupport = () => navigation.navigate('HelpSupport');
    const navigateToProfile = () => navigation.navigate('Profile');
    const navigateToAbout = () => navigation.navigate('About');
    const navigateToNotificationSettings = () => navigation.navigate('NotificationSettings');
    const navigateToTrackingSettings = () => navigation.navigate('TrackingSettings');

    const handleExportData = async () => {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const result = await AsyncStorage.multiGet(keys);
            const exportData: Record<string, any> = {};
            result.forEach(([key, value]) => {
                try { exportData[key] = value ? JSON.parse(value) : value; }
                catch { exportData[key] = value; }
            });

            const jsonData = JSON.stringify(exportData, null, 2);
            await Share.share({
                message: `Nightprint Data Export\nExported: ${new Date().toLocaleString()}\n\n${jsonData}`,
                title: 'Nightprint Data Export',
            });
            Alert.alert('Success', 'Your data has been prepared for export.');
        } catch (error) {
            Alert.alert('Error', 'Failed to export data.');
        }
    }

    const handleCheckUpdates = async () => {
        setIsCheckingUpdates(true);
        try {
            const updateService = (await import('../services/updateService')).default;
            const updateInfo = await updateService.checkForUpdates();

            if (updateInfo.isAvailable) {
                Alert.alert(
                    'Update Available',
                    'A new version is available. Update now?',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Update Now', onPress: () => updateService.downloadAndApplyUpdate() }
                    ]
                );
            } else {
                Alert.alert('Up to Date', 'You are running the latest version.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to check for updates.');
        } finally {
            setIsCheckingUpdates(false);
        }
    };

    const handleShareApp = async () => {
        // No App Store listing yet — Play Store is the only live store link.
        const shareMessage = 'Check out Nightprint! Optimize your sleep with AI insights. https://play.google.com/store/apps/details?id=com.sleeptracker.app';
        await Share.share({ message: shareMessage, title: 'Nightprint' });
    };

    const handleRestorePurchases = async () => {
        if (user?.id === 'guest') {
            Alert.alert('Sign In Required', 'Please sign in to restore your purchases.');
            return;
        }
        setIsRestoringPurchases(true);
        try {
            const customerInfo = await revenueCatService.restorePurchases();
            const hasPremium = customerInfo?.entitlements?.active?.['premium'];
            if (hasPremium) {
                Alert.alert('Purchases Restored', 'Your subscription has been successfully restored. Enjoy Nightprint VIP!');
                await fetchSubscriptionExpiry();
            } else {
                Alert.alert('No Active Subscription', 'No active subscription was found for this account. If you believe this is an error, please contact support.');
            }
        } catch (error: any) {
            Alert.alert('Restore Failed', error?.message || 'Unable to restore purchases. Please try again or contact support.');
        } finally {
            setIsRestoringPurchases(false);
        }
    };

    const handleOpenVipSupport = async (type: 'telegram' | 'whatsapp') => {
        const urls: Record<string, string> = {
            telegram: 'https://t.me/asadnoul',
            whatsapp: 'https://wa.me/971588983997',
        };
        const url = urls[type];
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'Cannot open this link on your device.');
            }
        } catch {
            Alert.alert('Error', 'Failed to open support link.');
        }
    };

    const showConfirm = (config: any) => {
        setConfirmConfig(config);
        setConfirmModalVisible(true);
    };

    const handleSignOut = () => {
        showConfirm({
            title: 'Log Out',
            message: 'Are you sure you want to log out?',
            isDestructive: true,
            onConfirmText: 'Log Out',
            onConfirm: async () => {
                try { await signOut(); }
                catch (error) { Alert.alert('Error', 'Failed to log out.'); }
            },
        });
    };

    const handleDeleteAccount = () => {
        if (user?.id === 'guest') {
            Alert.alert('Guest Mode', 'Create an account to access data deletion.');
            return;
        }

        showConfirm({
            title: 'Delete Account',
            message: 'This will permanently delete your account and all data. This action cannot be undone. Are you sure?',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await deleteAccount();
                    Alert.alert('Success', 'Your account has been deleted.');
                } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to delete account.');
                }
            },
        });
    };

    const isPremium = isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email);
    const isAdmin = user?.email === 'admin@naulx.com';

    const renderSleepProfileHeader = () => {
        if (!onboardingProfile || !onboardingProfile.onboarding_completed_at) {
            return (
                <TouchableOpacity
                    style={s.sleepProfileCard}
                    onPress={() => navigation.navigate('Profile')}
                    activeOpacity={0.85}
                >
                    <View style={[s.profileIconWrapper, { backgroundColor: theme.colors.accentLight }]}>
                        <User size={22} color={theme.colors.accent} />
                    </View>
                    <View style={s.sleepProfileTextBlock}>
                        <Text style={s.sleepProfileTitle}>Complete Profile</Text>
                        <Text style={s.sleepProfileSubtitle}>Personalize your journey</Text>
                    </View>
                    <ChevronRight size={20} color={theme.colors.textTertiary} />
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={s.sleepProfileCard}
                onPress={() => setShowSleepProfileModal(true)}
                activeOpacity={0.85}
            >
                <View style={[s.profileIconWrapper, { backgroundColor: theme.colors.accentLight }]}>
                    <Moon size={22} color={theme.colors.accent} />
                </View>
                <View style={s.sleepProfileTextBlock}>
                    <View style={s.sleepProfileTitleRow}>
                        <Text style={s.sleepProfileTitle}>Sleep Profile</Text>
                        <View style={s.activeBadge}>
                            <View style={s.activeDot} />
                            <Text style={s.activeBadgeText}>Active</Text>
                        </View>
                    </View>
                    <Text style={s.sleepProfileSubtitle}>
                        {onboardingProfile.age ? `${onboardingProfile.age}y • ` : ''}
                        {onboardingProfile.average_sleep_hours ? `${onboardingProfile.average_sleep_hours}h avg • ` : ''}
                        {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 ? `${onboardingProfile.sleep_goals.length} goals` : 'Set goals'}
                    </Text>
                </View>
                <ChevronRight size={20} color={theme.colors.accent} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={[s.container, { backgroundColor: theme.colors.background }]}>
            <ScrollView
                style={s.content}
                contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: bottomMargin }}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} accessibilityLabel="Back">
                        <ChevronLeft size={20} color={theme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={s.title}>Settings</Text>
                </View>

                <GuestBanner />

                {!isLoadingProfile && renderSleepProfileHeader()}

                {/* Look — theme mode picker */}
                <View style={s.sectionBlock}>
                    <Text style={s.sectionLabel}>Look</Text>
                    <View style={s.lookCard}>
                        <View style={s.themeRadioGroup} accessibilityRole="radiogroup">
                            {THEME_OPTIONS.map((option) => {
                                const selected = themeMode === option.mode;
                                return (
                                    <TouchableOpacity
                                        key={option.mode}
                                        style={[s.themeRadioButton, selected && s.themeRadioButtonSelected]}
                                        onPress={() => setThemeMode(option.mode)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ selected }}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={[s.themeRadioLabel, selected && s.themeRadioLabelSelected]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {themeMode === 'sunset' && nextSwitchLabel ? (
                            <Text style={s.lookHint}>{nextSwitchLabel}</Text>
                        ) : (
                            <Text style={s.lookHint}>
                                {themeMode === 'night' ? 'Sleep Mode is always on' : 'Day View is always on'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Account */}
                <View style={s.sectionBlock}>
                    <View style={s.sectionLabelRow}>
                        <Text style={s.sectionLabel}>Account</Text>
                        {isPremium && (
                            <View style={s.vipBadge}>
                                <Star size={10} color={theme.colors.premium} fill={theme.colors.premium} />
                                <Text style={s.vipBadgeText}>VIP</Text>
                            </View>
                        )}
                    </View>
                    <View style={s.groupCard}>
                        <TouchableOpacity style={s.row} onPress={navigateToProfile} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <User size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Your Profile</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={navigateToNotificationSettings} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <Bell size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Notifications</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={navigateToTrackingSettings} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <Activity size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Tracking</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={navigateToSubscription} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <CreditCard size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Subscription</Text>
                            <View style={s.rowValueGroup}>
                                <Text style={s.rowValue}>
                                    {isPremium ? (subscriptionExpiry ? `Renews ${subscriptionExpiry}` : 'VIP') : 'Free'}
                                </Text>
                                <ChevronRight size={18} color={theme.colors.textSecondary} />
                            </View>
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={handleRestorePurchases} disabled={isRestoringPurchases} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <RotateCcw size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Restore Purchases</Text>
                            {isRestoringPurchases ? (
                                <ActivityIndicator size="small" color={theme.colors.accent} />
                            ) : (
                                <ChevronRight size={18} color={theme.colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={[s.row, s.rowLast]} onPress={navigateToPrivacySettings} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <Shield size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Privacy & data</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Others */}
                <View style={s.sectionBlock}>
                    <Text style={s.sectionLabel}>Others</Text>
                    <View style={s.groupCard}>
                        <TouchableOpacity style={s.row} onPress={navigateToHelpSupport} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <LifeBuoy size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Help & support</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={() => setShowVipSupportModal(true)} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <BadgeCheck size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>VIP Support</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={navigateToAbout} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <Info size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>About</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={handleCheckUpdates} disabled={isCheckingUpdates} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <RefreshCw size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Check for updates</Text>
                            {isCheckingUpdates ? (
                                <ActivityIndicator size="small" color={theme.colors.accent} />
                            ) : (
                                <ChevronRight size={18} color={theme.colors.textSecondary} />
                            )}
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={handleShareApp} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <Share2 size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Share Application</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

                        <TouchableOpacity style={s.row} onPress={handleExportData} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <Download size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Export My Data</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>

                        {isAdmin && (
                            <>
                                <View style={s.rowDivider} />
                                <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Admin' as never)} activeOpacity={0.6}>
                                    <View style={s.rowIconChip}>
                                        <LayoutDashboard size={16} color={theme.colors.accent} />
                                    </View>
                                    <Text style={[s.rowLabel, s.rowLabelGrow]}>Admin Dashboard</Text>
                                    <ChevronRight size={18} color={theme.colors.textSecondary} />
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={s.rowDivider} />
                        <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleDeleteAccount} activeOpacity={0.6}>
                            <View style={[s.rowIconChip, s.rowIconChipDanger]}>
                                <Trash2 size={16} color={theme.colors.danger} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow, { color: theme.colors.danger }]}>Delete Account</Text>
                            <ChevronRight size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Log out */}
                <TouchableOpacity style={s.logOutButton} onPress={handleSignOut} activeOpacity={0.85}>
                    <LogOut size={18} color={theme.colors.danger} />
                    <Text style={s.logOutText}>Log out</Text>
                </TouchableOpacity>

                <View style={s.bottomSpacing} />
            </ScrollView>

            {/* Confirmation Modal */}
            <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.confirmContent}>
                        <View style={s.confirmHeader}>
                            {confirmConfig?.isDestructive ? <Trash2 size={36} color={theme.colors.danger} /> : <Info size={36} color={theme.colors.accent} />}
                            <Text style={s.confirmTitle}>{confirmConfig?.title}</Text>
                            <Text style={s.confirmMessage}>{confirmConfig?.message}</Text>
                        </View>
                        <View style={s.confirmActions}>
                            <TouchableOpacity style={s.confirmCancelButton} onPress={() => setConfirmModalVisible(false)}>
                                <Text style={s.confirmCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.confirmConfirmButton, confirmConfig?.isDestructive && { backgroundColor: theme.colors.danger }]}
                                onPress={() => { setConfirmModalVisible(false); confirmConfig?.onConfirm(); }}
                            >
                                <Text style={s.confirmConfirmText}>{confirmConfig?.onConfirmText || (confirmConfig?.isDestructive ? 'Delete' : 'Confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Sleep Profile Modal */}
            <Modal visible={showSleepProfileModal} transparent animationType="slide" onRequestClose={() => setShowSleepProfileModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.sleepModalContent}>
                        <View style={s.sleepModalHandle} />

                        <LinearGradient
                            colors={[theme.colors.accent, theme.colors.highlight]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={s.sleepModalHero}
                        >
                            <TouchableOpacity onPress={() => setShowSleepProfileModal(false)} style={s.sleepModalClose}>
                                <X size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <View style={s.sleepModalHeroIcon}>
                                <Moon size={26} color="#FFFFFF" />
                            </View>
                            <Text style={s.sleepModalHeroTitle}>Sleep Profile</Text>
                            {onboardingProfile?.onboarding_completed_at && (
                                <Text style={s.sleepModalHeroSubtitle}>
                                    Since {new Date(onboardingProfile.onboarding_completed_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                                </Text>
                            )}
                        </LinearGradient>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={s.sleepModalScroll}
                            contentContainerStyle={s.sleepModalScrollContent}
                        >
                            {onboardingProfile ? (
                                <View style={{ rowGap: 20 }}>
                                    {(onboardingProfile.age || onboardingProfile.gender || onboardingProfile.average_sleep_hours || onboardingProfile.sleep_pattern || onboardingProfile.wake_up_feeling) && (
                                        <View style={s.sleepInfoCard}>
                                            {onboardingProfile.age ? (
                                                <View style={s.sleepInfoRow}>
                                                    <View style={s.sleepInfoIcon}>
                                                        <Cake size={16} color={theme.colors.accent} />
                                                    </View>
                                                    <Text style={s.sleepInfoLabel}>Age</Text>
                                                    <Text style={s.sleepInfoValue}>{onboardingProfile.age}</Text>
                                                </View>
                                            ) : null}
                                            {onboardingProfile.gender ? (
                                                <>
                                                    <View style={s.sleepInfoDivider} />
                                                    <View style={s.sleepInfoRow}>
                                                        <View style={s.sleepInfoIcon}>
                                                            <User size={16} color={theme.colors.accent} />
                                                        </View>
                                                        <Text style={s.sleepInfoLabel}>Gender</Text>
                                                        <Text style={s.sleepInfoValue}>{onboardingProfile.gender}</Text>
                                                    </View>
                                                </>
                                            ) : null}
                                            {onboardingProfile.average_sleep_hours ? (
                                                <>
                                                    <View style={s.sleepInfoDivider} />
                                                    <View style={s.sleepInfoRow}>
                                                        <View style={s.sleepInfoIcon}>
                                                            <Clock size={16} color={theme.colors.accent} />
                                                        </View>
                                                        <Text style={s.sleepInfoLabel}>Avg Sleep</Text>
                                                        <Text style={s.sleepInfoValue}>{onboardingProfile.average_sleep_hours}h</Text>
                                                    </View>
                                                </>
                                            ) : null}
                                            {onboardingProfile.sleep_pattern ? (
                                                <>
                                                    <View style={s.sleepInfoDivider} />
                                                    <View style={s.sleepInfoRow}>
                                                        <View style={s.sleepInfoIcon}>
                                                            <Activity size={16} color={theme.colors.accent} />
                                                        </View>
                                                        <Text style={s.sleepInfoLabel}>Pattern</Text>
                                                        <Text style={s.sleepInfoValue}>{SLEEP_PATTERN_LABELS[onboardingProfile.sleep_pattern] || humanizeId(onboardingProfile.sleep_pattern)}</Text>
                                                    </View>
                                                </>
                                            ) : null}
                                            {onboardingProfile.wake_up_feeling ? (
                                                <>
                                                    <View style={s.sleepInfoDivider} />
                                                    <View style={s.sleepInfoRow}>
                                                        <View style={s.sleepInfoIcon}>
                                                            <Sunrise size={16} color={theme.colors.accent} />
                                                        </View>
                                                        <Text style={s.sleepInfoLabel}>Wakes Feeling</Text>
                                                        <Text style={s.sleepInfoValue}>{WAKE_FEELING_LABELS[onboardingProfile.wake_up_feeling] || humanizeId(onboardingProfile.wake_up_feeling)}</Text>
                                                    </View>
                                                </>
                                            ) : null}
                                        </View>
                                    )}

                                    {(onboardingProfile.preferred_bed_time || onboardingProfile.preferred_wake_time) && (
                                        <View style={s.sleepScheduleRow}>
                                            {onboardingProfile.preferred_bed_time ? (
                                                <View style={s.sleepScheduleCard}>
                                                    <View style={[s.sleepScheduleIcon, { backgroundColor: theme.colors.accentLight }]}>
                                                        <Sunset size={18} color={theme.colors.accent} />
                                                    </View>
                                                    <Text style={s.sleepScheduleLabel}>Bedtime</Text>
                                                    <Text style={s.sleepScheduleValue}>{onboardingProfile.preferred_bed_time}</Text>
                                                </View>
                                            ) : null}
                                            {onboardingProfile.preferred_wake_time ? (
                                                <View style={s.sleepScheduleCard}>
                                                    <View style={[s.sleepScheduleIcon, { backgroundColor: theme.colors.highlightLight }]}>
                                                        <Sunrise size={18} color={theme.colors.highlight} />
                                                    </View>
                                                    <Text style={s.sleepScheduleLabel}>Wake Time</Text>
                                                    <Text style={s.sleepScheduleValue}>{onboardingProfile.preferred_wake_time}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    )}

                                    {((onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0) ||
                                        (onboardingProfile.sleep_troubles && onboardingProfile.sleep_troubles.length > 0)) && (
                                        <View style={s.sleepTagRow}>
                                            {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 && (
                                                <View style={s.sleepTagCard}>
                                                    <View style={s.sleepTagSectionHeader}>
                                                        <Target size={14} color={theme.colors.accent} />
                                                        <Text style={s.sleepTagSectionTitle}>Sleep Goals</Text>
                                                    </View>
                                                    <View style={s.profileTagList}>
                                                        {onboardingProfile.sleep_goals.map((goal, i) => (
                                                            <View key={i} style={s.profileTag}>
                                                                <Text style={s.profileTagText}>{SLEEP_GOAL_LABELS[goal] || humanizeId(goal)}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )}

                                            {onboardingProfile.sleep_troubles && onboardingProfile.sleep_troubles.length > 0 && (
                                                <View style={s.sleepTagCard}>
                                                    <View style={s.sleepTagSectionHeader}>
                                                        <AlertCircle size={14} color={theme.colors.danger} />
                                                        <Text style={[s.sleepTagSectionTitle, { color: theme.colors.danger }]}>Sleep Troubles</Text>
                                                    </View>
                                                    <View style={s.profileTagList}>
                                                        {onboardingProfile.sleep_troubles.map((trouble, i) => (
                                                            <View key={i} style={[s.profileTag, s.profileTagDanger]}>
                                                                <Text style={[s.profileTagText, { color: theme.colors.danger }]}>{SLEEP_TROUBLE_LABELS[trouble] || humanizeId(trouble)}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {onboardingProfile.health_conditions && onboardingProfile.health_conditions.length > 0 && (
                                        <View style={s.sleepTagCard}>
                                            <View style={s.sleepTagSectionHeader}>
                                                <Stethoscope size={14} color={theme.colors.premium} />
                                                <Text style={[s.sleepTagSectionTitle, { color: theme.colors.premium }]}>Health Notes</Text>
                                            </View>
                                            <View style={s.profileTagList}>
                                                {onboardingProfile.health_conditions.map((cond, i) => (
                                                    <View key={i} style={[s.profileTag, s.profileTagPremium]}>
                                                        <Text style={[s.profileTagText, { color: theme.colors.premium }]}>{HEALTH_CONDITION_LABELS[cond] || humanizeId(cond)}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {onboardingProfile.onboarding_completed_at && (
                                        <View style={s.sleepCompletedRow}>
                                            <CalendarCheck size={13} color={theme.colors.textTertiary} />
                                            <Text style={s.profileCompletedAt}>
                                                Profile created {new Date(onboardingProfile.onboarding_completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <Text style={s.profileEmptyText}>No profile data found.</Text>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={s.sleepModalDone} onPress={() => setShowSleepProfileModal(false)} activeOpacity={0.85}>
                            <Text style={s.profileModalDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* VIP Support Modal */}
            <Modal visible={showVipSupportModal} transparent animationType="slide" onRequestClose={() => setShowVipSupportModal(false)}>
                <View style={s.modalOverlay}>
                    <View style={s.profileModalContent}>
                        <View style={s.profileModalHeader}>
                            <View style={s.profileModalHeaderLeft}>
                                <View style={[s.profileIconWrapper, { backgroundColor: theme.colors.premiumBadgeBackground }]}>
                                    <Star size={18} color={theme.colors.premium} fill={theme.colors.premium} />
                                </View>
                                <Text style={s.profileModalTitle}>VIP Support</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowVipSupportModal(false)} style={s.profileModalClose}>
                                <X size={18} color={theme.colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={s.vipModalSubtitle}>
                            Reach us directly for priority assistance. We typically respond within a few hours.
                        </Text>

                        <TouchableOpacity style={s.vipChannelCard} onPress={() => { setShowVipSupportModal(false); handleOpenVipSupport('telegram'); }} activeOpacity={0.85}>
                            <View style={[s.vipChannelIcon, { backgroundColor: theme.colors.accentLight }]}>
                                <Headphones size={24} color={theme.colors.accent} />
                            </View>
                            <View style={s.vipChannelInfo}>
                                <Text style={s.vipChannelName}>Telegram</Text>
                                <Text style={s.vipChannelDesc}>Fastest response · Chat in real time</Text>
                            </View>
                            <ChevronRight size={18} color={theme.colors.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={s.vipChannelCard} onPress={() => { setShowVipSupportModal(false); handleOpenVipSupport('whatsapp'); }} activeOpacity={0.85}>
                            <View style={[s.vipChannelIcon, { backgroundColor: theme.colors.highlightLight }]}>
                                <Heart size={24} color={theme.colors.highlight} />
                            </View>
                            <View style={s.vipChannelInfo}>
                                <Text style={s.vipChannelName}>WhatsApp</Text>
                                <Text style={s.vipChannelDesc}>Message us on WhatsApp anytime</Text>
                            </View>
                            <ChevronRight size={18} color={theme.colors.textTertiary} />
                        </TouchableOpacity>

                        <TouchableOpacity style={s.profileModalDone} onPress={() => setShowVipSupportModal(false)}>
                            <Text style={s.profileModalDoneText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = (theme: any) => StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
        marginBottom: 20,
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
        fontFamily: theme.typography.fontFamily.displaySemibold,
        fontSize: 24,
        letterSpacing: -0.2,
        color: theme.colors.textPrimary,
    },

    sleepProfileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        borderRadius: theme.borderRadius.card,
        padding: 16,
        marginBottom: 16,
    },
    profileIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sleepProfileTextBlock: { flex: 1, rowGap: 2 },
    sleepProfileTitleRow: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
    sleepProfileTitle: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 16,
        color: theme.colors.textPrimary,
    },
    sleepProfileSubtitle: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 13,
        color: theme.colors.textTertiary,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.accentLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        columnGap: 4,
    },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent },
    activeBadgeText: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        color: theme.colors.accent,
        fontSize: 10,
        textTransform: 'uppercase',
    },


    sectionBlock: { rowGap: 8, marginBottom: 20 },
    sectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 8,
    },
    sectionLabel: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 13,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: theme.colors.textTertiary,
    },
    vipBadge: {
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
    vipBadgeText: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        color: theme.colors.premiumBadgeText,
        fontSize: 10,
    },

    lookCard: {
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        borderRadius: theme.borderRadius.card,
        padding: 14,
        rowGap: 12,
    },
    themeRadioGroup: {
        flexDirection: 'row',
        columnGap: 6,
    },
    themeRadioButton: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        backgroundColor: theme.colors.backgroundTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    themeRadioButtonSelected: {
        borderWidth: 1.5,
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.navActiveBackground,
    },
    themeRadioLabel: {
        fontFamily: theme.typography.fontFamily.bodySemibold,
        fontSize: 13,
        color: theme.colors.textPrimary,
    },
    themeRadioLabelSelected: {
        fontFamily: theme.typography.fontFamily.bodyBold,
    },
    lookHint: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },

    groupCard: {
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        borderRadius: theme.borderRadius.card,
        paddingHorizontal: 16,
    },
    row: {
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        columnGap: 12,
    },
    rowLast: {},
    rowDivider: {
        height: 1,
        backgroundColor: theme.colors.cardBorder,
    },
    rowIconChip: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: theme.colors.accentLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowIconChipDanger: {
        backgroundColor: theme.colors.danger + '1F', // ~12% alpha, works on both themes
    },
    rowLabel: {
        fontFamily: theme.typography.fontFamily.bodySemibold,
        fontSize: 15,
        color: theme.colors.textPrimary,
    },
    rowLabelGrow: {
        flex: 1,
    },
    rowValueGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 6,
    },
    rowValue: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 14,
        color: theme.colors.textTertiary,
    },

    logOutButton: {
        marginTop: 4,
        height: 50,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.colors.accentBorder,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: 8,
    },
    logOutText: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 16,
        color: theme.colors.danger,
    },
    bottomSpacing: { height: 40 },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
    },
    confirmHeader: { alignItems: 'center', marginBottom: 24, rowGap: 12 },
    confirmTitle: {
        fontFamily: theme.typography.fontFamily.displaySemibold,
        fontSize: 20,
        color: theme.colors.textPrimary,
        textAlign: 'center',
    },
    confirmMessage: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 15,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    confirmActions: { flexDirection: 'row', columnGap: 12 },
    confirmCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundTertiary,
    },
    confirmCancelText: {
        fontFamily: theme.typography.fontFamily.bodySemibold,
        color: theme.colors.textPrimary,
        fontSize: 15,
    },
    confirmConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        backgroundColor: theme.colors.accent,
    },
    confirmConfirmText: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        color: theme.colors.background,
        fontSize: 15,
    },

    // Sleep Profile / VIP Support modal (shared shell)
    profileModalContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
    },
    profileModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    profileModalHeaderLeft: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
    profileModalTitle: {
        fontFamily: theme.typography.fontFamily.displaySemibold,
        fontSize: 18,
        color: theme.colors.textPrimary,
    },
    profileModalClose: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: theme.colors.backgroundTertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileTagList: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8 },
    profileTag: {
        backgroundColor: theme.colors.accentLight,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: theme.colors.accentBorder,
    },
    profileTagDanger: {
        backgroundColor: theme.colors.cardOverlay,
        borderColor: theme.colors.danger,
    },
    profileTagPremium: {
        backgroundColor: theme.colors.premiumBadgeBackground,
        borderColor: theme.colors.premiumBadgeBorder,
    },
    profileTagText: {
        fontFamily: theme.typography.fontFamily.bodyMedium,
        fontSize: 13,
        color: theme.colors.accent,
    },
    profileCompletedAt: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 12,
        color: theme.colors.textTertiary,
    },
    profileEmptyText: {
        fontFamily: theme.typography.fontFamily.body,
        color: theme.colors.textTertiary,
        textAlign: 'center',
        marginTop: 24,
    },
    profileModalDone: {
        marginTop: 20,
        backgroundColor: theme.colors.accentLight,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.accentBorder,
    },
    profileModalDoneText: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 15,
        color: theme.colors.accent,
    },

    // Sleep Profile modal
    sleepModalContent: {
        width: '100%',
        maxHeight: '86%',
        borderRadius: 28,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        overflow: 'hidden',
        paddingBottom: 20,
    },
    sleepModalHandle: {
        position: 'absolute',
        top: 10,
        left: '50%',
        marginLeft: -18,
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.5)',
        zIndex: 2,
    },
    sleepModalHero: {
        paddingTop: 28,
        paddingBottom: 22,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    sleepModalClose: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sleepModalHeroIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    sleepModalHeroTitle: {
        fontFamily: theme.typography.fontFamily.displaySemibold,
        fontSize: 20,
        color: '#FFFFFF',
    },
    sleepModalHeroSubtitle: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 13,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
    },
    sleepModalScroll: {
        maxHeight: 440,
    },
    sleepModalScrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 4,
    },

    sleepInfoCard: {
        backgroundColor: theme.colors.backgroundTertiary,
        borderRadius: theme.borderRadius.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        paddingHorizontal: 16,
    },
    sleepInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 10,
        paddingVertical: 12,
    },
    sleepInfoIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: theme.colors.accentLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sleepInfoLabel: {
        flex: 1,
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    sleepInfoValue: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 15,
        color: theme.colors.textPrimary,
        textTransform: 'capitalize',
    },
    sleepInfoDivider: {
        height: 1,
        backgroundColor: theme.colors.cardBorder,
    },

    sleepScheduleRow: {
        flexDirection: 'row',
        columnGap: 12,
    },
    sleepScheduleCard: {
        flex: 1,
        backgroundColor: theme.colors.backgroundTertiary,
        borderRadius: theme.borderRadius.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        padding: 14,
        rowGap: 4,
    },
    sleepScheduleIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 4,
    },
    sleepScheduleLabel: {
        fontFamily: theme.typography.fontFamily.bodySemibold,
        fontSize: 11,
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sleepScheduleValue: {
        fontFamily: theme.typography.fontFamily.displaySemibold,
        fontSize: 18,
        color: theme.colors.textPrimary,
    },

    sleepTagRow: {
        flexDirection: 'row',
        columnGap: 12,
    },
    sleepTagCard: {
        flex: 1,
        rowGap: 10,
        backgroundColor: theme.colors.backgroundTertiary,
        borderRadius: theme.borderRadius.card,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        padding: 14,
    },
    sleepTagSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 6,
    },
    sleepTagSectionTitle: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 12,
        color: theme.colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    sleepCompletedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: 6,
        marginTop: 4,
    },

    sleepModalDone: {
        marginHorizontal: 20,
        marginTop: 16,
        backgroundColor: theme.colors.accentLight,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.accentBorder,
    },

    vipModalSubtitle: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 14,
        color: theme.colors.textSecondary,
        lineHeight: 20,
        marginBottom: 18,
    },
    vipChannelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 14,
        backgroundColor: theme.colors.backgroundTertiary,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
    },
    vipChannelIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vipChannelInfo: { flex: 1, rowGap: 2 },
    vipChannelName: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 16,
        color: theme.colors.textPrimary,
    },
    vipChannelDesc: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 13,
        color: theme.colors.textTertiary,
    },
});

export default SettingsScreen;
