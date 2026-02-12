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
    Headphones
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
    <GlassCard intensity={intensity} tint={tint} style={style}>
      {children}
    </GlassCard>
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

const SLEEP_GOAL_LABELS: Record<string, string> = {
    fall_asleep_faster: 'Fall asleep faster',
    sleep_longer: 'Sleep longer',
    reduce_stress: 'Reduce stress',
    improve_quality: 'Improve quality',
    wake_refreshed: 'Wake refreshed',
    establish_routine: 'Establish routine',
};

export default function SettingsScreen() {
    const { theme } = useAppTheme();
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
        isDestructive?: boolean;
    } | null>(null);

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
        };
        loadData();
    }, []);

    // Load onboarding profile data
    useEffect(() => {
        if (user) {
            loadOnboardingData();
        }
    }, [user]);

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
            } else {
                setOnboardingProfile(data);
            }
        } catch (error) {
            console.error('Error loading onboarding data:', error);
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
            // If toggle is off, cancel any existing reminder
            if (!sleepReminder) {
                await notificationService.cancelBedtimeReminder();
                console.log('Sleep reminder cancelled');
                return;
            }

            // If toggle is on, check if user has set a bedtime
            if (!onboardingProfile?.preferred_bed_time) {
                console.log('No bedtime set - cannot schedule reminder');
                // Don't spam cancel logs, just skip scheduling
                return;
            }

            // Schedule bedtime reminder based on user's preferred bedtime
            const [hours, minutes] = onboardingProfile.preferred_bed_time.split(':');
            const bedtime = new Date();
            bedtime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            await notificationService.scheduleBedtimeReminder(bedtime);
            console.log('Sleep reminder scheduled for', onboardingProfile.preferred_bed_time);
        };

        handleSleepReminder().catch(err =>
            console.error('Failed to update sleep reminder:', err)
        );
    }, [sleepReminder, onboardingProfile]);

    const handleSleepReminderToggle = (value: boolean) => {
        // If trying to enable sleep reminder without bedtime, show alert
        if (value && !onboardingProfile?.preferred_bed_time) {
            Alert.alert(
                'Set Bedtime First',
                'To enable sleep reminders, you need to set your preferred bedtime. Please complete the onboarding or update your profile settings.',
                [
                    { text: 'OK', style: 'default' }
                ]
            );
            return; // Don't enable the toggle
        }

        // Otherwise, toggle normally
        setSleepReminder(value);
    };

    const handleThemeModeChange = async () => {
        const modes: ThemeMode[] = ['dark', 'light', 'auto'];
        const currentIndex = modes.indexOf(themeMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        await setThemeMode(nextMode);
    };

    const getThemeModeLabel = () => {
        switch (themeMode) {
            case 'dark':
                return 'Dark';
            case 'light':
                return 'Light';
            case 'auto':
                return 'Auto';
        }
    };

    const navigateToSubscription = () => {
        navigation.navigate('Subscription');
    };

    const navigateToPrivacySettings = () => {
        navigation.navigate('PrivacySettings');
    };

    const navigateToHelpSupport = () => {
        navigation.navigate('HelpSupport');
    };

    const navigateToProfile = () => {
        navigation.navigate('Profile');
    };

    const navigateToAbout = () => {
        navigation.navigate('About');
    };

    const navigateToBedtimeRoutine = () => {
        navigation.navigate('BedtimeRoutine' as any);
    };

    const navigateToDreamJournal = () => {
        navigation.navigate('DreamJournal' as any);
    };

    const navigateToRoomEnvironment = () => {
        navigation.navigate('RoomEnvironment' as any);
    };

    const navigateToSleepStages = () => {
        navigation.navigate('SleepStages' as any);
    };

    const navigateToSnoreDetection = () => {
        navigation.navigate('SnoreDetection' as any);
    };

    const navigateToHealthTracking = () => {
        navigation.navigate('HealthTracking' as any);
    };

    const navigateToRelaxationLibrary = () => {
        navigation.navigate('RelaxationLibrary' as any);
    };

    const navigateToPartnerMode = () => {
        navigation.navigate('PartnerMode' as any);
    };

    const navigateToSleepInterruptions = () => {
        navigation.navigate('SleepInterruptions' as any);
    };

    const navigateToCaffeineCalculator = () => {
        navigation.navigate('CaffeineCalculator' as any);
    };

    const handleExportData = async () => {
        try {
            // Get all data from AsyncStorage
            const keys = await AsyncStorage.getAllKeys();
            const result = await AsyncStorage.multiGet(keys);

            // Create a formatted data object
            const exportData: Record<string, any> = {};
            result.forEach(([key, value]) => {
                try {
                    exportData[key] = value ? JSON.parse(value) : value;
                } catch {
                    exportData[key] = value;
                }
            });

            // Create JSON string
            const jsonData = JSON.stringify(exportData, null, 2);
            const dataToShare = `Sleep Architect Data Export\nExported: ${new Date().toLocaleString()}\n\n${jsonData}`;

            // Share the data
            await Share.share({
                message: dataToShare,
                title: 'Sleep Architect Data Export',
            });

            Alert.alert('Success', 'Your data has been prepared for export. You can save it or share it via your preferred app.');
        } catch (error) {
            Alert.alert('Error', 'Failed to export data. Please try again.');
            console.error('Export error:', error);
        }
    }

    const showConfirm = (config: any) => {
        setConfirmConfig(config);
        setConfirmModalVisible(true);
    };

    const handleSignOut = () => {
        showConfirm({
            title: 'Sign Out',
            message: 'Are you sure you want to sign out?',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await signOut();
                } catch (error) {
                    Alert.alert('Error', 'Failed to sign out. Please try again.');
                }
            },
        });
    };

    const handleDeleteAccount = () => {
        if (user?.id === 'guest') {
            Alert.alert('Guest Mode', 'You are in guest mode. Create an account to access data deletion features.');
            return;
        }

        showConfirm({
            title: 'Delete Account',
            message: 'This will permanently delete your account and all associated data including sleep sessions, journal entries, and settings. This action cannot be undone. Are you absolutely sure?',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    await deleteAccount();
                    Alert.alert('Success', 'Your account has been deleted successfully.');
                } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to delete account. Please try again or contact support.');
                }
            },
        });
    };

    const translateX1 = animatedValue1.interpolate({
        inputRange: [0, 1],
        outputRange: [-50, 50],
    });

    const translateY1 = animatedValue1.interpolate({
        inputRange: [0, 1],
        outputRange: [-30, 30],
    });

    const translateX2 = animatedValue2.interpolate({
        inputRange: [0, 1],
        outputRange: [30, -30],
    });

    const translateY2 = animatedValue2.interpolate({
        inputRange: [0, 1],
        outputRange: [40, -40],
    });

    const renderSleepProfileHeader = () => {
        // If no profile or onboarding not completed, show a "Complete Your Profile" placeholder
        if (!onboardingProfile || !onboardingProfile.onboarding_completed_at) {
            return (
                <TouchableOpacity
                    style={styles.sleepProfileHeader}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <View style={styles.fluidBackgroundContainer}>
                        <Animated.View style={[styles.fluidCircle1, { transform: [{ translateX: translateX1 }, { translateY: translateY1 }] }]} />
                        <Animated.View style={[styles.fluidCircle2, { transform: [{ translateX: translateX2 }, { translateY: translateY2 }] }]} />
                    </View>
                    <GlassCard intensity={30} tint="dark" style={styles.sleepProfileContent}>
                        <View style={styles.sleepProfileTop}>
                            <User size={32} color={theme.colors.accent} />
                            <View style={styles.sleepProfileTopText}>
                                <Text style={styles.sleepProfileTitle}>Complete Your Profile</Text>
                                <Text style={styles.sleepProfileSubtitle}>Personalize your sleep journey</Text>
                            </View>
                        </View>
                        <View style={styles.completeProfileRow}>
                            <View style={styles.completeProfileButton}>
                                <Text style={styles.completeProfileButtonText}>Get Started</Text>
                                <ChevronRight size={18} color="#000" />
                            </View>
                        </View>
                    </GlassCard>
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.sleepProfileHeader}>
                {/* Animated Fluid Background */}
                <View style={styles.fluidBackgroundContainer}>
                    <Animated.View
                        style={[
                            styles.fluidCircle1,
                            {
                                transform: [
                                    { translateX: translateX1 },
                                    { translateY: translateY1 },
                                ],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.fluidCircle2,
                            {
                                transform: [
                                    { translateX: translateX2 },
                                    { translateY: translateY2 },
                                ],
                            },
                        ]}
                    />
                </View>

                <GlassCard intensity={30} tint="dark" style={styles.sleepProfileContent}>
                    <View style={styles.sleepProfileTop}>
                        <Moon size={32} color={theme.colors.accent} />
                        <View style={styles.sleepProfileTopText}>
                            <Text style={styles.sleepProfileTitle}>Sleep Profile</Text>
                            <Text style={styles.sleepProfileSubtitle}>Your personalized sleep data</Text>
                        </View>
                    </View>

                    <View style={styles.sleepStatsRow}>
                        {/* Average Sleep Hours */}
                        {onboardingProfile.average_sleep_hours && (
                            <View style={styles.statBox}>
                                <Clock size={24} color={theme.colors.accent} />
                                <Text style={styles.statValue}>{onboardingProfile.average_sleep_hours}h</Text>
                                <Text style={styles.statLabel}>Avg Sleep</Text>
                            </View>
                        )}

                        {/* Sleep Goals Count */}
                        {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 && (
                            <View style={styles.statBox}>
                                <Flag size={24} color={theme.colors.highlight} />
                                <Text style={styles.statValue}>{onboardingProfile.sleep_goals.length}</Text>
                                <Text style={styles.statLabel}>Goals</Text>
                            </View>
                        )}

                        {/* Age */}
                        {onboardingProfile.age && (
                            <View style={styles.statBox}>
                                <User size={24} color="#9D4EDD" />
                                <Text style={styles.statValue}>{onboardingProfile.age}</Text>
                                <Text style={styles.statLabel}>Age</Text>
                            </View>
                        )}
                    </View>

                    {/* Sleep Goals Tags */}
                    {onboardingProfile.sleep_goals && onboardingProfile.sleep_goals.length > 0 && (
                        <View style={styles.goalsContainer}>
                            <Text style={styles.goalsTitle}>Your Goals:</Text>
                            <View style={styles.goalsTags}>
                                {onboardingProfile.sleep_goals.slice(0, 3).map((goal) => (
                                    <View key={goal} style={styles.goalTag}>
                                        <Text style={styles.goalTagText}>
                                            {SLEEP_GOAL_LABELS[goal] || goal}
                                        </Text>
                                    </View>
                                ))}
                                {onboardingProfile.sleep_goals.length > 3 && (
                                    <View style={styles.goalTag}>
                                        <Text style={styles.goalTagText}>
                                            +{onboardingProfile.sleep_goals.length - 3} more
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </GlassCard>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F111A', '#1B1D2A']}
                style={styles.gradient}
            >
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{
                        paddingTop: insets.top + 20,
                        paddingBottom: bottomMargin
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                style={styles.backButton}
                            >
                                <ChevronLeft size={24} color={theme.colors.textPrimary} />
                            </TouchableOpacity>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.title}>Settings</Text>
                                <Text style={styles.subtitle}>Customize your experience</Text>
                            </View>
                        </View>
                    </View>

                    {/* Guest Banner */}
                    <GuestBanner />

                    {/* Sleep Profile Header */}
                    {!isLoadingProfile && renderSleepProfileHeader()}

                    {/* Account & Preferences */}
                    <GlassCard intensity={20} tint="dark" style={styles.card}>
                        <TouchableOpacity
                            style={styles.collapsibleHeader}
                            onPress={() => setAccountPreferencesExpanded(!accountPreferencesExpanded)}
                        >
                            <Text style={styles.cardTitle}>👤 Account & Preferences</Text>
                            <ChevronDown
                                size={24}
                                color="#A0AEC0"
                                style={{
                                    transform: [{ rotate: accountPreferencesExpanded ? '180deg' : '0deg' }]
                                }}
                            />
                        </TouchableOpacity>

                        {accountPreferencesExpanded && (
                            <>
                                <TouchableOpacity style={styles.settingItem} onPress={navigateToProfile}>
                                    <View style={styles.settingInfo}>
                                        <User size={24} color={theme.colors.accent} />
                                        <Text style={styles.settingLabel}>Profile</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToSubscription}
                                >
                                    <View style={styles.settingInfo}>
                                        <Star size={24} color={theme.colors.premium} />
                                        <Text style={styles.settingLabel}>Premium Subscription</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToPrivacySettings}
                                >
                                    <View style={styles.settingInfo}>
                                        <ShieldCheck size={24} color={theme.colors.highlight} />
                                        <Text style={styles.settingLabel}>Privacy Settings</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                {/* Admin Dashboard - Only visible to admin */}
                                {user?.email === 'admin@naulx.com' && (
                                    <TouchableOpacity
                                        style={styles.settingItem}
                                        onPress={() => navigation.navigate('Admin' as never)}
                                    >
                                        <View style={styles.settingInfo}>
                                            <Users size={24} color="#FF6B6B" />
                                            <Text style={styles.settingLabel}>Admin Dashboard</Text>
                                        </View>
                                        <ChevronRight size={20} color="#A0AEC0" />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity style={styles.settingItem} onPress={handleThemeModeChange}>
                                    <View style={styles.settingInfo}>
                                        {themeMode === 'dark' ? (
                                            <Moon size={24} color="#9D4EDD" />
                                        ) : themeMode === 'light' ? (
                                            <Sun size={24} color="#9D4EDD" />
                                        ) : (
                                            <Smartphone size={24} color="#9D4EDD" />
                                        )}
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={styles.settingLabel}>Theme</Text>
                                            <Text style={styles.settingSubLabel}>{getThemeModeLabel()}</Text>
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingInfo}>
                                        <Bell size={24} color={theme.colors.danger} />
                                        <Text style={styles.settingLabel}>Notifications</Text>
                                    </View>
                                    <Switch
                                        value={notifications}
                                        onValueChange={setNotifications}
                                        trackColor={{ false: '#333', true: theme.colors.accent }}
                                        thumbColor={notifications ? '#fff' : '#ccc'}
                                    />
                                </View>

                                <View style={styles.settingItem}>
                                    <View style={styles.settingInfo}>
                                        <Bell size={24} color={theme.colors.premium} />
                                        <Text style={styles.settingLabel}>Sleep Reminder</Text>
                                    </View>
                                    <Switch
                                        value={sleepReminder}
                                        onValueChange={handleSleepReminderToggle}
                                        trackColor={{ false: '#333', true: theme.colors.premium }}
                                        thumbColor={sleepReminder ? '#fff' : '#ccc'}
                                    />
                                </View>
                            </>
                        )}
                    </GlassCard>

                    {/* Sleep & Wellness */}
                    <GlassCard intensity={20} tint="dark" style={styles.card}>
                        <TouchableOpacity
                            style={styles.collapsibleHeader}
                            onPress={() => setSleepWellnessExpanded(!sleepWellnessExpanded)}
                        >
                            <Text style={styles.cardTitle}>🌙 Sleep & Wellness</Text>
                            <ChevronDown
                                size={24}
                                color="#A0AEC0"
                                style={{
                                    transform: [{ rotate: sleepWellnessExpanded ? '180deg' : '0deg' }]
                                }}
                            />
                        </TouchableOpacity>

                        {sleepWellnessExpanded && (
                            <>
                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToBedtimeRoutine}
                                >
                                    <View style={styles.settingInfo}>
                                        <CheckCircle2 size={24} color="#9D4EDD" />
                                        <Text style={styles.settingLabel}>Bedtime Routine</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToDreamJournal}
                                >
                                    <View style={styles.settingInfo}>
                                        <Book size={24} color="#FF9B7A" />
                                        <Text style={styles.settingLabel}>Dream Journal</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToRoomEnvironment}
                                >
                                    <View style={styles.settingInfo}>
                                        <Gauge size={24} color={theme.colors.highlight} />
                                        <Text style={styles.settingLabel}>Room Environment</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToSleepStages}
                                >
                                    <View style={styles.settingInfo}>
                                        <Activity size={24} color="#4ECDC4" />
                                        <Text style={styles.settingLabel}>Sleep Stages Detection</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToSnoreDetection}
                                >
                                    <View style={styles.settingInfo}>
                                        <Volume2 size={24} color="#F59E0B" />
                                        <Text style={styles.settingLabel}>Snore Detection</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToSleepInterruptions}
                                >
                                    <View style={styles.settingInfo}>
                                        <Clock size={24} color="#EF4444" />
                                        <Text style={styles.settingLabel}>Sleep Interruptions</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToRelaxationLibrary}
                                >
                                    <View style={styles.settingInfo}>
                                        <Headphones size={24} color="#A855F7" />
                                        <Text style={styles.settingLabel}>Relaxation Library</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToCaffeineCalculator}
                                >
                                    <View style={styles.settingInfo}>
                                        <Coffee size={24} color="#8B4513" />
                                        <Text style={styles.settingLabel}>Caffeine Calculator</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>
                            </>
                        )}
                    </GlassCard>

                    {/* Help & Legal */}
                    <GlassCard intensity={20} tint="dark" style={styles.card}>
                        <TouchableOpacity
                            style={styles.collapsibleHeader}
                            onPress={() => setHelpLegalExpanded(!helpLegalExpanded)}
                        >
                            <Text style={styles.cardTitle}>ℹ️ Help & Legal</Text>
                            <ChevronDown
                                size={24}
                                color="#A0AEC0"
                                style={{
                                    transform: [{ rotate: helpLegalExpanded ? '180deg' : '0deg' }]
                                }}
                            />
                        </TouchableOpacity>

                        {helpLegalExpanded && (
                            <>
                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToHelpSupport}
                                >
                                    <View style={styles.settingInfo}>
                                        <HelpCircle size={24} color="#32CD32" />
                                        <Text style={styles.settingLabel}>Help & Support</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToAbout}
                                >
                                    <View style={styles.settingInfo}>
                                        <FileText size={24} color="#FFA500" />
                                        <Text style={styles.settingLabel}>Terms of Service</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={navigateToAbout}
                                >
                                    <View style={styles.settingInfo}>
                                        <ShieldCheck size={24} color="#6366F1" />
                                        <Text style={styles.settingLabel}>Privacy Policy</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.settingItem} onPress={navigateToAbout}>
                                    <View style={styles.settingInfo}>
                                        <Info size={24} color="#87CEEB" />
                                        <Text style={styles.settingLabel}>About</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FeatureRequest' as never)}>
                                    <View style={styles.settingInfo}>
                                        <Lightbulb size={24} color="#F59E0B" />
                                        <Text style={styles.settingLabel}>Request a Feature</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                {/* Manage Alarms - Commented (available in main tab navigation) */}
                                {/* <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Alarms' as never)}>
                                    <View style={styles.settingInfo}>
                                        <Bell size={24} color="#8B5CF6" />
                                        <Text style={styles.settingLabel}>Manage Alarms</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity> */}
                            </>
                        )}
                    </GlassCard>

                    {/* Data & Actions */}
                    <GlassCard intensity={20} tint="dark" style={styles.card}>
                        <TouchableOpacity
                            style={styles.collapsibleHeader}
                            onPress={() => setDataActionsExpanded(!dataActionsExpanded)}
                        >
                            <Text style={styles.cardTitle}>🔒 Data & Actions</Text>
                            <ChevronDown
                                size={24}
                                color="#A0AEC0"
                                style={{
                                    transform: [{ rotate: dataActionsExpanded ? '180deg' : '0deg' }]
                                }}
                            />
                        </TouchableOpacity>

                        {dataActionsExpanded && (
                            <>
                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={handleExportData}
                                >
                                    <View style={styles.settingInfo}>
                                        <Download size={24} color="#4CAF50" />
                                        <Text style={styles.settingLabel}>Export My Data</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.settingItem}
                                    onPress={handleDeleteAccount}
                                >
                                    <View style={styles.settingInfo}>
                                        <Trash2 size={24} color={theme.colors.danger} />
                                        <Text style={styles.settingLabel}>Delete Account</Text>
                                    </View>
                                    <ChevronRight size={20} color="#A0AEC0" />
                                </TouchableOpacity>
                            </>
                        )}
                    </GlassCard>

                    {/* Sign Out */}
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                    >
                        <GlassCard intensity={20} tint="dark" style={styles.signOutCard}>
                            <LogOut size={24} color={theme.colors.danger} />
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </GlassCard>
                    </TouchableOpacity>

                    <View style={styles.bottomSpacing} />
                </ScrollView>

                {/* Confirmation Modal */}
                <Modal
                    visible={confirmModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setConfirmModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <GlassCard intensity={90} tint="dark" style={styles.confirmContent}>
                            <View style={styles.confirmHeader}>
                                {confirmConfig?.isDestructive ? (
                                    <Trash2 size={40} color={theme.colors.danger} />
                                ) : (
                                    <Info size={40} color={theme.colors.accent} />
                                )}
                                <Text style={styles.confirmTitle}>{confirmConfig?.title}</Text>
                                <Text style={styles.confirmMessage}>{confirmConfig?.message}</Text>
                            </View>

                            <View style={styles.confirmActions}>
                                <TouchableOpacity
                                    style={styles.confirmCancelButton}
                                    onPress={() => setConfirmModalVisible(false)}
                                >
                                    <Text style={styles.confirmCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.confirmConfirmButton,
                                        confirmConfig?.isDestructive && { backgroundColor: theme.colors.danger }
                                    ]}
                                    onPress={() => {
                                        setConfirmModalVisible(false);
                                        confirmConfig?.onConfirm();
                                    }}
                                >
                                    <Text style={styles.confirmConfirmText}>
                                        {confirmConfig?.isDestructive ? 'Delete' : 'Confirm'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                    </View>
                </Modal>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F111A',
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        marginBottom: 30,
    },
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
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 16,
        color: '#A0AEC0',
    },
    card: {
        backgroundColor: 'rgba(27, 29, 42, 0.7)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    collapsibleHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 4,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingLabel: {
        fontSize: 16,
        color: '#FFFFFF',
        marginLeft: 12,
    },
    settingSubLabel: {
        fontSize: 13,
        color: '#A0AEC0',
        marginLeft: 12,
        marginTop: 2,
    },
    signOutButton: {
        marginTop: 10,
    },
    signOutCard: {
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E57373',
        marginLeft: 8,
    },
    bottomSpacing: {
        height: 30,
    },
    sleepProfileHeader: {
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    fluidBackgroundContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    fluidCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: '#C9A227',
        opacity: 0.15,
        top: -50,
        left: -30,
    },
    fluidCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#9B7ED9',
        opacity: 0.15,
        bottom: -40,
        right: -20,
    },
    sleepProfileContent: {
        backgroundColor: 'rgba(27, 29, 42, 0.6)',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 209, 0.1)',
        overflow: 'hidden',
    },
    sleepProfileTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    sleepProfileTopText: {
        flex: 1,
    },
    sleepProfileTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    sleepProfileSubtitle: {
        fontSize: 14,
        color: '#A0AEC0',
    },
    sleepStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'rgba(201, 162, 39, 0.05)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 162, 39, 0.08)',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#A0AEC0',
        textAlign: 'center',
    },
    goalsContainer: {
        marginTop: 4,
    },
    goalsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A0AEC0',
        marginBottom: 10,
    },
    goalsTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    goalTag: {
        backgroundColor: 'rgba(201, 162, 39, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(201, 162, 39, 0.15)',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    goalTagText: {
        fontSize: 12,
        color: '#C9A227',
        fontWeight: '500',
    },
    completeProfileRow: {
        marginTop: 10,
        alignItems: 'flex-end',
    },
    completeProfileButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    completeProfileButtonText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    confirmContent: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        backgroundColor: 'rgba(27, 29, 42, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    confirmHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    confirmTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    confirmMessage: {
        fontSize: 16,
        color: '#A0AEC0',
        textAlign: 'center',
        lineHeight: 22,
    },
    confirmActions: {
        flexDirection: 'row',
        gap: 12,
    },
    confirmCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    confirmCancelText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#C9A227',
    },
    confirmConfirmText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '700',
    },
});
