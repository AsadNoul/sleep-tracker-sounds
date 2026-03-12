import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, ActivityIndicator, Platform, Dimensions, Text } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  BarChart2,
  Music,
  Leaf,
  Settings as SettingsIcon
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SleepProvider } from './contexts/SleepContext';
import { AudioProvider } from './contexts/AudioContext';
import { ToastProvider } from './contexts/ToastContext';
import { OfflineModeProvider } from './contexts/OfflineModeContext';
import NetworkStatus from './components/NetworkStatus';
import GuestModeWarning from './components/GuestModeWarning';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary, { withScreenErrorBoundary } from './components/ErrorBoundary';
import revenueCatService from './services/revenueCatService';
import { crashLogger, setupGlobalErrorHandlers } from './services/crashLogger';
import alarmService from './services/alarmService';
import { useFonts } from 'expo-font';
import UpdateChecker from './components/UpdateChecker';

// Import screens
import HomeScreen from './screens/HomeScreen';
import SleepSessionScreen from './screens/SleepSessionScreen';
import JournalScreen from './screens/JournalScreen';
import SoundsScreen from './screens/SoundsScreen';
import MindfulnessScreen from './screens/MindfulnessScreen';
import SettingsScreen from './screens/SettingsScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import HelpSupportScreen from './screens/HelpSupportScreen';
import PrivacySettingsScreen from './screens/PrivacySettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AboutScreen from './screens/AboutScreen';
import SessionPlayerScreen from './screens/SessionPlayerScreen';
import BedtimeRoutineScreen from './screens/BedtimeRoutineScreen';
import DreamJournalScreen from './screens/DreamJournalScreen';
import RoomEnvironmentScreen from './screens/RoomEnvironmentScreen';
import SleepAnalysisScreen from './screens/SleepAnalysisScreen';
import FeatureRequestScreen from './screens/FeatureRequestScreen';
import AlarmsScreen from './screens/AlarmsScreen';
import SleepStagesScreen from './screens/SleepStagesScreen';
import SnoreDetectionScreen from './screens/SnoreDetectionScreen';
import HealthTrackingScreen from './screens/HealthTrackingScreen';
import RelaxationLibraryScreen from './screens/RelaxationLibraryScreen';
import PartnerModeScreen from './screens/PartnerModeScreen';
import SleepInterruptionsScreen from './screens/SleepInterruptionsScreen';
import CaffeineCalculatorScreen from './screens/CaffeineCalculatorScreen';
import AchievementsScreen from './screens/AchievementsScreen';
import AdminScreen from './screens/AdminScreen';

// Auth & Onboarding screens
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SplashScreen from './screens/SplashScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Wrap crash-prone screens with per-screen error boundaries
// So a single screen crash doesn't take down the whole app
const SafeHomeScreen = withScreenErrorBoundary(HomeScreen, 'Home');
const SafeSleepSessionScreen = withScreenErrorBoundary(SleepSessionScreen, 'Sleep Session');
const SafeJournalScreen = withScreenErrorBoundary(JournalScreen, 'Journal');
const SafeSoundsScreen = withScreenErrorBoundary(SoundsScreen, 'Sounds');
const SafeMindfulnessScreen = withScreenErrorBoundary(MindfulnessScreen, 'Mindfulness');
const SafeSettingsScreen = withScreenErrorBoundary(SettingsScreen, 'Settings');
const SafeSleepAnalysisScreen = withScreenErrorBoundary(SleepAnalysisScreen, 'Sleep Analysis');
const SafeSubscriptionScreen = withScreenErrorBoundary(SubscriptionScreen, 'Subscription');

// Helper function to calculate safe tab bar height
const getTabBarHeight = (insetsBottom: number): number => {
  // Base height for the tab bar itself (icons + labels)
  const baseTabBarHeight = 65;

  if (Platform.OS === 'android') {
    // Android navigation bar handling
    // Case 1: Gesture navigation (low insetsBottom, typically 0-20)
    // Case 2: 3-button navigation (insetsBottom is usually 0 if handled by system, 
    // but Expo/RN insets might report 0 or the actual height)

    // If we have actual insets (gesture or modern Android), use them with a base padding
    if (insetsBottom > 0) {
      return baseTabBarHeight + insetsBottom + 4;
    }

    // Fallback for older Android or where insets aren't reporting correctly
    // 48dp is standard Android bottom nav height
    return baseTabBarHeight + 10;
  }

  // iOS: Always use insets to account for the home indicator
  return baseTabBarHeight + Math.max(insetsBottom, 15);
};

