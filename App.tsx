import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import NetworkStatus from './components/NetworkStatus';
import GuestModeWarning from './components/GuestModeWarning';
import ErrorBoundary from './components/ErrorBoundary';
import revenueCatService from './services/revenueCatService';
import { crashLogger, setupGlobalErrorHandlers } from './services/crashLogger';

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

// Auth & Onboarding screens
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SplashScreen from './screens/SplashScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F0F1E',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#8B5CF6',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Sounds" component={SoundsScreen} />
      <Tab.Screen name="Mindfulness" component={MindfulnessScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading, hasCompletedOnboarding } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  // Show splash screen while loading OR for 2 seconds
  if (isLoading || showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
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
          <Stack.Screen name="SleepSession" component={SleepSessionScreen} />
          <Stack.Screen name="SessionPlayer" component={SessionPlayerScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="BedtimeRoutine" component={BedtimeRoutineScreen} />
          <Stack.Screen name="DreamJournal" component={DreamJournalScreen} />
          <Stack.Screen name="RoomEnvironment" component={RoomEnvironmentScreen} />
          <Stack.Screen name="SleepAnalysis" component={SleepAnalysisScreen} />
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
          <Stack.Screen name="SleepSession" component={SleepSessionScreen} />
          <Stack.Screen name="SessionPlayer" component={SessionPlayerScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="BedtimeRoutine" component={BedtimeRoutineScreen} />
          <Stack.Screen name="DreamJournal" component={DreamJournalScreen} />
          <Stack.Screen name="RoomEnvironment" component={RoomEnvironmentScreen} />
          <Stack.Screen name="SleepAnalysis" component={SleepAnalysisScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              <AudioProvider>
                <SleepProvider>
                  <NavigationContainer>
                    <NetworkStatus />
                    <GuestModeWarning />
                    <AppNavigator />
                  </NavigationContainer>
                </SleepProvider>
              </AudioProvider>
            </AuthProvider>
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