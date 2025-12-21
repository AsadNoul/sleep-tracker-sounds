import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export default function Toast({
  message,
  type = 'success',
  visible,
  onHide,
  duration = 3000
}: ToastProps) {
  const { theme, isDark } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onHide());
  };

  if (!visible) return null;

  const renderIcon = () => {
    const size = 24;
    const color = getColor();
    switch (type) {
      case 'success':
        return <CheckCircle2 size={size} color={color} />;
      case 'error':
        return <XCircle size={size} color={color} />;
      case 'warning':
        return <AlertTriangle size={size} color={color} />;
      case 'info':
        return <Info size={size} color={color} />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return theme.colors.accent;
      case 'error':
        return theme.colors.danger;
      case 'warning':
        return theme.colors.premium;
      case 'info':
        return theme.colors.highlight;
    }
  };

  return (
    <Animated.View
      style={[
        styles(theme).container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={hideToast}>
        <BlurView intensity={80} tint="dark" style={styles(theme).toastContent}>
          {renderIcon()}
          <Text style={styles(theme).message}>{message}</Text>
          <TouchableOpacity onPress={hideToast} style={styles(theme).closeButton}>
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10000,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(27, 29, 42, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  message: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
});
