import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { Star, X, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';

interface RatingPromptProps {
  trigger?: 'session_complete' | 'manual';
  sessionCount?: number;
}

const STORAGE_KEY = 'rating_prompt_shown';
const STORAGE_DECLINED_KEY = 'rating_prompt_declined';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sleeptracker.app';
const MIN_SESSIONS_FOR_PROMPT = 3; // Show after 3 sleep sessions

export default function RatingPrompt({ 
  trigger = 'manual',
  sessionCount = 0 
}: RatingPromptProps) {
  const { theme } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    checkAndShowPrompt();
  }, [sessionCount, trigger]);

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const checkAndShowPrompt = async () => {
    try {
      // Check if already shown or declined recently
      const hasShown = await AsyncStorage.getItem(STORAGE_KEY);
      const hasDeclined = await AsyncStorage.getItem(STORAGE_DECLINED_KEY);
      
      // If already rated, don't show again
      if (hasShown === 'rated') return;
      
      // If declined, wait 30 days before asking again
      if (hasDeclined) {
        const declinedTime = parseInt(hasDeclined);
        const daysSinceDecline = (Date.now() - declinedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDecline < 30) return;
      }

      // Show based on trigger
      if (trigger === 'session_complete' && sessionCount >= MIN_SESSIONS_FOR_PROMPT) {
        // Only show every 10 sessions after the first prompt eligibility
        if (sessionCount === MIN_SESSIONS_FOR_PROMPT || sessionCount % 10 === 0) {
          setVisible(true);
        }
      } else if (trigger === 'manual') {
        setVisible(true);
      }
    } catch (error) {
      console.error('Error checking rating prompt:', error);
    }
  };

  const handleRate = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, 'rated');
      await AsyncStorage.removeItem(STORAGE_DECLINED_KEY);
      
      // Open Play Store
      const supported = await Linking.canOpenURL(PLAY_STORE_URL);
      if (supported) {
        await Linking.openURL(PLAY_STORE_URL);
      }
      
      setVisible(false);
    } catch (error) {
      console.error('Error opening Play Store:', error);
      setVisible(false);
    }
  };

  const handleMaybeLater = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_DECLINED_KEY, Date.now().toString());
      setVisible(false);
    } catch (error) {
      console.error('Error saving decline:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleMaybeLater}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleMaybeLater}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          {/* Animated Star Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Star size={40} color="#FFFFFF" fill="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Enjoying Better Sleep?
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Your feedback helps us improve and reach more people who need better sleep
          </Text>

          {/* Stars Row */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={32}
                color="#FFD700"
                fill="#FFD700"
                style={styles.starIcon}
              />
            ))}
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.rateButton}
            onPress={handleRate}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rateButtonGradient}
            >
              <Heart size={20} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.rateButtonText}>Rate Us on Play Store</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterButton}
            onPress={handleMaybeLater}
            activeOpacity={0.7}
          >
            <Text style={[styles.laterButtonText, { color: theme.colors.textSecondary }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            🌙 Thank you for using Sleep Tracker
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Poppins_700Bold',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: 'Poppins_400Regular',
  },
  starsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  starIcon: {
    marginHorizontal: 2,
  },
  rateButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rateButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  laterButton: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  laterButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
});
