/**
 * AnimatedPressable
 * Drop-in replacement for TouchableOpacity that adds:
 *  • Scale spring on press-in / press-out (Reanimated, runs on UI thread)
 *  • Optional haptic feedback via expo-haptics
 *  • Configurable scale factor and haptic style
 */
import React from 'react';
import { StyleProp, ViewStyle, Pressable, GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// ─── Props ────────────────────────────────────────────────────────────────
interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  /** Scale when pressed (default 0.95) */
  activeScale?: number;
  /** Haptic style. Pass false to disable. Default: 'light' */
  haptic?: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' | false;
  disabled?: boolean;
  /** extra activeOpacity-like feel — dims slightly on press */
  dimOnPress?: boolean;
  /** For accessibility */
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
  testID?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AnimatedPressableComponent({
  children,
  onPress,
  onLongPress,
  style,
  activeScale = 0.95,
  haptic = 'light',
  disabled = false,
  dimOnPress = true,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
}: AnimatedPressableProps) {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // ── Press handlers ──────────────────────────────────────────────────────
  const handlePressIn = () => {
    scale.value   = withSpring(activeScale, { damping: 15, stiffness: 300 });
    opacity.value = withSpring(dimOnPress ? 0.85 : 1, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value   = withSpring(1, { damping: 12, stiffness: 200 });
    opacity.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (haptic) {
      triggerHaptic(haptic);
    }
    onPress?.(event);
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    if (haptic) {
      triggerHaptic('medium');
    }
    onLongPress?.(event);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={onLongPress ? handleLongPress : undefined}
      disabled={disabled}
      style={[animatedStyle, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}

// ─── Haptics helper ───────────────────────────────────────────────────────
function triggerHaptic(style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid') {
  try {
    switch (style) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'soft':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        break;
      case 'rigid':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Haptics not available on this device — fail silently
  }
}

export { triggerHaptic };
