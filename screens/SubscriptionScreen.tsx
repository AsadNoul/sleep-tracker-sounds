import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { isPremiumActive as checkPremiumStatus } from '../utils/subscriptionHelpers';
import analyticsService from '../services/analyticsService';
import {
  ArrowLeft,
  X,
  ShieldCheck,
  CheckCircle,
  Music,
  BarChart2,
  XCircle,
  TrendingDown,
  Heart,
  Thermometer,
  Moon,
  ChevronDown,
  ChevronUp,
  Infinity,
  Gift,
  Sparkles,
  Crown,
  Headphones,
  FileText,
  Users,
  Clock,
  Star,
  Zap,
  Award,
  TrendingUp,
  Flame,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ConfettiCannon from 'react-native-confetti-cannon';
import revenueCatService from '../services/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';
import { useAppTheme } from '../hooks/useAppTheme';

type PlanType = 'monthly' | 'yearly' | 'lifetime';

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Working Mom',
    flag: '🇺🇸',
    country: 'United States',
    avatarColor: '#EC4899',
    quote: '"I went from 5hrs broken sleep to 7.5hrs solid in just 2 weeks. This app changed my life!"',
    stars: 5,
    improvement: '+42% sleep quality',
  },
  {
    name: 'James K.',
    role: 'Software Engineer',
    flag: '🇬🇧',
    country: 'United Kingdom',
    avatarColor: '#6366F1',
    quote: '"The AI insights showed me caffeine was killing my deep sleep. Fixed in 10 days. Incredible."',
    stars: 5,
    improvement: '+38% deep sleep',
  },
  {
    name: 'Priya R.',
    role: 'Yoga Instructor',
    flag: '🇦🇪',
    country: 'UAE',
    avatarColor: '#10B981',
    quote: '"Sleep sounds + tracking combo is unbeatable. Finally waking up refreshed every morning."',
    stars: 5,
    improvement: '+31% sleep score',
  },
  {
    name: 'David L.',
    role: 'Entrepreneur',
    flag: '🇺🇸',
    country: 'United States',
    avatarColor: '#F59E0B',
    quote: '"Worth every penny. The sleep recorder caught my sleep apnea — literally changed my health."',
    stars: 5,
    improvement: '+55% energy levels',
  },
];

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, profile, session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // source tells us which feature triggered the paywall (for analytics)
  const source: string = route.params?.source || 'unknown';

  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [isComparisonVisible, setIsComparisonVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const confettiRef = useRef<any>(null);

  // Monthly price derived from yearly package for the breakdown label
  const [yearlyPricePerMonth, setYearlyPricePerMonth] = useState<string | null>(null);
  const [yearlyTotalPrice, setYearlyTotalPrice] = useState<string | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<string | null>(null);

  // Testimonial carousel
  const testimonialRef = useRef<ScrollView>(null);
  const [testimonialIndex, setTestimonialIndex] = useState(0);

  // Card width = screen width - horizontal padding (20*2) - scroll padding adjustment
  const cardWidth = width - 40;

  // Auto-advance testimonials every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTestimonialIndex(prev => {
        const next = (prev + 1) % TESTIMONIALS.length;
        testimonialRef.current?.scrollTo({ x: next * cardWidth, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [cardWidth]);

  const COMPARISON_FEATURES = [
    { label: 'Basic Sleep Tracking', free: true, pro: true, description: 'Track sleep duration, bedtime, and wake-up times.' },
    { label: 'Sleep Journal (7 days)', free: true, pro: true, description: 'View last 7 days of sleep history free. Premium unlocks unlimited history.' },
    { label: 'Sleep Sounds (4 free)', free: true, pro: true, description: '4 free sounds (Forest, Birds, Crickets, Wind). Premium unlocks the full library of 19 sounds.' },
    { label: 'Sleep Recorder', free: false, pro: true, description: 'Record & analyze snoring, sleep talk, and breathing patterns all night long.' },
    { label: 'Sleep Architecture', free: false, pro: true, description: 'Detailed breakdown of Deep, REM, Light, and Awake periods.' },
    { label: '30-Day & 90-Day Trends', free: false, pro: true, description: 'Analyze your sleep patterns long-term to identify improvements.' },
    { label: 'AI Sleep Insights', free: false, pro: true, description: 'Personalized recommendations generated from your unique sleep data.' },
    { label: 'Detailed Sleep Reports', free: false, pro: true, description: 'Export full sleep reports as PDF or CSV — share with your doctor or coach.' },
    { label: 'Nap Mode', free: false, pro: true, description: 'Power nap with countdown timer and gentle wake-up alarm.' },
    { label: 'Partner Mode', free: false, pro: true, description: 'Compare and share sleep data with a partner or friend.' },
    { label: 'Room Environment', free: false, pro: true, description: 'Track temperature, humidity, and noise levels during sleep.' },
    { label: 'VIP Priority Support', free: false, pro: true, description: 'Skip the queue — get responses within 2 hours from our support team.' },
    { label: 'Ad-Free Experience', free: false, pro: true, description: 'No interruptions. Ever.' },
  ];

  useEffect(() => {
    // Track paywall view with the source feature
    analyticsService.trackEvent('paywall_viewed', { source, plan_shown: selectedPlan });

    const init = async () => {
      if (user?.id && user.id !== 'guest') {
        try {
          if (revenueCatService.isReady()) {
            await revenueCatService.setUserId(user.id);
          }
        } catch (_) {}
      }
      await loadOfferings();
    };
    init();
  }, []);

  const loadOfferings = async () => {
    try {
      setIsLoadingOfferings(true);
      const availablePackages = await revenueCatService.getOfferings();

      if (availablePackages && availablePackages.length > 0) {
        setPackages(availablePackages);

        // Pre-compute price labels for yearly breakdown
        for (const pkg of availablePackages) {
          const id = pkg.identifier.toLowerCase();
          if (id.includes('annual') || id.includes('yearly') || id.includes('year')) {
            const total = pkg.product.price;
            const perMonth = (total / 12).toFixed(2);
            const currencySymbol = pkg.product.priceString.replace(/[\d.,]/g, '').trim() || '$';
            setYearlyPricePerMonth(`${currencySymbol}${perMonth}`);
            setYearlyTotalPrice(pkg.product.priceString);
          }
          if (id.includes('monthly') || id.includes('month')) {
            setMonthlyPrice(pkg.product.priceString);
          }
        }
      }
    } catch (_) {
    } finally {
      setIsLoadingOfferings(false);
    }
  };

  const handleSubscribe = async () => {
    if (user?.id === 'guest') {
      Alert.alert(
        'Create an Account',
        'Sign in or create an account to link your subscription across all your devices.',
        [
          { text: 'Sign In / Sign Up', onPress: () => navigation.navigate('Login') },
          { text: 'Buy as Guest', onPress: () => proceedWithPurchase() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    await proceedWithPurchase();
  };

  const proceedWithPurchase = async () => {
    if (packages.length === 0) {
      Alert.alert('No Plans Available', 'Please reload the app and try again.', [
        { text: 'Reload', onPress: () => loadOfferings() },
      ]);
      return;
    }

    setIsProcessing(true);
    try {
      const packageToPurchase = packages.find(pkg => {
        const id = pkg.identifier.toLowerCase();
        if (selectedPlan === 'monthly') return id.includes('monthly') || id.includes('month');
        if (selectedPlan === 'yearly') return id.includes('annual') || id.includes('yearly') || id.includes('year');
        if (selectedPlan === 'lifetime') return id.includes('lifetime') || id.includes('life');
        return false;
      });

      if (!packageToPurchase) {
        Alert.alert('Plan Not Found', `The ${selectedPlan} plan is not available yet. Try another plan.`);
        return;
      }

      const customerInfo = await revenueCatService.purchasePackage(packageToPurchase);
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

      if (isPremium) {
        confettiRef.current?.start();
        const ok = await updateSubscriptionStatus();

        // Track purchase
        analyticsService.trackSubscriptionPurchase(selectedPlan, packageToPurchase.product.price);

        if (ok) {
          await new Promise(r => setTimeout(r, 500));
          Alert.alert(
            '🎉 Welcome to Premium!',
            selectedPlan === 'lifetime'
              ? 'You now have lifetime access to all features. Thank you!'
              : `Your ${selectedPlan === 'monthly' ? 'monthly' : 'yearly'} subscription is active. Enjoy!`,
            [{ text: 'Let\'s Go!', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Warning', 'Payment successful but activation failed. Contact support.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      }
    } catch (error: any) {
      if (!error.userCancelled) {
        Alert.alert('Subscription Error', error.message || 'Failed to process. Please try again.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => proceedWithPurchase() },
        ]);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSubscriptionStatus = async (): Promise<boolean> => {
    try {
      if (!session?.user) return false;

      const subscriptionStatus = selectedPlan === 'monthly'
        ? 'premium_monthly'
        : selectedPlan === 'lifetime'
          ? 'premium_lifetime'
          : 'premium_yearly';

      const now = new Date();
      const endDate = new Date(now);
      if (selectedPlan === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else if (selectedPlan === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
      else endDate.setFullYear(endDate.getFullYear() + 100); // lifetime = 100yr

      const { error } = await supabase
        .from('user_profiles')
        .update({
          subscription_status: subscriptionStatus,
          subscription_start_date: now.toISOString(),
          subscription_end_date: endDate.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', session.user.id)
        .select();

      return !error;
    } catch (_) {
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
      const customerInfo = await revenueCatService.restorePurchases();
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

      if (isPremium) {
        const subscriptionType = await revenueCatService.getSubscriptionType();
        const expirationDate = await revenueCatService.getExpirationDate();
        await updateSubscriptionStatus();
        Alert.alert(
          'Subscription Restored!',
          `Your ${subscriptionType || 'premium'} subscription has been restored.${expirationDate ? ` Valid until ${expirationDate.toLocaleDateString()}.` : ''}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('No Subscription Found', 'No active subscription found. Contact support at asadalibscs20@gmail.com', [{ text: 'OK' }]);
      }
    } catch (_) {
      Alert.alert('Error', 'Something went wrong restoring purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancelSubscription = async () => {
    const msg = Platform.OS === 'ios'
      ? 'To cancel, go to Settings > Apple ID > Subscriptions > Sleep Architect > Cancel.\n\nYou keep access until the billing period ends.'
      : 'To cancel, go to Google Play Store > Subscriptions > Sleep Architect > Cancel.\n\nYou keep access until the billing period ends.';
    Alert.alert('Cancel Subscription', msg, [{ text: 'OK' }]);
  };

  const isPremium = checkPremiumStatus(profile?.subscription_status, profile?.subscription_end_date, profile?.role, profile?.email);

  // ─── Already Premium screen ───
  if (isPremium) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#0F172A', '#1E1B4B']} style={StyleSheet.absoluteFill} />
        <View style={[s.premiumHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <X size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={s.centeredContent}>
          <LinearGradient colors={['#8B5CF6', '#6366F1', '#9D4EDD']} style={s.premiumBadge}>
            <Crown size={60} color="#FFF" />
          </LinearGradient>
          <Text style={s.premiumTitle}>You're Premium!</Text>
          <Text style={s.premiumSubtitle}>
            {(profile?.subscription_status as string) === 'premium_lifetime'
              ? 'Lifetime Access — all features forever'
              : `${profile?.subscription_status === 'premium_monthly' ? 'Monthly' : 'Yearly'} Premium`}
          </Text>
          {profile?.subscription_end_date && (profile?.subscription_status as string) !== 'premium_lifetime' && (
            <Text style={s.expiryText}>Renews: {new Date(profile.subscription_end_date).toLocaleDateString()}</Text>
          )}
          <TouchableOpacity style={s.manageBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={s.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
          {(profile?.subscription_status as string) !== 'premium_lifetime' && (
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancelSubscription}>
              <Text style={s.cancelBtnText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
        </View>
        <ConfettiCannon ref={confettiRef} count={200} origin={{ x: -10, y: 0 }} autoStart={false} fadeOut fallSpeed={3000} colors={['#8B5CF6', '#6366F1', '#9D4EDD', '#F59E0B', '#EC4899']} />
      </View>
    );
  }

  if (isLoadingOfferings) {
    return (
      <View style={s.container}>
        <LinearGradient colors={['#0F172A', '#1E1B4B']} style={StyleSheet.absoluteFill} />
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={s.loadingText}>Loading plans...</Text>
        </View>
      </View>
    );
  }

  // Get the selected package for display
  const selectedPackage = packages.find(pkg => {
    const id = pkg.identifier.toLowerCase();
    if (selectedPlan === 'monthly') return id.includes('monthly') || id.includes('month');
    if (selectedPlan === 'yearly') return id.includes('annual') || id.includes('yearly') || id.includes('year');
    if (selectedPlan === 'lifetime') return id.includes('lifetime') || id.includes('life');
    return false;
  });

  const hasLifetime = packages.some(pkg => {
    const id = pkg.identifier.toLowerCase();
    return id.includes('lifetime') || id.includes('life');
  });

  return (
    <View style={s.container}>
      <LinearGradient colors={['#0F172A', '#1E1B4B', '#0F172A']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <X size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom + 180, 200) }]}
        style={s.scrollView}
      >

        {/* Hero */}
        <View style={s.hero}>
          <LinearGradient colors={['rgba(139,92,246,0.3)', 'rgba(99,102,241,0.1)']} style={s.heroBadge}>
            <Crown size={32} color="#8B5CF6" />
          </LinearGradient>
          <Text style={s.heroTitle}>Sleep Better,{'\n'}Every Night</Text>
          <Text style={s.heroSubtitle}>Join thousands of users who improved their sleep with Premium</Text>

          {/* Free trial banner */}
          <View style={s.trialBanner}>
            <View style={s.trialBannerIcon}><Gift size={16} color="#10B981" /></View>
            <Text style={s.trialText}>3 days free — cancel anytime</Text>
          </View>
        </View>

        {/* ─── TRUST STATS BAR ─── */}
        <View style={s.trustStatsRow}>
          <View style={s.trustStat}>
            <View style={s.trustStatIcon}><Star size={13} color="#F59E0B" /></View>
            <Text style={s.trustStatText}>4.8 App Store</Text>
          </View>
          <View style={s.trustStatDivider} />
          <View style={s.trustStat}>
            <View style={s.trustStatIcon}><Users size={13} color="#8B5CF6" /></View>
            <Text style={s.trustStatText}>50K+ users</Text>
          </View>
          <View style={s.trustStatDivider} />
          <View style={s.trustStat}>
            <View style={s.trustStatIcon}><Moon size={13} color="#6366F1" /></View>
            <Text style={s.trustStatText}>2M+ nights tracked</Text>
          </View>
        </View>

        {/* ─── TESTIMONIALS CAROUSEL ─── */}
        <View style={s.testimonialsSection}>
          <ScrollView
            ref={testimonialRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onMomentumScrollEnd={e => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
              setTestimonialIndex(idx);
            }}
            style={{ width: cardWidth }}
          >
            {TESTIMONIALS.map((t, i) => (
              <View key={i} style={[s.testimonialCard, { width: cardWidth }]}>
                <LinearGradient
                  colors={['rgba(139,92,246,0.1)', 'rgba(99,102,241,0.05)']}
                  style={s.testimonialGradient}
                >
                  {/* Author row at top */}
                  <View style={s.testimonialAuthorTop}>
                    <View style={s.testimonialAvatarWrap}>
                      <View style={[s.testimonialAvatar, { backgroundColor: t.avatarColor + '33', borderColor: t.avatarColor + '66' }]}>
                        <Text style={[s.testimonialAvatarText, { color: t.avatarColor }]}>{t.name[0]}</Text>
                      </View>
                      <View style={s.testimonialFlagBadge}>
                        <Text style={s.testimonialFlagText}>{t.flag}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.testimonialNameRow}>
                        <Text style={s.testimonialName}>{t.name}</Text>
                        <Text style={s.testimonialCountry}>{t.country}</Text>
                      </View>
                      <Text style={s.testimonialRole}>{t.role}</Text>
                    </View>
                    <View style={s.testimonialImprovementChip}>
                      <TrendingUp size={11} color="#10B981" />
                      <Text style={s.testimonialImprovementText}>{t.improvement}</Text>
                    </View>
                  </View>
                  {/* Stars */}
                  <View style={s.testimonialStars}>
                    {Array.from({ length: t.stars }).map((_, si) => (
                      <View key={si} style={si > 0 ? { marginLeft: 2 } : {}}>
                        <Star size={13} color="#F59E0B" fill="#F59E0B" />
                      </View>
                    ))}
                  </View>
                  {/* Quote */}
                  <Text style={s.testimonialQuote}>{t.quote}</Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>

          {/* Dot indicators */}
          <View style={s.testimonialDots}>
            {TESTIMONIALS.map((_, i) => (
              <View
                key={i}
                style={[s.testimonialDot, testimonialIndex === i && s.testimonialDotActive]}
              />
            ))}
          </View>
        </View>

        {/* ─── SOCIAL PROOF COUNTER ─── */}
        <View style={s.socialProofRow}>
          <View style={s.socialProofIcon}><Flame size={16} color="#F97316" /></View>
          <Text style={s.socialProofText}>127 people upgraded this week</Text>
        </View>

        {/* ─── PRICING TOGGLE — at the top ─── */}
        <View style={s.planToggleRow}>
          {/* Monthly */}
          <TouchableOpacity
            style={[s.planTab, selectedPlan === 'monthly' && s.planTabActive]}
            onPress={() => setSelectedPlan('monthly')}
          >
            <Text style={[s.planTabLabel, selectedPlan === 'monthly' && s.planTabLabelActive]}>Monthly</Text>
            <Text style={[s.planTabPrice, selectedPlan === 'monthly' && s.planTabPriceActive]}>
              {monthlyPrice || '–'}<Text style={s.planTabPeriod}>/mo</Text>
            </Text>
          </TouchableOpacity>

          {/* Yearly — most popular */}
          <TouchableOpacity
            style={[s.planTab, s.planTabYearly, selectedPlan === 'yearly' && s.planTabActive]}
            onPress={() => setSelectedPlan('yearly')}
          >
            <View style={s.popularBadge}><Text style={s.popularBadgeText}>BEST VALUE</Text></View>
            <Text style={[s.planTabLabel, selectedPlan === 'yearly' && s.planTabLabelActive]}>Yearly</Text>
            <Text style={[s.planTabPrice, selectedPlan === 'yearly' && s.planTabPriceActive]}>
              {yearlyPricePerMonth || '–'}<Text style={s.planTabPeriod}>/mo</Text>
            </Text>
            {yearlyTotalPrice && (
              <Text style={s.planTabYearlyTotal}>{yearlyTotalPrice}/year</Text>
            )}
            {monthlyPrice && yearlyPricePerMonth && (
              <View style={s.savingsChip}>
                <View style={s.savingsChipIcon}><TrendingDown size={12} color="#10B981" /></View>
                <Text style={s.savingsChipText}>Save vs monthly</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Lifetime — if available in RevenueCat */}
          {hasLifetime && (
            <TouchableOpacity
              style={[s.planTab, selectedPlan === 'lifetime' && s.planTabActive]}
              onPress={() => setSelectedPlan('lifetime')}
            >
              <Infinity size={16} color={selectedPlan === 'lifetime' ? '#8B5CF6' : 'rgba(255,255,255,0.4)'} />
              <Text style={[s.planTabLabel, selectedPlan === 'lifetime' && s.planTabLabelActive]}>Lifetime</Text>
              <Text style={[s.planTabPrice, selectedPlan === 'lifetime' && s.planTabPriceActive]}>
                {packages.find(p => p.identifier.toLowerCase().includes('life'))?.product.priceString || '–'}
              </Text>
              <Text style={s.planTabYearlyTotal}>One-time</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Secure checkout badge */}
        <View style={s.secureBadge}>
          <View style={s.secureBadgeIcon}><ShieldCheck size={16} color="#10B981" /></View>
          <Text style={s.secureBadgeText}>
            {Platform.OS === 'ios' ? 'Secure checkout via App Store' : 'Secure checkout via Google Play'}
          </Text>
        </View>

        {/* Features grid */}
        <View style={s.featuresSection}>
          <Text style={s.sectionTitle}>What's included</Text>
          <View style={s.featuresGrid}>
            {[
              { icon: Music, text: '19 Sleep Sounds', color: '#8B5CF6' },
              { icon: BarChart2, text: '90-Day Trends', color: '#6366F1' },
              { icon: Sparkles, text: 'AI Insights', color: '#F59E0B' },
              { icon: Heart, text: 'Sleep Analysis', color: '#EC4899' },
              { icon: Moon, text: 'Nap Mode', color: '#10B981' },
              { icon: Thermometer, text: 'Environment', color: '#3B82F6' },
              { icon: Headphones, text: 'VIP Support', color: '#F59E0B' },
              { icon: FileText, text: 'Sleep Reports', color: '#6366F1' },
              { icon: Users, text: 'Partner Mode', color: '#EC4899' },
              { icon: Zap, text: 'Sleep Recorder', color: '#10B981' },
            ].map((f, i) => (
              <View key={i} style={s.featureChip}>
                <View style={s.featureChipIcon}><f.icon size={18} color={f.color} /></View>
                <Text style={s.featureChipText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming features teaser */}
        <View style={s.upcomingSection}>
          <Text style={s.sectionTitle}>Coming Soon</Text>
          <View style={s.upcomingCard}>
            <LinearGradient colors={['rgba(139,92,246,0.08)', 'rgba(99,102,241,0.04)']} style={s.upcomingGradient}>
              {[
                { icon: Users, text: 'Partner Mode', desc: 'Share & compare sleep with a partner', color: '#EC4899' },
                { icon: FileText, text: 'PDF & CSV Export', desc: 'Detailed sleep reports exportable anytime', color: '#6366F1' },
                { icon: Star, text: 'Sleep Coach', desc: 'Personalized sleep improvement program', color: '#F59E0B' },
                { icon: Clock, text: 'Smart Alarm', desc: 'Wake up at your lightest sleep stage', color: '#10B981' },
              ].map((item, i) => (
                <View key={i} style={[s.upcomingRow, i < 3 && s.upcomingRowBorder]}>
                  <View style={s.upcomingIcon}><item.icon size={18} color={item.color} /></View>
                  <View style={s.upcomingText}>
                    <Text style={s.upcomingTitle}>{item.text}</Text>
                    <Text style={s.upcomingDesc}>{item.desc}</Text>
                  </View>
                  <View style={s.upcomingBadge}><Text style={s.upcomingBadgeText}>SOON</Text></View>
                </View>
              ))}
            </LinearGradient>
          </View>
        </View>

        {/* Comparison table */}
        <View style={s.comparisonSection}>
          <TouchableOpacity
            style={s.comparisonToggle}
            onPress={() => setIsComparisonVisible(v => !v)}
          >
            <Text style={s.comparisonToggleText}>Free vs Premium</Text>
            {isComparisonVisible
              ? <ChevronUp size={18} color="#8B5CF6" />
              : <ChevronDown size={18} color="#8B5CF6" />}
          </TouchableOpacity>

          {isComparisonVisible && (
            <View style={s.comparisonCard}>
              {/* Header row */}
              <View style={s.comparisonHeaderRow}>
                <Text style={[s.comparisonCol, { flex: 3, color: 'rgba(255,255,255,0.4)', fontSize: 11 }]}>FEATURE</Text>
                <Text style={[s.comparisonColCenter, { color: 'rgba(255,255,255,0.4)', fontSize: 11 }]}>FREE</Text>
                <Text style={[s.comparisonColCenter, { color: '#8B5CF6', fontSize: 11 }]}>PRO</Text>
              </View>
              {COMPARISON_FEATURES.map((row, i) => (
                <View key={i}>
                  <TouchableOpacity
                    style={[s.comparisonRow, i % 2 === 0 && { backgroundColor: 'rgba(255,255,255,0.02)' }, expandedRow === i && { backgroundColor: 'rgba(139,92,246,0.08)' }]}
                    onPress={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <Text style={[s.comparisonCol, { flex: 3 }]}>{row.label}</Text>
                    <View style={s.comparisonColCenter}>
                      {row.free ? <CheckCircle size={15} color="rgba(255,255,255,0.4)" /> : <XCircle size={15} color="rgba(255,255,255,0.12)" />}
                    </View>
                    <View style={s.comparisonColCenter}>
                      {row.pro ? <CheckCircle size={16} color="#8B5CF6" /> : <XCircle size={15} color="rgba(255,255,255,0.12)" />}
                    </View>
                  </TouchableOpacity>
                  {expandedRow === i && (
                    <Text style={s.comparisonExpanded}>{row.description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ─── Sticky Subscribe Button ─── */}
      <View style={[s.stickyBottom, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>

        {/* Money-back guarantee badge */}
        <View style={s.guaranteeBadge}>
          <View style={s.guaranteeIcon}><Award size={14} color="#F59E0B" /></View>
          <Text style={s.guaranteeText}>30-day money-back guarantee · No questions asked</Text>
        </View>

        <TouchableOpacity
          style={[s.subscribeBtn, isProcessing && { opacity: 0.6 }]}
          onPress={handleSubscribe}
          disabled={isProcessing}
        >
          <LinearGradient colors={['#8B5CF6', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.subscribeBtnGradient}>
            {isProcessing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={s.subscribeBtnText}>
                  {selectedPlan === 'lifetime'
                    ? 'Get Lifetime Access'
                    : `Start 3-Day Free Trial`}
                </Text>
                <Text style={s.subscribeBtnSub}>
                  {selectedPlan === 'lifetime'
                    ? `${selectedPackage?.product.priceString || ''} one-time`
                    : selectedPlan === 'yearly'
                      ? `Then ${yearlyTotalPrice || ''}/year • Cancel anytime`
                      : `Then ${monthlyPrice || ''}/month • Cancel anytime`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={handleRestorePurchases} disabled={isRestoring}>
          <Text style={s.restoreBtnText}>{isRestoring ? 'Restoring...' : 'Restore Purchases'}</Text>
        </TouchableOpacity>

        <Text style={s.termsText}>
          {selectedPlan === 'lifetime'
            ? 'One-time payment. No recurring charges.'
            : `3-day free trial, then auto-renews. Cancel anytime via ${Platform.OS === 'ios' ? 'App Store Settings' : 'Google Play'}.`}
          {' '}By subscribing you agree to our Terms & Privacy Policy.
        </Text>
      </View>

      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut
        fallSpeed={3000}
        colors={['#8B5CF6', '#6366F1', '#9D4EDD', '#F59E0B', '#EC4899']}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 10 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 16 },
  heroBadge: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#FFF', textAlign: 'center', lineHeight: 36, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  trialBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50 },
  trialBannerIcon: { marginRight: 8 },
  trialText: { color: '#10B981', fontSize: 13, fontWeight: '700' },

  // Trust stats bar
  trustStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 50, paddingVertical: 9, paddingHorizontal: 14, marginBottom: 14 },
  trustStat: { flexDirection: 'row', alignItems: 'center' },
  trustStatIcon: { marginRight: 5 },
  trustStatText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
  trustStatDivider: { width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 10 },

  // Testimonials
  testimonialsSection: { marginBottom: 14, alignItems: 'center' },
  testimonialCard: { paddingRight: 0 },
  testimonialGradient: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  testimonialAuthorTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  testimonialAvatarWrap: { position: 'relative', marginRight: 10 },
  testimonialAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  testimonialAvatarText: { fontSize: 18, fontWeight: '900' },
  testimonialFlagBadge: { position: 'absolute', bottom: -2, right: -4, backgroundColor: '#1E1B4B', borderRadius: 8, paddingHorizontal: 1, paddingVertical: 0 },
  testimonialFlagText: { fontSize: 13 },
  testimonialNameRow: { flexDirection: 'row', alignItems: 'center' },
  testimonialName: { color: '#FFF', fontSize: 13, fontWeight: '700', marginRight: 6 },
  testimonialCountry: { color: 'rgba(255,255,255,0.3)', fontSize: 11 },
  testimonialRole: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 1 },
  testimonialImprovementChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  testimonialImprovementText: { color: '#10B981', fontSize: 10, fontWeight: '700', marginLeft: 3 },
  testimonialStars: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  testimonialQuote: { color: 'rgba(255,255,255,0.82)', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  testimonialDots: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  testimonialDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 3 },
  testimonialDotActive: { backgroundColor: '#8B5CF6', width: 18, borderRadius: 3 },

  // Social proof counter
  socialProofRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(249,115,22,0.08)', borderWidth: 1, borderColor: 'rgba(249,115,22,0.2)', paddingVertical: 7, paddingHorizontal: 16, borderRadius: 50, marginBottom: 16, alignSelf: 'center' },
  socialProofIcon: { marginRight: 8 },
  socialProofText: { color: '#F97316', fontSize: 13, fontWeight: '700' },

  // Plan toggle
  planToggleRow: { flexDirection: 'row', marginBottom: 16, marginHorizontal: -4 },
  planTab: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', position: 'relative', overflow: 'visible', marginHorizontal: 4 },
  planTabYearly: { flex: 1.4 },
  planTabActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.12)' },
  planTabLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  planTabLabelActive: { color: '#FFF' },
  planTabPrice: { color: 'rgba(255,255,255,0.6)', fontSize: 20, fontWeight: '900' },
  planTabPriceActive: { color: '#8B5CF6' },
  planTabPeriod: { fontSize: 12, fontWeight: '500' },
  planTabYearlyTotal: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500' },
  popularBadge: { position: 'absolute', top: -10, left: '50%', transform: [{ translateX: -28 }], backgroundColor: '#8B5CF6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  popularBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  savingsChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 2 },
  savingsChipIcon: { marginRight: 4 },
  savingsChipText: { color: '#10B981', fontSize: 10, fontWeight: '700' },

  // Secure badge
  secureBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  secureBadgeIcon: { marginRight: 8 },
  secureBadgeText: { color: 'rgba(255,255,255,0.35)', fontSize: 12 },

  // Features
  featuresSection: { marginBottom: 20 },
  sectionTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  featureChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 50, marginRight: 10, marginBottom: 10 },
  featureChipIcon: { marginRight: 8 },
  featureChipText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },

  // Upcoming features
  upcomingSection: { marginBottom: 20 },
  upcomingCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)' },
  upcomingGradient: { padding: 4 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  upcomingRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  upcomingIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  upcomingText: { flex: 1 },
  upcomingTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', marginBottom: 2 },
  upcomingDesc: { color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 15 },
  upcomingBadge: { backgroundColor: 'rgba(139,92,246,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  upcomingBadgeText: { color: '#8B5CF6', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  // Comparison
  comparisonSection: { marginBottom: 20 },
  comparisonToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  comparisonToggleText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  comparisonCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  comparisonHeaderRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14 },
  comparisonCol: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  comparisonColCenter: { width: 48, alignItems: 'center', justifyContent: 'center' },
  comparisonExpanded: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18, paddingHorizontal: 14, paddingBottom: 12, paddingTop: 2 },

  // Sticky bottom
  stickyBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,23,42,0.97)', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  guaranteeBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  guaranteeIcon: { marginRight: 6 },
  guaranteeText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' },
  subscribeBtn: { marginBottom: 10 },
  subscribeBtnGradient: { paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
  subscribeBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  subscribeBtnSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '500', marginTop: 4 },
  restoreBtn: { alignSelf: 'center', paddingVertical: 8, marginBottom: 6 },
  restoreBtnText: { color: '#8B5CF6', fontSize: 14, fontWeight: '600' },
  termsText: { color: 'rgba(255,255,255,0.25)', fontSize: 10, textAlign: 'center', lineHeight: 14 },

  // Premium screen
  premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  premiumBadge: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  premiumTitle: { fontSize: 32, fontWeight: '900', color: '#FFF', marginBottom: 8 },
  premiumSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 8 },
  expiryText: { fontSize: 14, color: '#8B5CF6', marginBottom: 32 },
  manageBtn: { backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#8B5CF6', marginBottom: 12 },
  manageBtnText: { color: '#8B5CF6', fontSize: 16, fontWeight: '700' },
  cancelBtn: { backgroundColor: 'rgba(239,68,68,0.1)', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: '#EF4444' },
  cancelBtnText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});
