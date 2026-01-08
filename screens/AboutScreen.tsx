import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

export default function AboutScreen() {
  const navigation = useNavigation();

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const buildNumber = Application.nativeBuildVersion || '1';
  const appName = Application.applicationName || 'Sleep Tracker';

  const handleOpenLink = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0F111A', '#1B1D2A']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* App Icon & Name */}
          <View style={styles.appInfoContainer}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={['#00FFD1', '#33C6FF', '#9D4EDD']}
                style={styles.iconGradient}
              >
                <Ionicons name="moon" size={60} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>{appName}</Text>
            <Text style={styles.tagline}>Track, Improve, Rest Better</Text>
          </View>

          {/* Version Info */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Version Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>{appVersion}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build Number</Text>
              <Text style={styles.infoValue}>{buildNumber}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Release Date</Text>
              <Text style={styles.infoValue}>December 2025</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoValue}>
                {Constants.platform?.ios
                  ? 'iOS'
                  : Constants.platform?.android
                  ? 'Android'
                  : 'Mobile'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SDK Version</Text>
              <Text style={styles.infoValue}>Expo SDK 54</Text>
            </View>
          </BlurView>

          {/* About App */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>About This App</Text>
            <Text style={styles.description}>
              Sleep Tracker is your comprehensive sleep companion, designed to help you
              achieve better sleep through tracking, ambient sounds, and mindfulness
              exercises.
            </Text>
            <Text style={styles.description}>
              Our mission is to improve your sleep quality and overall well-being by
              providing you with the tools and insights you need to understand and
              optimize your sleep patterns.
            </Text>
          </BlurView>

          {/* Features */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Key Features</Text>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="bed" size={24} color="#00FFD1" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Sleep Tracking</Text>
                <Text style={styles.featureDescription}>
                  Monitor your sleep duration and quality
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="musical-notes" size={24} color="#33C6FF" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Ambient Sounds</Text>
                <Text style={styles.featureDescription}>
                  Relax with nature sounds and white noise
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="leaf" size={24} color="#9D4EDD" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Mindfulness</Text>
                <Text style={styles.featureDescription}>
                  Guided meditation and breathing exercises
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="stats-chart" size={24} color="#FFD700" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Analytics</Text>
                <Text style={styles.featureDescription}>
                  Visualize your sleep patterns and trends
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#32CD32" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>Privacy First</Text>
                <Text style={styles.featureDescription}>
                  Your data is encrypted and secure
                </Text>
              </View>
            </View>
          </BlurView>

          {/* Links */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Links & Resources</Text>

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenLink('https://github.com')}
            >
              <Ionicons name="logo-github" size={24} color="#FFFFFF" />
              <Text style={styles.linkText}>GitHub Repository</Text>
              <Ionicons name="open-outline" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenLink('https://example.com/privacy')}
            >
              <Ionicons name="document-text" size={24} color="#00FFD1" />
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenLink('https://example.com/terms')}
            >
              <Ionicons name="document-text" size={24} color="#33C6FF" />
              <Text style={styles.linkText}>Terms of Service</Text>
              <Ionicons name="open-outline" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkItem}
              onPress={() => handleOpenLink('mailto:support@sleeptracker.com')}
            >
              <Ionicons name="mail" size={24} color="#FFD700" />
              <Text style={styles.linkText}>Contact Support</Text>
              <Ionicons name="open-outline" size={20} color="#A0AEC0" />
            </TouchableOpacity>
          </BlurView>

          {/* Credits */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Credits</Text>
            <Text style={styles.creditText}>
              Developed with React Native & Expo
            </Text>
            <Text style={styles.creditText}>Icons by Ionicons</Text>
            <Text style={styles.creditText}>Sound library by various artists</Text>
            <Text style={styles.creditText}>
              Built with Love By NaulX Agency
            </Text>
          </BlurView>

          {/* Copyright */}
          <View style={styles.copyright}>
            <Text style={styles.copyrightText}>
              © {new Date().getFullYear()} Sleep Tracker
            </Text>
            <Text style={styles.copyrightText}>All rights reserved</Text>
            <Text style={styles.copyrightSubtext}>
              Made with ❤️ for better sleep
            </Text>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F111A',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    color: '#FFFFFF',
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
    shadowColor: '#00FFD1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#A0AEC0',
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
    color: '#FFFFFF',
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
    color: '#A0AEC0',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  description: {
    fontSize: 15,
    color: '#A0AEC0',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#A0AEC0',
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
    color: '#FFFFFF',
    marginLeft: 12,
  },
  creditText: {
    fontSize: 14,
    color: '#A0AEC0',
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
    color: '#A0AEC0',
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 13,
    color: '#A0AEC0',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bottomSpacing: {
    height: 30,
  },
});
