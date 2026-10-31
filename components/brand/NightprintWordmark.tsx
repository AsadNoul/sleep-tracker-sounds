import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import NightprintLogo, { NightprintLogoVariant } from './NightprintLogo';

interface NightprintWordmarkProps {
  size?: number;
  variant?: NightprintLogoVariant;
  layout?: 'horizontal' | 'stacked';
  textColor?: string;
}

export default function NightprintWordmark({
  size = 48,
  variant,
  layout = 'horizontal',
  textColor,
}: NightprintWordmarkProps) {
  const { theme, isDark } = useAppTheme();
  const resolvedVariant = variant ?? (isDark ? 'dark' : 'light');
  const resolvedTextColor = textColor ?? theme.colors.textPrimary;
  const fontFamily = theme.typography.fontFamily.displaySemibold ?? theme.typography.fontFamily.bold;

  return (
    <View style={layout === 'stacked' ? styles.stacked : styles.horizontal}>
      <NightprintLogo size={size} variant={resolvedVariant} />
      <Text
        style={[
          styles.text,
          {
            fontFamily,
            color: resolvedTextColor,
            fontSize: size * 0.42,
            marginTop: layout === 'stacked' ? size * 0.12 : 0,
            marginLeft: layout === 'horizontal' ? size * 0.14 : 0,
          },
        ]}
      >
        Nightprint
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  horizontal: { flexDirection: 'row', alignItems: 'center' },
  stacked: { alignItems: 'center' },
  text: { letterSpacing: -0.5 },
});
