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
    Animated,
    Modal,
    ActivityIndicator,
    Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
    ChevronLeft,
    Moon,
    Clock,
    Flag,
    User,
    Star,
    ShieldCheck,
    CheckCircle2,
    Book,
    Gauge,
    Bell,
    Sun,
    Smartphone,
    HelpCircle,
    Info,
    Share2,
    LogOut,
    Trash2,
    FileText,
    Download,
    ChevronRight,
    ChevronDown,
    Lightbulb,
    Activity,
    Volume2,
    Users,
    Coffee,
    Headphones,
    Heart,
    Shield,
    X
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
import * as Notifications from 'expo-notifications';
import PushNotificationPrompt from '../components/PushNotificationPrompt';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import revenueCatService from '../services/revenueCatService';

// Android-safe BlurView wrapper
const GlassCard = ({ style, children, intensity = 20, tint = "dark" }: { style?: any; children: React.ReactNode; intensity?: number; tint?: 'dark' | 'light' | 'default' }) => {
    if (Platform.OS === 'android') {
        return (
            <View style={[style, { backgroundColor: 'rgba(17, 25, 40, 0.75)' }]}>
                {children}
            </View>
        );
    }
    return (
        <BlurView intensity={intensity} tint={tint} style={style}>
            {children}
        </BlurView>
    );
};

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

