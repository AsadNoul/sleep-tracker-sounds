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
  Platform,
  Modal,
} from 'react-native';
import { ChevronLeft, ChevronRight, Mail, Github, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import SleepPrintMark from '../components/SleepPrintMark';

export default function AboutScreen() {
  const { theme } = useAppTheme();
  const s = styles(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const buildNumber = Application.nativeBuildVersion || '1';

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

  const openSourceLicenses = `
# Open-Source Licenses

Sleep Architect is built with the help of these open-source projects:

- React Native & Expo (MIT)
- react-navigation (MIT)
- lucide-react-native (ISC)
- react-native-reanimated (MIT)
- Supabase JS client (MIT)
- react-native-purchases / RevenueCat SDK (MIT)

Fonts: Fraunces and DM Sans, licensed under the SIL Open Font License, courtesy of Google Fonts.

Full license texts are available from each project's public repository.
  `;

  const showLegal = (title: string, content: string) => {
    setLegalTitle(title);
    setLegalContent(content);
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
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={s.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        {/* App Mark & Name */}
        <View style={s.appInfoContainer}>
          <View style={s.markGlow} />
          <View style={s.markWrapper}>
            <SleepPrintMark size={120} colors={theme.sleepPrintMark} />
          </View>
          <Text style={s.appName}>Sleep Architect</Text>
          <Text style={s.versionText}>Version {appVersion} ({buildNumber})</Text>
        </View>

        {/* Links list — matches canvas's About list card */}
        <View style={s.groupCard}>
          <TouchableOpacity
            style={s.row}
            onPress={() => showLegal("What's New", "You're on the latest version of Sleep Architect. Check back here after every update for a summary of what's changed.")}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>What's new</Text>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <View style={s.rowDivider} />

          <TouchableOpacity
            style={s.row}
            onPress={handleShareOrRate}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>Rate the app</Text>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <View style={s.rowDivider} />

          <TouchableOpacity
            style={s.row}
            onPress={() => showLegal('Terms of Service', termsOfService)}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>Terms of use</Text>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <View style={s.rowDivider} />

          <TouchableOpacity
            style={s.row}
            onPress={() => showLegal('Privacy Policy', privacyPolicy)}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>Privacy policy</Text>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
          <View style={s.rowDivider} />

          <TouchableOpacity
            style={[s.row, s.rowLast]}
            onPress={() => showLegal('Open-Source Licenses', openSourceLicenses)}
            activeOpacity={0.7}
          >
            <Text style={s.rowLabel}>Open-source licenses</Text>
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <Text style={s.disclaimerText}>
          Sleep Architect is a wellness app, not a medical device.
        </Text>

        {/* Support & resources — self-designed, same system, no canvas equivalent */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Support & Resources</Text>
          <View style={s.groupCard}>
            <TouchableOpacity style={s.row} onPress={handleContactSupport} activeOpacity={0.7}>
              <View style={s.rowIconLabel}>
                <Mail size={18} color={theme.colors.accent} />
                <Text style={s.rowLabel}>Contact Support</Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity
              style={[s.row, s.rowLast]}
              onPress={() => handleOpenLink('https://github.com/AsadNoul/sleep-tracker-sounds')}
              activeOpacity={0.7}
            >
              <View style={s.rowIconLabel}>
                <Github size={18} color={theme.colors.textPrimary} />
                <Text style={s.rowLabel}>GitHub Repository</Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* System information — self-designed, same system */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>System Information</Text>
          <View style={s.groupCard}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>App Version</Text>
              <Text style={s.infoValue}>{appVersion}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Build Identity</Text>
              <Text style={s.infoValue}>#{buildNumber}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Platform</Text>
              <Text style={s.infoValue}>{Platform.OS} {Platform.Version}</Text>
            </View>
            <View style={s.rowDivider} />
            <View style={[s.infoRow, s.rowLast]}>
              <Text style={s.infoLabel}>Release Cycle</Text>
              <Text style={s.infoValue}>Stable (v3.0)</Text>
            </View>
          </View>
        </View>

        {/* Credits — self-designed, same system */}
        <View style={s.creditsSection}>
          <View style={s.divider} />
          <Text style={s.creditText}>Developed with React Native & Expo</Text>
          <Text style={s.creditText}>Icons by Lucide · Acoustic analysis by NaulX Engine</Text>
          <View style={s.agencyContainer}>
            <Text style={s.agencyLabel}>Proudly Crafted By</Text>
            <Text style={s.agencyName}>NaulX Agency</Text>
          </View>
        </View>

        <Text style={s.footerText}>Made for better nights · © {new Date().getFullYear()}</Text>
      </ScrollView>

      {/* Legal / info modal */}
      <Modal
        visible={legalModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setLegalModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{legalTitle}</Text>
              <TouchableOpacity onPress={() => setLegalModalVisible(false)} style={s.modalClose}>
                <X size={18} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={s.legalText}>{legalContent}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );

  async function handleShareOrRate() {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/sleep-architect'
      : 'https://play.google.com/store/apps/details?id=com.asadNoul.sleeptracker';
    await handleOpenLink(url);
  }
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appInfoContainer: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 8,
      rowGap: 12,
    },
    markGlow: {
      position: 'absolute',
      left: 20,
      right: 20,
      top: -20,
      height: 240,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.accentLight,
    },
    markWrapper: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appName: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 30,
      letterSpacing: -0.4,
      color: theme.colors.textPrimary,
    },
    versionText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },

    groupCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      paddingHorizontal: 16,
      marginTop: 16,
    },
    row: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    rowLast: {},
    rowDivider: {
      height: 1,
      backgroundColor: theme.colors.cardBorder,
    },
    rowLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
    rowIconLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
    },

    disclaimerText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginTop: 16,
    },

    sectionBlock: { marginTop: 24, rowGap: 8 },
    sectionLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
    },

    infoRow: {
      minHeight: 48,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
    },
    infoLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    infoValue: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },

    creditsSection: {
      marginTop: 28,
      alignItems: 'center',
      rowGap: 6,
    },
    divider: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.cardBorder,
      marginBottom: 12,
    },
    creditText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
      textAlign: 'center',
    },
    agencyContainer: {
      marginTop: 12,
      alignItems: 'center',
      rowGap: 4,
    },
    agencyLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 12,
      color: theme.colors.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    agencyName: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 20,
      color: theme.colors.accent,
      letterSpacing: 0.4,
    },

    footerText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 24,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      maxHeight: '80%',
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 20,
      color: theme.colors.textPrimary,
      flex: 1,
      marginRight: 12,
    },
    modalClose: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.colors.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalBody: {
      paddingBottom: 12,
    },
    legalText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      lineHeight: 24,
      color: theme.colors.textSecondary,
      paddingBottom: 20,
    },
  });
