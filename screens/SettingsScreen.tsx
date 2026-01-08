import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { saveSettings, loadSettings } from '../utils/storage';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Main: undefined;
  SleepSession: undefined;
  Subscription: undefined;
  HelpSupport: undefined;
  PrivacySettings: undefined;
  Profile: undefined;
  About: undefined;
};

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { themeMode, setThemeMode } = useTheme();
  const { signOut, user, saveUserSettings } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [sleepReminder, setSleepReminder] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadData = async () => {
      const savedSettings = await loadSettings();
      if (savedSettings) {
        setNotifications(savedSettings.notifications ?? true);
        setSleepReminder(savedSettings.sleepReminder ?? false);
        setHapticFeedback(savedSettings.hapticFeedback ?? true);
      }
    };
    loadData();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    const settings = { notifications, sleepReminder, hapticFeedback };
    saveSettings(settings);
    
    // Also save to Supabase if user is authenticated
    if (user && user.id !== 'guest') {
      saveUserSettings(settings).catch(err => {
        console.error('Failed to sync settings to cloud:', err);
      });
    }
  }, [notifications, sleepReminder, hapticFeedback, user, saveUserSettings]);

  const handleThemeModeChange = async () => {
    const modes: ThemeMode[] = ['dark', 'light', 'auto'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    await setThemeMode(nextMode);
  };

  const getThemeModeLabel = () => {
    switch (themeMode) {
      case 'dark':
        return 'Dark';
      case 'light':
        return 'Light';
      case 'auto':
        return 'Auto';
    }
  };

  const navigateToSubscription = () => {
    navigation.navigate('Subscription');
  };

  const navigateToPrivacySettings = () => {
    navigation.navigate('PrivacySettings');
  };

  const navigateToHelpSupport = () => {
    navigation.navigate('HelpSupport');
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const navigateToAbout = () => {
    navigation.navigate('About');
  };

  const handleExportData = async () => {
    try {
      // Get all data from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const result = await AsyncStorage.multiGet(keys);

      // Create a formatted data object
      const exportData: Record<string, any> = {};
      result.forEach(([key, value]) => {
        try {
          exportData[key] = value ? JSON.parse(value) : value;
        } catch {
          exportData[key] = value;
        }
      });

      // Create JSON string
      const jsonData = JSON.stringify(exportData, null, 2);
      const dataToShare = `Sleep Tracker Data Export\nExported: ${new Date().toLocaleString()}\n\n${jsonData}`;

      // Share the data
      await Share.share({
        message: dataToShare,
        title: 'Sleep Tracker Data Export',
      });

      Alert.alert('Success', 'Your data has been prepared for export. You can save it or share it via your preferred app.');
    } catch (error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
      console.error('Export error:', error);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all data
              await AsyncStorage.clear();
              await signOut();
              Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account. Please try again.');
              console.error('Delete account error:', error);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Navigation will be handled automatically by AuthContext
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F111A', '#1B1D2A']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Customize your experience</Text>
          </View>

          {/* Account Section */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>

            <TouchableOpacity style={styles.settingItem} onPress={navigateToProfile}>
              <View style={styles.settingInfo}>
                <Ionicons name="person" size={24} color="#00FFD1" />
                <Text style={styles.settingLabel}>Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={navigateToSubscription}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="star" size={24} color="#FFD700" />
                <Text style={styles.settingLabel}>Premium Subscription</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.settingItem}
              onPress={navigateToPrivacySettings}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="shield-checkmark" size={24} color="#33C6FF" />
                <Text style={styles.settingLabel}>Privacy Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>
          </BlurView>

          {/* App Preferences */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>App Preferences</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={24} color="#FF6B6B" />
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#333', true: '#00FFD1' }}
                thumbColor={notifications ? '#fff' : '#ccc'}
              />
            </View>

            <TouchableOpacity style={styles.settingItem} onPress={handleThemeModeChange}>
              <View style={styles.settingInfo}>
                <Ionicons
                  name={themeMode === 'dark' ? 'moon' : themeMode === 'light' ? 'sunny' : 'phone-portrait'}
                  size={24}
                  color="#9D4EDD"
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.settingLabel}>Theme</Text>
                  <Text style={styles.settingSubLabel}>{getThemeModeLabel()}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="alarm" size={24} color="#FFD700" />
                <Text style={styles.settingLabel}>Sleep Reminder</Text>
              </View>
              <Switch
                value={sleepReminder}
                onValueChange={setSleepReminder}
                trackColor={{ false: '#333', true: '#FFD700' }}
                thumbColor={sleepReminder ? '#fff' : '#ccc'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="phone-portrait" size={24} color="#00CED1" />
                <Text style={styles.settingLabel}>Haptic Feedback</Text>
              </View>
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: '#333', true: '#00CED1' }}
                thumbColor={hapticFeedback ? '#fff' : '#ccc'}
              />
            </View>
          </BlurView>

          {/* Support & Info */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Support & Info</Text>
            
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={navigateToHelpSupport}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="help-circle" size={24} color="#32CD32" />
                <Text style={styles.settingLabel}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="document-text" size={24} color="#FFA500" />
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={navigateToAbout}>
              <View style={styles.settingInfo}>
                <Ionicons name="information-circle" size={24} color="#87CEEB" />
                <Text style={styles.settingLabel}>About</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>
          </BlurView>

          {/* Data & Privacy */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Data & Privacy</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleExportData}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="download" size={24} color="#4CAF50" />
                <Text style={styles.settingLabel}>Export My Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleDeleteAccount}
            >
              <View style={styles.settingInfo}>
                <Ionicons name="trash" size={24} color="#FF6B6B" />
                <Text style={styles.settingLabel}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
            </TouchableOpacity>
          </BlurView>

          {/* Sign Out */}
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <BlurView intensity={20} tint="dark" style={styles.signOutCard}>
              <Ionicons name="log-out" size={24} color="#FF6B6B" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </BlurView>
          </TouchableOpacity>

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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  settingSubLabel: {
    fontSize: 13,
    color: '#A0AEC0',
    marginLeft: 12,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: 10,
  },
  signOutCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 30,
  },
  profileCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  profileValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  profileButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  profileButton: {
    backgroundColor: '#00FFD1',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginLeft: 10,
    marginTop: 8,
  },
  profileButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: '#222',
    backgroundColor: '#f9f9f9',
  },
});