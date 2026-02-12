import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * RevenueCat Service - Stub for Expo Go
 * 
 * The native react-native-purchases SDK crashes Expo Go.
 * This stub returns safe no-op responses so the app runs without subscriptions.
 * For production EAS builds, reinstall react-native-purchases and restore the full implementation.
 */

// Minimal type stubs so the rest of the app compiles
export interface PurchasesPackageStub {
  identifier: string;
  packageType: string;
  product: {
    title: string;
    description: string;
    priceString: string;
    price: number;
    currencyCode: string;
  };
}

export interface CustomerInfoStub {
  entitlements: {
    active: Record<string, any>;
    all: Record<string, any>;
  };
  activeSubscriptions: string[];
  originalAppUserId: string;
}

class RevenueCatService {
  private isConfiguredFlag = false;

  isReady(): boolean {
    return this.isConfiguredFlag;
  }

  async configure(userId?: string): Promise<void> {
    console.warn('⚠️ RevenueCat stub: native SDK not available in Expo Go. Subscription features disabled.');
    // Don't set isConfiguredFlag = true since we can't actually do purchases
  }

  async setUserId(userId: string): Promise<void> {
    console.warn('⚠️ RevenueCat stub: setUserId no-op');
  }

  async logout(): Promise<void> {
    console.warn('⚠️ RevenueCat stub: logout no-op');
  }

  async getOfferings(): Promise<PurchasesPackageStub[]> {
    console.warn('⚠️ RevenueCat stub: returning empty offerings');
    return [];
  }

  async purchasePackage(packageToPurchase: any): Promise<CustomerInfoStub> {
    throw new Error('Purchases not available in Expo Go. Use EAS build for subscription features.');
  }

  async restorePurchases(): Promise<CustomerInfoStub> {
    console.warn('⚠️ RevenueCat stub: restorePurchases no-op');
    return {
      entitlements: { active: {}, all: {} },
      activeSubscriptions: [],
      originalAppUserId: '',
    };
  }

  async getCustomerInfo(): Promise<CustomerInfoStub> {
    return {
      entitlements: { active: {}, all: {} },
      activeSubscriptions: [],
      originalAppUserId: '',
    };
  }

  async isPremiumActive(): Promise<boolean> {
    return false;
  }

  async getSubscriptionType(): Promise<'monthly' | 'yearly' | null> {
    return null;
  }

  async getExpirationDate(): Promise<Date | null> {
    return null;
  }
}

export default new RevenueCatService();
