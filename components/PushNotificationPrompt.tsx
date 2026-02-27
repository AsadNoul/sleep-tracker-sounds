import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Bell, X, Moon, Activity, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../hooks/useAppTheme';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

interface PushNotificationPromptProps {
  userId?: string;
  trigger?: 'onboarding' | 'first_session' | 'settings' | 'manual';
}

const STORAGE_KEY = 'push_permission_prompted';
const STORAGE_DECLINED_KEY = 'push_permission_declined';

export default function PushNotificationPrompt({ 
  userId, 
  trigger = 'manual' 
}: PushNotificationPromptProps) {
  const { theme } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    checkAndShowPrompt();
  }, [userId, trigger]);

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [visible]);

  const checkAndShowPrompt = async () => {
    try {
      // Check if already prompted
      const hasPrompted = await AsyncStorage.getItem(STORAGE_KEY);
      const hasDeclined = await AsyncStorage.getItem(STORAGE_DECLINED_KEY);
      
      // Check current permission status
      const { status } = await Notifications.getPermissionsAsync();
      
      // Don't show if already granted or if declined recently (within 7 days)
      if (status === 'granted') return;
      
      if (hasDeclined) {
        const declinedTime = parseInt(hasDeclined);
        const daysSinceDecline = (Date.now() - declinedTime) / (1000 * 60 * 60 * 24);
        if (daysSinceDecline < 7) return; // Wait 7 days before asking again
      }

      // Show based on trigger
      if (trigger === 'onboarding') {
        // Always show after onboarding
        setVisible(true);
      } else if (trigger === 'first_session' && !hasPrompted) {
        // Show after first sleep session if never prompted
        setVisible(true);
      } else if (trigger === 'settings' || trigger === 'manual') {
        // Manual trigger from settings
        setVisible(true);
      }
    } catch (error) {
      console.error('Error checking notification prompt:', error);
    }
  };

  const handleEnable = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, Date.now().toString());
      await AsyncStorage.removeItem(STORAGE_DECLINED_KEY);

      const { status } = await Notifications.requestPermissionsAsync();

      if (status === 'granted') {
        // Get and save push token
        const pushTokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });

        const pushToken = pushTokenData.data;
        console.log('📱 Expo Push Token:', pushToken);

        if (userId) {
          await supabase
            .from('user_profiles')
            .update({ expo_push_token: pushToken })
            .eq('id', userId);
          console.log('✅ Push token saved to database');
        }
      }

      setVisible(false);
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setVisible(false);
    }
  };

  const handleMaybeLater = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, Date.now().toString());
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

          {/* Animated Bell Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Bell size={40} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Stay Connected to Your Sleep
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Enable notifications to receive personalized sleep insights and timely reminders
          </Text>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <BenefitItem
              icon={<Moon size={20} color="#8B5CF6" />}
              text="Bedtime reminders"
              theme={theme}
            />
            <BenefitItem
              icon={<Activity size={20} color="#EC4899" />}
              text="Sleep quality insights"
              theme={theme}
            />
            <BenefitItem
              icon={<Clock size={20} color="#10B981" />}
              text="Smart wake-up alarms"
              theme={theme}
            />
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnable}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.enableButtonGradient}
            >
              <Text style={styles.enableButtonText}>Enable Notifications</Text>
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
        </View>
      </View>
    </Modal>
  );
}

interface BenefitItemProps {
  icon: React.ReactNode;
  text: string;
  theme: any;
}

function BenefitItem({ icon, text, theme }: BenefitItemProps) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.benefitIcon}>{icon}</View>
      <Text style={[styles.benefitText, { color: theme.colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  benefitsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    marginRight: 12,
  },
  benefitText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  enableButton: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  enableButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  laterButton: {
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
});
