import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { savePrivacySettings, loadPrivacySettings } from '../utils/storage';

const theme = {
  background: '#0F111A',
  card: '#1B1D2A',
  accent: '#00FFD1',
  highlight: '#33C6FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
  danger: '#FF6B6B',
};

export default function PrivacySettingsScreen() {
  const navigation = useNavigation();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Privacy settings state
  const [settings, setSettings] = useState({
    collectSleepData: true,
    shareAnonymousData: true,
    personalization: true,
    notifications: true,
    thirdPartyIntegration: false,
    locationTracking: false,
  });

  // Load privacy settings on mount
  useEffect(() => {
    const loadData = async () => {
      const savedSettings = await loadPrivacySettings();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    };
    loadData();
  }, []);

  // Save privacy settings whenever they change
  useEffect(() => {
    savePrivacySettings(settings);
  }, [settings]);

  // Toggle setting
  const toggleSetting = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };
  
  // Handle data download
  const handleDownloadData = async () => {
    setIsDownloading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        'Data Export Initiated',
        'Your data export has been initiated. You will receive an email with a download link within 24 hours.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to initiate data export. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Handle data deletion
  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete all your data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);

            try {
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 2000));

              Alert.alert(
                'Data Deletion Initiated',
                'Your data deletion request has been initiated. All your data will be permanently deleted within 30 days.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to initiate data deletion. Please try again later.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.background, '#0A0C14']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Settings</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionDescription}>
          Control how your data is collected, used, and shared. Your privacy is our priority.
        </Text>
        
        {/* Data Collection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection</Text>
          
          <BlurView intensity={20} style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Sleep Data Collection</Text>
                <Text style={styles.settingDescription}>
                  Allow the app to collect data about your sleep patterns
                </Text>
              </View>
              <Switch
                value={settings.collectSleepData}
                onValueChange={() => toggleSetting('collectSleepData')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.collectSleepData ? theme.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Anonymous Data Sharing</Text>
                <Text style={styles.settingDescription}>
                  Share anonymous data to help improve our services
                </Text>
              </View>
              <Switch
                value={settings.shareAnonymousData}
                onValueChange={() => toggleSetting('shareAnonymousData')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.shareAnonymousData ? theme.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
          </BlurView>
        </View>
        
        {/* Personalization Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personalization</Text>
          
          <BlurView intensity={20} style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Personalized Experience</Text>
                <Text style={styles.settingDescription}>
                  Allow us to personalize your experience based on your usage
                </Text>
              </View>
              <Switch
                value={settings.personalization}
                onValueChange={() => toggleSetting('personalization')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.personalization ? theme.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive personalized notifications and reminders
                </Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={() => toggleSetting('notifications')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.notifications ? theme.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
          </BlurView>
        </View>
        
        {/* Integrations Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integrations</Text>
          
          <BlurView intensity={20} style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Third-Party Integrations</Text>
                <Text style={styles.settingDescription}>
                  Allow data sharing with connected health apps
                </Text>
              </View>
              <Switch
                value={settings.thirdPartyIntegration}
                onValueChange={() => toggleSetting('thirdPartyIntegration')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.thirdPartyIntegration ? theme.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Location Tracking</Text>
                <Text style={styles.settingDescription}>
                  Allow location data to be used for environmental factors
                </Text>
              </View>
              <Switch
                value={settings.locationTracking}
                onValueChange={() => toggleSetting('locationTracking')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.locationTracking ? theme.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
          </BlurView>
        </View>
        
        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <BlurView intensity={20} style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.dataActionItem}
              onPress={handleDownloadData}
              disabled={isDownloading || isDeleting}
            >
              <View style={styles.dataActionIcon}>
                <Ionicons name="download-outline" size={24} color={theme.highlight} />
              </View>
              <View style={styles.dataActionInfo}>
                <Text style={styles.dataActionTitle}>Download Your Data</Text>
                <Text style={styles.dataActionDescription}>
                  Get a copy of all the data we have stored about you
                </Text>
              </View>
              {isDownloading ? (
                <ActivityIndicator color={theme.highlight} size="small" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.dataActionItem}
              onPress={handleDeleteData}
              disabled={isDownloading || isDeleting}
            >
              <View style={[styles.dataActionIcon, styles.deleteIcon]}>
                <Ionicons name="trash-outline" size={24} color={theme.danger} />
              </View>
              <View style={styles.dataActionInfo}>
                <Text style={[styles.dataActionTitle, styles.deleteText]}>Delete All Data</Text>
                <Text style={styles.dataActionDescription}>
                  Permanently delete all your data from our servers
                </Text>
              </View>
              {isDeleting ? (
                <ActivityIndicator color={theme.danger} size="small" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
        
        {/* Privacy Policy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          
          <BlurView intensity={20} style={styles.settingsCard}>
            <TouchableOpacity style={styles.legalItem}>
              <Text style={styles.legalItemText}>Privacy Policy</Text>
              <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.legalItem}>
              <Text style={styles.legalItemText}>Terms of Service</Text>
              <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.legalItem}>
              <Text style={styles.legalItemText}>Data Processing Agreement</Text>
              <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </BlurView>
        </View>
        
        <Text style={styles.footerText}>
          Last updated: June 21, 2025
        </Text>
        
        {/* Bottom padding for tab bar */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 12,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(51, 198, 255, 0.1)',
    marginHorizontal: 16,
  },
  dataActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  dataActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 198, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deleteIcon: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  dataActionInfo: {
    flex: 1,
    marginRight: 16,
  },
  dataActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.highlight,
    marginBottom: 4,
  },
  deleteText: {
    color: theme.danger,
  },
  dataActionDescription: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  legalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  legalItemText: {
    fontSize: 16,
    color: theme.textPrimary,
  },
  footerText: {
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  bottomPadding: {
    height: 100,
  },
});