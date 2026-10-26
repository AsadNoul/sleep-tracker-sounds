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
  ActivityIndicator,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ChevronLeft, Shield, Download, FileJson, Trash2, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { savePrivacySettings, loadPrivacySettings } from '../utils/storage';
import { exportAndShareData, type ExportFormat } from '../utils/dataExport';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Canvas (`Ac-Privacy.dc.html` / `D-Ac-Privacy.dc.html`): back button + "Privacy
// & data" Fraunces title, a hero card ("Your sleep data is yours"), a
// "Permissions" group card, a "Your data" group card (PDF/JSON export rows +
// an anonymous-usage toggle), then two stacked bottom buttons.
//
// This screen's real feature set is larger than the simple mockup (6 privacy
// toggles across 3 categories, a 3-format export flow, full account deletion,
// legal links) — those sections have no canvas equivalent, so they're
// self-designed here in the same system (uppercase group labels,
// `groupCard`/`row`/`rowDivider`, Fraunces display title, DM Sans body,
// theme.borderRadius.card) rather than left in the old BlurView styling.
// All data sources, navigation, Supabase field names and business logic are
// unchanged — only JSX/styling.

export default function PrivacySettingsScreen() {
  const { theme } = useAppTheme();
  const s = styles(theme);
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

  const handleDownloadJson = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to export data');
      return;
    }
    performExport('json');
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
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={s.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} accessibilityLabel="Back">
            <ChevronLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Privacy &amp; data</Text>
        </View>

        {/* Hero card — canvas-matched */}
        <View style={s.heroCard}>
          <View style={[s.heroIconWrapper, { backgroundColor: theme.colors.accentLight }]}>
            <Shield size={18} color={theme.colors.accent} />
          </View>
          <View style={s.heroTextBlock}>
            <Text style={s.heroTitle}>Your sleep data is yours</Text>
            <Text style={s.heroSubtitle}>
              We never sell it. Download or delete it any time.
            </Text>
          </View>
        </View>

        {/* Data Collection — self-designed (no canvas equivalent) */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Data Collection</Text>
          <View style={s.groupCard}>
            <View style={s.row}>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Sleep data collection</Text>
                <Text style={s.rowDescription}>Collect data about your sleep patterns</Text>
              </View>
              <Switch
                value={settings.collectSleepData}
                onValueChange={() => toggleSetting('collectSleepData')}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
              />
            </View>
            <View style={s.rowDivider} />
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Share anonymous usage</Text>
                <Text style={s.rowDescription}>Helps us fix bugs. No sleep data.</Text>
              </View>
              <Switch
                value={settings.shareAnonymousData}
                onValueChange={() => toggleSetting('shareAnonymousData')}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
              />
            </View>
          </View>
        </View>

        {/* Personalization — self-designed (no canvas equivalent) */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Personalization</Text>
          <View style={s.groupCard}>
            <View style={s.row}>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Personalized experience</Text>
                <Text style={s.rowDescription}>Tailor insights to your usage</Text>
              </View>
              <Switch
                value={settings.personalization}
                onValueChange={() => toggleSetting('personalization')}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
              />
            </View>
            <View style={s.rowDivider} />
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Notifications</Text>
                <Text style={s.rowDescription}>Personalized reminders and reports</Text>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={() => toggleSetting('notifications')}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
              />
            </View>
          </View>
        </View>

        {/* Permissions — canvas-matched section, rows self-designed as live toggles
            instead of the mockup's static "Allowed" labels, since this screen's
            source data is real app settings rather than OS permission state. */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Permissions &amp; Integrations</Text>
          <View style={s.groupCard}>
            <View style={s.row}>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Third-party integrations</Text>
                <Text style={s.rowDescription}>Share data with connected health apps</Text>
              </View>
              <Switch
                value={settings.thirdPartyIntegration}
                onValueChange={() => toggleSetting('thirdPartyIntegration')}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
              />
            </View>
            <View style={s.rowDivider} />
            <View style={[s.row, s.rowLast]}>
              <View style={s.rowTextBlock}>
                <Text style={s.rowLabel}>Location tracking</Text>
                <Text style={s.rowDescription}>Use location for environmental factors</Text>
              </View>
              <Switch
                value={settings.locationTracking}
                onValueChange={() => toggleSetting('locationTracking')}
                trackColor={{ false: theme.colors.cardBorder, true: theme.colors.accent }}
                thumbColor={Platform.OS === 'android' ? theme.colors.textPrimary : undefined}
              />
            </View>
          </View>
        </View>

        {/* Your data — canvas-matched (PDF/JSON export rows) */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Your Data</Text>
          <View style={s.groupCard}>
            <TouchableOpacity
              style={s.row}
              onPress={handleDownloadData}
              disabled={isDownloading || isDeleting}
              activeOpacity={0.7}
            >
              <View style={s.rowIconLabel}>
                <Download size={18} color={theme.colors.textTertiary} />
                <Text style={s.rowLabel}>Download as PDF report</Text>
              </View>
              {isDownloading ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <ChevronRight size={16} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity
              style={[s.row, s.rowLast]}
              onPress={handleDownloadJson}
              disabled={isDownloading || isDeleting}
              activeOpacity={0.7}
            >
              <View style={s.rowIconLabel}>
                <FileJson size={18} color={theme.colors.textTertiary} />
                <Text style={s.rowLabel}>Download raw data (JSON)</Text>
              </View>
              {isDownloading ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <ChevronRight size={16} color={theme.colors.textTertiary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal — self-designed (no canvas equivalent) */}
        <View style={s.sectionBlock}>
          <Text style={s.sectionLabel}>Legal</Text>
          <View style={s.groupCard}>
            <TouchableOpacity style={s.row} activeOpacity={0.7}>
              <Text style={s.rowLabel}>Privacy Policy</Text>
              <ChevronRight size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity style={s.row} activeOpacity={0.7}>
              <Text style={s.rowLabel}>Terms of Service</Text>
              <ChevronRight size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
            <View style={s.rowDivider} />
            <TouchableOpacity style={[s.row, s.rowLast]} activeOpacity={0.7}>
              <Text style={s.rowLabel}>Data Processing Agreement</Text>
              <ChevronRight size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom destructive actions — canvas-matched button treatment */}
        <View style={s.bottomActions}>
          <TouchableOpacity
            style={s.deleteDataButton}
            onPress={handleDeleteData}
            disabled={isDownloading || isDeleting}
            activeOpacity={0.85}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.textPrimary} />
            ) : (
              <>
                <Trash2 size={18} color={theme.colors.textPrimary} />
                <Text style={s.deleteDataButtonText}>Delete all data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footerText}>Last updated: June 21, 2025</Text>
      </ScrollView>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 20,
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
  title: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    letterSpacing: -0.2,
    color: theme.colors.textPrimary,
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 20,
  },
  heroIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextBlock: { flex: 1, rowGap: 4 },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },

  sectionBlock: { rowGap: 8, marginBottom: 20 },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textTertiary,
  },

  groupCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    columnGap: 12,
  },
  rowLast: {},
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
  },
  rowTextBlock: { flex: 1, rowGap: 2 },
  rowIconLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  rowLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  rowDescription: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
  },

  bottomActions: {
    rowGap: 10,
    marginBottom: 20,
  },
  deleteDataButton: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    backgroundColor: theme.colors.cardOverlay,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  deleteDataButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },

  footerText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
});
