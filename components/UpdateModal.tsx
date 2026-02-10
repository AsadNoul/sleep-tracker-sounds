import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Download, Sparkles, Zap, Shield } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface UpdateModalProps {
  visible: boolean;
  onUpdate: () => Promise<void>;
  isEmergency?: boolean;
  version?: string;
}

const { width, height } = Dimensions.get('window');

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  onUpdate,
  isEmergency = false,
  version,
}) => {
  const { theme } = useTheme();
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Animations
  const scaleAnim = new Animated.Value(0);
  const pulseAnim = new Animated.Value(1);
  const sparkleAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Pulse animation for the logo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Sparkle rotation animation
      Animated.loop(
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [visible]);

  const handleUpdate = async () => {
    setIsDownloading(true);
    try {
      await onUpdate();
    } catch (error) {
      console.error('Update failed:', error);
      setIsDownloading(false);
    }
  };

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <BlurView intensity={90} style={styles.container}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Gradient Background */}
          <LinearGradient
            colors={
              isEmergency
                ? ['#7C3AED', '#EC4899', '#F59E0B']
                : ['#6366F1', '#8B5CF6', '#A855F7']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Sparkle decorations */}
            <Animated.View
              style={[
                styles.sparkle,
                styles.sparkle1,
                { transform: [{ rotate: sparkleRotate }] },
              ]}
            >
              <Sparkles size={24} color="#FFFFFF" opacity={0.6} />
            </Animated.View>
            <Animated.View
              style={[
                styles.sparkle,
                styles.sparkle2,
                {
                  transform: [
                    {
                      rotate: sparkleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['360deg', '0deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Sparkles size={20} color="#FFFFFF" opacity={0.4} />
            </Animated.View>

            {/* App Logo */}
            <Animated.View
              style={[
                styles.logoContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <Image
                source={require('../assets/app_logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              {isEmergency && (
                <View style={styles.emergencyBadge}>
                  <Zap size={16} color="#FFF" fill="#FFF" />
                </View>
              )}
            </Animated.View>

            {/* Title */}
            <Text style={styles.title}>
              {isEmergency ? '🚨 Critical Update' : '✨ New Update Available'}
            </Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              {isEmergency
                ? 'An important security update is ready to install'
                : "We've made Sleep Architect even better!"}
            </Text>

            {/* Version info */}
            {version && (
              <View style={styles.versionContainer}>
                <Text style={styles.versionText}>Version {version}</Text>
              </View>
            )}

            {/* Features list */}
            <View style={styles.featuresContainer}>
              <FeatureItem
                icon={<Sparkles size={18} color="#FFF" />}
                text="Enhanced performance and stability"
              />
              <FeatureItem
                icon={<Zap size={18} color="#FFF" />}
                text="New features and improvements"
              />
              <FeatureItem
                icon={<Shield size={18} color="#FFF" />}
                text="Bug fixes and optimizations"
              />
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={[
                styles.updateButton,
                isDownloading && styles.updateButtonDisabled,
              ]}
              onPress={handleUpdate}
              disabled={isDownloading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F3F4F6']}
                style={styles.buttonGradient}
              >
                {isDownloading ? (
                  <View style={styles.downloadingContainer}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={styles.buttonTextDownloading}>
                      Updating...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Download size={20} color="#6366F1" />
                    <Text style={styles.buttonText}>
                      {isEmergency ? 'Update Now (Required)' : 'Update Now'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Info text */}
            <Text style={styles.infoText}>
              {isEmergency
                ? 'This update is required to continue using the app'
                : 'Update takes less than a minute'}
            </Text>
          </LinearGradient>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const FeatureItem: React.FC<{ icon: React.ReactNode; text: string }> = ({
  icon,
  text,
}) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>{icon}</View>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 32,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  sparkle: {
    position: 'absolute',
  },
  sparkle1: {
    top: 20,
    right: 20,
  },
  sparkle2: {
    bottom: 40,
    left: 30,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 24,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    padding: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  emergencyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  versionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 24,
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 12,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  updateButton: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  updateButtonDisabled: {
    opacity: 0.8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  downloadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonTextDownloading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  infoText: {
    marginTop: 16,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});
