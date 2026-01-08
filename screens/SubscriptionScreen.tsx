import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_MONTHLY_PRICE_ID, STRIPE_YEARLY_PRICE_ID, SUPABASE_ANON_KEY } from '@env';

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user, profile, session } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);

  const plans = [
    {
      id: 'monthly' as const,
      name: 'Monthly',
      price: '$4.99',
      period: '/month',
      description: 'Perfect for trying out premium features',
      priceId: STRIPE_MONTHLY_PRICE_ID,
    },
    {
      id: 'yearly' as const,
      name: 'Annual',
      price: '$49.99',
      period: '/year',
      description: 'Best value - Save ~17%',
      badge: 'Popular',
      priceId: STRIPE_YEARLY_PRICE_ID,
    },
  ];

  useEffect(() => {
    console.log('SubscriptionScreen: User state:', {
      hasUser: !!user,
      userId: user?.id,
      isGuest: user?.id === 'guest',
      hasSession: !!session,
      userEmail: user?.email,
    });
  }, [user, session]);

  const initializePaymentSheet = async () => {
    try {
      setPaymentSheetReady(false);

      // Check if user is authenticated (not guest)
      if (!user || user.id === 'guest') {
        console.log('User not authenticated - skipping payment sheet initialization');
        return;
      }

      // Get the selected plan
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) return;

      // Get auth token for Supabase Edge Function
      // Use the session from AuthContext (it's already available)
      console.log('Using session from AuthContext');
      let authSession = session;

      // If no session in context, try getSession as fallback
      if (!authSession) {
        console.log('No session in context, trying getSession...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        authSession = sessionData?.session;

        if (sessionError || !authSession) {
          console.error('Session error:', sessionError);
          Alert.alert(
            'Authentication Error',
            'Your session has expired. Please log out and log back in.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      console.log('Session info:', {
        userId: authSession.user.id,
        email: authSession.user.email,
        hasAccessToken: !!authSession.access_token,
        tokenPreview: authSession.access_token?.substring(0, 20) + '...',
        expiresAt: authSession.expires_at,
      });

      // Call Supabase Edge Function to create payment intent
      const supabaseUrl = process.env.SUPABASE_URL || 'https://wdcgvzeolhpfkuozickj.supabase.co';

      console.log('Calling Edge Function:', `${supabaseUrl}/functions/v1/create-payment-intent`);
      console.log('Plan:', plan.id, 'Price ID:', plan.priceId);

      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          priceId: plan.priceId,
          planType: selectedPlan,
          userId: user.id,
          email: user.email,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edge Function error response:', errorText);

        let errorMessage = 'Failed to initialize payment';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log('Edge Function success:', responseData);

      const { paymentIntent, ephemeralKey, customer } = responseData;

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Sleep Tracker',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          email: user?.email,
        },
      });

      if (error) {
        console.error('Payment sheet initialization error:', error);
      } else {
        setPaymentSheetReady(true);
      }
    } catch (error: any) {
      console.error('Error initializing payment sheet:', error);
      Alert.alert('Error', error.message || 'Failed to initialize payment');
    }
  };

  const handleSubscribe = async () => {
    if (user?.id === 'guest') {
      Alert.alert(
        'Sign In Required',
        'Please sign in or create an account to subscribe to premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login' as never) },
        ]
      );
      return;
    }

    setIsProcessing(true);

    try {
      // Initialize payment sheet with the currently selected plan
      console.log('Subscribe button clicked - initializing payment sheet for:', selectedPlan);
      await initializePaymentSheet();

      if (!paymentSheetReady) {
        throw new Error('Failed to initialize payment system');
      }

      // Present the payment sheet
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code !== 'Canceled') {
          Alert.alert('Payment Error', error.message);
        }
      } else {
        // Payment successful
        await updateSubscriptionStatus();

        Alert.alert(
          'Success!',
          'Your subscription has been activated. Enjoy all premium features!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      console.error('Error in handleSubscribe:', error);
      Alert.alert('Error', error.message || 'Failed to process subscription. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSubscriptionStatus = async () => {
    try {
      if (!session?.user) return;

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

      // Update user profile in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: subscriptionStatus,
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', session.user.id);

      if (error) {
        console.error('Error updating subscription status:', error);
      }
    } catch (error) {
      console.error('Error in updateSubscriptionStatus:', error);
    }
  };

  // Check if user is already premium
  const isPremium = profile?.subscription_status &&
    (profile.subscription_status === 'premium_monthly' ||
     profile.subscription_status === 'premium_yearly');

  if (isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0F111A', '#1B1D2A']}
          style={styles.gradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.centeredContent}>
            <LinearGradient
              colors={['#00FFD1', '#33C6FF', '#9D4EDD']}
              style={styles.premiumBadge}
            >
              <Ionicons name="star" size={60} color="#FFFFFF" />
            </LinearGradient>

            <Text style={styles.premiumTitle}>You're Premium!</Text>
            <Text style={styles.premiumSubtitle}>
              You currently have {profile.subscription_status === 'premium_monthly' ? 'Monthly' : 'Yearly'} Premium
            </Text>

            {profile.subscription_end_date && (
              <Text style={styles.expiryText}>
                Valid until: {new Date(profile.subscription_end_date).toLocaleDateString()}
              </Text>
            )}

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('Profile' as never)}
            >
              <Text style={styles.manageButtonText}>Manage Subscription</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F111A', '#1B1D2A']}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Premium Subscription</Text>
            <Text style={styles.subtitle}>Unlock all premium features</Text>
          </View>

          {/* Features */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.cardTitle}>Premium Features</Text>

            {[
              { id: 'meditations', icon: 'leaf', text: 'All premium meditations & sleep stories' },
              { id: 'sounds', icon: 'musical-notes', text: 'Unlimited sleep sounds & music' },
              { id: 'analytics', icon: 'stats-chart', text: 'Advanced sleep analytics' },
              { id: 'insights', icon: 'bulb', text: 'Personalized insights & recommendations' },
              { id: 'export', icon: 'download', text: 'Export sleep data' },
              { id: 'sync', icon: 'cloud', text: 'Cloud sync across devices' },
              { id: 'adfree', icon: 'close-circle', text: 'Ad-free experience' },
              { id: 'support', icon: 'headset', text: 'Priority support' },
            ].map((feature) => (
              <View key={feature.id} style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Ionicons name={feature.icon as any} size={20} color="#00FFD1" />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </BlurView>

          {/* Pricing Plans */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.selectedPlan,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                <BlurView intensity={20} tint="dark" style={styles.planContent}>
                  {plan.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  )}

                  {selectedPlan === plan.id && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#00FFD1" />
                    </View>
                  )}

                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>{plan.price}</Text>
                    <Text style={styles.period}>{plan.period}</Text>
                  </View>
                  <Text style={styles.planDescription}>{plan.description}</Text>

                  {plan.id === 'yearly' && (
                    <View style={styles.savingsTag}>
                      <Ionicons name="trending-down" size={16} color="#32CD32" />
                      <Text style={styles.savingsText}>Save $9.89/year</Text>
                    </View>
                  )}
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Subscribe Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.subscribeButton, isProcessing && styles.disabledButton]}
            onPress={handleSubscribe}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={isProcessing ? ['#666', '#666'] : ['#00FFD1', '#33C6FF']}
              style={styles.subscribeButtonGradient}
            >
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator color="#000" />
                  <Text style={styles.subscribeButtonText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="lock-closed" size={20} color="#0F111A" />
                  <Text style={styles.subscribeButtonText}>
                    Subscribe to {selectedPlan === 'monthly' ? 'Monthly' : 'Yearly'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy.
            Subscription auto-renews unless canceled 24 hours before renewal.
          </Text>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={() => Alert.alert('Restore Purchases', 'Contact support to restore your purchases')}
          >
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    marginBottom: 20,
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
    color: '#FFFFFF',
    flex: 1,
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
    borderColor: '#00FFD1',
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
    backgroundColor: '#00FFD1',
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
    color: '#FFFFFF',
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
    color: '#00FFD1',
  },
  period: {
    fontSize: 16,
    color: '#A0AEC0',
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#A0AEC0',
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
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  restoreButton: {
    paddingVertical: 10,
  },
  restoreText: {
    fontSize: 14,
    color: '#00FFD1',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 16,
  },
  expiryText: {
    fontSize: 14,
    color: '#00FFD1',
    marginBottom: 32,
  },
  manageButton: {
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00FFD1',
  },
  manageButtonText: {
    fontSize: 16,
    color: '#00FFD1',
    fontWeight: '600',
  },
});
