import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { isPremiumActive as checkPremiumStatus } from '../utils/subscriptionHelpers';
import analyticsService from '../services/analyticsService';
import { 
  ArrowLeft, 
  X, 
  ShieldCheck, 
  CheckCircle, 
  Leaf, 
  Music, 
  BarChart2, 
  Lightbulb, 
  Download, 
  Cloud, 
  XCircle, 
  Headset, 
  TrendingDown, 
  AlertCircle, 
  Lock,
  Heart,
  Thermometer,
  Zap,
  Moon,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ConfettiCannon from 'react-native-confetti-cannon';
import revenueCatService, { PurchasesPackageStub as PurchasesPackage } from '../services/revenueCatService';
import { useAppTheme } from '../hooks/useAppTheme';

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const { user, profile, session } = useAuth();
  const { theme, isDark } = useAppTheme();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isComparisonVisible, setIsComparisonVisible] = useState(false);

  const COMPARISON_FEATURES = [
    { 
      label: 'Basic Sleep Tracking', 
      free: true, 
      pro: true,
      description: 'Track your sleep duration, bedtime, and wake-up times with our core tracking engine.'
    },
    { 
      label: 'Sleep Sounds (Limited)', 
      free: true, 
      pro: true,
      description: 'Access a selection of calming sounds to help you fall asleep. Premium unlocks the full library.'
    },
    { 
      label: 'Advanced HRV Metrics', 
      free: false, 
      pro: true,
      description: 'Monitor Heart Rate Variability to understand your recovery and stress levels throughout the night.'
    },
    { 
      label: 'Sleep Architecture', 
      free: false, 
      pro: true,
      description: 'Detailed breakdown of your sleep stages: Deep, REM, Light, and Awake periods.'
    },
    { 
      label: 'Environmental Factors', 
      free: false, 
      pro: true,
      description: 'See how room temperature, humidity, and noise levels affect your sleep quality.'
    },
    { 
      label: '30-Day Trends', 
      free: false, 
      pro: true,
      description: 'Analyze your sleep patterns over the last month to identify long-term improvements.'
    },
    { 
      label: 'AI Sleep Insights', 
      free: false, 
      pro: true,
      description: 'Get personalized recommendations based on your unique sleep data and habits.'
    },
    { 
      label: 'Ad-Free Experience', 
      free: false, 
      pro: true,
      description: 'Enjoy the complete app experience without any interruptions or advertisements.'
    },
  ];

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const confettiRef = useRef<any>(null);

  // Load RevenueCat offerings on mount and set user ID
  useEffect(() => {
    const initializeRevenueCat = async () => {
      // Set user ID if logged in (critical for webhooks!)
      if (user?.id && user.id !== 'guest') {
        try {
          // Only set user ID if RevenueCat is properly configured
          if (revenueCatService.isReady()) {
            await revenueCatService.setUserId(user.id);
            console.log('Ã”Â£Ã  RevenueCat user ID set in SubscriptionScreen:', user.id);
          } else {
            console.warn('⚠️ RevenueCat not configured, skipping user ID set');
          }
        } catch (error) {
          console.error('Ã”Ã˜Ã® Failed to set RevenueCat user ID:', error);
        }
      }

      await loadOfferings();
    };

    initializeRevenueCat();
  }, [user?.id]);

  const loadOfferings = async () => {
    try {
      setIsLoadingOfferings(true);
      console.log('Â­Æ’Ã´Âª Loading RevenueCat offerings...');

      const availablePackages = await revenueCatService.getOfferings();

      if (!availablePackages || availablePackages.length === 0) {
        Alert.alert(
          'No Offerings Available',
          'Please make sure you have created products in RevenueCat dashboard and Google Play Console.',
          [{ text: 'OK' }]
        );
      } else {
        console.log('✅ Loaded packages:', availablePackages.map(p => p.identifier));
        setPackages(availablePackages);
      }
    } catch (error: any) {
      console.error('Ã”Ã˜Ã® Error loading offerings:', error);
      Alert.alert(
        'Error Loading Plans',
        'Could not load subscription plans. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingOfferings(false);
    }
  };

  const handleSubscribe = async () => {
    if (user?.id === 'guest') {
      Alert.alert(
        'Create an Account',
        'To ensure your premium subscription is safely linked to you and available on all your devices, please sign in or create an account first.',
        [
          { 
            text: 'Sign In / Sign Up', 
            onPress: () => navigation.navigate('Login' as never) 
          },
          { 
            text: 'Continue as Guest', 
            style: 'destructive',
            onPress: () => {
               Alert.alert(
                 'Are you sure?',
                 'Purchasing as a guest means your subscription might be lost if you reinstall the app or change devices. We strongly recommend signing in.',
                 [
                   { text: 'Sign In Now', onPress: () => navigation.navigate('Login' as never) },
                   { text: 'Buy as Guest anyway', onPress: () => proceedWithPurchase() }
                 ]
               );
            }
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    await proceedWithPurchase();
  };

  const proceedWithPurchase = async () => {
    if (packages.length === 0) {
      Alert.alert(
        'No Plans Available',
        'Please reload the app and try again.',
        [
          { text: 'Reload', onPress: () => loadOfferings() },
        ]
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Find the package to purchase based on selected plan
      // Look for package identifier containing 'monthly' or 'annual'/'yearly'
      const packageToPurchase = packages.find(pkg => {
        const identifier = pkg.identifier.toLowerCase();
        if (selectedPlan === 'monthly') {
          return identifier.includes('monthly') || identifier.includes('month');
        } else {
          return identifier.includes('annual') || identifier.includes('yearly') || identifier.includes('year');
        }
      });

      if (!packageToPurchase) {
        Alert.alert(
          'Plan Not Found',
          `Could not find the ${selectedPlan} plan. Please try the other plan or contact support.`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Â­Æ’Ã¸Ã† Purchasing package:', packageToPurchase.identifier);

      // Make the purchase
      const customerInfo = await revenueCatService.purchasePackage(packageToPurchase);

      // Check if the purchase was successful
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

      if (isPremium) {
        // Trigger confetti celebration!
        confettiRef.current?.start();

        // Update subscription status in your database
        const updateSuccess = await updateSubscriptionStatus();

        if (updateSuccess) {
          console.log('Ã”Â£Ã  Subscription status updated successfully!');

          // Wait a moment for the database to propagate
          await new Promise(resolve => setTimeout(resolve, 500));

          Alert.alert(
            'Success!',
            'Your subscription has been activated. Enjoy all premium features!',
            [{
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              }
            }]
          );
        } else {
          console.error('Ã”Ã˜Ã® Failed to update subscription status');
          Alert.alert(
            'Warning',
            'Payment was successful but there was an issue activating your subscription. Please contact support.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        Alert.alert(
          'Purchase Issue',
          'The purchase was processed but premium access was not granted. Please contact support.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error in proceedWithPurchase:', error);

      if (!error.userCancelled) {
        Alert.alert(
          'Subscription Error',
          error.message || 'Failed to process subscription. Please try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Try Again',
              onPress: () => proceedWithPurchase()
            }
          ]
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSubscriptionStatus = async (): Promise<boolean> => {
    try {
      if (!session?.user) {
        console.error('Ã”Ã˜Ã® No session user found!');
        return false;
      }

      const subscriptionStatus = selectedPlan === 'monthly'
        ? 'premium_monthly'
        : 'premium_yearly';

      // Calculate subscription end date
      const now = new Date();
      const endDate = new Date(now);
      if (selectedPlan === 'monthly') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      console.log('Â­Æ’Ã´Ã˜ Updating subscription in database:', {
        userId: session.user.id,
        status: subscriptionStatus,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Update user profile in Supabase
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: subscriptionStatus,
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', session.user.id)
        .select();

      if (error) {
        console.error('Ã”Ã˜Ã® Error updating subscription status:', error);
        return false;
      }

      console.log('Ã”Â£Ã  Database updated successfully:', data);
      return true;
    } catch (error) {
      console.error('Ã”Ã˜Ã® Error in updateSubscriptionStatus:', error);
      return false;
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsRestoring(true);

      if (!session?.user) {
        Alert.alert('Error', 'You must be signed in to restore purchases');
        return;
      }

      console.log('Â­Æ’Ã¶Ã¤ Restoring purchases via RevenueCat...');

      // Restore purchases
      const customerInfo = await revenueCatService.restorePurchases();

      // Check if user has active premium
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

      if (isPremium) {
        // Get subscription details
        const subscriptionType = await revenueCatService.getSubscriptionType();
        const expirationDate = await revenueCatService.getExpirationDate();

        // Update database
        await updateSubscriptionStatus();

        Alert.alert(
          'Subscription Restored!',
          `Your ${subscriptionType || 'premium'} subscription has been restored.${expirationDate ? ` Valid until ${expirationDate.toLocaleDateString()}.` : ''}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'No Subscription Found',
          'We could not find an active subscription for your account. If you believe this is an error, please contact support at asadalibscs20@gmail.com',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Something went wrong while restoring purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelSubscription = async () => {
    const cancelMessage = Platform.OS === 'ios'
      ? 'To cancel your subscription, please go to Settings > Apple ID > Subscriptions > Sleep Architect > Cancel Subscription.\n\nYou will continue to have access until the end of your billing period.'
      : 'To cancel your subscription, please go to Google Play Store > Subscriptions > Sleep Architect > Cancel Subscription.\n\nYou will continue to have access until the end of your billing period.';

    const buttonText = Platform.OS === 'ios' ? 'Open Settings' : 'Open Play Store';

    Alert.alert(
      'Cancel Subscription',
      cancelMessage,
      [
        { text: buttonText, onPress: () => {
          // In a real app, you'd open the respective store subscriptions page
          Alert.alert('Info', `This would open ${Platform.OS === 'ios' ? 'iOS Settings' : 'Google Play Store'} subscriptions page.`);
        }},
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  // Check if user is already premium (including cancelled with valid end date)
  const isPremium = checkPremiumStatus(profile?.subscription_status, profile?.subscription_end_date);

  if (isPremium) {
    return (
      <View style={styles(theme).container}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.backgroundSecondary]}
          style={styles(theme).gradient}
        >
          <View style={styles(theme).premiumHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles(theme).backButton}
            >
              <ArrowLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles(theme).closeButton}
            >
              <X size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles(theme).centeredContent}>
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.highlight, '#9D4EDD']}
              style={styles(theme).premiumBadge}
            >
              <Star size={60} color={theme.colors.textPrimary} />
            </LinearGradient>

            <Text style={styles(theme).premiumTitle}>You're Premium!</Text>
            <Text style={styles(theme).premiumSubtitle}>
              You currently have {profile.subscription_status === 'premium_monthly' ? 'Monthly' : 'Yearly'} Premium
            </Text>

            {profile.subscription_end_date && (
              <Text style={styles(theme).expiryText}>
                Valid until: {new Date(profile.subscription_end_date).toLocaleDateString()}
              </Text>
            )}

            <TouchableOpacity
              style={styles(theme).manageButton}
              onPress={() => navigation.navigate('Profile' as never)}
            >
              <Text style={styles(theme).manageButtonText}>Manage Subscription</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(theme).cancelButton}
              onPress={handleCancelSubscription}
            >
              <Text style={styles(theme).cancelButtonText}>Cancel Subscription</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (isLoadingOfferings) {
    return (
      <View style={styles(theme).container}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.backgroundSecondary]}
          style={styles(theme).gradient}
        >
          <View style={styles(theme).loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={styles(theme).loadingText}>Loading subscription plans...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        style={styles(theme).gradient}
      >
        <ScrollView
          style={styles(theme).content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles(theme).scrollContent}
        >
          {/* Header */}
          <View style={styles(theme).header}>
            <View style={styles(theme).headerTop}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles(theme).backButton}
              >
                <ArrowLeft size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles(theme).closeButton}
              >
                <X size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles(theme).title}>Premium Subscription</Text>
            <Text style={styles(theme).subtitle}>Unlock all premium features</Text>
          </View>

          {/* RevenueCat Badge */}
          <BlurView intensity={20} tint="dark" style={styles(theme).revenueCatBanner}>
            <ShieldCheck size={20} color={theme.colors.accent} />
            <View style={styles(theme).revenueCatTextContainer}>
              <Text style={styles(theme).revenueCatTitle}>SECURE CHECKOUT</Text>
              <Text style={styles(theme).revenueCatText}>
                {Platform.OS === 'ios'
                  ? 'Secure payments via Apple Pay & App Store'
                  : 'Secure payments via Google Play'}
              </Text>
            </View>
          </BlurView>

          {/* Features Grid */}
          <View style={[styles(theme).card, { backgroundColor: 'transparent', borderWidth: 0 }]}>
            <Text style={styles(theme).cardTitle}>Premium Benefits</Text>
            
            <View style={styles(theme).featuresGrid}>
              {[
                { id: 'hrv', icon: Heart, text: 'HRV Analysis', subtext: 'Heart health', color: '#EC4899' },
                { id: 'architecture', icon: TrendingDown, text: 'Sleep Stages', subtext: 'Deep/REM/Light', color: '#8B5CF6' },
                { id: 'env', icon: Thermometer, text: 'Environment', subtext: 'Temp & Noise', color: '#F59E0B' },
                { id: 'trends', icon: BarChart2, text: '30-Day Trends', subtext: 'Long-term data', color: '#6366F1' },
                { id: 'meditations', icon: Leaf, text: 'Meditations', subtext: 'Full library', color: '#10B981' },
                { id: 'sounds', icon: Music, text: 'Sleep Sounds', subtext: 'Unlimited access', color: '#8B5CF6' },
              ].map((feature) => (
                <View key={feature.id} style={styles(theme).featureGridItem}>
                  <View style={[styles(theme).featureGridIcon, { backgroundColor: feature.color + '20' }]}>
                    <feature.icon size={24} color={feature.color} />
                  </View>
                  <Text style={styles(theme).featureGridText}>{feature.text}</Text>
                  <Text style={styles(theme).featureGridSubtext}>{feature.subtext}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Comparison Table */}
          <View style={styles(theme).comparisonContainer}>
            <TouchableOpacity 
              style={styles(theme).comparisonHeaderToggle}
              onPress={() => setIsComparisonVisible(!isComparisonVisible)}
              activeOpacity={0.7}
            >
              <Text style={styles(theme).comparisonTitle}>Free vs. Premium</Text>
              <View style={styles(theme).toggleIconContainer}>
                <Text style={styles(theme).toggleText}>
                  {isComparisonVisible ? 'Hide Details' : 'Show Details'}
                </Text>
                {isComparisonVisible ? (
                  <ChevronUp size={20} color={theme.colors.accent} />
                ) : (
                  <ChevronDown size={20} color={theme.colors.accent} />
                )}
              </View>
            </TouchableOpacity>

            {isComparisonVisible && (
              <BlurView intensity={20} tint="dark" style={styles(theme).comparisonCard}>
                <View style={styles(theme).comparisonHeader}>
                  <View style={{ flex: 2.5 }} />
                  <Text style={styles(theme).headerValue}>Free</Text>
                  <Text style={[styles(theme).headerValue, { color: theme.colors.accent }]}>Pro</Text>
                  <View style={{ width: 30 }} />
                </View>
                
                {COMPARISON_FEATURES.map((row, i) => (
                  <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' }}>
                    <TouchableOpacity 
                      style={[
                        styles(theme).comparisonRow, 
                        i % 2 === 0 && expandedRow !== i && { backgroundColor: 'rgba(255, 255, 255, 0.03)' },
                        expandedRow === i && { backgroundColor: 'rgba(139, 92, 246, 0.1)' }
                      ]}
                      onPress={() => setExpandedRow(expandedRow === i ? null : i)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles(theme).comparisonLabel}>{row.label}</Text>
                      <View style={styles(theme).comparisonValue}>
                        {row.free ? <CheckCircle size={16} color={theme.colors.textSecondary} /> : <XCircle size={16} color="rgba(255, 255, 255, 0.1)" />}
                      </View>
                      <View style={styles(theme).comparisonValue}>
                        {row.pro ? <CheckCircle size={18} color={theme.colors.accent} /> : <XCircle size={18} color="rgba(255, 255, 255, 0.1)" />}
                      </View>
                      <View style={{ width: 30, alignItems: 'center' }}>
                        {expandedRow === i ? <ChevronUp size={16} color={theme.colors.textSecondary} /> : <ChevronDown size={16} color="rgba(255, 255, 255, 0.3)" />}
                      </View>
                    </TouchableOpacity>
                    
                    {expandedRow === i && (
                      <View style={styles(theme).expandedContent}>
                        <Text style={styles(theme).expandedDescription}>{row.description}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </BlurView>
            )}
          </View>

          {/* Pricing Plans */}
          <View style={styles(theme).plansContainer}>
            {packages.length > 0 ? (
              packages.map((pkg) => {
                const isMonthly = pkg.identifier.toLowerCase().includes('month');
                const isYearly = pkg.identifier.toLowerCase().includes('annual') ||
                                 pkg.identifier.toLowerCase().includes('year');
                const isSelected = (isMonthly && selectedPlan === 'monthly') ||
                                  (isYearly && selectedPlan === 'yearly');

                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles(theme).planCard,
                      isSelected && styles(theme).selectedPlan,
                    ]}
                    onPress={() => setSelectedPlan(isMonthly ? 'monthly' : 'yearly')}
                  >
                    <BlurView intensity={20} tint="dark" style={styles(theme).planContent}>
                      {isYearly && (
                        <View style={styles(theme).badge}>
                          <Text style={styles(theme).badgeText}>Popular</Text>
                        </View>
                      )}

                      {isSelected && (
                        <View style={styles(theme).checkmark}>
                          <CheckCircle size={24} color={theme.colors.accent} />
                        </View>
                      )}

                      <Text style={styles(theme).planName}>
                        {isMonthly ? 'Monthly' : 'Annual'}
                      </Text>
                      <View style={styles(theme).priceContainer}>
                        <Text style={styles(theme).price}>{pkg.product.priceString}</Text>
                        <Text style={styles(theme).period}>/{isMonthly ? 'month' : 'year'}</Text>
                      </View>
                      <Text style={styles(theme).planDescription}>
                        {isMonthly ? 'Perfect for trying out premium features' : 'Best value - Save ~17%'}
                      </Text>

                      {isYearly && (
                        <View style={styles(theme).savingsTag}>
                          <TrendingDown size={16} color="#32CD32" />
                          <Text style={styles(theme).savingsText}>Save money with annual plan</Text>
                        </View>
                      )}
                    </BlurView>
                  </TouchableOpacity>
                );
              })
            ) : (
              <BlurView intensity={20} tint="dark" style={styles(theme).noPlanCard}>
                <AlertCircle size={40} color="#FF6B9D" />
                <Text style={styles(theme).noPlanTitle}>No Plans Available</Text>
                <Text style={styles(theme).noPlanText}>
                  Please make sure you have set up products in RevenueCat and Google Play Console.
                </Text>
                <TouchableOpacity
                  style={styles(theme).reloadButton}
                  onPress={loadOfferings}
                >
                  <Text style={styles(theme).reloadButtonText}>Reload</Text>
                </TouchableOpacity>
              </BlurView>
            )}
          </View>

          <View style={styles(theme).bottomSpacing} />
        </ScrollView>

        {/* Subscribe Button */}
        {packages.length > 0 && (
          <View style={styles(theme).bottomContainer}>
            <TouchableOpacity
              style={[styles(theme).subscribeButton, isProcessing && styles(theme).disabledButton]}
              onPress={handleSubscribe}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={isProcessing ? [theme.colors.inactive, theme.colors.inactive] : [theme.colors.accent, theme.colors.highlight]}
                style={styles(theme).subscribeButtonGradient}
              >
                {isProcessing ? (
                  <View style={styles(theme).processingContainer}>
                    <ActivityIndicator color={isDark ? "#000" : "#FFF"} />
                    <Text style={styles(theme).subscribeButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <View style={styles(theme).buttonContent}>
                    <Lock size={20} color={theme.colors.background} />
                    <Text style={styles(theme).subscribeButtonText}>
                      Subscribe to {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles(theme).termsText}>
              By subscribing, you agree to our Terms of Service and Privacy Policy.
              {Platform.OS === 'ios'
                ? ' Subscription auto-renews unless canceled 24 hours before renewal via App Store Settings.'
                : ' Subscription auto-renews unless canceled 24 hours before renewal via Google Play Store.'}
            </Text>

            <TouchableOpacity
              style={styles(theme).restoreButton}
              onPress={handleRestorePurchases}
              disabled={isRestoring}
            >
              <Text style={styles(theme).restoreText}>
                {isRestoring ? 'Restoring...' : 'Restore Purchases'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Confetti celebration effect */}
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut={true}
        fallSpeed={3000}
        colors={[theme.colors.accent, theme.colors.highlight, '#9D4EDD', theme.colors.premium, '#FF6B9D']}
      />
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
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  premiumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  revenueCatBanner: {
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  revenueCatTextContainer: {
    flex: 1,
  },
  revenueCatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
    marginBottom: 4,
  },
  revenueCatText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  comparisonContainer: {
    paddingVertical: 20,
    marginBottom: 20,
  },
  comparisonTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  comparisonHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  comparisonCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  comparisonHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
    marginTop: 8,
  },
  headerLabel: {
    flex: 2,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerValue: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  comparisonLabel: {
    flex: 2.5,
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    paddingRight: 10,
  },
  comparisonValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
  expandedDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
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
    color: theme.colors.textPrimary,
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  featureGridItem: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  featureGridIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureGridText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  featureGridSubtext: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  plansContainer: {
    marginBottom: 20,
  },
  planCard: {
    marginBottom: 15,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPlan: {
    borderColor: theme.colors.accent,
  },
  planContent: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 20,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  checkmark: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  period: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  savingsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  savingsText: {
    fontSize: 12,
    color: '#32CD32',
    fontWeight: '600',
  },
  noPlanCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  noPlanTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  noPlanText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  reloadButton: {
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  reloadButtonText: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(15, 17, 26, 0.95)',
  },
  subscribeButton: {
    marginBottom: 15,
  },
  subscribeButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  disabledButton: {
    opacity: 0.6,
  },
  termsText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  restoreButton: {
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 14,
    color: theme.colors.accent,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  premiumBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  premiumTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  expiryText: {
    fontSize: 14,
    color: theme.colors.accent,
    marginBottom: 32,
  },
  manageButton: {
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  manageButtonText: {
    fontSize: 16,
    color: theme.colors.accent,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 107, 157, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B9D',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '600',
  },
});

