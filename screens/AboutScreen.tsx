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
import { ChevronLeft, Moon, Info, Mail, Globe, Shield, FileText, Star, Github, Twitter, Share2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { Modal } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

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

          {/* Version Info */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Version Information</Text>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Version</Text>
                <Text style={styles(theme).infoValue}>{appVersion}</Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Build Number</Text>
                <Text style={styles(theme).infoValue}>{buildNumber}</Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Release Date</Text>
                <Text style={styles(theme).infoValue}>December 2025</Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Platform</Text>
                <Text style={styles(theme).infoValue}>
                  {Constants.platform?.ios
                    ? 'iOS'
                    : Constants.platform?.android
                      ? 'Android'
                      : 'Mobile'}
                </Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>SDK Version</Text>
                <Text style={styles(theme).infoValue}>Expo SDK 54</Text>
              </View>
            </BlurView>
          ) : (
            <View style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Version Information</Text>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Version</Text>
                <Text style={styles(theme).infoValue}>{appVersion}</Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Build Number</Text>
                <Text style={styles(theme).infoValue}>{buildNumber}</Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Release Date</Text>
                <Text style={styles(theme).infoValue}>December 2025</Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>Platform</Text>
                <Text style={styles(theme).infoValue}>
                  {Constants.platform?.ios
                    ? 'iOS'
                    : Constants.platform?.android
                      ? 'Android'
                      : 'Mobile'}
                </Text>
              </View>

              <View style={styles(theme).infoRow}>
                <Text style={styles(theme).infoLabel}>SDK Version</Text>
                <Text style={styles(theme).infoValue}>Expo SDK 54</Text>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={() => {
            throw new Error('Test crash - delete this button after testing');
          }}>
            <Text>Test Crash</Text>
          </TouchableOpacity>
          {/* About App */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>About This App</Text>
              <Text style={styles(theme).description}>
                Sleep Architect is your comprehensive sleep companion, designed to help you
                achieve better sleep through tracking, ambient sounds, and mindfulness
                exercises.
              </Text>
              <Text style={styles(theme).description}>
                Our mission is to improve your sleep quality and overall well-being by
                providing you with the tools and insights you need to understand and
                optimize your sleep patterns.
              </Text>
            </BlurView>
          ) : (
            <View style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>About This App</Text>
              <Text style={styles(theme).description}>
                Sleep Architect is your comprehensive sleep companion, designed to help you
                achieve better sleep through tracking, ambient sounds, and mindfulness
                exercises.
              </Text>
              <Text style={styles(theme).description}>
                Our mission is to improve your sleep quality and overall well-being by
                providing you with the tools and insights you need to understand and
                optimize your sleep patterns.
              </Text>
            </View>
          )}

          {/* Features */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Key Features</Text>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Moon size={24} color={theme.colors.accent} />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Sleep Tracking</Text>
                  <Text style={styles(theme).featureDescription}>
                    Monitor your sleep duration and quality
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Globe size={24} color={theme.colors.highlight} />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Ambient Sounds</Text>
                  <Text style={styles(theme).featureDescription}>
                    Relax with nature sounds and white noise
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Info size={24} color="#9D4EDD" />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Mindfulness</Text>
                  <Text style={styles(theme).featureDescription}>
                    Guided meditation and breathing exercises
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Star size={24} color={theme.colors.premium} />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Analytics</Text>
                  <Text style={styles(theme).featureDescription}>
                    Visualize your sleep patterns and trends
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Shield size={24} color="#32CD32" />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Privacy First</Text>
                  <Text style={styles(theme).featureDescription}>
                    Your data is encrypted and secure
                  </Text>
                </View>
              </View>
            </BlurView>
          ) : (
            <View style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Key Features</Text>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Moon size={24} color={theme.colors.accent} />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Sleep Tracking</Text>
                  <Text style={styles(theme).featureDescription}>
                    Monitor your sleep duration and quality
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Globe size={24} color={theme.colors.highlight} />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Ambient Sounds</Text>
                  <Text style={styles(theme).featureDescription}>
                    Relax with nature sounds and white noise
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Info size={24} color="#9D4EDD" />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Mindfulness</Text>
                  <Text style={styles(theme).featureDescription}>
                    Guided meditation and breathing exercises
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Star size={24} color={theme.colors.premium} />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Analytics</Text>
                  <Text style={styles(theme).featureDescription}>
                    Visualize your sleep patterns and trends
                  </Text>
                </View>
              </View>

              <View style={styles(theme).featureItem}>
                <View style={styles(theme).featureIcon}>
                  <Shield size={24} color="#32CD32" />
                </View>
                <View style={styles(theme).featureText}>
                  <Text style={styles(theme).featureTitle}>Privacy First</Text>
                  <Text style={styles(theme).featureDescription}>
                    Your data is encrypted and secure
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Links */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Links & Resources</Text>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={() => handleOpenLink('https://github.com/AsadNoul/sleep-tracker-sounds')}
              >
                <Github size={24} color={theme.colors.textPrimary} />
                <Text style={styles(theme).linkText}>GitHub Repository</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={() => handleOpenLink('https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/privacy.md')}
              >
                <FileText size={24} color={theme.colors.accent} />
                <Text style={styles(theme).linkText}>Privacy Policy</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={() => handleOpenLink('https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/terms.md')}
              >
                <FileText size={24} color={theme.colors.highlight} />
                <Text style={styles(theme).linkText}>Terms of Service</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={handleContactSupport}
              >
                <Mail size={24} color={theme.colors.premium} />
                <Text style={styles(theme).linkText}>Contact Support</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </BlurView>
          ) : (
            <View style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Links & Resources</Text>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={() => handleOpenLink('https://github.com/AsadNoul/sleep-tracker-sounds')}
              >
                <Github size={24} color={theme.colors.textPrimary} />
                <Text style={styles(theme).linkText}>GitHub Repository</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={() => handleOpenLink('https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/privacy.md')}
              >
                <FileText size={24} color={theme.colors.accent} />
                <Text style={styles(theme).linkText}>Privacy Policy</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={() => handleOpenLink('https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main/terms.md')}
              >
                <FileText size={24} color={theme.colors.highlight} />
                <Text style={styles(theme).linkText}>Terms of Service</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).linkItem}
                onPress={handleContactSupport}
              >
                <Mail size={24} color={theme.colors.premium} />
                <Text style={styles(theme).linkText}>Contact Support</Text>
                <Share2 size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Credits */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Credits</Text>
              <Text style={styles(theme).creditText}>
                Developed with React Native & Expo
              </Text>
              <Text style={styles(theme).creditText}>Icons by Lucide</Text>
              <Text style={styles(theme).creditText}>Sound library by various artists</Text>
              <Text style={styles(theme).creditText}>
                Built with Love By NaulX Agency
              </Text>
            </BlurView>
          ) : (
            <View style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>Credits</Text>
              <Text style={styles(theme).creditText}>
                Developed with React Native & Expo
              </Text>
              <Text style={styles(theme).creditText}>Icons by Lucide</Text>
              <Text style={styles(theme).creditText}>Sound library by various artists</Text>
              <Text style={styles(theme).creditText}>
                Built with Love By NaulX Agency
              </Text>
            </View>
          )}

          {/* Copyright */}
          <View style={styles(theme).copyright}>
            <Text style={styles(theme).copyrightText}>
              © {new Date().getFullYear()} Sleep Architect
            </Text>
            <Text style={styles(theme).copyrightText}>All rights reserved</Text>
            <Text style={styles(theme).copyrightSubtext}>
              Made with ❤️© for better sleep
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

const styles = (theme: any) => StyleSheet.create({
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
    paddingBottom: 20,
    paddingTop: Platform.OS === 'ios' ? 0 : 10, // insets.top is handled by the container if needed, but here we add some breathing room
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  appInfoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  creditText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  copyright: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  copyrightText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  bottomSpacing: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    backgroundColor: '#1A1A2E',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButtonModal: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 24,
  },
  legalText: {
    color: '#A0AEC0',
    fontSize: 15,
    lineHeight: 24,
    paddingBottom: 40,
  },
});
