import { useAppTheme } from '../hooks/useAppTheme';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { ChevronLeft, Shield, Eye, Share2, Download, Trash2, Lock, Info, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { savePrivacySettings, loadPrivacySettings } from '../utils/storage';
import { exportAndShareData, type ExportFormat } from '../utils/dataExport';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';


export default function PrivacySettingsScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { sleepHistory } = useSleep();
  const { user } = useAuth();
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

  // Save privacy settings whenever they change - AND sync to Supabase if authenticated
  useEffect(() => {
    const saveSettings = async () => {
      // Save locally
      await savePrivacySettings(settings);

      // Sync to Supabase if user is authenticated
      if (user && user.id !== 'guest') {
        try {
          const { error } = await supabase
            .from('user_settings')
            .upsert({
              user_id: user.id,
              privacy_analytics: settings.shareAnonymousData,
              notifications: settings.notifications,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id'
            });

          if (error) {
            console.error('Failed to sync privacy settings:', error);
          } else {
            console.log('LOG Privacy settings synced to cloud');
          }
        } catch (error) {
          console.error('Privacy settings sync error:', error);
        }
      }
    };

    saveSettings();
  }, [settings, user]);

  // Toggle setting
  const toggleSetting = (key) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  // Handle data download - REAL IMPLEMENTATION with format selection
  const handleDownloadData = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to export data');
      return;
    }

    // Check if running in Expo Go
    const isExpoGo = !Constants.appOwnership || Constants.appOwnership === 'expo';

    if (isExpoGo) {
      // Only show CSV and JSON options in Expo Go
      Alert.alert(
        'Choose Export Format',
        'PDF export requires a custom build. Please choose CSV or JSON:',
        [
          { text: 'CSV (Spreadsheet)', onPress: () => performExport('csv') },
          { text: 'JSON (Raw Data)', onPress: () => performExport('json') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Show all options in custom build
      Alert.alert(
        'Choose Export Format',
        'Select the format you want to export your data in:',
        [
          { text: 'PDF (Recommended)', onPress: () => performExport('pdf') },
          { text: 'CSV (Spreadsheet)', onPress: () => performExport('csv') },
          { text: 'JSON (Raw Data)', onPress: () => performExport('json') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const performExport = async (format: ExportFormat) => {
    setIsDownloading(true);

    try {
      // Fetch journal entries from AsyncStorage or Supabase
      let journalEntries = [];

      if (user && user.id !== 'guest') {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });

        if (!error && data) {
          journalEntries = data;
        }
      }

      // Prepare export data
      const exportData = {
        userEmail: user?.email || 'Guest User',
        exportDate: new Date().toISOString(),
        sleepSessions: sleepHistory || [],
        journalEntries: journalEntries,
        profile: user,
      };

      // Generate and share in selected format
      await exportAndShareData(exportData, format);

      const formatNames = {
        pdf: 'PDF',
        csv: 'CSV',
        json: 'JSON',
      };

      Alert.alert(
        'Export Complete',
        `Your data has been exported as ${formatNames[format]}. The file is ready to share or save.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Data export error:', error);
      Alert.alert(
        'Export Failed',
        'Failed to export data. Please try again later or contact support at asadalibscs20@gmail.com'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle data deletion - REAL IMPLEMENTATION
  const handleDeleteData = () => {
    Alert.alert(
      'Delete All Data',
      'Are you sure you want to delete ALL your data? This includes:\n\n• All sleep sessions\n• Journal entries\n• Settings & preferences\n\nThis action CANNOT be undone!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);

            try {
              // Delete from Supabase if authenticated
              if (user && user.id !== 'guest') {
                // Delete sleep records
                const { error: sleepError } = await supabase
                  .from('sleep_records')
                  .delete()
                  .eq('user_id', user.id);

                // Delete journal entries
                const { error: journalError } = await supabase
                  .from('journal_entries')
                  .delete()
                  .eq('user_id', user.id);

                // Delete user settings
                const { error: settingsError } = await supabase
                  .from('user_settings')
                  .delete()
                  .eq('user_id', user.id);

                if (sleepError || journalError || settingsError) {
                  console.error('Supabase deletion errors:', { sleepError, journalError, settingsError });
                }
              }

              // Delete from AsyncStorage
              await AsyncStorage.multiRemove([
                '@sleep_sessions',
                '@sleep_history',
                '@journal_entries',
                '@privacy_settings',
                '@user_preferences',
                '@offline_queue'
              ]);

              Alert.alert(
                'Data Deleted',
                'All your data has been permanently deleted.',
                [{
                  text: 'OK',
                  onPress: () => navigation.navigate('Home' as never)
                }]
              );
            } catch (error) {
              console.error('Data deletion error:', error);
              Alert.alert(
                'Deletion Failed',
                'Failed to delete some data. Please contact support at asadalibscs20@gmail.com'
              );
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles(theme).container} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.background, '#0A0C14']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles(theme).header}>
        <TouchableOpacity
          style={styles(theme).backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles(theme).title}>Privacy Settings</Text>
        <View style={styles(theme).placeholder} />
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
        <Text style={styles(theme).sectionDescription}>
          Control how your data is collected, used, and shared. Your privacy is our priority.
        </Text>

        {/* Data Collection Section */}
        <View style={styles(theme).section}>
          <Text style={styles(theme).sectionTitle}>Data Collection</Text>

          <BlurView intensity={20} style={styles(theme).settingsCard}>
            <View style={styles(theme).settingItem}>
              <View style={styles(theme).settingInfo}>
                <Text style={styles(theme).settingTitle}>Sleep Data Collection</Text>
                <Text style={styles(theme).settingDescription}>
                  Allow the app to collect data about your sleep patterns
                </Text>
              </View>
              <Switch
                value={settings.collectSleepData}
                onValueChange={() => toggleSetting('collectSleepData')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.collectSleepData ? theme.colors.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>

            <View style={styles(theme).divider} />

            <View style={styles(theme).settingItem}>
              <View style={styles(theme).settingInfo}>
                <Text style={styles(theme).settingTitle}>Anonymous Data Sharing</Text>
                <Text style={styles(theme).settingDescription}>
                  Share anonymous data to help improve our services
                </Text>
              </View>
              <Switch
                value={settings.shareAnonymousData}
                onValueChange={() => toggleSetting('shareAnonymousData')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.shareAnonymousData ? theme.colors.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
          </BlurView>
        </View>

        {/* Personalization Section */}
        <View style={styles(theme).section}>
          <Text style={styles(theme).sectionTitle}>Personalization</Text>

          <BlurView intensity={20} style={styles(theme).settingsCard}>
            <View style={styles(theme).settingItem}>
              <View style={styles(theme).settingInfo}>
                <Text style={styles(theme).settingTitle}>Personalized Experience</Text>
                <Text style={styles(theme).settingDescription}>
                  Allow us to personalize your experience based on your usage
                </Text>
              </View>
              <Switch
                value={settings.personalization}
                onValueChange={() => toggleSetting('personalization')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.personalization ? theme.colors.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>

            <View style={styles(theme).divider} />

            <View style={styles(theme).settingItem}>
              <View style={styles(theme).settingInfo}>
                <Text style={styles(theme).settingTitle}>Notifications</Text>
                <Text style={styles(theme).settingDescription}>
                  Receive personalized notifications and reminders
                </Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={() => toggleSetting('notifications')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.notifications ? theme.colors.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
          </BlurView>
        </View>

        {/* Integrations Section */}
        <View style={styles(theme).section}>
          <Text style={styles(theme).sectionTitle}>Integrations</Text>

          <BlurView intensity={20} style={styles(theme).settingsCard}>
            <View style={styles(theme).settingItem}>
              <View style={styles(theme).settingInfo}>
                <Text style={styles(theme).settingTitle}>Third-Party Integrations</Text>
                <Text style={styles(theme).settingDescription}>
                  Allow data sharing with connected health apps
                </Text>
              </View>
              <Switch
                value={settings.thirdPartyIntegration}
                onValueChange={() => toggleSetting('thirdPartyIntegration')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.thirdPartyIntegration ? theme.colors.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>

            <View style={styles(theme).divider} />

            <View style={styles(theme).settingItem}>
              <View style={styles(theme).settingInfo}>
                <Text style={styles(theme).settingTitle}>Location Tracking</Text>
                <Text style={styles(theme).settingDescription}>
                  Allow location data to be used for environmental factors
                </Text>
              </View>
              <Switch
                value={settings.locationTracking}
                onValueChange={() => toggleSetting('locationTracking')}
                trackColor={{ false: '#1E2C3A', true: '#1E2C3A' }}
                thumbColor={settings.locationTracking ? theme.colors.accent : '#444'}
                ios_backgroundColor="#1E2C3A"
              />
            </View>
          </BlurView>
        </View>

        {/* Data Management Section */}
        <View style={styles(theme).section}>
          <Text style={styles(theme).sectionTitle}>Data Management</Text>

          <BlurView intensity={20} style={styles(theme).settingsCard}>
            <TouchableOpacity
              style={styles(theme).dataActionItem}
              onPress={handleDownloadData}
              disabled={isDownloading || isDeleting}
            >
              <View style={styles(theme).dataActionIcon}>
                <Download size={24} color={theme.colors.highlight} />
              </View>
              <View style={styles(theme).dataActionInfo}>
                <Text style={styles(theme).dataActionTitle}>Download Your Data</Text>
                <Text style={styles(theme).dataActionDescription}>
                  Get a copy of all the data we have stored about you
                </Text>
              </View>
              {isDownloading ? (
                <ActivityIndicator color={theme.colors.highlight} size="small" />
              ) : (
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>

            <View style={styles(theme).divider} />

            <TouchableOpacity
              style={styles(theme).dataActionItem}
              onPress={handleDeleteData}
              disabled={isDownloading || isDeleting}
            >
              <View style={[styles(theme).dataActionIcon, styles(theme).deleteIcon]}>
                <Trash2 size={24} color={theme.colors.danger} />
              </View>
              <View style={styles(theme).dataActionInfo}>
                <Text style={[styles(theme).dataActionTitle, styles(theme).deleteText]}>Delete All Data</Text>
                <Text style={styles(theme).dataActionDescription}>
                  Permanently delete all your data from our servers
                </Text>
              </View>
              {isDeleting ? (
                <ActivityIndicator color={theme.colors.danger} size="small" />
              ) : (
                <ChevronRight size={20} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Privacy Policy Section */}
        <View style={styles(theme).section}>
          <Text style={styles(theme).sectionTitle}>Legal</Text>

          <BlurView intensity={20} style={styles(theme).settingsCard}>
            <TouchableOpacity style={styles(theme).legalItem}>
              <Text style={styles(theme).legalItemText}>Privacy Policy</Text>
              <Share2 size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles(theme).divider} />

            <TouchableOpacity style={styles(theme).legalItem}>
              <Text style={styles(theme).legalItemText}>Terms of Service</Text>
              <Share2 size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles(theme).divider} />

            <TouchableOpacity style={styles(theme).legalItem}>
              <Text style={styles(theme).legalItemText}>Data Processing Agreement</Text>
              <Share2 size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </BlurView>
        </View>

        <Text style={styles(theme).footerText}>
          Last updated: June 21, 2025
        </Text>

        {/* Bottom padding for tab bar */}
        <View style={styles(theme).bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.textPrimary,
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
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
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
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
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
    color: theme.colors.highlight,
    marginBottom: 4,
  },
  deleteText: {
    color: theme.colors.danger,
  },
  dataActionDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  legalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  legalItemText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  bottomPadding: {
    height: 100,
  },
});

