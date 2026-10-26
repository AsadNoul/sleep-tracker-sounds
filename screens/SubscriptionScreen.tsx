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
  Check,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ConfettiCannon from 'react-native-confetti-cannon';
import revenueCatService from '../services/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';
import { useAppTheme } from '../hooks/useAppTheme';
import SleepPrintMark from '../components/SleepPrintMark';

// ============================================================================
// Sleep Architect — Subscription / Paywall screen (redesign/ui-ux-v3)
// ============================================================================
// Canvas reference: `Ac-Paywall.dc.html` (close button + "Compare plans" link,
// Sleep Print mark, Fraunces h1, checklist, plan radio cards, CTA + fine
// print) and `Gp-Compare.dc.html` (Free vs Premium comparison table — folded
// into this screen's existing collapsible comparison section, since there is
// no separate route for it).
//
// REVENUE-CRITICAL: every RevenueCat call site below (getOfferings,
// purchasePackage, restorePurchases, getSubscriptionType, getExpirationDate,
// isReady/setUserId) keeps byte-identical logic to the pre-redesign version —
// only the surrounding JSX/styles changed. The loading/error state machine
// for offerings fetch and purchase/restore flows is unchanged in substance.
// ============================================================================

type PlanType = 'monthly' | 'yearly' | 'lifetime';

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    role: 'Working Mom',
    flag: '🇺🇸',
    country: 'United States',
    quote: '"I went from 5hrs broken sleep to 7.5hrs solid in just 2 weeks. This app changed my life!"',
    stars: 5,
    improvement: '+42% sleep quality',
  },
  {
    name: 'James K.',
    role: 'Software Engineer',
    flag: '🇬🇧',
    country: 'United Kingdom',
    quote: '"The AI insights showed me caffeine was killing my deep sleep. Fixed in 10 days. Incredible."',
    stars: 5,
    improvement: '+38% deep sleep',
  },
  {
    name: 'Priya R.',
    role: 'Yoga Instructor',
    flag: '🇦🇪',
    country: 'UAE',
    quote: '"Sleep sounds + tracking combo is unbeatable. Finally waking up refreshed every morning."',
    stars: 5,
    improvement: '+31% sleep score',
  },
  {
    name: 'David L.',
    role: 'Entrepreneur',
    flag: '🇺🇸',
    country: 'United States',
    quote: '"Worth every penny. The sleep recorder caught my sleep apnea — literally changed my health."',
    stars: 5,
    improvement: '+55% energy levels',
  },
];

