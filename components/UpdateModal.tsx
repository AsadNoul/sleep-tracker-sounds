import React, { useState, useEffect, useRef } from 'react';
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
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Download, Sparkles, Zap, Shield } from 'lucide-react-native';

interface UpdateModalProps {
  visible: boolean;
  onUpdate: () => Promise<void>;
  onSkip?: () => void;
  isEmergency?: boolean;
  version?: string;
}

const { width } = Dimensions.get('window');

// Android-safe blur wrapper
const SafeBlur = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  if (Platform.OS === 'android') {
    return <View style={[style, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>{children}</View>;
  }
  return <BlurView intensity={90} tint="dark" style={style}>{children}</BlurView>;
};

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  onUpdate,
  onSkip,
  isEmergency = false,
  version,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      setIsDownloading(false);
      setDownloadFailed(false);

      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(sparkleAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
      ).start();
    }
  }, [visible]);

  const handleUpdate = async () => {
    setIsDownloading(true);
    setDownloadFailed(false);
    try {
      await onUpdate();
      // onUpdate calls reloadAsync — if we reach here something went wrong
    } catch (error) {
      console.error('[UpdateModal] Update failed:', error);
      setIsDownloading(false);
      setDownloadFailed(true);
    }
  };

  const handleRetry = () => {
    handleUpdate();
  };

  const sparkleRotate = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const sparkleRotateReverse = sparkleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      // Prevent dismissing by hardware back on Android — force update
      onRequestClose={() => {
        if (!isEmergency && onSkip && !isDownloading) {
          onSkip();
        }
      }}
    >
      <SafeBlur style={styles.container}>
        <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
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
            {/* Decorative sparkles */}
            <Animated.View style={[styles.sparkle, styles.sparkle1, { transform: [{ rotate: sparkleRotate }] }]}>
              <Sparkles size={24} color="rgba(255,255,255,0.55)" />
            </Animated.View>
            <Animated.View style={[styles.sparkle, styles.sparkle2, { transform: [{ rotate: sparkleRotateReverse }] }]}>
              <Sparkles size={18} color="rgba(255,255,255,0.35)" />
            </Animated.View>

            {/* App Logo */}
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
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
              {isEmergency ? '🚨 Critical Update' : '✨ Update Available'}
            </Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>
              {isEmergency
                ? 'A required security update must be installed to continue.'
                : "We've improved Sleep Architect. Update now for the best experience."}
            </Text>

            {/* Version pill */}
            {version && (
              <View style={styles.versionContainer}>
                <Text style={styles.versionText}>Version {version}</Text>
              </View>
            )}

            {/* Feature list */}
            <View style={styles.featuresContainer}>
              <FeatureItem icon={<Sparkles size={16} color="#FFF" />} text="Enhanced performance & stability" />
              <FeatureItem icon={<Zap size={16} color="#FFF" />} text="New features & improvements" />
              <FeatureItem icon={<Shield size={16} color="#FFF" />} text="Bug fixes & optimisations" />
            </View>

            {/* Update button */}
            {downloadFailed ? (
              <TouchableOpacity style={styles.updateButton} onPress={handleRetry} activeOpacity={0.85}>
                <LinearGradient colors={['#FFFFFF', '#F3F4F6']} style={styles.buttonGradient}>
                  <View style={styles.buttonContent}>
                    <Download size={20} color="#EF4444" />
                    <Text style={[styles.buttonText, { color: '#EF4444', marginLeft: 8 }]}>Retry Update</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.updateButton, isDownloading && styles.updateButtonDisabled]}
                onPress={handleUpdate}
                disabled={isDownloading}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#FFFFFF', '#F3F4F6']} style={styles.buttonGradient}>
                  {isDownloading ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator size="small" color="#6366F1" />
                      <Text style={[styles.buttonText, { marginLeft: 10 }]}>Updating...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Download size={20} color="#6366F1" />
                      <Text style={[styles.buttonText, { marginLeft: 8 }]}>
                        {isEmergency ? 'Update Now (Required)' : 'Update Now'}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* "Later" option — only for non-emergency, not during download */}
            {!isEmergency && onSkip && !isDownloading && (
              <TouchableOpacity onPress={onSkip} style={styles.laterButton} activeOpacity={0.7}>
                <Text style={styles.laterText}>Maybe Later</Text>
              </TouchableOpacity>
            )}

            {/* Info text */}
            <Text style={styles.infoText}>
              {isEmergency
                ? 'This update is required to use the app'
                : 'Takes less than a minute · Free update'}
            </Text>
          </LinearGradient>
        </Animated.View>
      </SafeBlur>
    </Modal>
  );
};

const FeatureItem: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
  },
  sparkle: { position: 'absolute' },
  sparkle1: { top: 20, right: 20 },
  sparkle2: { bottom: 40, left: 30 },
  logoContainer: {
    width: 110,
    height: 110,
    marginBottom: 24,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 28,
    padding: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: '100%', height: '100%' },
  emergencyBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.88)',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  versionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 22,
  },
  versionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  featuresContainer: { width: '100%', marginBottom: 22 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  featureIcon: { marginRight: 12 },
  featureText: { color: '#FFFFFF', fontSize: 14, flex: 1, fontWeight: '500' },
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
  updateButtonDisabled: { opacity: 0.75 },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6366F1',
  },
  laterButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  laterText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  infoText: {
    marginTop: 12,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
