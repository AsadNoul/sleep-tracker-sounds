import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

const { width, height } = Dimensions.get('window');

// Import your space images
const spaceImages = [
  require('../assets/space1.jpg'), // Galaxy spiral
  require('../assets/space2.jpg'), // Aurora clouds
  require('../assets/space3.jpg'), // Starfield
  require('../assets/space4.jpg'), // Sunset nebula
  require('../assets/space5.jpg'), // Purple nebula
];

interface SleepBackgroundAnimationProps {
  duration?: number; // Duration in seconds for each image
  transitionDuration?: number; // Transition duration in seconds
}

export default function SleepBackgroundAnimation({
  duration = 300, // 5 minutes per image by default
  transitionDuration = 3, // 3 seconds fade transition
}: SleepBackgroundAnimationProps) {
  const { theme, isDark } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start the image rotation
    const interval = setInterval(() => {
      // Fade out and zoom in slightly
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: transitionDuration * 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: transitionDuration * 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Change image
        setCurrentIndex((prevIndex) => (prevIndex + 1) % spaceImages.length);

        // Reset scale and fade in
        scaleAnim.setValue(1);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: transitionDuration * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: duration * 1000,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, duration * 1000);

    return () => clearInterval(interval);
  }, [duration, transitionDuration]);

  return (
    <View style={styles.container}>
      {/* Background layer - shows next image */}
      <Image
        source={spaceImages[(currentIndex + 1) % spaceImages.length]}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Animated foreground layer - current image */}
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Image
          source={spaceImages[currentIndex]}
          style={styles.image}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Dark overlay for better text visibility */}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
  },
  animatedContainer: {
    ...StyleSheet.absoluteFillObject,
    width,
    height,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Subtle dark overlay
  },
});