// Short checklist shown under the Sleep Print mark — canvas content
// (Ac-Paywall.dc.html `features` list), kept as the hero summary above the
// existing, more detailed feature grid/comparison table further down.
const HERO_CHECKLIST = [
  'All sleep sounds, mixing and saved mixes',
  'Full history, trends and Sleep Prints',
  'AI-powered sleep insights & reports',
  'Sleep recorder, nap mode and routines',
  'Partner mode',
];

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, profile, session } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useAppTheme();
  const s = styles(theme);

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
  // Trial days — read from actual package intro offer (null = no trial configured)
  const [trialDays, setTrialDays] = useState<number | null>(null);

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
          // Read actual free trial days from the intro offer (set in Play Console / App Store Connect)
          // introPrice is present when a trial or intro offer is configured
          const intro = (pkg.product as any)?.introPrice;
          if (intro && intro.periodUnit === 'DAY' && intro.price === 0) {
            setTrialDays(intro.periodNumberOfUnits ?? 3);
          } else if (intro && intro.periodUnit === 'WEEK' && intro.price === 0) {
            setTrialDays((intro.periodNumberOfUnits ?? 1) * 7);
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
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={[s.premiumHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Back">
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Close">
            <X size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={s.centeredContent}>
          <View style={s.premiumMarkWrap}>
            <SleepPrintMark size={120} colors={theme.sleepPrintMark} />
          </View>
          <View style={s.premiumCrownBadge}>
            <Crown size={26} color={theme.colors.premiumBadgeText} />
          </View>
          <Text style={s.premiumTitle}>You're Premium!</Text>
          <Text style={s.premiumSubtitle}>
            {(profile?.subscription_status as string) === 'premium_lifetime'
              ? 'Lifetime Access — all features forever'
              : `${profile?.subscription_status === 'premium_monthly' ? 'Monthly' : 'Yearly'} Premium`}
          </Text>
          {profile?.subscription_end_date && (profile?.subscription_status as string) !== 'premium_lifetime' && (
            <Text style={s.expiryText}>Renews: {new Date(profile.subscription_end_date).toLocaleDateString()}</Text>
          )}
          <TouchableOpacity style={s.manageBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
            <Text style={s.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
          {(profile?.subscription_status as string) !== 'premium_lifetime' && (
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancelSubscription} activeOpacity={0.85}>
              <Text style={s.cancelBtnText}>Cancel Subscription</Text>
            </TouchableOpacity>
          )}
        </View>
        <ConfettiCannon ref={confettiRef} count={200} origin={{ x: -10, y: 0 }} autoStart={false} fadeOut fallSpeed={3000} colors={[theme.colors.accent, theme.colors.highlight, theme.colors.premium]} />
      </View>
    );
  }

  // ─── Loading state — RevenueCat offerings fetch in flight ───
  // Functional requirement unchanged: renders while isLoadingOfferings is
  // true, so the paywall never shows blank/broken plan data mid-fetch.
  if (isLoadingOfferings) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={s.loadingContainer}>
          <View style={s.loadingMarkWrap}>
            <SleepPrintMark size={100} colors={theme.sleepPrintMark} />
          </View>
          <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 8 }} />
          <Text style={s.loadingText}>Loading your plans…</Text>
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

  // Error state — offerings fetch completed but returned nothing usable.
  // Restyled to match the canvas's St-Error pattern (icon badge, Fraunces
  // heading, body copy, primary retry action) while keeping the same
  // underlying recovery path (re-run loadOfferings).
  if (!isLoadingOfferings && packages.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Back">
            <ArrowLeft size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Close">
            <X size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={s.errorContent}>
          <View style={s.errorIconBadge}>
            <Crown size={36} color={theme.colors.accent} />
          </View>
          <Text style={s.errorTitle}>We couldn't load plans</Text>
          <Text style={s.errorBody}>
            Check your internet connection and try again. If this keeps happening, contact support.
          </Text>
          <TouchableOpacity style={s.errorRetryBtn} onPress={() => loadOfferings()} activeOpacity={0.9}>
            <Text style={s.errorRetryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.restoreBtn} onPress={handleRestorePurchases} disabled={isRestoring}>
            <Text style={s.restoreBtnText}>{isRestoring ? 'Restoring...' : 'Restore Purchases'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View aria-hidden style={s.heroGlow} pointerEvents="none" />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn} accessibilityLabel="Close">
          <X size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setIsComparisonVisible(true)} style={s.comparePlansLink}>
          <Text style={s.comparePlansLinkText}>Compare plans</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: Math.max(insets.bottom + 180, 200) }]}
        style={s.scrollView}
      >

        {/* Hero — Sleep Print mark + title, matching Ac-Paywall.dc.html */}
        <View style={s.hero}>
          <View style={s.heroMarkWrap}>
            <SleepPrintMark size={110} colors={theme.sleepPrintMark} />
          </View>
          <Text style={s.heroTitle}>Sleep Architect Premium</Text>
          <Text style={s.heroSubtitle}>Everything you need to wind down and wake up better.</Text>

          {/* Free trial banner — only shown when trial is actually configured in stores */}
          {trialDays != null && (
            <View style={s.trialBanner}>
              <View style={s.trialBannerIcon}><Gift size={16} color={theme.colors.success} /></View>
              <Text style={s.trialText}>{trialDays} days free — cancel anytime</Text>
            </View>
          )}
        </View>

        {/* Hero checklist — canvas content */}
        <View style={s.heroChecklist}>
          {HERO_CHECKLIST.map((item, i) => (
            <View key={i} style={s.heroChecklistRow}>
              <View style={s.heroChecklistIcon}>
                <Check size={13} color={theme.colors.accent} strokeWidth={3} />
              </View>
              <Text style={s.heroChecklistText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* ─── TRUST STATS BAR ─── */}
        <View style={s.trustStatsRow}>
          <View style={s.trustStat}>
            <View style={s.trustStatIcon}><Star size={13} color={theme.colors.premium} /></View>
            <Text style={s.trustStatText}>4.8 App Store</Text>
          </View>
          <View style={s.trustStatDivider} />
          <View style={s.trustStat}>
            <View style={s.trustStatIcon}><Users size={13} color={theme.colors.accent} /></View>
            <Text style={s.trustStatText}>50K+ users</Text>
          </View>
          <View style={s.trustStatDivider} />
          <View style={s.trustStat}>
            <View style={s.trustStatIcon}><Moon size={13} color={theme.colors.highlight} /></View>
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
                {/* Author row at top */}
                <View style={s.testimonialAuthorTop}>
                  <View style={s.testimonialAvatarWrap}>
                    <View style={s.testimonialAvatar}>
                      <Text style={s.testimonialAvatarText}>{t.name[0]}</Text>
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
                    <TrendingUp size={11} color={theme.colors.success} />
                    <Text style={s.testimonialImprovementText}>{t.improvement}</Text>
                  </View>
                </View>
                {/* Stars */}
                <View style={s.testimonialStars}>
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <View key={si} style={si > 0 ? { marginLeft: 2 } : {}}>
                      <Star size={13} color={theme.colors.premium} fill={theme.colors.premium} />
                    </View>
                  ))}
                </View>
                {/* Quote */}
                <Text style={s.testimonialQuote}>{t.quote}</Text>
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
          <View style={s.socialProofIcon}><Flame size={16} color={theme.colors.highlight} /></View>
          <Text style={s.socialProofText}>127 people upgraded this week</Text>
        </View>

        {/* ─── PRICING — plan radio cards, matching Ac-Paywall.dc.html ─── */}
        <View style={s.planList}>
          {/* Yearly — most popular, canvas's primary selected example */}
          <TouchableOpacity
            style={[s.planCard, selectedPlan === 'yearly' && s.planCardActive]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.9}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'yearly' }}
          >
            <View style={[s.planRadio, selectedPlan === 'yearly' && s.planRadioActive]} />
            <View style={s.planCardText}>
              <Text style={s.planCardLabel}>Yearly</Text>
              <Text style={s.planCardPrice}>
                {yearlyTotalPrice ? `${yearlyTotalPrice} a year` : '–'}
                {yearlyPricePerMonth ? ` · ${yearlyPricePerMonth} a month` : ''}
              </Text>
            </View>
            <View style={s.savingsBadge}>
              <Text style={s.savingsBadgeText}>Save 33%</Text>
            </View>
          </TouchableOpacity>

          {/* Monthly */}
          <TouchableOpacity
            style={[s.planCard, selectedPlan === 'monthly' && s.planCardActive]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.9}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedPlan === 'monthly' }}
          >
            <View style={[s.planRadio, selectedPlan === 'monthly' && s.planRadioActive]} />
            <View style={s.planCardText}>
              <Text style={s.planCardLabel}>Monthly</Text>
              <Text style={s.planCardPrice}>{monthlyPrice ? `${monthlyPrice} a month` : '–'}</Text>
            </View>
          </TouchableOpacity>

          {/* Lifetime — if available in RevenueCat; no canvas equivalent, designed
              in the same radio-card system as the other two plans. */}
          {hasLifetime && (
            <TouchableOpacity
              style={[s.planCard, selectedPlan === 'lifetime' && s.planCardActive]}
              onPress={() => setSelectedPlan('lifetime')}
              activeOpacity={0.9}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedPlan === 'lifetime' }}
            >
              <View style={[s.planRadio, selectedPlan === 'lifetime' && s.planRadioActive]} />
              <View style={s.planCardText}>
                <Text style={s.planCardLabel}>Lifetime</Text>
                <Text style={s.planCardPrice}>
                  {packages.find(p => p.identifier.toLowerCase().includes('life'))?.product.priceString || '–'} one-time
                </Text>
              </View>
              <Infinity size={18} color={selectedPlan === 'lifetime' ? theme.colors.accent : theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Secure checkout badge */}
        <View style={s.secureBadge}>
          <View style={s.secureBadgeIcon}><ShieldCheck size={16} color={theme.colors.success} /></View>
          <Text style={s.secureBadgeText}>
            {Platform.OS === 'ios' ? 'Secure checkout via App Store' : 'Secure checkout via Google Play'}
          </Text>
        </View>

        {/* Features grid — self-designed section, no canvas equivalent for this
            density; kept in the same card/chip system as the rest of the app. */}
        <View style={s.featuresSection}>
          <Text style={s.sectionTitle}>What's included</Text>
          <View style={s.featuresGrid}>
            {[
              { icon: Music, text: '19 Sleep Sounds' },
              { icon: BarChart2, text: '90-Day Trends' },
              { icon: Zap, text: 'AI Insights' },
              { icon: Heart, text: 'Sleep Analysis' },
              { icon: Moon, text: 'Nap Mode' },
              { icon: Thermometer, text: 'Environment' },
              { icon: Headphones, text: 'VIP Support' },
              { icon: FileText, text: 'Sleep Reports' },
              { icon: Users, text: 'Partner Mode' },
              { icon: Zap, text: 'Sleep Recorder' },
            ].map((f, i) => (
              <View key={i} style={s.featureChip}>
                <View style={s.featureChipIcon}><f.icon size={16} color={theme.colors.accent} /></View>
                <Text style={s.featureChipText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Upcoming features teaser — self-designed, same card system */}
        <View style={s.upcomingSection}>
          <Text style={s.sectionTitle}>Coming Soon</Text>
          <View style={s.upcomingCard}>
            {[
              { icon: Users, text: 'Partner Mode', desc: 'Share & compare sleep with a partner' },
              { icon: FileText, text: 'PDF & CSV Export', desc: 'Detailed sleep reports exportable anytime' },
              { icon: Star, text: 'Sleep Coach', desc: 'Personalized sleep improvement program' },
              { icon: Clock, text: 'Smart Alarm', desc: 'Wake up at your lightest sleep stage' },
            ].map((item, i) => (
              <View key={i} style={[s.upcomingRow, i < 3 && s.upcomingRowBorder]}>
                <View style={s.upcomingIcon}><item.icon size={17} color={theme.colors.accent} /></View>
                <View style={s.upcomingText}>
                  <Text style={s.upcomingTitle}>{item.text}</Text>
                  <Text style={s.upcomingDesc}>{item.desc}</Text>
                </View>
                <View style={s.upcomingBadge}><Text style={s.upcomingBadgeText}>SOON</Text></View>
              </View>
            ))}
          </View>
        </View>

        {/* Comparison table — canvas content folded in from Gp-Compare.dc.html's
            "Free vs Premium" table structure, using the existing detailed
            13-row dataset and expand-for-description behavior (unchanged
            logic; the "Compare plans" header link above also opens this). */}
        <View style={s.comparisonSection}>
          <TouchableOpacity
            style={s.comparisonToggle}
            onPress={() => setIsComparisonVisible(v => !v)}
            activeOpacity={0.85}
          >
            <Text style={s.comparisonToggleText}>Free vs Premium</Text>
            {isComparisonVisible
              ? <ChevronUp size={18} color={theme.colors.accent} />
              : <ChevronDown size={18} color={theme.colors.accent} />}
          </TouchableOpacity>

          {isComparisonVisible && (
            <View style={s.comparisonCard}>
              {/* Header row */}
              <View style={s.comparisonHeaderRow}>
                <Text style={[s.comparisonColHeader, { flex: 3 }]}>FEATURE</Text>
                <Text style={s.comparisonColHeaderCenter}>FREE</Text>
                <Text style={[s.comparisonColHeaderCenter, s.comparisonColHeaderPro]}>PRO</Text>
              </View>
              {COMPARISON_FEATURES.map((row, i) => (
                <View key={i}>
                  <TouchableOpacity
                    style={[s.comparisonRow, i % 2 === 0 && s.comparisonRowAlt, expandedRow === i && s.comparisonRowExpanded]}
                    onPress={() => setExpandedRow(expandedRow === i ? null : i)}
                  >
                    <Text style={[s.comparisonCol, { flex: 3 }]}>{row.label}</Text>
                    <View style={s.comparisonColCenter}>
                      {row.free ? <CheckCircle size={15} color={theme.colors.textTertiary} /> : <XCircle size={15} color={theme.colors.cardBorder} />}
                    </View>
                    <View style={s.comparisonColCenter}>
                      {row.pro ? <CheckCircle size={16} color={theme.colors.accent} /> : <XCircle size={15} color={theme.colors.cardBorder} />}
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
          <View style={s.guaranteeIcon}><Award size={14} color={theme.colors.premium} /></View>
          <Text style={s.guaranteeText}>30-day money-back guarantee · No questions asked</Text>
        </View>

        <TouchableOpacity
          style={[s.subscribeBtn, isProcessing && s.subscribeBtnBusy]}
          onPress={handleSubscribe}
          disabled={isProcessing}
          activeOpacity={0.9}
        >
          {isProcessing ? (
            <ActivityIndicator color={theme.colors.ctaText} />
          ) : (
            <>
              <Text style={s.subscribeBtnText}>
                {selectedPlan === 'lifetime'
                  ? 'Get Lifetime Access'
                  : trialDays != null
                    ? `Start ${trialDays}-Day Free Trial`
                    : 'Get Premium'}
              </Text>
              <Text style={s.subscribeBtnSub}>
                {selectedPlan === 'lifetime'
                  ? `${selectedPackage?.product.priceString || ''} one-time`
                  : selectedPlan === 'yearly'
                    ? trialDays != null
                      ? `Free for ${trialDays} days, then ${yearlyTotalPrice || ''}/year`
                      : `${yearlyTotalPrice || ''}/year • Cancel anytime`
                    : trialDays != null
                      ? `Free for ${trialDays} days, then ${monthlyPrice || ''}/month`
                      : `${monthlyPrice || ''}/month • Cancel anytime`}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.restoreBtn} onPress={handleRestorePurchases} disabled={isRestoring}>
          <Text style={s.restoreBtnText}>{isRestoring ? 'Restoring...' : 'Restore Purchases'}</Text>
        </TouchableOpacity>

        <Text style={s.termsText}>
          {selectedPlan === 'lifetime'
            ? 'One-time payment. No recurring charges.'
            : trialDays != null
              ? `${trialDays}-day free trial, then auto-renews. Cancel anytime via ${Platform.OS === 'ios' ? 'App Store Settings' : 'Google Play'}.`
              : `Auto-renews. Cancel anytime via ${Platform.OS === 'ios' ? 'App Store Settings' : 'Google Play'}.`}
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
        colors={[theme.colors.accent, theme.colors.highlight, theme.colors.premium]}
      />
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  heroGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -40,
    height: 300,
    backgroundColor: theme.colors.accentLight,
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingMarkWrap: { marginBottom: 8, opacity: 0.9 },
  loadingText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 14,
    marginTop: 16,
  },

  // Error state
  errorContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorIconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.navActiveBackground,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorBody: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorRetryBtn: {
    height: 54,
    paddingHorizontal: 32,
    borderRadius: 18,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorRetryBtnText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.background,
  },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comparePlansLink: { height: 44, justifyContent: 'center', paddingHorizontal: 4 },
  comparePlansLinkText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 6 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 16 },
  heroMarkWrap: { marginBottom: 10 },
  heroTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 28,
    letterSpacing: -0.4,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
  },
  trialBannerIcon: { marginRight: 8 },
  trialText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.success,
    fontSize: 13,
  },

  // Hero checklist
  heroChecklist: { marginBottom: 18, rowGap: 10 },
  heroChecklistRow: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  heroChecklistIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.navActiveBackground,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroChecklistText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },

  // Trust stats bar
  trustStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: 50,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  trustStat: { flexDirection: 'row', alignItems: 'center' },
  trustStatIcon: { marginRight: 5 },
  trustStatText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  trustStatDivider: { width: 1, height: 12, backgroundColor: theme.colors.cardBorder, marginHorizontal: 10 },

  // Testimonials
  testimonialsSection: { marginBottom: 14, alignItems: 'center' },
  testimonialCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  testimonialAuthorTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  testimonialAvatarWrap: { position: 'relative', marginRight: 10 },
  testimonialAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.navActiveBackground,
    borderWidth: 1.5,
    borderColor: theme.colors.accentBorder,
  },
  testimonialAvatarText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 18,
    color: theme.colors.accent,
  },
  testimonialFlagBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 8,
    paddingHorizontal: 1,
    paddingVertical: 0,
  },
  testimonialFlagText: { fontSize: 13 },
  testimonialNameRow: { flexDirection: 'row', alignItems: 'center' },
  testimonialName: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
    marginRight: 6,
  },
  testimonialCountry: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 11,
  },
  testimonialRole: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 11,
    marginTop: 1,
  },
  testimonialImprovementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  testimonialImprovementText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.success,
    fontSize: 10,
    marginLeft: 3,
  },
  testimonialStars: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  testimonialQuote: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  testimonialDots: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  testimonialDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.cardBorder, marginHorizontal: 3 },
  testimonialDotActive: { backgroundColor: theme.colors.accent, width: 18, borderRadius: 3 },

  // Social proof counter
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.highlightLight,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 50,
    marginBottom: 16,
    alignSelf: 'center',
  },
  socialProofIcon: { marginRight: 8 },
  socialProofText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.highlight,
    fontSize: 13,
  },

  // Plan cards — canvas's radio-card pattern
  planList: { rowGap: 10, marginBottom: 16 },
  planCard: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  planCardActive: {
    borderWidth: 2,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.navActiveBackground,
  },
  planRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    flexShrink: 0,
  },
  planRadioActive: {
    borderWidth: 7,
    borderColor: theme.colors.accent,
  },
  planCardText: { flex: 1, rowGap: 2 },
  planCardLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 17,
    color: theme.colors.textPrimary,
  },
  planCardPrice: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  savingsBadge: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 99,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    color: theme.colors.background,
  },

  // Secure badge
  secureBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  secureBadgeIcon: { marginRight: 8 },
  secureBadgeText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 12,
  },

  // Features
  featuresSection: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', marginRight: -10, marginBottom: -10 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 50,
    marginRight: 10,
    marginBottom: 10,
  },
  featureChipIcon: { marginRight: 8 },
  featureChipText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },

  // Upcoming features
  upcomingSection: { marginBottom: 20 },
  upcomingCard: {
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 4,
  },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  upcomingRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder },
  upcomingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.navActiveBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  upcomingText: { flex: 1 },
  upcomingTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
    marginBottom: 2,
  },
  upcomingDesc: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 11,
    lineHeight: 15,
  },
  upcomingBadge: {
    backgroundColor: theme.colors.premiumBadgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
  },
  upcomingBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.premiumBadgeText,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  // Comparison — canvas's Gp-Compare table pattern
  comparisonSection: { marginBottom: 20 },
  comparisonToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  comparisonToggleText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  comparisonCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
  },
  comparisonHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  comparisonColHeader: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  comparisonColHeaderCenter: {
    width: 48,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.textTertiary,
  },
  comparisonColHeaderPro: { color: theme.colors.accent },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14 },
  comparisonRowAlt: { backgroundColor: theme.colors.backgroundSecondary },
  comparisonRowExpanded: { backgroundColor: theme.colors.accentLight },
  comparisonCol: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  comparisonColCenter: { width: 48, alignItems: 'center', justifyContent: 'center' },
  comparisonExpanded: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
  },

  // Sticky bottom
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.cardOverlay,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  guaranteeBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  guaranteeIcon: { marginRight: 6 },
  guaranteeText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.premium,
    fontSize: 12,
  },
  subscribeBtn: {
    height: 60,
    borderRadius: 20,
    backgroundColor: theme.colors.ctaBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  subscribeBtnBusy: { opacity: 0.7 },
  subscribeBtnText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.ctaText,
    fontSize: 17,
  },
  subscribeBtnSub: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.ctaText,
    opacity: 0.85,
    fontSize: 12,
    marginTop: 4,
  },
  restoreBtn: { alignSelf: 'center', paddingVertical: 8, marginBottom: 6 },
  restoreBtnText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.accent,
    fontSize: 14,
  },
  termsText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    opacity: 0.7,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },

  // Premium screen
  premiumHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 10 },
  centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  premiumMarkWrap: { marginBottom: 8 },
  premiumCrownBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.premiumBadgeBackground,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: -8,
  },
  premiumTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 30,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  premiumSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  expiryText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 14,
    color: theme.colors.accent,
    marginBottom: 32,
  },
  manageBtn: {
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    marginBottom: 12,
  },
  manageBtnText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.accent,
    fontSize: 16,
  },
  cancelBtn: {
    backgroundColor: theme.colors.cardOverlay,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  cancelBtnText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.danger,
    fontSize: 16,
  },
});
