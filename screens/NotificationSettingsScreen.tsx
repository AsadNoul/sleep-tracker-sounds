import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { saveSettings, loadSettings } from '../utils/storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';

interface OnboardingProfile {
    preferred_bed_time?: string;
}

const NotificationSettingsScreen = () => {
    const { theme } = useAppTheme();
    const s = styles(theme);
    const insets = useSafeAreaInsets();
    const bottomMargin = useSafeBottomMargin();
    const navigation = useNavigation();
    const { user, saveUserSettings } = useAuth();

    const [morningReportReady, setMorningReportReady] = useState(true);
    const [windDownReminder, setWindDownReminder] = useState(false);
    const [weeklySummary, setWeeklySummary] = useState(false);
    const [preferredBedTime, setPreferredBedTime] = useState<string | undefined>(undefined);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const savedSettings = await loadSettings();
            if (savedSettings) {
                setMorningReportReady(savedSettings.notifications ?? true);
                setWindDownReminder(savedSettings.sleepReminder ?? false);
                setWeeklySummary(savedSettings.weeklySummary ?? false);
            }
            setLoaded(true);
        };
        loadData();
    }, []);

    useEffect(() => {
        const loadBedTime = async () => {
            if (!user || user.id === 'guest') return;
            try {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('preferred_bed_time')
                    .eq('id', user.id)
                    .single();
                if (data?.preferred_bed_time) {
                    setPreferredBedTime(data.preferred_bed_time);
                    return;
                }
            } catch {}
            try {
                const cached = await AsyncStorage.getItem('@cached_onboarding_profile');
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed?.preferred_bed_time) setPreferredBedTime(parsed.preferred_bed_time);
                }
            } catch {}
        };
        loadBedTime();
    }, [user]);

    useEffect(() => {
        if (!loaded) return;
        const settings = {
            notifications: morningReportReady,
            sleepReminder: windDownReminder,
            weeklySummary,
        };
        saveSettings(settings);

        if (user && user.id !== 'guest') {
            saveUserSettings(settings).catch(err => {
                console.error('Failed to sync settings to cloud:', err);
            });
        }
    }, [morningReportReady, windDownReminder, weeklySummary, loaded, user, saveUserSettings]);

    useEffect(() => {
        const handleSleepReminder = async () => {
            if (!windDownReminder) {
                await notificationService.cancelBedtimeReminder();
                return;
            }
            if (!preferredBedTime) return;

            const [hours, minutes] = preferredBedTime.split(':');
            const bedtime = new Date();
            bedtime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            await notificationService.scheduleBedtimeReminder(bedtime);
        };

        handleSleepReminder().catch(err =>
            console.error('Failed to update sleep reminder:', err)
        );
    }, [windDownReminder, preferredBedTime]);

    const handleWindDownToggle = (value: boolean) => {
        if (value && !preferredBedTime) {
            Alert.alert(
                'Set Bedtime First',
                'To enable wind-down reminders, you need to set your preferred bedtime. Please complete the onboarding or update your profile settings.',
                [{ text: 'OK', style: 'default' }]
            );
            return;
        }
        setWindDownReminder(value);
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
                    <Text style={s.title}>Notifications</Text>
                </View>

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

                <View style={s.bottomSpacing} />
            </ScrollView>
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
    rowLabel: {
        fontFamily: theme.typography.fontFamily.bodySemibold,
        fontSize: 15,
        color: theme.colors.textPrimary,
    },
    bottomSpacing: { height: 40 },
});

export default NotificationSettingsScreen;
