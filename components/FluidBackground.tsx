import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface FluidBackgroundProps {
  color1?: string;
  color2?: string;
  color3?: string;
  style?: ViewStyle;
  animated?: boolean;
}

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

const FluidBackgroundComponent = ({
  color1 = '#4C1D95', // Deep Purple
  color2 = '#1E40AF', // Blue
  color3 = '#701A75', // Fuchsia
  style,
  animated = true,
}: FluidBackgroundProps) => {
  // Animation values for 3 large nebula "wisps"
  const wave1Pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const wave2Pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const wave3Pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const wave1Scale = useRef(new Animated.Value(1)).current;
  const wave2Scale = useRef(new Animated.Value(1)).current;
  const wave3Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    const animateWave = (pos: Animated.ValueXY, scale: Animated.Value, delay: number) => {
      const createMoveAnimation = () => {
        const randomX = (Math.random() - 0.5) * width;
        const randomY = (Math.random() - 0.5) * height;
        const randomScale = 0.8 + Math.random() * 1.2;
        const randomDuration = 25000 + Math.random() * 20000;

        Animated.parallel([
          Animated.timing(pos, {
            toValue: { x: randomX, y: randomY },
            duration: randomDuration,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: randomScale,
            duration: randomDuration,
            useNativeDriver: true,
          }),
        ]).start(() => createMoveAnimation());
      };

      setTimeout(createMoveAnimation, delay);
    };

    animateWave(wave1Pos, wave1Scale, 0);
    animateWave(wave2Pos, wave2Scale, 5000);
    animateWave(wave3Pos, wave3Scale, 10000);
  }, [animated]);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* Base Deep Space Background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#020617' }]} />
      
      {/* Starfield Image - Lower opacity for performance/clarity */}
      <Image 
        source={require('../assets/space3.jpg')} 
        style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} 
        resizeMode="cover"
      />

      {/* Svg Nebula Blobs - Optimized with Native Driver Transforms */}
      <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="grad1" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color1} stopOpacity="0.6" />
            <Stop offset="60%" stopColor={color1} stopOpacity="0.2" />
            <Stop offset="100%" stopColor={color1} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="grad2" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color2} stopOpacity="0.5" />
            <Stop offset="70%" stopColor={color2} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={color2} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="grad3" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={color3} stopOpacity="0.5" />
            <Stop offset="80%" stopColor={color3} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={color3} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        
        <AnimatedEllipse
          cx={width * 0.5}
          cy={height * 0.5}
          rx={width * 0.9}
          ry={width * 0.6}
          fill="url(#grad1)"
          style={{
            transform: [
              { translateX: wave1Pos.x },
              { translateY: wave1Pos.y },
              { scale: wave1Scale },
            ],
          }}
        />
        <AnimatedEllipse
          cx={width * 0.3}
          cy={height * 0.4}
          rx={width * 0.7}
          ry={width * 0.8}
          fill="url(#grad2)"
          style={{
            transform: [
              { translateX: wave2Pos.x },
              { translateY: wave2Pos.y },
              { scale: wave2Scale },
            ],
          }}
        />
        <AnimatedEllipse
          cx={width * 0.7}
          cy={height * 0.6}
          rx={width * 0.8}
          ry={width * 0.5}
          fill="url(#grad3)"
          style={{
            transform: [
              { translateX: wave3Pos.x },
              { translateY: wave3Pos.y },
              { scale: wave3Scale },
            ],
          }}
        />
      </Svg>

      {/* Vignette and Depth Gradients - Static overlays are cheap */}
      <LinearGradient
        colors={['rgba(2, 6, 23, 0.3)', 'transparent', 'rgba(2, 6, 23, 0.8)']}
        style={StyleSheet.absoluteFill}
      />
      
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.1)', 'transparent', 'rgba(30, 58, 138, 0.15)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </View>
  );
};

export default React.memo(FluidBackgroundComponent);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
    overflow: 'hidden',
  },
});
