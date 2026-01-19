import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface ThemedTextProps extends TextProps {
    variant?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black' | 'light';
    size?: 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'huge' | 'massive';
    color?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'white';
}

/**
 * ThemedText Component
 * Automatically applies Poppins font family and theme colors
 * 
 * Usage:
 * <ThemedText variant="bold" size="lg">Hello</ThemedText>
 * <ThemedText variant="medium" color="primary">Body text</ThemedText>
 */
export default function ThemedText({
    variant = 'regular',
    size,
    color,
    style,
    children,
    ...props
}: ThemedTextProps) {
    const { theme } = useAppTheme();

    const fontFamily = theme.typography.fontFamily[variant] || theme.typography.fontFamily.regular;
    const fontSize = size ? theme.typography.sizes[size] : undefined;

    const textColor = color
        ? color === 'primary' ? theme.colors.textPrimary
            : color === 'secondary' ? theme.colors.textSecondary
                : color === 'accent' ? theme.colors.accent
                    : color === 'success' ? theme.colors.success
                        : color === 'warning' ? theme.colors.warning
                            : color === 'error' ? theme.colors.error
                                : color === 'white' ? '#FFFFFF'
                                    : theme.colors.textPrimary
        : theme.colors.textPrimary;

    return (
        <RNText
            {...props}
            style={[
                { fontFamily, fontSize, color: textColor },
                style
            ]}
        >
            {children}
        </RNText>
    );
}
