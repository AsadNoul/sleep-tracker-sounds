import { supabase } from '../lib/supabase';
import { AppState, AppStateStatus, Platform } from 'react-native';
import logger from '../utils/logger';
import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = 'cdece4b2549e31e3cf56aa53ca6da153';
const APPSFLYER_DEV_KEY = 'fRMbuaBdG4LdpmtXjo7Z2C';

// Lazy load AppsFlyer (not available in Expo Go)
let appsFlyer: any = null;
let appsFlyerAvailable = false;
try {
  const module = require('react-native-appsflyer');
  appsFlyer = module?.default || module;
  // Check if the module actually has the required methods
  appsFlyerAvailable = appsFlyer && typeof appsFlyer.initSdk === 'function';
  if (!appsFlyerAvailable) {
    appsFlyer = null;
    logger.warn('⚠️ AppsFlyer module loaded but native methods not available (Expo Go). Will work in production builds.');
  }
} catch (e) {
  logger.warn('⚠️ AppsFlyer is not available in this runtime (Expo Go). It will work in development/production builds.');
}

class AnalyticsService {
  private eventQueue: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private readonly MAX_QUEUE_SIZE = 500;
  private appStateSubscription: any = null;
  private cachedUserId: string | null = null;
  private userIdCacheTime = 0;
  private readonly USER_ID_CACHE_TTL = 60000; // 1 minute
  private mixpanel: Mixpanel | null = null;
  private mixpanelInitialized = false;
  private appsFlyerInitialized = false;

  constructor() {
    // Start auto-flush timer
    this.startAutoFlush();
    // Listen for app going to background to flush
    this.setupAppStateListener();
    // Initialize Mixpanel
    this.initializeMixpanel();
    // Initialize AppsFlyer
    this.initializeAppsFlyer();
  }

