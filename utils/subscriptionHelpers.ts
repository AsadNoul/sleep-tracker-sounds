/**
 * Helper functions for subscription status checking
 */

export const isPremiumActive = (
  subscriptionStatus: string | null | undefined,
  subscriptionEndDate: string | null | undefined
): boolean => {
  // No subscription status means not premium
  if (!subscriptionStatus) return false;

  // Active premium subscriptions
  if (
    subscriptionStatus === 'premium_monthly' ||
    subscriptionStatus === 'premium_yearly'
  ) {
    return true;
  }

  // Cancelled subscriptions - check if still valid until end date
  if (subscriptionStatus === 'cancelled' && subscriptionEndDate) {
    const endDate = new Date(subscriptionEndDate);
    const now = new Date();
    return endDate > now; // Still has access if end date hasn't passed
  }

  return false;
};

export const getSubscriptionLabel = (
  subscriptionStatus: string | null | undefined
): string => {
  switch (subscriptionStatus) {
    case 'premium_monthly':
      return 'Premium Monthly';
    case 'premium_yearly':
      return 'Premium Yearly';
    case 'cancelled':
      return 'Cancelled (Active Until Expiry)';
    default:
      return 'Free';
  }
};
