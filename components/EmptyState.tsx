import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon, Moon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../hooks/useAppTheme';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon = Moon,
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  const { theme, isDark } = useAppTheme();
  return (
    <View style={styles(theme).container}>
      <BlurView intensity={20} tint="dark" style={styles(theme).content}>
        <View style={styles(theme).iconContainer}>
          <Icon size={80} color={theme.colors.accent} />
        </View>

        <Text style={styles(theme).title}>{title}</Text>
        <Text style={styles(theme).description}>{description}</Text>

        {actionLabel && onAction && (
          <TouchableOpacity style={styles(theme).actionButton} onPress={onAction}>
            <Text style={styles(theme).actionButtonText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </BlurView>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 209, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.background,
  },
});
