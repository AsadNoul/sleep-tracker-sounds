import { supabase } from '../lib/supabase';
import { AppState, AppStateStatus, Platform } from 'react-native';
import logger from '../utils/logger';

// Mixpanel HTTP API (pure JS - no native modules, works in Expo Go)
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

  // Cached device IP — fetched once on init, used in every Mixpanel call
  // so Mixpanel can resolve city / region / country from the real device IP
  private deviceIp: string = '0'; // '0' = "use request sender IP" (fallback)
  private ipFetched = false;

  constructor() {
    this.startAutoFlush();
    this.setupAppStateListener();
    this.mixpanelDistinctId = 'anon_' + Math.random().toString(36).substring(2, 15);
    this.fetchDeviceIp(); // fire-and-forget, fills this.deviceIp
    logger.debug('📊 Analytics ready (Mixpanel HTTP + Supabase)');
  }

  /**
   * Fetch the device's public IP once on startup.
   * Stored in this.deviceIp and passed to every Mixpanel call so geo
   * (city, region, country) resolves correctly in the Mixpanel dashboard.
   */
  private async fetchDeviceIp() {
    if (this.ipFetched) return;
    try {
      // ipify is free, CORS-safe, returns just the IP as JSON
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      if (data?.ip) {
        this.deviceIp = data.ip;
        logger.debug('📊 Device IP resolved:', this.deviceIp);
      }
    } catch (_) {
      // Fallback: '0' tells Mixpanel to use the HTTP request's source IP
      this.deviceIp = '0';
    } finally {
      this.ipFetched = true;
    }
  }

  /** Send event to Mixpanel via HTTP API (pure JS, fire-and-forget) */
  private mixpanelTrack(eventName: string, properties?: any) {
    try {
      const payload = [{
        event: eventName,
        properties: {
          token: MIXPANEL_TOKEN,
          distinct_id: this.mixpanelDistinctId || 'anonymous',
          time: Math.floor(Date.now() / 1000),
          $os: Platform.OS,
          // $ip tells Mixpanel which IP to use for geo-resolution.
          // Passing the real device IP (or '0' = use HTTP request source IP)
          // is required for city/region/country to populate in the dashboard.
          $ip: this.deviceIp,
          ...properties,
        },
      }];
      fetch(MIXPANEL_TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (_) {}
  }

  /** Set user profile properties via Mixpanel Engage API */
  private mixpanelEngage(operation: string, data: any) {
    try {
      const payload = [{
        $token: MIXPANEL_TOKEN,
        $distinct_id: this.mixpanelDistinctId || 'anonymous',
        // $ip on Engage calls lets Mixpanel set $city/$region/$country_code
        // on the People profile automatically from the device's real IP
        $ip: this.deviceIp,
        [operation]: data,
      }];
      fetch(MIXPANEL_ENGAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (_) {}
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
      // Track to Mixpanel via HTTP API (real-time)
      this.mixpanelTrack(eventName, properties || {});

      // Enforce queue size limit - drop oldest events if full
      if (this.eventQueue.length >= this.MAX_QUEUE_SIZE) {
        this.eventQueue.splice(0, this.eventQueue.length - this.MAX_QUEUE_SIZE + 1);
        logger.debug('📊 Analytics queue full, dropped oldest events');
      }

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

  /** Identify user for Mixpanel tracking */
  async identifyUser(userId: string, traits?: any) {
    try {
      this.cachedUserId = userId;
      this.userIdCacheTime = Date.now();
      this.mixpanelDistinctId = userId;

      // Ensure IP is resolved before setting profile so geo populates
      if (!this.ipFetched) await this.fetchDeviceIp();

      // Always set $ip on identify so Mixpanel updates geo on the People profile
      this.mixpanelEngage('$set', {
        $ip: this.deviceIp,
        ...(traits || {}),
      });

      logger.debug('📊 User identified:', userId);
    } catch (error) {
      logger.error('User identification error:', error);
    }
  }

  /** Set user properties in Mixpanel */
  async setUserProperties(properties: any) {
    try {
      this.mixpanelEngage('$set', properties);
    } catch (error) {
      logger.error('Set user properties error:', error);
    }
  }

  /** Increment a numeric user property */
  async incrementUserProperty(property: string, value: number = 1) {
    try {
      this.mixpanelEngage('$add', { [property]: value });
    } catch (error) {
      logger.error('Increment user property error:', error);
    }
  }

  /** Reset user identity (on logout) */
  async reset() {
    try {
      this.cachedUserId = null;
      this.userIdCacheTime = 0;
      this.mixpanelDistinctId = 'anon_' + Math.random().toString(36).substring(2, 15);
      logger.debug('📊 Analytics user reset');
    } catch (error) {
      logger.error('Reset error:', error);
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
  }

  // ─── Sleep tracking events ───────────────────────────────────────
  async trackSleepSessionStart(source?: string) {
    await this.trackEvent('sleep_session_start', {
      source: source || 'home',
      timestamp: new Date().toISOString(),
    });
    this.mixpanelEngage('$add', { total_sessions_started: 1 });
  }

  async trackSleepSessionComplete(duration: number, quality: number, score: number) {
    await this.trackEvent('sleep_session_complete', {
      duration_minutes: duration,
      quality,
      sleep_score: score,
      timestamp: new Date().toISOString(),
    });
    this.mixpanelEngage('$add', { total_sessions_completed: 1, total_sleep_minutes: duration });
    this.mixpanelEngage('$set', { last_sleep_score: score, last_session_date: new Date().toISOString() });
  }

  async trackSleepSessionCancelled(duration: number) {
    await this.trackEvent('sleep_session_cancelled', { duration_minutes: duration });
  }

  async trackSleepQualityRated(rating: number, sessionId: string) {
    await this.trackEvent('sleep_quality_rated', { rating, session_id: sessionId });
  }

  async trackNapStarted(plannedMinutes: number) {
    await this.trackEvent('nap_started', { planned_duration_minutes: plannedMinutes });
  }

  async trackNapCompleted(actualMinutes: number) {
    await this.trackEvent('nap_completed', { actual_duration_minutes: actualMinutes });
    this.mixpanelEngage('$add', { total_naps: 1 });
  }

  // ─── Sound events ─────────────────────────────────────────────────
  async trackSoundPlayed(soundId: string, soundName: string, isPremium: boolean) {
    await this.trackEvent('sound_played', { sound_id: soundId, sound_name: soundName, is_premium: isPremium });
    this.mixpanelEngage('$add', { total_sounds_played: 1 });
  }

  async trackSoundStopped(soundId: string, playedSeconds: number) {
    await this.trackEvent('sound_stopped', { sound_id: soundId, played_seconds: playedSeconds });
  }

  async trackTimerSet(durationMinutes: number) {
    await this.trackEvent('sound_timer_set', { duration_minutes: durationMinutes });
  }

  // ─── Subscription & paywall events ───────────────────────────────
  async trackSubscriptionView() {
    await this.trackEvent('subscription_screen_view');
  }

  async trackPaywallViewed(source: string) {
    await this.trackEvent('paywall_viewed', { source });
    this.mixpanelEngage('$add', { paywall_views: 1 });
  }

  async trackFeatureGateHit(feature: string) {
    await this.trackEvent('feature_gate_hit', { feature });
    this.mixpanelEngage('$add', { feature_gate_hits: 1 });
  }

  async trackSubscriptionPurchase(plan: string, price: number) {
    await this.trackEvent('subscription_purchase', { plan, price, currency: 'USD' });
    this.mixpanelEngage('$set', { subscription_plan: plan, subscription_price: price, is_premium: true });
    this.mixpanelEngage('$add', { total_revenue: price });
  }

  async trackSubscriptionRestored(plan: string) {
    await this.trackEvent('subscription_restored', { plan });
    this.mixpanelEngage('$set', { subscription_plan: plan, is_premium: true });
  }

  async trackSubscriptionCancel(plan: string) {
    await this.trackEvent('subscription_cancel', { plan });
    this.mixpanelEngage('$set', { is_premium: false });
  }

  async trackFreeTrialStarted(plan: string) {
    await this.trackEvent('free_trial_started', { plan });
    this.mixpanelEngage('$set', { trial_started: true, trial_start_date: new Date().toISOString() });
  }

  // ─── Content access events ────────────────────────────────────────
  async trackPremiumContentAccess(contentType: string, contentId: string) {
    await this.trackEvent('premium_content_access', { content_type: contentType, content_id: contentId });
  }

  async trackPremiumContentBlocked(contentType: string) {
    await this.trackEvent('premium_content_blocked', { content_type: contentType });
  }

  // ─── Journal & analysis events ───────────────────────────────────
  async trackJournalViewed(sessionCount: number) {
    await this.trackEvent('journal_viewed', { session_count: sessionCount });
  }

  async trackSleepAnalysisViewed(timeframe: string) {
    await this.trackEvent('sleep_analysis_viewed', { timeframe });
  }

  async trackInsightViewed(insightType: string) {
    await this.trackEvent('insight_viewed', { insight_type: insightType });
  }

  async trackReportExported(format: 'pdf' | 'csv') {
    await this.trackEvent('report_exported', { format });
    this.mixpanelEngage('$add', { total_exports: 1 });
  }

  // ─── Mindfulness & relaxation events ─────────────────────────────
  async trackMindfulnessSessionStarted(category: string, durationMinutes: number) {
    await this.trackEvent('mindfulness_session_started', { category, duration_minutes: durationMinutes });
    this.mixpanelEngage('$add', { total_mindfulness_sessions: 1 });
  }

  async trackMindfulnessSessionCompleted(category: string, durationMinutes: number) {
    await this.trackEvent('mindfulness_session_completed', { category, duration_minutes: durationMinutes });
  }

  // ─── Alarm events ─────────────────────────────────────────────────
  async trackAlarmSet(time: string, days: string[]) {
    await this.trackEvent('alarm_set', { time, repeat_days: days.join(',') });
    this.mixpanelEngage('$add', { total_alarms_set: 1 });
  }

  async trackAlarmDismissed(alarmId: string) {
    await this.trackEvent('alarm_dismissed', { alarm_id: alarmId });
  }

  async trackAlarmSnoozed(alarmId: string, snoozeCount: number) {
    await this.trackEvent('alarm_snoozed', { alarm_id: alarmId, snooze_count: snoozeCount });
  }

  // ─── Dream journal events ─────────────────────────────────────────
  async trackDreamLogged(hasText: boolean, hasMood: boolean) {
    await this.trackEvent('dream_logged', { has_text: hasText, has_mood: hasMood });
    this.mixpanelEngage('$add', { total_dreams_logged: 1 });
  }

  // ─── Partner mode events ──────────────────────────────────────────
  async trackPartnerInviteSent() {
    await this.trackEvent('partner_invite_sent');
  }

  async trackPartnerConnected() {
    await this.trackEvent('partner_connected');
    this.mixpanelEngage('$set', { has_partner: true });
  }

  // ─── VIP support events ───────────────────────────────────────────
  async trackVipSupportOpened(channel: 'email' | 'telegram') {
    await this.trackEvent('vip_support_opened', { channel });
  }

  // ─── Screen view events ───────────────────────────────────────────
  async trackScreenView(screenName: string, properties?: Record<string, any>) {
    await this.trackEvent('screen_view', { screen_name: screenName, ...properties });
  }

  async trackFeatureUse(featureName: string, properties?: Record<string, any>) {
    await this.trackEvent('feature_use', { feature_name: featureName, ...properties });
  }

  // ─── Settings events ──────────────────────────────────────────────
  async trackThemeChanged(theme: 'dark' | 'light' | 'system') {
    await this.trackEvent('theme_changed', { theme });
    this.mixpanelEngage('$set', { preferred_theme: theme });
  }

  async trackNotificationToggled(type: string, enabled: boolean) {
    await this.trackEvent('notification_toggled', { notification_type: type, enabled });
  }

  async trackDataExported() {
    await this.trackEvent('data_exported');
  }

  async trackAccountDeleted() {
    await this.trackEvent('account_deleted');
  }

  // ─── Onboarding events ────────────────────────────────────────────
  async trackOnboardingStepViewed(step: number, stepName: string) {
    await this.trackEvent('onboarding_step_viewed', { step, step_name: stepName });
  }

  async trackOnboardingComplete() {
    await this.trackEvent('onboarding_complete');
    this.mixpanelEngage('$set', { onboarding_completed: true, onboarding_date: new Date().toISOString() });
  }

  async trackOnboardingSkip(step: number) {
    await this.trackEvent('onboarding_skip', { step });
  }

  // ─── Auth events ──────────────────────────────────────────────────
  async trackSignup(method: string) {
    await this.trackEvent('user_signup', { method });
    this.mixpanelEngage('$set', { signup_method: method, signup_date: new Date().toISOString() });
  }

  async trackSignin(method: string) {
    await this.trackEvent('user_signin', { method });
    this.mixpanelEngage('$set', { last_signin_date: new Date().toISOString(), signin_method: method });
    this.mixpanelEngage('$add', { total_signins: 1 });
  }

  async trackSignout() {
    await this.trackEvent('user_signout');
  }

  async trackPasswordReset() {
    await this.trackEvent('password_reset_requested');
  }

  // ─── App lifecycle events ─────────────────────────────────────────
  async trackAppOpened(source?: string) {
    await this.trackEvent('app_opened', { source: source || 'direct' });
    this.mixpanelEngage('$add', { app_opens: 1 });
    this.mixpanelEngage('$set', { last_seen: new Date().toISOString() });
  }

  async trackAppBackgrounded(sessionSeconds: number) {
    await this.trackEvent('app_backgrounded', { session_seconds: sessionSeconds });
    this.mixpanelEngage('$add', { total_session_seconds: sessionSeconds });
  }

  // ─── Error & crash events ─────────────────────────────────────────
  async trackError(errorCode: string, screenName: string, message?: string) {
    await this.trackEvent('app_error', { error_code: errorCode, screen: screenName, message: message || '' });
  }

  async trackNetworkError(endpoint: string) {
    await this.trackEvent('network_error', { endpoint });
  }
}

export default new AnalyticsService();
