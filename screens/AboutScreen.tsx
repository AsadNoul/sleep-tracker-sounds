import { useAppTheme } from '../hooks/useAppTheme';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ChevronLeft, Moon, Info, Mail, Globe, Shield, FileText, Star, Github, Twitter, Share2, X, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Modal } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const GlassCard = ({ children, intensity = 20, tint = 'dark', style }: any) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint as any} style={style}>
        {children}
      </BlurView>
    );
  }
  return <View style={[style, { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>{children}</View>;
};


export default function AboutScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const buildNumber = Application.nativeBuildVersion || '1';
  const appName = Application.applicationName || 'Sleep Architect';

  const handleOpenLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const [legalModalVisible, setLegalModalVisible] = React.useState(false);
  const [legalTitle, setLegalTitle] = React.useState('');
  const [legalContent, setLegalContent] = React.useState('');

  const privacyPolicy = `
# Privacy Policy

Welcome to Sleep Architect. Your privacy is important to us.

## 1. Data Collection
We collect sleep data locally on your device. If you use cloud sync, this data is encrypted and stored securely in our database.

We collect the following types of data:
- Sleep session data (duration, quality, timestamps)
- Device identifiers (for analytics and push notifications)
- Email address (if you create an account)
- Usage analytics (to improve app functionality)

## 2. Device IDs and Third-Party Services
We use device identifiers for:
- Analytics and app functionality (Supabase)
- Push notifications (Expo Notifications)
- Subscription management (RevenueCat)
- Authentication (Google Sign-In)

These identifiers help us provide core app features like syncing your data across devices and sending you sleep reminders.

## 3. Audio Data
Sleep Architect does NOT record or store any audio data from your room. All analysis is performed on-device if applicable.

## 4. Usage Data
We may collect anonymous usage statistics to improve the application.

## 5. Third Parties
We do not sell your personal data to third parties. We share data with service providers only as necessary to operate the app:
- Supabase (database and authentication)
- RevenueCat (subscription management)
- Expo (push notifications)
- Google (authentication)

## 6. Your Rights - Data Deletion
You have the right to request deletion of your account and all associated data at any time.

To delete your account:
1. Go to Settings → Data & Privacy
2. Tap "Delete Account"
3. Confirm the deletion

This will permanently remove:
- Your account
- All sleep sessions and journal entries
- Analytics data
- Device identifiers
- All personal information

This action cannot be undone. If you need help, contact us at asadalibscs20@gmail.com
  `;

  const termsOfService = `
# Terms of Service

By using Sleep Architect, you agree to these terms.

## 1. Health Disclaimer
Sleep Architect is NOT a medical device. Always consult with a doctor for serious sleep disorders.

## 2. Subscriptions
Premium features require an active subscription. Payments are managed through your app store account.

## 3. Intellectual Property
All content and designs within Sleep Architect are owned by NaulX Agency.

## 4. Modifications
We reserve the right to modify these terms at any time.
  `;

  const showLegal = (title: string) => {
    setLegalTitle(title);
    setLegalContent(title === 'Privacy Policy' ? privacyPolicy : termsOfService);
    setLegalModalVisible(true);
  };

  const handleContactSupport = async () => {
    const deviceInfo = `
---------- Device Information ----------
App Version: ${appVersion}
Build Number: ${buildNumber}
Platform: ${Platform.OS} ${Platform.Version}
Device: ${Device.modelName || 'Unknown'}
Brand: ${Device.brand || 'Unknown'}
OS Version: ${Device.osVersion || 'Unknown'}
Expo SDK: ${Constants.expoConfig?.sdkVersion || 'Unknown'}
----------------------------------------

Please describe your issue below:


`;

    const emailUrl = `mailto:asadalibscs20@gmail.com?subject=Sleep Architect Support Request&body=${encodeURIComponent(deviceInfo)}`;
    const supported = await Linking.canOpenURL(emailUrl);
    if (supported) {
      await Linking.openURL(emailUrl);
    }
  };

  return (
    <View style={styles(theme).container}>
      <LinearGradient colors={[theme.colors.background, theme.colors.backgroundSecondary]} style={styles(theme).gradient}>
        {/* Header */}
        <View style={[styles(theme).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles(theme).backButton}
          >
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme).headerTitle}>About</Text>
          <View style={styles(theme).backButton} />
        </View>

        <ScrollView
          style={styles(theme).content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles(theme).scrollContent,
            {
              paddingBottom: insets.bottom + 100
            }
          ]}
        >
          {/* App Icon & Name */}
          <View style={styles(theme).appInfoContainer}>
            <View style={styles(theme).iconContainer}>
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.highlight, '#9D4EDD']}
                style={styles(theme).iconGradient}
              >
                <Image
                  source={require('../assets/app_logo.png')}
                  style={{ width: 90, height: 90, borderRadius: 22 }}
                  resizeMode="contain"
                />
              </LinearGradient>
            </View>
            <Text style={styles(theme).appName}>Sleep Architect</Text>
            <Text style={styles(theme).tagline}>VIP Personalized Sleep Intelligence</Text>
          </View>

          {/* Mission Card */}
          <GlassCard intensity={30} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).sectionHeader}>
              <Info size={22} color={theme.colors.accent} />
              <Text style={styles(theme).cardTitle}>Our Mission</Text>
            </View>
            <Text style={styles(theme).description}>
              Sleep Architect is built to be your ultimate sleep sanctuary. Our mission is to transform your life by optimizing the one-third of it usually spent in the dark.
            </Text>
            <Text style={styles(theme).description}>
              Using advanced biometric analysis and non-invasive acoustic tracking, we provide the insights you need to wake up as the best version of yourself.
            </Text>
          </GlassCard>

          {/* Links & Resources */}
          <GlassCard intensity={20} tint="dark" style={styles(theme).card}>
            <Text style={styles(theme).cardTitle}>Legal & Support</Text>

            <TouchableOpacity
              style={styles(theme).linkItem}
              onPress={() => handleOpenLink('https://github.com/AsadNoul/sleep-tracker-sounds/blob/main/privacy.md')}
            >
              <Shield size={22} color={theme.colors.accent} />
              <Text style={styles(theme).linkText}>Read full Privacy Policy</Text>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(theme).linkItem}
              onPress={() => handleOpenLink('https://github.com/AsadNoul/sleep-tracker-sounds/blob/main/terms.md')}
            >
              <FileText size={22} color={theme.colors.highlight} />
              <Text style={styles(theme).linkText}>Read full Terms of Service</Text>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(theme).linkItem}
              onPress={handleContactSupport}
            >
              <Mail size={22} color={theme.colors.premium} />
              <Text style={styles(theme).linkText}>Contact Support</Text>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles(theme).linkItem, { borderBottomWidth: 0 }]}
              onPress={() => handleOpenLink('https://github.com/AsadNoul/sleep-tracker-sounds')}
            >
              <Github size={22} color={theme.colors.textPrimary} />
              <Text style={styles(theme).linkText}>GitHub Repository</Text>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </GlassCard>

          {/* Version Info Table */}
          <View style={styles(theme).card}>
            <Text style={styles(theme).cardTitle}>System Information</Text>

            <View style={styles(theme).infoRow}>
              <Text style={styles(theme).infoLabel}>App Version</Text>
              <Text style={styles(theme).infoValue}>{appVersion}</Text>
            </View>

            <View style={styles(theme).infoRow}>
              <Text style={styles(theme).infoLabel}>Build Identity</Text>
              <Text style={styles(theme).infoValue}>#{buildNumber}</Text>
            </View>

            <View style={styles(theme).infoRow}>
              <Text style={styles(theme).infoLabel}>Platform</Text>
              <Text style={styles(theme).infoValue}>{Platform.OS} {Platform.Version}</Text>
            </View>

            <View style={[styles(theme).infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles(theme).infoLabel}>Release Cycle</Text>
              <Text style={styles(theme).infoValue}>Stable (v2.1)</Text>
            </View>
          </View>

          {/* Credits */}
          <View style={styles(theme).creditsSection}>
            <View style={styles(theme).divider} />
            <Text style={styles(theme).creditText}>Developed with React Native & Expo</Text>
            <Text style={styles(theme).creditText}>Icons by Lucide • Acoustic analysis by NaulX Engine</Text>
            <View style={styles(theme).agencyContainer}>
              <Text style={styles(theme).agencyText}>Proudly Crafted By</Text>
              <Text style={styles(theme).agencyName}>NaulX Agency</Text>
            </View>
          </View>

          {/* Copyright */}
          <View style={styles(theme).copyright}>
            <Text style={styles(theme).copyrightText}>
              © {new Date().getFullYear()} Sleep Architect. All rights reserved.
            </Text>
            <Text style={styles(theme).copyrightSubtext}>
              Made with ❤️ for better sleep
            </Text>
          </View>

          <View style={styles(theme).bottomSpacing} />
        </ScrollView>

        <Modal
          visible={legalModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setLegalModalVisible(false)}
        >
          <View style={styles(theme).modalOverlay}>
            <BlurView intensity={90} tint="dark" style={styles(theme).modalContent}>
              <View style={styles(theme).modalHeader}>
                <Text style={styles(theme).modalTitle}>{legalTitle}</Text>
                <TouchableOpacity onPress={() => setLegalModalVisible(false)} style={styles(theme).closeButtonModal}>
                  <ChevronLeft size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles(theme).modalBody}>
                <Text style={styles(theme).legalText}>{legalContent}</Text>
              </ScrollView>
            </BlurView>
          </View>
        </Modal>
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradient: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 15,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    appInfoContainer: {
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30,
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 30,
      padding: 3,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    iconGradient: {
      flex: 1,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appName: {
      fontSize: 32,
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: 20,
      letterSpacing: 1,
    },
    tagline: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 5,
      fontWeight: '500',
    },
    card: {
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      marginLeft: 10,
    },
    description: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginBottom: 12,
    },
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    linkText: {
      flex: 1,
      fontSize: 16,
      color: '#FFFFFF',
      marginLeft: 15,
      fontWeight: '500',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    infoLabel: {
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      fontSize: 15,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    creditsSection: {
      marginTop: 10,
      marginBottom: 20,
      alignItems: 'center',
    },
    divider: {
      width: 40,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 2,
      marginBottom: 20,
    },
    creditText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginBottom: 6,
      textAlign: 'center',
    },
    agencyContainer: {
      marginTop: 15,
      alignItems: 'center',
    },
    agencyText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: 4,
    },
    agencyName: {
      fontSize: 20,
      fontWeight: '800',
      color: theme.colors.accent,
      letterSpacing: 1,
    },
    copyright: {
      alignItems: 'center',
      paddingBottom: 20,
    },
    copyrightText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    copyrightSubtext: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.3)',
      marginTop: 4,
    },
    bottomSpacing: {
      height: 30,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
    },
    modalContent: {
      flex: 1,
      marginTop: 50,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 25,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    closeButtonModal: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBody: {
      padding: 25,
    },
    legalText: {
      fontSize: 15,
      lineHeight: 24,
      color: '#E2E8F0',
      paddingBottom: 40,
    },
  });
