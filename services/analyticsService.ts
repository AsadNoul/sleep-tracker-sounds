import { supabase } from '../lib/supabase';
import { AppState, AppStateStatus, Platform } from 'react-native';
import logger from '../utils/logger';

const MIXPANEL_TOKEN = 'cdece4b2549e31e3cf56aa53ca6da153';
const MIXPANEL_TRACK_URL = 'https://api.mixpanel.com/track';
const MIXPANEL_ENGAGE_URL = 'https://api.mixpanel.com/engage';

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
  private mixpanelDistinctId: string | null = null;

  constructor() {
    this.startAutoFlush();
    this.setupAppStateListener();
    // Generate anonymous distinct_id for Mixpanel until user identifies
    this.mixpanelDistinctId = 'anon_' + Math.random().toString(36).substring(2, 15);
    logger.debug('📊 Mixpanel HTTP API ready (pure JS, no native modules)');
  }

  /**
   * Send events to Mixpanel via HTTP API (pure JS - works in Expo Go)
   */
  private async mixpanelTrack(eventName: string, properties?: any) {
    try {
      const payload = [{
        event: eventName,
        properties: {
          token: MIXPANEL_TOKEN,
          distinct_id: this.mixpanelDistinctId || 'anonymous',
          time: Math.floor(Date.now() / 1000),
          $os: Platform.OS,
          ...properties,
        },
      }];

      fetch(MIXPANEL_TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
        body: JSON.stringify(payload),
      }).catch(() => {}); // Fire and forget
    } catch (error) {
      // Silently fail - analytics should never crash the app
    }
  }

  /**
   * Set user profile properties via Mixpanel Engage API
   */
  private async mixpanelEngage(operation: string, data: any) {
    try {
      const payload = [{
        $token: MIXPANEL_TOKEN,
        $distinct_id: this.mixpanelDistinctId || 'anonymous',
        [operation]: data,
      }];

      fetch(MIXPANEL_ENGAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (error) {
      // Silently fail
    }
  }

  private setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
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
      // Track to Mixpanel via HTTP API (real-time, pure JS)
      this.mixpanelTrack(eventName, properties || {});

      // Enforce queue size limit
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
    }
  }

  /**
   * Identify user for tracking
   */
  async identifyUser(userId: string, traits?: any) {
    try {
      this.cachedUserId = userId;
      this.userIdCacheTime = Date.now();
      this.mixpanelDistinctId = userId;

      if (traits) {
        this.mixpanelEngage('$set', traits);
      }
      logger.debug('📊 User identified in Mixpanel:', userId);
    } catch (error) {
      logger.error('User identification error:', error);
    }
  }

  /**
   * Set user properties
   */
  async setUserProperties(properties: any) {
    try {
      this.mixpanelEngage('$set', properties);
      logger.debug('📊 User properties set in Mixpanel');
    } catch (error) {
      logger.error('Set user properties error:', error);
    }
  }

  /**
   * Increment a numeric user property
   */
  async incrementUserProperty(property: string, value: number = 1) {
    try {
      this.mixpanelEngage('$add', { [property]: value });
    } catch (error) {
      logger.error('Increment user property error:', error);
    }
  }

  /**
   * Force flush all queued events
   */
  async forceFlush() {
    await this.flush();
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
    await this.flush();
  }

  /**
   * Reset user identity (on logout)
   */
  async reset() {
    try {
      this.cachedUserId = null;
      this.userIdCacheTime = 0;
      this.mixpanelDistinctId = 'anon_' + Math.random().toString(36).substring(2, 15);
      logger.debug('📊 Mixpanel user reset');
    } catch (error) {
      logger.error('Reset error:', error);
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