  private async initializeMixpanel() {
    try {
      this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);
      await this.mixpanel.init();
      this.mixpanelInitialized = true;
      logger.debug('📊 Mixpanel initialized');
    } catch (error) {
      logger.error('Mixpanel initialization error:', error);
    }
  }

  private async initializeAppsFlyer() {
    try {
      if (!appsFlyerAvailable || !appsFlyer) {
        logger.info('📊 AppsFlyer not available in this runtime. Will work in production builds.');
        this.appsFlyerInitialized = false;
        return;
      }

      // Verify the method exists before calling
      if (typeof appsFlyer.initSdk !== 'function') {
        logger.warn('⚠️ AppsFlyer initSdk method not available. Skipping initialization.');
        this.appsFlyerInitialized = false;
        return;
      }

      // Set initialization flag optimistically
      this.appsFlyerInitialized = true;
      
      appsFlyer.initSdk(
        {
          devKey: APPSFLYER_DEV_KEY,
          isDebug: __DEV__,
          appId: Platform.OS === 'ios' ? '6738912651' : 'com.sleeptracker.app',
          onInstallConversionDataListener: true,
          onDeepLinkListener: true,
          timeToWaitForATTUserAuthorization: 10,
        },
        (result) => {
          logger.debug('📊 AppsFlyer SDK initialized successfully:', result);
        },
        (error) => {
          logger.error('📊 AppsFlyer SDK error:', error);
          this.appsFlyerInitialized = false;
        }
      );
      
      logger.info('✅ AppsFlyer initialization started');
    } catch (error) {
      logger.error('❌ AppsFlyer setup error:', error);
      this.appsFlyerInitialized = false;
    }
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Fire-and-forget but with best effort
        this.flush().catch(() => {});
      }
    });
  }

  private startAutoFlush() {
    if (this.flushInterval) return;
    
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Flush queued events to database
   */
  private async flush() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Cache user ID to avoid round-trip on every flush
      const now = Date.now();
      if (!this.cachedUserId || now - this.userIdCacheTime > this.USER_ID_CACHE_TTL) {
        const { data: { user } } = await supabase.auth.getUser();
        this.cachedUserId = user?.id || null;
        this.userIdCacheTime = now;
      }
      
      const events = eventsToSend.map(event => ({
        user_id: this.cachedUserId || null,
        event_name: event.name,
        properties: event.properties || {},
        created_at: event.timestamp,
      }));

      await supabase.from('analytics_events').insert(events);
      logger.debug(`📊 Flushed ${events.length} analytics events`);
    } catch (error) {
      logger.error('Analytics flush error:', error);
      // Re-queue failed events but respect max queue size
      const spaceLeft = this.MAX_QUEUE_SIZE - this.eventQueue.length;
      if (spaceLeft > 0) {
        this.eventQueue.unshift(...eventsToSend.slice(0, spaceLeft));
      }
    }
  }

  /**
   * Track any event in the app (queued for batch processing)
   */
  async trackEvent(eventName: string, properties?: any): Promise<void> {
    try {
      // Track to Mixpanel (real-time)
      if (this.mixpanelInitialized && this.mixpanel) {
        this.mixpanel.track(eventName, properties || {});
      }

      // Track to AppsFlyer (real-time)
      if (this.appsFlyerInitialized && appsFlyer) {
        appsFlyer.logEvent(eventName, properties || {});
      }

      // Enforce queue size limit - drop oldest events if full
      if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
        this.eventQueue.splice(0, this.eventQueue.length - this.MAX_QUEUE_SIZE + 1);
        logger.debug('📊 Analytics queue full, dropped oldest events');
      }

      // Add to queue for Supabase
      this.eventQueue.push({
        name: eventName,
        properties: properties || {},
        timestamp: new Date().toISOString(),
      });

      logger.debug(`📊 Analytics: ${eventName}`, properties);

      // Flush if batch size reached
      if (this.eventQueue.length >= this.BATCH_SIZE) {
        await this.flush();
      }
    } catch (error) {
      logger.error('Analytics tracking error:', error);
      // Don't throw - analytics should never break the app
    }
  }

  /**
   * Identify user for tracking
   */
  async identifyUser(userId: string, traits?: any) {
    try {
      this.cachedUserId = userId;
      this.userIdCacheTime = Date.now();
      
      if (this.mixpanelInitialized && this.mixpanel) {
        this.mixpanel.identify(userId);
        if (traits) {
          this.mixpanel.getPeople().set(traits);
        }
        logger.debug('📊 User identified in Mixpanel:', userId);
      }

      if (this.appsFlyerInitialized && appsFlyer) {
        appsFlyer.setCustomerUserId(userId);
        if (traits) {
          appsFlyer.setAdditionalData(traits);
        }
        logger.debug('📊 User identified in AppsFlyer:', userId);
      }
    } catch (error) {
      logger.error('User identification error:', error);
    }
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: any) {
    try {
      if (this.mixpanelInitialized && this.mixpanel) {
        this.mixpanel.getPeople().set(properties);
        logger.debug('📊 User properties set in Mixpanel');
      }
    } catch (error) {
      logger.error('Set user properties error:', error);
    }
  }

  /**
   * Increment a numeric user property
   */
  async incrementUserProperty(property: string, value: number = 1) {
    try {
      if (this.mixpanelInitialized && this.mixpanel) {
        this.mixpanel.getPeople().increment(property, value);
      }
    } catch (error) {
      logger.error('Increment user property error:', error);
    }
  }

  /**
   * Force flush all queued events (call on app background/close)
   */
  async forceFlush() {
    await this.flush();
    if (this.mixpanelInitialized && this.mixpanel) {
      await this.mixpanel.flush();
    }
  }

  /**
   * Clean up when app is closing
   */
  async destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    await this.flush(); // Final flush (awaited)
    if (this.mixpanelInitialized && this.mixpanel) {
      await this.mixpanel.flush();
    }
  }

  /**
   * Reset user identity (on logout)
   */
  async reset() {
    try {
      this.cachedUserId = null;
      this.userIdCacheTime = 0;
      if (this.mixpanelInitialized && this.mixpanel) {
        this.mixpanel.reset();
        logger.debug('📊 Mixpanel user reset');
      }
    } catch (error) {
      logger.error('Reset error:', error);
    }
  }

  /**
   * Get AppsFlyer ID for testing and verification
   */
  async getAppsFlyerId(): Promise<string | null> {
    try {
      if (this.appsFlyerInitialized && appsFlyer) {
        const appsFlyerId = await appsFlyer.getAppsFlyerUID();
        logger.debug('📊 AppsFlyer ID:', appsFlyerId);
        return appsFlyerId;
      }
      return null;
    } catch (error) {
      logger.error('Get AppsFlyer ID error:', error);
      return null;
    }
  }

  /**
   * Test AppsFlyer integration
   */
  async testAppsFlyerIntegration(): Promise<boolean> {
    try {
      if (!appsFlyerAvailable || !appsFlyer) {
        logger.warn('⚠️ AppsFlyer not available in this runtime (Expo Go). Build the app with EAS to test AppsFlyer.');
        return false;
      }

      // Wait a bit for initialization to complete
      let attempts = 0;
      while (!this.appsFlyerInitialized && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!this.appsFlyerInitialized) {
        logger.error('❌ AppsFlyer not initialized after waiting. This is expected in Expo Go.');
        return false;
      }

      logger.info('✅ AppsFlyer initialized successfully');

      // Get AppsFlyer ID
      const appsFlyerId = await this.getAppsFlyerId();
      if (appsFlyerId) {
        logger.info('✅ AppsFlyer ID retrieved:', appsFlyerId);
      } else {
        logger.warn('⚠️ Could not retrieve AppsFlyer ID (may be normal on first install)');
      }

      // Send test event
      if (appsFlyer && typeof appsFlyer.logEvent === 'function') {
        appsFlyer.logEvent('af_test_event', {
          test_param: 'test_value',
          timestamp: new Date().toISOString()
        });
        logger.info('✅ AppsFlyer test event sent');
      }

      return true;
    } catch (error) {
      logger.error('❌ AppsFlyer test failed:', error);
      return false;
    }
  }

  // Sleep tracking events
  async trackSleepSessionStart() {
    await this.trackEvent('sleep_session_start', {
      timestamp: new Date().toISOString(),
    });
  }

  async trackSleepSessionComplete(duration: number, quality: number, score: number) {
    await this.trackEvent('sleep_session_complete', {
      duration_minutes: duration,
      quality: quality,
      sleep_score: score,
      timestamp: new Date().toISOString(),
    });
  }

  // Subscription events
  async trackSubscriptionView() {
    await this.trackEvent('subscription_screen_view');
  }

  async trackSubscriptionPurchase(plan: string, price: number) {
    await this.trackEvent('subscription_purchase', {
      plan: plan,
      price: price,
      currency: 'USD',
    });
  }

  async trackSubscriptionCancel(plan: string) {
    await this.trackEvent('subscription_cancel', {
      plan: plan,
    });
  }

  // Content access events
  async trackPremiumContentAccess(contentType: string, contentId: string) {
    await this.trackEvent('premium_content_access', {
      content_type: contentType,
      content_id: contentId,
    });
  }

  async trackPremiumContentBlocked(contentType: string) {
    await this.trackEvent('premium_content_blocked', {
      content_type: contentType,
    });
  }

  // User engagement events
  async trackScreenView(screenName: string) {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
    });
  }

  async trackFeatureUse(featureName: string) {
    await this.trackEvent('feature_use', {
      feature_name: featureName,
    });
  }

  // Onboarding events
  async trackOnboardingComplete() {
    await this.trackEvent('onboarding_complete');
  }

  async trackOnboardingSkip(step: number) {
    await this.trackEvent('onboarding_skip', {
      step: step,
    });
  }

  // Auth events
  async trackSignup(method: string) {
    await this.trackEvent('user_signup', {
      method: method,
    });
  }

  async trackSignin(method: string) {
    await this.trackEvent('user_signin', {
      method: method,
    });
  }

  async trackSignout() {
    await this.trackEvent('user_signout');
  }
}

export default new AnalyticsService();
