import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing as ReEasing,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard: React.FC<{ style?: any }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width="60%" height={24} style={styles.mb12} />
      <SkeletonLoader width="100%" height={16} style={styles.mb8} />
      <SkeletonLoader width="80%" height={16} />
    </View>
  );
};

export const SkeletonStatCard: React.FC<{ style?: any }> = ({ style }) => {
  return (
    <View style={[styles.statCard, style]}>
      <SkeletonLoader width={40} height={40} borderRadius={20} style={styles.mb12} />
      <SkeletonLoader width="80%" height={20} style={styles.mb8} />
      <SkeletonLoader width="60%" height={14} />
    </View>
  );
};

export const SkeletonList: React.FC<{ count?: number; style?: any }> = ({ count = 3, style }) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={styles.mb16} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
  },
  mb8: {
    marginBottom: 8,
  },
  mb12: {
    marginBottom: 12,
  },
  mb16: {
    marginBottom: 16,
  },
});

// ─────────────────────────────────────────────────────────────────────────
// ✨  SHIMMER LOADERS  (Reanimated-based left-to-right light sweep)
// All existing exports above are untouched.
// ─────────────────────────────────────────────────────────────────────────

/** Base shimmer rectangle — animated left-to-right highlight sweep */
interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  // Sweep from left-edge to right-edge of screen
  const SHIMMER_WIDTH = 220;
  const translateX = useSharedValue(-SHIMMER_WIDTH);

  React.useEffect(() => {
    translateX.value = -SHIMMER_WIDTH;
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH + SHIMMER_WIDTH, {
        duration: 1200,
        easing: ReEasing.linear,
      }),
      -1,
      false,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.07)',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <ReAnimated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: SHIMMER_WIDTH,
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255,255,255,0)',
            'rgba(255,255,255,0.16)',
            'rgba(255,255,255,0)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </ReAnimated.View>
    </View>
  );
};

/** Shimmer card — mirrors SkeletonCard layout with the shimmer sweep effect */
export const ShimmerCard: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[shimmerStyles.card, style]}>
    <ShimmerLoader width="55%" height={22} style={shimmerStyles.mb12} />
    <ShimmerLoader width="100%" height={14} style={shimmerStyles.mb8} />
    <ShimmerLoader width="75%" height={14} />
  </View>
);

/** Shimmer stat card — mirrors SkeletonStatCard layout */
export const ShimmerStatCard: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[shimmerStyles.statCard, style]}>
    <ShimmerLoader width={44} height={44} borderRadius={22} style={shimmerStyles.mb12} />
    <ShimmerLoader width="80%" height={18} style={shimmerStyles.mb8} />
    <ShimmerLoader width="55%" height={13} />
  </View>
);

/** Convenience: renders a column of ShimmerCards */
export const ShimmerList: React.FC<{ count?: number; style?: any }> = ({
  count = 3,
  style,
}) => (
  <View style={style}>
    {Array.from({ length: count }).map((_, i) => (
      <ShimmerCard key={i} style={shimmerStyles.mb16} />
    ))}
  </View>
);

const shimmerStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flex: 1,
  },
  mb8:  { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
});