const getTabBarPaddingBottom = (insetsBottom: number): number => {
  if (Platform.OS === 'android') {
    return insetsBottom > 0 ? insetsBottom + 2 : 10;
  }
  return insetsBottom > 0 ? insetsBottom : 10;
};

function MainNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarHeight(insets.bottom);
  const tabBarPaddingBottom = getTabBarPaddingBottom(insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0F1E',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 12,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 8, // Android shadow
          shadowColor: '#000', // iOS shadow
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: Platform.OS === 'android' ? 2 : 0,
        },
        tabBarBadgeStyle: {
          backgroundColor: '#F59E0B',
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
          top: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return <Home size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
          } else if (route.name === 'Journal') {
            return <BarChart2 size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
          } else if (route.name === 'Sounds') {
            return <Music size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
          } else if (route.name === 'Mindfulness') {
            return <Leaf size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
          } else if (route.name === 'Settings') {
            return <SettingsIcon size={size} color={color} strokeWidth={focused ? 2.5 : 2} />;
          }
          return <Home size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={SafeHomeScreen} />
      <Tab.Screen name="Journal" component={SafeJournalScreen} />
      <Tab.Screen name="Sounds" component={SafeSoundsScreen} />
      <Tab.Screen name="Mindfulness" component={SafeMindfulnessScreen} />
      <Tab.Screen name="Settings" component={SafeSettingsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading, hasCompletedOnboarding } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [splashDuration, setSplashDuration] = useState(2000);

  // Determine splash duration: 1s for returning users, 2s for first-timers
  useEffect(() => {
    AsyncStorage.getItem('@has_launched_before').then(val => {
      if (val === 'true') {
        setSplashDuration(1000);
      } else {
        AsyncStorage.setItem('@has_launched_before', 'true');
        setSplashDuration(2000);
      }
    });
  }, []);

  // Show splash screen while loading
  if (isLoading || showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} splashDuration={splashDuration} />;
  }

  return (
    <>
      <GuestModeWarning />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not logged in
          !hasCompletedOnboarding ? (
            // New users: Show onboarding FIRST, then auth screens
            <>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : (
            // Returning users (completed onboarding but logged out): Skip onboarding, go to auth
            <>
              <Stack.Screen name="Welcome" component={WelcomeScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          )
        ) : !hasCompletedOnboarding ? (
          // Logged in but hasn't finished onboarding (e.g. Google Sign-in for first time)
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Main" component={MainNavigator} />
            <Stack.Screen name="SleepSession" component={SafeSleepSessionScreen} />
            <Stack.Screen name="SessionPlayer" component={SessionPlayerScreen} />
            <Stack.Screen name="Subscription" component={SafeSubscriptionScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="BedtimeRoutine" component={BedtimeRoutineScreen} />
            <Stack.Screen name="DreamJournal" component={DreamJournalScreen} />
            <Stack.Screen name="RoomEnvironment" component={RoomEnvironmentScreen} />
            <Stack.Screen name="SleepAnalysis" component={SafeSleepAnalysisScreen} />
            <Stack.Screen name="FeatureRequest" component={FeatureRequestScreen} />
            <Stack.Screen name="Alarms" component={AlarmsScreen} />
            <Stack.Screen name="SleepStages" component={SleepStagesScreen} />
            <Stack.Screen name="SnoreDetection" component={SnoreDetectionScreen} />
            <Stack.Screen name="HealthTracking" component={HealthTrackingScreen} />
            <Stack.Screen name="RelaxationLibrary" component={RelaxationLibraryScreen} />
            <Stack.Screen name="PartnerMode" component={PartnerModeScreen} />
            <Stack.Screen name="SleepInterruptions" component={SleepInterruptionsScreen} />
            <Stack.Screen name="CaffeineCalculator" component={CaffeineCalculatorScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
          </>
        ) : (
          // Logged in and finished onboarding
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            {user?.id === 'guest' && (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              </>
            )}
            <Stack.Screen name="SleepSession" component={SafeSleepSessionScreen} />
            <Stack.Screen name="SessionPlayer" component={SessionPlayerScreen} />
            <Stack.Screen name="Subscription" component={SafeSubscriptionScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="About" component={AboutScreen} />
            <Stack.Screen name="BedtimeRoutine" component={BedtimeRoutineScreen} />
            <Stack.Screen name="DreamJournal" component={DreamJournalScreen} />
            <Stack.Screen name="RoomEnvironment" component={RoomEnvironmentScreen} />
            <Stack.Screen name="SleepAnalysis" component={SafeSleepAnalysisScreen} />
            <Stack.Screen name="FeatureRequest" component={FeatureRequestScreen} />
            <Stack.Screen name="Alarms" component={AlarmsScreen} />
            <Stack.Screen name="SleepStages" component={SleepStagesScreen} />
            <Stack.Screen name="SnoreDetection" component={SnoreDetectionScreen} />
            <Stack.Screen name="HealthTracking" component={HealthTrackingScreen} />
            <Stack.Screen name="RelaxationLibrary" component={RelaxationLibraryScreen} />
            <Stack.Screen name="PartnerMode" component={PartnerModeScreen} />
            <Stack.Screen name="SleepInterruptions" component={SleepInterruptionsScreen} />
            <Stack.Screen name="CaffeineCalculator" component={CaffeineCalculatorScreen} />
            <Stack.Screen name="Achievements" component={AchievementsScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  // Load Poppins fonts
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Light': require('./assets/fonts/Poppins-Light.ttf'),
    'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('./assets/fonts/Poppins-ExtraBold.ttf'),
    'Poppins-Black': require('./assets/fonts/Poppins-Black.ttf'),
  });

  // Log font loading status
  useEffect(() => {
    if (fontsLoaded) {
      console.log('✅ Poppins fonts loaded successfully!');
    }
    if (fontError) {
      console.error('❌ Font loading error:', fontError);
    }
  }, [fontsLoaded, fontError]);

  // Initialize crash reporting and services on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Setup crash logging FIRST (so it can catch other errors)
        console.log('🔄 Setting up crash reporting...');
        crashLogger.configure('asadalibscs20@gmail.com');
        setupGlobalErrorHandlers();
        console.log('✅ Crash reporting configured');

        // 2. Clear old corrupted sync queue (Dec 4, 2025 fix)
        const hasCleared = await AsyncStorage.getItem('@queue_cleared_dec4_2025');
        if (!hasCleared) {
          await AsyncStorage.multiRemove([
            '@sync_queue_sleep_records',
            '@sync_queue_journal_entries',
            '@sync_queue_settings',
            '@sync_completed_idempotency_keys',
          ]);
          await AsyncStorage.setItem('@queue_cleared_dec4_2025', 'true');
          console.log('✅ Old sync queue cleared! Fresh start.');
        }

        // 3. Initialize RevenueCat
        console.log('🔄 Initializing RevenueCat...');
        await revenueCatService.configure();
        console.log('✅ RevenueCat initialized successfully!');

        // 4. Initialize Alarm Service
        console.log('🔄 Initializing Alarm Service...');
        await alarmService.initialize();
        console.log('✅ Alarm Service initialized successfully!');

      } catch (error) {
        console.error('❌ Error during app initialization:', error);
        // Report the initialization error
        try {
          await crashLogger.reportCrash(error, 'critical');
        } catch (reportError) {
          console.error('Failed to report initialization error:', reportError);
        }
      }
    };

    initializeApp();
  }, []);

  // Wait for fonts to load
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={{ color: '#fff', marginTop: 20 }}>Loading Poppins fonts...</Text>
      </View>
    );
  }

  if (fontError) {
    console.error('Font loading failed, continuing without custom fonts');
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <ToastProvider>
            <OfflineModeProvider>
              <AuthProvider>
                <SleepProvider>
                  <AudioProvider>
                    <UpdateChecker />
                    <NavigationContainer>
                      <OfflineBanner />
                      <NetworkStatus />
                      <AppNavigator />
                    </NavigationContainer>
                  </AudioProvider>
                </SleepProvider>
              </AuthProvider>
            </OfflineModeProvider>
          </ToastProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F111A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});