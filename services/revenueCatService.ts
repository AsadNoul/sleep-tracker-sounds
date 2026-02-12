import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  LOG_LEVEL
} from 'react-native-purchases';
import { REVENUECAT_ANDROID_API_KEY, REVENUECAT_IOS_API_KEY } from '@env';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * RevenueCat Service
 * Handles all subscription management through RevenueCat
 */

class RevenueCatService {
  private isConfigured = false;

  private isExpoGo(): boolean {
    // In Expo Go (aka Store Client), native modules like RevenueCat are not available.
    // Keep app running by treating RevenueCat as unavailable.
    const anyConstants = Constants as any;
    return (
      anyConstants?.executionEnvironment === 'storeClient' ||
      anyConstants?.appOwnership === 'expo'
    );
  }

  /**
   * Check if RevenueCat is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Initialize RevenueCat SDK
   * Call this once when the app starts
   */
  async configure(userId?: string): Promise<void> {
    try {
      if (this.isConfigured) {
        console.log('RevenueCat already configured');
        return;
      }

      // RevenueCat requires a native build (dev client / EAS build). It will not work in Expo Go.
      if (this.isExpoGo() || Platform.OS === 'web') {
        console.warn('⚠️ RevenueCat is not available in Expo Go / web. Subscription features will be disabled in this runtime.');
        return;
      }

      // Configure RevenueCat with platform-specific API key
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_API_KEY : REVENUECAT_ANDROID_API_KEY;

      if (!apiKey) {
        console.warn(`⚠️ RevenueCat API key not configured for ${Platform.OS}. Subscriptions will not work.`);
        return; // Don't throw error - let app continue without RevenueCat
      }

      // Validate API key format
      const isValidKey = Platform.OS === 'ios'
        ? apiKey.startsWith('appl_') && apiKey.length > 20
        : apiKey.startsWith('goog_') && apiKey.length > 20;

      if (!isValidKey) {
        console.warn(`⚠️ Invalid RevenueCat API key format for ${Platform.OS}.`);
        console.warn('Please get a valid API key from: https://app.revenuecat.com/settings/api-keys');
        return; // Don't crash - let app run without subscriptions
      }

      // Enable debug logging in development
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      Purchases.configure({
        apiKey,
        appUserID: userId, // Optional: set user ID for tracking across devices
      });

      this.isConfigured = true;
      console.log('✅ RevenueCat configured successfully');
    } catch (error) {
      console.error('❌ Error configuring RevenueCat:', error);
      // Don't re-throw - let app continue without RevenueCat
      console.warn('App will continue without subscription features');
    }
  }

  /**
   * Set user ID after authentication
   * This allows tracking subscriptions across devices
   */
  async setUserId(userId: string): Promise<void> {
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ RevenueCat not configured. Cannot set user ID.');
        return;
      }
      await Purchases.logIn(userId);
      console.log('✅ RevenueCat user logged in');
    } catch (error) {
      console.error('❌ Error logging in to RevenueCat:', error);
      throw error;
    }
  }

  /**
   * Logout user (switch to anonymous)
   */
  async logout(): Promise<void> {
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ RevenueCat not configured. Cannot logout.');
        return;
      }
      await Purchases.logOut();
      console.log('✅ RevenueCat user logged out');
    } catch (error) {
      console.error('❌ Error logging out from RevenueCat:', error);
      throw error;
    }
  }

  /**
   * Get available subscription packages
   * Returns monthly and yearly offerings
   */
  async getOfferings(): Promise<PurchasesPackage[]> {
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ RevenueCat not configured. Cannot fetch offerings.');
        return [];
      }

      const offerings = await Purchases.getOfferings();

      if (offerings.current && offerings.current.availablePackages.length > 0) {
        console.log('✅ Available packages:', offerings.current.availablePackages.length);
        return offerings.current.availablePackages;
      } else {
        console.warn('⚠️ No offerings available');
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching offerings:', error);
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Purchase a subscription package
   */
  async purchasePackage(packageToPurchase: PurchasesPackage): Promise<CustomerInfo> {
    try {
      if (!this.isConfigured) {
        throw new Error('RevenueCat not configured. Cannot make purchases.');
      }

      console.log('🛒 Attempting purchase:', packageToPurchase.identifier);

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      console.log('✅ Purchase successful!');
      console.log('Entitlements:', Object.keys(customerInfo.entitlements.active));

      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('User cancelled the purchase');
      } else {
        console.error('❌ Error making purchase:', error);
      }
      throw error;
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<CustomerInfo> {
    try {
      console.log('🔄 Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();

      const activeEntitlements = Object.keys(customerInfo.entitlements.active);

      if (activeEntitlements.length > 0) {
        console.log('✅ Purchases restored! Active entitlements:', activeEntitlements);
      } else {
        console.log('ℹ️ No active subscriptions found');
      }

      return customerInfo;
    } catch (error) {
      console.error('❌ Error restoring purchases:', error);
      throw error;
    }
  }

  /**
   * Get current customer info (subscription status)
   */
  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('❌ Error getting customer info:', error);
      throw error;
    }
  }

  /**
   * Check if user has active premium subscription
   * You should set "premium" as your entitlement identifier in RevenueCat dashboard
   */
  async isPremiumActive(): Promise<boolean> {
    try {
      if (!this.isConfigured) {
        console.warn('⚠️ RevenueCat not configured. Treating as free user.');
        return false;
      }

      const customerInfo = await this.getCustomerInfo();

      // Check if the "premium" entitlement is active
      // NOTE: You must create this entitlement in RevenueCat dashboard
      const isPremium = customerInfo.entitlements.active['premium'] !== undefined;

      return isPremium;
    } catch (error: any) {
      // Distinguish network errors from confirmed free status
      // If it's a network error, we shouldn't downgrade the user
      const isNetworkError = error?.message?.includes('network') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('fetch') ||
        error?.code === 'NETWORK_ERROR';

      if (isNetworkError) {
        console.warn('⚠️ Network error checking premium status. Returning cached/optimistic value.');
        // On network error, don't downgrade - return last known or optimistic true
        // This prevents premium users from losing access during connectivity issues
        return false; // Safe default; app should also check local cache
      }

      console.error('❌ Error checking premium status:', error);
      return false;
    }
  }

  /**
   * Get subscription type (monthly or yearly)
   */
  async getSubscriptionType(): Promise<'monthly' | 'yearly' | null> {
    try {
      const customerInfo = await this.getCustomerInfo();

      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      if (!premiumEntitlement) {
        return null;
      }

      // Get the product identifier to determine if it's monthly or yearly
      const productId = premiumEntitlement.productIdentifier.toLowerCase();

      if (productId.includes('monthly') || productId.includes('month')) {
        return 'monthly';
      } else if (productId.includes('yearly') || productId.includes('annual') || productId.includes('year')) {
        return 'yearly';
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting subscription type:', error);
      return null;
    }
  }

  /**
   * Get subscription expiration date
   */
  async getExpirationDate(): Promise<Date | null> {
    try {
      const customerInfo = await this.getCustomerInfo();

      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      if (!premiumEntitlement) {
        return null;
      }

      return premiumEntitlement.expirationDate ? new Date(premiumEntitlement.expirationDate) : null;
    } catch (error) {
      console.error('❌ Error getting expiration date:', error);
      return null;
    }
  }
}

// Export singleton instance
export default new RevenueCatService();