const SettingsScreen = () => {
    const { theme, isDark } = useAppTheme();
    const insets = useSafeAreaInsets();
    const bottomMargin = useSafeBottomMargin();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { themeMode, setThemeMode } = useTheme();
    const { signOut, deleteAccount, user, saveUserSettings } = useAuth();
    const [notifications, setNotifications] = useState(true);
    const [sleepReminder, setSleepReminder] = useState(false);
    const [onboardingProfile, setOnboardingProfile] = useState<OnboardingProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [accountPreferencesExpanded, setAccountPreferencesExpanded] = useState(false);
    const [sleepWellnessExpanded, setSleepWellnessExpanded] = useState(false);
    const [helpLegalExpanded, setHelpLegalExpanded] = useState(false);
    const [dataActionsExpanded, setDataActionsExpanded] = useState(false);
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

    // Animated values for fluid background
    const animatedValue1 = useRef(new Animated.Value(0)).current;
    const animatedValue2 = useRef(new Animated.Value(0)).current;

    // Load settings on mount
    useEffect(() => {
        const loadData = async () => {
            const savedSettings = await loadSettings();
            if (savedSettings) {
                setNotifications(savedSettings.notifications ?? true);
                setSleepReminder(savedSettings.sleepReminder ?? false);
            }

            // Check push notification permission status
            const { status } = await Notifications.getPermissionsAsync();
            setPushPermissionStatus(status);
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

    // Animated fluid background
    useEffect(() => {
        const animation1 = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue1, {
                    toValue: 1,
                    duration: 8000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue1, {
                    toValue: 0,
                    duration: 8000,
                    useNativeDriver: true,
                }),
            ])
        );

        const animation2 = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue2, {
                    toValue: 1,
                    duration: 6000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue2, {
                    toValue: 0,
                    duration: 6000,
                    useNativeDriver: true,
                }),
            ])
        );

        animation1.start();
        animation2.start();

        return () => {
            animation1.stop();
            animation2.stop();
        };
    }, []);

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
        const settings = { notifications, sleepReminder };
        saveSettings(settings);

        // Also save to Supabase if user is authenticated
        if (user && user.id !== 'guest') {
            saveUserSettings(settings).catch(err => {
                console.error('Failed to sync settings to cloud:', err);
            });
        }
    }, [notifications, sleepReminder, user, saveUserSettings]);

    // Handle sleep reminder scheduling
    useEffect(() => {
        const handleSleepReminder = async () => {
            if (!sleepReminder) {
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
    }, [sleepReminder, onboardingProfile]);

    const handleSleepReminderToggle = (value: boolean) => {
        if (value && !onboardingProfile?.preferred_bed_time) {
            Alert.alert(
                'Set Bedtime First',
                'To enable sleep reminders, you need to set your preferred bedtime. Please complete the onboarding or update your profile settings.',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }
        setSleepReminder(value);
    };

    const navigateToSubscription = () => navigation.navigate('Subscription');
    const navigateToPrivacySettings = () => navigation.navigate('PrivacySettings');
    const navigateToHelpSupport = () => navigation.navigate('HelpSupport');
    const navigateToProfile = () => navigation.navigate('Profile');
    const navigateToAbout = () => navigation.navigate('About');
    const navigateToSleepAnalysis = () => navigation.navigate('SleepAnalysis' as any);

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

    const handleOpenLink = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) await Linking.openURL(url);
        else Alert.alert('Error', 'Cannot open link');
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
            title: 'Sign Out',
            message: 'Are you sure you want to sign out?',
            isDestructive: true,
            onConfirmText: 'Sign Out',
            onConfirm: async () => {
                try { await signOut(); }
                catch (error) { Alert.alert('Error', 'Failed to sign out.'); }
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

    const translateX1 = animatedValue1.interpolate({ inputRange: [0, 1], outputRange: [-50, 50] });
    const translateY1 = animatedValue1.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
    const translateX2 = animatedValue2.interpolate({ inputRange: [0, 1], outputRange: [30, -30] });
    const translateY2 = animatedValue2.interpolate({ inputRange: [0, 1], outputRange: [40, -40] });

    const renderSleepProfileHeader = () => {
        const isPremium = isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email);

        if (!onboardingProfile || !onboardingProfile.onboarding_completed_at) {
            return (
                <TouchableOpacity
                    style={styles.sleepProfileHeaderCompact}
                    onPress={() => navigation.navigate('Profile')}
                    activeOpacity={0.9}
                >
                    <GlassCard intensity={30} tint="dark" style={styles.sleepProfileContentCompact}>
                        <View style={styles.sleepProfileTopCompact}>
                            <View style={styles.profileIconWrapper}>
                                <User size={24} color={theme.colors.accent} />
                            </View>
                            <View style={[styles.sleepProfileTopText, { marginLeft: 12 }]}>
                                <Text style={styles.sleepProfileTitle}>Complete Profile</Text>
                                <Text style={styles.sleepProfileSubtitleCompact}>Personalize your journey</Text>
                            </View>
                        </View>
                        <ChevronRight size={20} color={theme.colors.textSecondary} />
                    </GlassCard>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={styles.sleepProfileHeaderCompact}
                onPress={() => setShowSleepProfileModal(true)}
                activeOpacity={0.9}
            >
                <GlassCard intensity={30} tint="dark" style={styles.sleepProfileContentCompact}>
                    <View style={styles.sleepProfileTopCompact}>
                        <View style={[styles.profileIconWrapper, { backgroundColor: 'rgba(0, 255, 209, 0.1)' }]}>
                            <Moon size={24} color={theme.colors.accent} />
                        </View>
                        <View style={[styles.sleepProfileTopText, { marginLeft: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.sleepProfileTitle}>Sleep Profile</Text>
                                <View style={styles.activeProfileBadge}>
                                    <View style={styles.activeDot} />
                                    <Text style={styles.activeText}>Active</Text>
                                </View>
                            </View>
                            <Text style={styles.sleepProfileSubtitleCompact}>
                                {onboardingProfile.age ? `${onboardingProfile.age}y • ` : ''}
                                {onboardingProfile.average_sleep_hours ? `${onboardingProfile.average_sleep_hours}h avg • ` : ''}
                                {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 ? `${onboardingProfile.sleep_goals.length} goals` : 'Set goals'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.profileAction}>
                        <Text style={styles.profileActionText}>View</Text>
                        <ChevronRight size={18} color={theme.colors.accent} style={{ marginLeft: 2 }} />
                    </View>
                </GlassCard>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F111A', '#1B1D2A']} style={styles.gradient}>
                {/* Fluid Background Elements */}
                <View style={styles.fluidBackgroundContainer}>
                    <Animated.View style={[styles.fluidCircle1, { transform: [{ translateX: translateX1 }, { translateY: translateY1 }] }]} />
                    <Animated.View style={[styles.fluidCircle2, { transform: [{ translateX: translateX2 }, { translateY: translateY2 }] }]} />
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: bottomMargin }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <ChevronLeft size={24} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.title}>Settings</Text>
                                <Text style={styles.subtitle}>Customize your experience</Text>
                            </View>
                        </View>
                    </View>

                    <GuestBanner />

                    {/* Notification Alert */}
                    {user && user.id !== 'guest' && pushPermissionStatus !== 'granted' && (
                        <TouchableOpacity style={styles.notificationBanner} onPress={() => setShowPushPrompt(true)} activeOpacity={0.8}>
                            <LinearGradient colors={['#8B5CF6', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.notificationBannerGradient}>
                                <Bell size={24} color="#FFFFFF" />
                                <View style={[styles.notificationBannerText, { marginLeft: 12 }]}>
                                    <Text style={styles.notificationBannerTitle}>Enable Notifications</Text>
                                    <Text style={styles.notificationBannerSubtitle}>Get sleep reminders & insights</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {!isLoadingProfile && renderSleepProfileHeader()}

                    {/* Account Section */}
                    <GlassCard intensity={20} tint="dark" style={[styles.card, isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email) && styles.premiumCardBorder]}>
                        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setAccountPreferencesExpanded(!accountPreferencesExpanded)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <User size={20} color={theme.colors.accent} />
                                <Text style={styles.cardTitle}>Account</Text>
                                {isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email) && (
                                    <View style={styles.vipBadge}>
                                        <Star size={10} color="#FFD700" fill="#FFD700" />
                                        <Text style={[styles.vipBadgeText, { marginLeft: 3 }]}>VIP</Text>
                                    </View>
                                )}
                            </View>
                            <ChevronDown size={20} color="#A0AEC0" style={{ transform: [{ rotate: accountPreferencesExpanded ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>

                        {accountPreferencesExpanded && (
                            <>
                                <TouchableOpacity style={styles.settingItem} onPress={navigateToProfile}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 255, 209, 0.1)' }]}>
                                            <User size={20} color={theme.colors.accent} />
                                        </View>
                                        <Text style={styles.settingLabel}>Your Profile</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.settingItem} onPress={navigateToSubscription}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(201, 162, 39, 0.1)' }]}>
                                            <Star size={20} color={theme.colors.premium} />
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>Manage Subscription</Text>
                                            {subscriptionExpiry && <Text style={styles.expiryLabel}>Renews on: {subscriptionExpiry}</Text>}
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.settingItem} onPress={handleRestorePurchases} disabled={isRestoringPurchases}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 255, 209, 0.1)' }]}>
                                            {isRestoringPurchases
                                                ? <ActivityIndicator size="small" color="#00FFD1" />
                                                : <Download size={20} color="#00FFD1" />}
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>Restore Purchases</Text>
                                            <Text style={styles.settingSubLabel}>{isRestoringPurchases ? 'Checking...' : 'Recover existing subscription'}</Text>
                                        </View>
                                    </View>
                                    {!isRestoringPurchases && <ChevronRight size={20} color="#A0AEC0" />}
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.settingItem} onPress={() => setShowVipSupportModal(true)}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(201, 162, 39, 0.15)' }]}>
                                            <Headphones size={20} color="#C9A227" />
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>VIP Support</Text>
                                            <Text style={styles.settingSubLabel}>Telegram & WhatsApp priority help</Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                {user?.email === 'admin@naulx.com' && (
                                    <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Admin' as never)}>
                                        <View style={styles.settingInfo}>
                                            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                                                <Users size={20} color="#FF6B6B" />
                                            </View>
                                            <Text style={styles.settingLabel}>Admin Dashboard</Text>
                                        </View>
                                        <ChevronRight size={20} color="#A0AEC0" />
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </GlassCard>

                    {/* Notifications Section */}
                    <GlassCard intensity={20} tint="dark" style={styles.card}>
                        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setSleepWellnessExpanded(!sleepWellnessExpanded)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Bell size={20} color={theme.colors.danger} />
                                <Text style={styles.cardTitle}>Notifications</Text>
                            </View>
                            <ChevronDown size={20} color="#A0AEC0" style={{ transform: [{ rotate: sleepWellnessExpanded ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>

                        {sleepWellnessExpanded && (
                            <>
                                <View style={styles.settingItem}>
                                    <View style={styles.settingInfo}>
                                        <Bell size={24} color={theme.colors.danger} />
                                        <Text style={styles.settingLabel}>General Notifications</Text>
                                    </View>
                                    <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#333', true: theme.colors.accent }} />
                                </View>
                                <View style={[styles.settingItem, { borderBottomWidth: 0 }]}>
                                    <View style={styles.settingInfo}>
                                        <Clock size={24} color={theme.colors.premium} />
                                        <Text style={styles.settingLabel}>Sleep Reminder</Text>
                                    </View>
                                    <Switch value={sleepReminder} onValueChange={handleSleepReminderToggle} trackColor={{ false: '#333', true: theme.colors.premium }} />
                                </View>
                            </>
                        )}
                    </GlassCard>

                    {/* App Settings Section */}
                    <GlassCard intensity={20} tint="dark" style={styles.card}>
                        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setHelpLegalExpanded(!helpLegalExpanded)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Smartphone size={20} color={theme.colors.accent} />
                                <Text style={styles.cardTitle}>App Settings</Text>
                            </View>
                            <ChevronDown size={20} color="#A0AEC0" style={{ transform: [{ rotate: helpLegalExpanded ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>

                        {helpLegalExpanded && (
                            <>
                                <TouchableOpacity style={styles.settingItem} onPress={handleCheckUpdates} disabled={isCheckingUpdates}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 255, 209, 0.1)' }]}>
                                            {isCheckingUpdates ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <Download size={20} color={theme.colors.accent} />}
                                        </View>
                                        <View>
                                            <Text style={styles.settingLabel}>Check for updates</Text>
                                            <Text style={styles.settingSubLabel}>{isCheckingUpdates ? 'Connecting...' : 'Keep app updated'}</Text>
                                        </View>
                                    </View>
                                    {!isCheckingUpdates && <ChevronRight size={20} color="#A0AEC0" />}
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.settingItem} onPress={handleShareApp}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(51, 198, 255, 0.1)' }]}>
                                            <Share2 size={20} color={theme.colors.highlight} />
                                        </View>
                                        <Text style={styles.settingLabel}>Share Application</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.settingItem} onPress={navigateToAbout}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(157, 78, 221, 0.1)' }]}>
                                            <Info size={20} color="#9D4EDD" />
                                        </View>
                                        <Text style={styles.settingLabel}>About Sleep Architect</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>
                            </>
                        )}
                    </GlassCard>

                    {/* Data & Privacy Section */}
                    <GlassCard intensity={20} tint="dark" style={styles.card}>
                        <TouchableOpacity style={styles.collapsibleHeader} onPress={() => setDataActionsExpanded(!dataActionsExpanded)}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <ShieldCheck size={20} color={theme.colors.highlight} />
                                <Text style={styles.cardTitle}>Data & Privacy</Text>
                            </View>
                            <ChevronDown size={20} color="#A0AEC0" style={{ transform: [{ rotate: dataActionsExpanded ? '180deg' : '0deg' }] }} />
                        </TouchableOpacity>

                        {dataActionsExpanded && (
                            <>
                                <TouchableOpacity style={styles.settingItem} onPress={navigateToPrivacySettings}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(51, 198, 255, 0.1)' }]}>
                                            <ShieldCheck size={20} color={theme.colors.highlight} />
                                        </View>
                                        <Text style={styles.settingLabel}>Privacy Controls</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.settingItem} onPress={handleExportData}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 255, 209, 0.1)' }]}>
                                            <Download size={20} color={theme.colors.accent} />
                                        </View>
                                        <Text style={styles.settingLabel}>Export My Data</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]} onPress={handleDeleteAccount}>
                                    <View style={styles.settingInfo}>
                                        <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                                            <Trash2 size={20} color={theme.colors.danger} />
                                        </View>
                                        <Text style={[styles.settingLabel, { color: theme.colors.danger }]}>Delete Account</Text>
                                    </View>
                                    <ChevronRight size={20} color={theme.colors.danger} />
                                </TouchableOpacity>
                            </>
                        )}
                    </GlassCard>

                    {/* Sign Out */}
                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <GlassCard intensity={20} tint="dark" style={styles.signOutCard}>
                            <LogOut size={24} color={theme.colors.danger} />
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </GlassCard>
                    </TouchableOpacity>

                    <View style={styles.bottomSpacing} />
                </ScrollView>

                {/* Confirmation Modal */}
                <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard intensity={90} tint="dark" style={styles.confirmContent}>
                            <View style={styles.confirmHeader}>
                                {confirmConfig?.isDestructive ? <Trash2 size={40} color={theme.colors.danger} /> : <Info size={40} color={theme.colors.accent} />}
                                <Text style={styles.confirmTitle}>{confirmConfig?.title}</Text>
                                <Text style={styles.confirmMessage}>{confirmConfig?.message}</Text>
                            </View>
                            <View style={styles.confirmActions}>
                                <TouchableOpacity style={styles.confirmCancelButton} onPress={() => setConfirmModalVisible(false)}>
                                    <Text style={styles.confirmCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <View style={{ width: 12 }} />
                                <TouchableOpacity
                                    style={[styles.confirmConfirmButton, confirmConfig?.isDestructive && { backgroundColor: theme.colors.danger }]}
                                    onPress={() => { setConfirmModalVisible(false); confirmConfig?.onConfirm(); }}
                                >
                                    <Text style={styles.confirmConfirmText}>{confirmConfig?.onConfirmText || (confirmConfig?.isDestructive ? 'Delete' : 'Confirm')}</Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    </View>
                </Modal>

                {/* Sleep Profile Modal */}
                <Modal visible={showSleepProfileModal} transparent animationType="slide" onRequestClose={() => setShowSleepProfileModal(false)}>
                    <View style={styles.modalOverlay}>
                        <GlassCard intensity={90} tint="dark" style={styles.profileModalContent}>
                            {/* Header */}
                            <View style={styles.profileModalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(0, 255, 209, 0.1)', marginRight: 10 }]}>
                                        <Moon size={20} color="#00FFD1" />
                                    </View>
                                    <Text style={styles.profileModalTitle}>Sleep Profile</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowSleepProfileModal(false)} style={styles.profileModalClose}>
                                    <X size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                                {onboardingProfile ? (
                                    <View>
                                        {/* Basic Info */}
                                        {(onboardingProfile.age || onboardingProfile.gender) && (
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>Basic Info</Text>
                                                <View style={styles.profileRow}>
                                                    {onboardingProfile.age ? (
                                                        <View style={styles.profileChip}>
                                                            <Text style={styles.profileChipLabel}>Age</Text>
                                                            <Text style={styles.profileChipValue}>{onboardingProfile.age}</Text>
                                                        </View>
                                                    ) : null}
                                                    {onboardingProfile.gender ? (
                                                        <View style={styles.profileChip}>
                                                            <Text style={styles.profileChipLabel}>Gender</Text>
                                                            <Text style={styles.profileChipValue}>{onboardingProfile.gender}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        )}

                                        {/* Sleep Stats */}
                                        {(onboardingProfile.average_sleep_hours || onboardingProfile.sleep_pattern || onboardingProfile.wake_up_feeling) && (
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>Sleep Stats</Text>
                                                <View style={styles.profileRow}>
                                                    {onboardingProfile.average_sleep_hours ? (
                                                        <View style={styles.profileChip}>
                                                            <Text style={styles.profileChipLabel}>Avg Hours</Text>
                                                            <Text style={styles.profileChipValue}>{onboardingProfile.average_sleep_hours}h</Text>
                                                        </View>
                                                    ) : null}
                                                    {onboardingProfile.sleep_pattern ? (
                                                        <View style={styles.profileChip}>
                                                            <Text style={styles.profileChipLabel}>Pattern</Text>
                                                            <Text style={styles.profileChipValue}>{onboardingProfile.sleep_pattern}</Text>
                                                        </View>
                                                    ) : null}
                                                    {onboardingProfile.wake_up_feeling ? (
                                                        <View style={styles.profileChip}>
                                                            <Text style={styles.profileChipLabel}>Wake Feeling</Text>
                                                            <Text style={styles.profileChipValue}>{onboardingProfile.wake_up_feeling}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        )}

                                        {/* Sleep Schedule */}
                                        {(onboardingProfile.preferred_bed_time || onboardingProfile.preferred_wake_time) && (
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>Schedule</Text>
                                                <View style={styles.profileRow}>
                                                    {onboardingProfile.preferred_bed_time ? (
                                                        <View style={styles.profileChip}>
                                                            <Text style={styles.profileChipLabel}>Bedtime</Text>
                                                            <Text style={styles.profileChipValue}>{onboardingProfile.preferred_bed_time}</Text>
                                                        </View>
                                                    ) : null}
                                                    {onboardingProfile.preferred_wake_time ? (
                                                        <View style={styles.profileChip}>
                                                            <Text style={styles.profileChipLabel}>Wake Time</Text>
                                                            <Text style={styles.profileChipValue}>{onboardingProfile.preferred_wake_time}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        )}

                                        {/* Sleep Goals */}
                                        {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 && (
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>Sleep Goals</Text>
                                                <View style={styles.profileTagList}>
                                                    {onboardingProfile.sleep_goals.map((goal, i) => (
                                                        <View key={i} style={styles.profileTag}>
                                                            <Text style={styles.profileTagText}>{goal}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Sleep Troubles */}
                                        {onboardingProfile.sleep_troubles && onboardingProfile.sleep_troubles.length > 0 && (
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>Sleep Troubles</Text>
                                                <View style={styles.profileTagList}>
                                                    {onboardingProfile.sleep_troubles.map((trouble, i) => (
                                                        <View key={i} style={[styles.profileTag, { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.3)' }]}>
                                                            <Text style={[styles.profileTagText, { color: '#FF9999' }]}>{trouble}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Health Conditions */}
                                        {onboardingProfile.health_conditions && onboardingProfile.health_conditions.length > 0 && (
                                            <View style={styles.profileSection}>
                                                <Text style={styles.profileSectionTitle}>Health Notes</Text>
                                                <View style={styles.profileTagList}>
                                                    {onboardingProfile.health_conditions.map((cond, i) => (
                                                        <View key={i} style={[styles.profileTag, { backgroundColor: 'rgba(201, 162, 39, 0.1)', borderColor: 'rgba(201, 162, 39, 0.3)' }]}>
                                                            <Text style={[styles.profileTagText, { color: '#C9A227' }]}>{cond}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}

                                        {/* Completed At */}
                                        {onboardingProfile.onboarding_completed_at && (
                                            <Text style={styles.profileCompletedAt}>
                                                Profile created {new Date(onboardingProfile.onboarding_completed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 24 }}>No profile data found.</Text>
                                )}
                            </ScrollView>

                            <TouchableOpacity style={styles.profileModalDone} onPress={() => setShowSleepProfileModal(false)}>
                                <Text style={styles.profileModalDoneText}>Done</Text>
                            </TouchableOpacity>
                        </GlassCard>
                    </View>
                </Modal>

                {/* VIP Support Modal */}
                <Modal visible={showVipSupportModal} transparent animationType="slide" onRequestClose={() => setShowVipSupportModal(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.vipModalContent}>
                            {/* Header */}
                            <View style={styles.profileModalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={[styles.iconWrapper, { backgroundColor: 'rgba(201, 162, 39, 0.15)', marginRight: 10 }]}>
                                        <Star size={20} color="#C9A227" fill="#C9A227" />
                                    </View>
                                    <Text style={styles.profileModalTitle}>VIP Support</Text>
                                </View>
                                <TouchableOpacity onPress={() => setShowVipSupportModal(false)} style={styles.profileModalClose}>
                                    <X size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.vipModalSubtitle}>
                                Reach us directly for priority assistance. We typically respond within a few hours.
                            </Text>

                            {/* Telegram */}
                            <TouchableOpacity style={styles.vipChannelCard} onPress={() => { setShowVipSupportModal(false); handleOpenVipSupport('telegram'); }} activeOpacity={0.85}>
                                <View style={[styles.vipChannelIcon, { backgroundColor: 'rgba(0, 136, 204, 0.15)' }]}>
                                    <Headphones size={28} color="#0088CC" />
                                </View>
                                <View style={styles.vipChannelInfo}>
                                    <Text style={styles.vipChannelName}>Telegram</Text>
                                    <Text style={styles.vipChannelDesc}>Fastest response · Chat in real time</Text>
                                </View>
                                <ChevronRight size={20} color="#0088CC" />
                            </TouchableOpacity>

                            {/* WhatsApp */}
                            <TouchableOpacity style={styles.vipChannelCard} onPress={() => { setShowVipSupportModal(false); handleOpenVipSupport('whatsapp'); }} activeOpacity={0.85}>
                                <View style={[styles.vipChannelIcon, { backgroundColor: 'rgba(37, 211, 102, 0.15)' }]}>
                                    <Heart size={28} color="#25D366" />
                                </View>
                                <View style={styles.vipChannelInfo}>
                                    <Text style={styles.vipChannelName}>WhatsApp</Text>
                                    <Text style={styles.vipChannelDesc}>Message us on WhatsApp anytime</Text>
                                </View>
                                <ChevronRight size={20} color="#25D366" />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.profileModalDone, { marginTop: 10 }]} onPress={() => setShowVipSupportModal(false)}>
                                <Text style={styles.profileModalDoneText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Push Notification Prompt */}
                {showPushPrompt && user && <PushNotificationPrompt userId={user.id} trigger="settings" />}
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F111A' },
    gradient: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20 },
    header: { marginBottom: 24 },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    subtitle: { fontSize: 16, color: '#94A3B8' },
    card: {
        backgroundColor: 'rgba(27, 29, 42, 0.7)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    premiumCardBorder: {
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 5,
    },
    cardTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginLeft: 8 },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingLabel: { fontSize: 16, color: '#FFFFFF', marginLeft: 12 },
    settingSubLabel: { fontSize: 13, color: '#94A3B8', marginLeft: 12, marginTop: 2 },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    vipBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    vipBadgeText: { color: '#FFD700', fontSize: 10, fontWeight: '900' },
    expiryLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2, marginLeft: 12 },
    notificationBanner: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
    notificationBannerGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    notificationBannerText: { flex: 1 },
    notificationBannerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    notificationBannerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
    signOutButton: { marginTop: 10 },
    signOutCard: {
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    signOutText: { fontSize: 16, fontWeight: '600', color: '#FF6B6B', marginLeft: 8 },
    bottomSpacing: { height: 40 },
    fluidBackgroundContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    fluidCircle1: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: '#C9A227',
        opacity: 0.1,
        top: -50,
        left: -50,
    },
    fluidCircle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#9B7ED9',
        opacity: 0.1,
        bottom: -50,
        right: -50,
    },
    sleepProfileHeaderCompact: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
    sleepProfileContentCompact: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(27, 29, 42, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    sleepProfileTopCompact: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    profileIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sleepProfileTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
    sleepProfileSubtitleCompact: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
    activeProfileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 209, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 8,
    },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00FFD1', marginRight: 4 },
    activeText: { color: '#00FFD1', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    profileAction: { flexDirection: 'row', alignItems: 'center' },
    profileActionText: { color: '#00FFD1', fontSize: 14, fontWeight: '600' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        backgroundColor: 'rgba(27, 29, 42, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    confirmHeader: { alignItems: 'center', marginBottom: 24 },
    confirmTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginTop: 16, marginBottom: 8, textAlign: 'center' },
    confirmMessage: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
    confirmActions: { flexDirection: 'row' },
    confirmCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    confirmCancelText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    confirmConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#C9A227',
    },
    confirmConfirmText: { color: '#000000', fontSize: 16, fontWeight: '700' },

    // Sleep Profile Modal
    profileModalContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        backgroundColor: 'rgba(27, 29, 42, 0.97)',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 209, 0.2)',
        overflow: 'hidden',
    },
    profileModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    profileModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    profileModalClose: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileSection: {
        marginBottom: 18,
    },
    profileSectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#00FFD1',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    profileRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    profileChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
    },
    profileChipLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    profileChipValue: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    profileTagList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    profileTag: {
        backgroundColor: 'rgba(0, 255, 209, 0.08)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 209, 0.2)',
    },
    profileTagText: {
        fontSize: 13,
        color: '#00FFD1',
        fontWeight: '500',
    },
    profileCompletedAt: {
        fontSize: 12,
        color: '#4A5568',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    profileModalDone: {
        marginTop: 20,
        backgroundColor: 'rgba(0, 255, 209, 0.1)',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 209, 0.3)',
    },
    profileModalDoneText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#00FFD1',
    },

    // VIP Support Modal
    vipModalContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        backgroundColor: 'rgba(20, 22, 35, 0.98)',
        borderWidth: 1,
        borderColor: 'rgba(201, 162, 39, 0.25)',
        overflow: 'hidden',
    },
    vipModalSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        lineHeight: 20,
        marginBottom: 20,
        textAlign: 'center',
    },
    vipChannelCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    vipChannelIcon: {
        width: 52,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    vipChannelInfo: {
        flex: 1,
    },
    vipChannelName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 3,
    },
    vipChannelDesc: {
        fontSize: 13,
        color: '#94A3B8',
    },
});

export default SettingsScreen;
