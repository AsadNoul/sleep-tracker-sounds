import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Share,
    Platform,
    Modal,
    ActivityIndicator,
    Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ChevronLeft,
    ChevronRight,
    Moon,
    User,
    Star,
    Bell,
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
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { saveSettings, loadSettings } from '../utils/storage';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../hooks/useAppTheme';
import GuestBanner from '../components/GuestBanner';
import notificationService from '../services/notificationService';
// Do NOT statically import expo-notifications — the import itself crashes
// Expo Go on Android (see utils/notificationAvailability.ts). Lazy-load it.
import type * as NotificationsType from 'expo-notifications';
import { isExpoNotificationsAvailable } from '../utils/notificationAvailability';
import PushNotificationPrompt from '../components/PushNotificationPrompt';
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

type MovementSensitivity = 'Low' | 'Normal' | 'High';
const MOVEMENT_LEVELS: MovementSensitivity[] = ['Low', 'Normal', 'High'];

let Notifications: typeof NotificationsType | null = null;

function getNotifications(): typeof NotificationsType | null {
    if (Notifications) return Notifications;
    if (!isExpoNotificationsAvailable()) return null;
    try {
        Notifications = require('expo-notifications');
    } catch (error) {
        console.warn('[notifications] Failed to load expo-notifications module:', error);
        Notifications = null;
    }
    return Notifications;
}

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
    { mode: 'sunset', label: 'By sunset' },
    { mode: 'night', label: 'Sleep Mode' },
    { mode: 'day', label: 'Day View' },
];

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

    // Notifications
    const [morningReportReady, setMorningReportReady] = useState(true);
    const [windDownReminder, setWindDownReminder] = useState(false);
    const [weeklySummary, setWeeklySummary] = useState(false);

    // Tracking
    const [snoreDetection, setSnoreDetection] = useState(true);
    const [movementSensitivity, setMovementSensitivity] = useState<MovementSensitivity>('Normal');

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
    const [pushPermissionStatus, setPushPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
    const [showPushPrompt, setShowPushPrompt] = useState(false);
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [subscriptionExpiry, setSubscriptionExpiry] = useState<string | null>(null);
    const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
    const [showSleepProfileModal, setShowSleepProfileModal] = useState(false);
    const [showVipSupportModal, setShowVipSupportModal] = useState(false);

    // Load settings on mount
    useEffect(() => {
        const loadData = async () => {
            const savedSettings = await loadSettings();
            if (savedSettings) {
                setMorningReportReady(savedSettings.notifications ?? true);
                setWindDownReminder(savedSettings.sleepReminder ?? false);
                setWeeklySummary(savedSettings.weeklySummary ?? false);
                setSnoreDetection(savedSettings.snoreDetection ?? true);
                if (MOVEMENT_LEVELS.includes(savedSettings.movementSensitivity)) {
                    setMovementSensitivity(savedSettings.movementSensitivity);
                }
            }

            // Check push notification permission status (guarded: native
            // notification modules aren't present in Expo Go on Android)
            const N = getNotifications();
            if (N) {
                const { status } = await N.getPermissionsAsync();
                setPushPermissionStatus(status);
            } else {
                setPushPermissionStatus('denied');
            }
        };
        loadData();
    }, []);

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

    // Save settings whenever they change
    useEffect(() => {
        const settings = {
            notifications: morningReportReady,
            sleepReminder: windDownReminder,
            weeklySummary,
            snoreDetection,
            movementSensitivity,
        };
        saveSettings(settings);

        // Also save to Supabase if user is authenticated
        if (user && user.id !== 'guest') {
            saveUserSettings(settings).catch(err => {
                console.error('Failed to sync settings to cloud:', err);
            });
        }
    }, [morningReportReady, windDownReminder, weeklySummary, snoreDetection, movementSensitivity, user, saveUserSettings]);

    // Handle wind-down (sleep) reminder scheduling
    useEffect(() => {
        const handleSleepReminder = async () => {
            if (!windDownReminder) {
                await notificationService.cancelBedtimeReminder();
                return;
            }

            if (!onboardingProfile?.preferred_bed_time) {
                return;
            }

            const [hours, minutes] = onboardingProfile.preferred_bed_time.split(':');
            const bedtime = new Date();
            bedtime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            await notificationService.scheduleBedtimeReminder(bedtime);
        };

        handleSleepReminder().catch(err =>
            console.error('Failed to update sleep reminder:', err)
        );
    }, [windDownReminder, onboardingProfile]);

    const handleWindDownToggle = (value: boolean) => {
        if (value && !onboardingProfile?.preferred_bed_time) {
            Alert.alert(
                'Set Bedtime First',
                'To enable wind-down reminders, you need to set your preferred bedtime. Please complete the onboarding or update your profile settings.',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }
        setWindDownReminder(value);
    };

    const handleMovementSensitivityPress = () => {
        const currentIndex = MOVEMENT_LEVELS.indexOf(movementSensitivity);
        const next = MOVEMENT_LEVELS[(currentIndex + 1) % MOVEMENT_LEVELS.length];
        setMovementSensitivity(next);
    };

    const navigateToSubscription = () => navigation.navigate('Subscription');
    const navigateToPrivacySettings = () => navigation.navigate('PrivacySettings');
    const navigateToHelpSupport = () => navigation.navigate('HelpSupport');
    const navigateToProfile = () => navigation.navigate('Profile');
    const navigateToAbout = () => navigation.navigate('About');

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
                message: `Sleep Architect Data Export\nExported: ${new Date().toLocaleString()}\n\n${jsonData}`,
                title: 'Sleep Architect Data Export',
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
        const shareMessage = Platform.OS === 'ios'
            ? 'Check out Sleep Architect! Optimize your sleep with AI insights. https://apps.apple.com/app/sleep-architect'
            : 'Check out Sleep Architect! https://play.google.com/store/apps/details?id=com.asadNoul.sleeptracker';
        await Share.share({ message: shareMessage, title: 'Sleep Architect' });
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
                Alert.alert('Purchases Restored', 'Your subscription has been successfully restored. Enjoy Sleep Architect VIP!');
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

                {/* Notification Alert */}
                {user && user.id !== 'guest' && pushPermissionStatus !== 'granted' && (
                    <TouchableOpacity style={s.notificationBanner} onPress={() => setShowPushPrompt(true)} activeOpacity={0.85}>
                        <View style={[s.notificationBannerIcon, { backgroundColor: theme.colors.accentLight }]}>
                            <Bell size={20} color={theme.colors.accent} />
                        </View>
                        <View style={s.notificationBannerText}>
                            <Text style={s.notificationBannerTitle}>Enable Notifications</Text>
                            <Text style={s.notificationBannerSubtitle}>Get sleep reminders & insights</Text>
                        </View>
                        <ChevronRight size={18} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                )}

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

                {/* Notifications */}
                <View style={s.sectionBlock}>
                    <Text style={s.sectionLabel}>Notifications</Text>
                    <View style={s.groupCard}>
                        <View style={s.row}>
                            <Text style={s.rowLabel}>Wind-down reminder</Text>
                            <Switch
                                value={windDownReminder}
                                onValueChange={handleWindDownToggle}
                                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
                            />
                        </View>
                        <View style={s.rowDivider} />
                        <View style={s.row}>
                            <Text style={s.rowLabel}>Morning Report ready</Text>
                            <Switch
                                value={morningReportReady}
                                onValueChange={setMorningReportReady}
                                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
                            />
                        </View>
                        <View style={s.rowDivider} />
                        <View style={[s.row, s.rowLast]}>
                            <Text style={s.rowLabel}>Weekly summary</Text>
                            <Switch
                                value={weeklySummary}
                                onValueChange={setWeeklySummary}
                                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
                            />
                        </View>
                    </View>
                </View>

                {/* Tracking */}
                <View style={s.sectionBlock}>
                    <Text style={s.sectionLabel}>Tracking</Text>
                    <View style={s.groupCard}>
                        <View style={s.row}>
                            <Text style={s.rowLabel}>Snore detection</Text>
                            <Switch
                                value={snoreDetection}
                                onValueChange={setSnoreDetection}
                                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
                            />
                        </View>
                        <View style={s.rowDivider} />
                        <TouchableOpacity style={[s.row, s.rowLast]} onPress={handleMovementSensitivityPress} activeOpacity={0.7}>
                            <Text style={s.rowLabel}>Movement sensitivity</Text>
                            <View style={s.rowValueGroup}>
                                <Text style={s.rowValue}>{movementSensitivity}</Text>
                                <ChevronRight size={16} color={theme.colors.textTertiary} />
                            </View>
                        </TouchableOpacity>
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

                        <TouchableOpacity style={s.row} onPress={navigateToPrivacySettings} activeOpacity={0.6}>
                            <View style={s.rowIconChip}>
                                <Shield size={16} color={theme.colors.accent} />
                            </View>
                            <Text style={[s.rowLabel, s.rowLabelGrow]}>Privacy & data</Text>
                            <ChevronRight size={18} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={s.rowDivider} />

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
                    <View style={s.profileModalContent}>
                        <View style={s.profileModalHeader}>
                            <View style={s.profileModalHeaderLeft}>
                                <View style={[s.profileIconWrapper, { backgroundColor: theme.colors.accentLight }]}>
                                    <Moon size={18} color={theme.colors.accent} />
                                </View>
                                <Text style={s.profileModalTitle}>Sleep Profile</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowSleepProfileModal(false)} style={s.profileModalClose}>
                                <X size={18} color={theme.colors.textTertiary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                            {onboardingProfile ? (
                                <View>
                                    {(onboardingProfile.age || onboardingProfile.gender) && (
                                        <View style={s.profileSection}>
                                            <Text style={s.profileSectionTitle}>Basic Info</Text>
                                            <View style={s.profileRow}>
                                                {onboardingProfile.age ? (
                                                    <View style={s.profileChip}>
                                                        <Text style={s.profileChipLabel}>Age</Text>
                                                        <Text style={s.profileChipValue}>{onboardingProfile.age}</Text>
                                                    </View>
                                                ) : null}
                                                {onboardingProfile.gender ? (
                                                    <View style={s.profileChip}>
                                                        <Text style={s.profileChipLabel}>Gender</Text>
                                                        <Text style={s.profileChipValue}>{onboardingProfile.gender}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                    )}

                                    {(onboardingProfile.average_sleep_hours || onboardingProfile.sleep_pattern || onboardingProfile.wake_up_feeling) && (
                                        <View style={s.profileSection}>
                                            <Text style={s.profileSectionTitle}>Sleep Stats</Text>
                                            <View style={s.profileRow}>
                                                {onboardingProfile.average_sleep_hours ? (
                                                    <View style={s.profileChip}>
                                                        <Text style={s.profileChipLabel}>Avg Hours</Text>
                                                        <Text style={s.profileChipValue}>{onboardingProfile.average_sleep_hours}h</Text>
                                                    </View>
                                                ) : null}
                                                {onboardingProfile.sleep_pattern ? (
                                                    <View style={s.profileChip}>
                                                        <Text style={s.profileChipLabel}>Pattern</Text>
                                                        <Text style={s.profileChipValue}>{onboardingProfile.sleep_pattern}</Text>
                                                    </View>
                                                ) : null}
                                                {onboardingProfile.wake_up_feeling ? (
                                                    <View style={s.profileChip}>
                                                        <Text style={s.profileChipLabel}>Wake Feeling</Text>
                                                        <Text style={s.profileChipValue}>{onboardingProfile.wake_up_feeling}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                    )}

                                    {(onboardingProfile.preferred_bed_time || onboardingProfile.preferred_wake_time) && (
                                        <View style={s.profileSection}>
                                            <Text style={s.profileSectionTitle}>Schedule</Text>
                                            <View style={s.profileRow}>
                                                {onboardingProfile.preferred_bed_time ? (
                                                    <View style={s.profileChip}>
                                                        <Text style={s.profileChipLabel}>Bedtime</Text>
                                                        <Text style={s.profileChipValue}>{onboardingProfile.preferred_bed_time}</Text>
                                                    </View>
                                                ) : null}
                                                {onboardingProfile.preferred_wake_time ? (
                                                    <View style={s.profileChip}>
                                                        <Text style={s.profileChipLabel}>Wake Time</Text>
                                                        <Text style={s.profileChipValue}>{onboardingProfile.preferred_wake_time}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                    )}

                                    {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 && (
                                        <View style={s.profileSection}>
                                            <Text style={s.profileSectionTitle}>Sleep Goals</Text>
                                            <View style={s.profileTagList}>
                                                {onboardingProfile.sleep_goals.map((goal, i) => (
                                                    <View key={i} style={s.profileTag}>
                                                        <Text style={s.profileTagText}>{goal}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {onboardingProfile.sleep_troubles && onboardingProfile.sleep_troubles.length > 0 && (
                                        <View style={s.profileSection}>
                                            <Text style={s.profileSectionTitle}>Sleep Troubles</Text>
                                            <View style={s.profileTagList}>
                                                {onboardingProfile.sleep_troubles.map((trouble, i) => (
                                                    <View key={i} style={[s.profileTag, s.profileTagDanger]}>
                                                        <Text style={[s.profileTagText, { color: theme.colors.danger }]}>{trouble}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {onboardingProfile.health_conditions && onboardingProfile.health_conditions.length > 0 && (
                                        <View style={s.profileSection}>
                                            <Text style={s.profileSectionTitle}>Health Notes</Text>
                                            <View style={s.profileTagList}>
                                                {onboardingProfile.health_conditions.map((cond, i) => (
                                                    <View key={i} style={[s.profileTag, s.profileTagPremium]}>
                                                        <Text style={[s.profileTagText, { color: theme.colors.premium }]}>{cond}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {onboardingProfile.onboarding_completed_at && (
                                        <Text style={s.profileCompletedAt}>
                                            Profile created {new Date(onboardingProfile.onboarding_completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </Text>
                                    )}
                                </View>
                            ) : (
                                <Text style={s.profileEmptyText}>No profile data found.</Text>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={s.profileModalDone} onPress={() => setShowSleepProfileModal(false)}>
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

            {/* Push Notification Prompt */}
            {showPushPrompt && user && <PushNotificationPrompt userId={user.id} trigger="settings" />}
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

    notificationBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: 12,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.accentBorder,
        borderRadius: theme.borderRadius.card,
        padding: 14,
        marginBottom: 16,
    },
    notificationBannerIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBannerText: { flex: 1, rowGap: 2 },
    notificationBannerTitle: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 15,
        color: theme.colors.textPrimary,
    },
    notificationBannerSubtitle: {
        fontFamily: theme.typography.fontFamily.body,
        fontSize: 12,
        color: theme.colors.textTertiary,
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
    profileSection: { marginBottom: 18, rowGap: 10 },
    profileSectionTitle: {
        fontFamily: theme.typography.fontFamily.bodyBold,
        fontSize: 12,
        color: theme.colors.accent,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    profileRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 8 },
    profileChip: {
        backgroundColor: theme.colors.backgroundTertiary,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        alignItems: 'center',
    },
    profileChipLabel: {
        fontFamily: theme.typography.fontFamily.bodySemibold,
        fontSize: 10,
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    profileChipValue: {
        fontFamily: theme.typography.fontFamily.bodySemibold,
        fontSize: 15,
        color: theme.colors.textPrimary,
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
        textAlign: 'center',
        marginTop: 12,
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
