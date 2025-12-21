import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { CloudOff, Cloud } from 'lucide-react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export default function NetworkStatus() {
  const { theme, isDark } = useAppTheme();
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      setIsOnline(online);

      if (!online) {
        // Show offline banner
        setShowBanner(true);
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      } else if (showBanner) {
        // Hide banner when back online
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => setShowBanner(false), 300);
        });
      }
    });

    return () => unsubscribe();
  }, [showBanner]);

  if (!showBanner) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles(theme).banner,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: isOnline ? theme.colors.success : theme.colors.danger,
        },
      ]}
    >
      {isOnline ? (
        <Cloud size={20} color={theme.colors.textPrimary} />
      ) : (
        <CloudOff size={20} color={theme.colors.textPrimary} />
      )}
      <Text style={styles(theme).text}>
        {isOnline ? 'Back Online' : 'No Internet Connection'}
      </Text>
    </Animated.View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    gap: 8,
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
