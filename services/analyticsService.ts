import { supabase } from '../lib/supabase';
import logger from '../utils/logger';

class AnalyticsService {
  private eventQueue: any[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds

  constructor() {
    // Start auto-flush timer
    this.startAutoFlush();
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const events = eventsToSend.map(event => ({
        user_id: user?.id || null,
        event_name: event.name,
        properties: event.properties || {},
        created_at: event.timestamp,
      }));

      await supabase.from('analytics_events').insert(events);
      logger.debug(`📊 Flushed ${events.length} analytics events`);
    } catch (error) {
      logger.error('Analytics flush error:', error);
      // Re-queue failed events (up to limit)
      if (this.eventQueue.length < 100) {
        this.eventQueue.unshift(...eventsToSend);
      }
    }
  }

  /**
   * Track any event in the app (queued for batch processing)
   */
  async trackEvent(eventName: string, properties?: any): Promise<void> {
    try {
      // Add to queue
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
   * Force flush all queued events (call on app background/close)
   */
  async forceFlush() {
    await this.flush();
  }

  /**
   * Clean up when app is closing
   */
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // Final flush
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
