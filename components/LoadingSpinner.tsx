import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../hooks/useAppTheme';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export default function LoadingSpinner({
  message = 'Loading...',
  fullScreen = false,
  size = 'large'
}: LoadingSpinnerProps) {
  const { theme, isDark } = useAppTheme();
  if (fullScreen) {
    return (
      <View style={styles(theme).fullScreenContainer}>
        <BlurView intensity={80} tint="dark" style={styles(theme).blurContainer}>
          <ActivityIndicator size={size} color={theme.colors.accent} />
          {message && <Text style={styles(theme).message}>{message}</Text>}
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles(theme).inlineContainer}>
      <ActivityIndicator size={size} color={theme.colors.accent} />
      {message && <Text style={styles(theme).message}>{message}</Text>}
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  blurContainer: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 150,
  },
  inlineContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
});
