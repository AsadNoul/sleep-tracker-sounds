import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { saveSettings, loadSettings } from '../utils/storage';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../contexts/AuthContext';

type MovementSensitivity = 'Low' | 'Normal' | 'High';
const MOVEMENT_LEVELS: MovementSensitivity[] = ['Low', 'Normal', 'High'];

const TrackingSettingsScreen = () => {
    const { theme } = useAppTheme();
    const s = styles(theme);
    const insets = useSafeAreaInsets();
    const bottomMargin = useSafeBottomMargin();
    const navigation = useNavigation();
    const { user, saveUserSettings } = useAuth();

    const [snoreDetection, setSnoreDetection] = useState(true);
    const [movementSensitivity, setMovementSensitivity] = useState<MovementSensitivity>('Normal');
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            const savedSettings = await loadSettings();
            if (savedSettings) {
                setSnoreDetection(savedSettings.snoreDetection ?? true);
                if (MOVEMENT_LEVELS.includes(savedSettings.movementSensitivity)) {
                    setMovementSensitivity(savedSettings.movementSensitivity);
                }
            }
            setLoaded(true);
        };
        loadData();
    }, []);

    useEffect(() => {
        if (!loaded) return;
        const settings = { snoreDetection, movementSensitivity };
        saveSettings(settings);

        if (user && user.id !== 'guest') {
            saveUserSettings(settings).catch(err => {
                console.error('Failed to sync settings to cloud:', err);
            });
        }
    }, [snoreDetection, movementSensitivity, loaded, user, saveUserSettings]);

    const handleMovementSensitivityPress = () => {
        const currentIndex = MOVEMENT_LEVELS.indexOf(movementSensitivity);
        const next = MOVEMENT_LEVELS[(currentIndex + 1) % MOVEMENT_LEVELS.length];
        setMovementSensitivity(next);
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
                    <Text style={s.title}>Tracking</Text>
                </View>

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
    bottomSpacing: { height: 40 },
});

export default TrackingSettingsScreen;
