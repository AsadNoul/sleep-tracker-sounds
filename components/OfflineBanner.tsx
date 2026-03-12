import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useOfflineMode } from '../contexts/OfflineModeContext';
import { useAppTheme } from '../hooks/useAppTheme';

export default function OfflineBanner() {
    const { isOffline, offlineMessage } = useOfflineMode();
    const { theme, isDark } = useAppTheme();

    if (!isOffline || !offlineMessage) return null;

    return (
        <View style={[styles.banner, { backgroundColor: isDark ? '#D97706' : '#F59E0B' }]}>
            <WifiOff size={16} color="#FFF" />
            <Text style={styles.text}>{offlineMessage}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        rowGap: 8, columnGap: 8,
    },
    text: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
});
