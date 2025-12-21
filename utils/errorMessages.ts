// Centralized error messages for better UX

export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  AUTH_EMAIL_IN_USE: 'This email is already registered. Please sign in instead.',
  AUTH_WEAK_PASSWORD: 'Password must be at least 8 characters long.',
  AUTH_INVALID_EMAIL: 'Please enter a valid email address.',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_NETWORK_ERROR: 'Connection error. Please check your internet and try again.',
  AUTH_TOO_MANY_REQUESTS: 'Too many attempts. Please try again in a few minutes.',

  // Sleep session errors
  SLEEP_INVALID_TIME: 'Invalid sleep time. Please check your start and end times.',
  SLEEP_SAVE_FAILED: 'Failed to save sleep session. Your data is saved locally and will sync when you\'re online.',
  SLEEP_LOAD_FAILED: 'Failed to load sleep history. Showing cached data.',
  SLEEP_DELETE_FAILED: 'Failed to delete sleep session. Please try again.',

  // Subscription errors
  SUBSCRIPTION_PAYMENT_FAILED: 'Payment failed. Please check your card details and try again.',
  SUBSCRIPTION_NETWORK_ERROR: 'Connection error. Please check your internet connection.',
  SUBSCRIPTION_INIT_FAILED: 'Failed to initialize payment. Please try again or contact support.',
  SUBSCRIPTION_ALREADY_PREMIUM: 'You already have an active subscription.',

  // Journal errors
  JOURNAL_SAVE_FAILED: 'Failed to save journal entry. Your entry is saved locally.',
  JOURNAL_EMPTY: 'Please write something before saving.',
  JOURNAL_LOAD_FAILED: 'Failed to load journal entries.',

  // Profile errors
  PROFILE_UPDATE_FAILED: 'Failed to update profile. Please try again.',
  PROFILE_LOAD_FAILED: 'Failed to load profile data.',
  PROFILE_INVALID_NAME: 'Please enter a valid name.',

  // Network errors
  NETWORK_OFFLINE: 'You\'re offline. Your data will sync when you reconnect.',
  NETWORK_TIMEOUT: 'Request timed out. Please try again.',
  NETWORK_SERVER_ERROR: 'Server error. Please try again later.',

  // Generic errors
  GENERIC_ERROR: 'Something went wrong. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please contact support if this persists.',
};

export const getErrorMessage = (error: any): string => {
  // Handle Supabase auth errors
  if (error?.message) {
    const message = error.message.toLowerCase();

    if (message.includes('invalid login credentials')) {
      return ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS;
    }
    if (message.includes('email already') || message.includes('already registered')) {
      return ERROR_MESSAGES.AUTH_EMAIL_IN_USE;
    }
    if (message.includes('password') && message.includes('weak')) {
      return ERROR_MESSAGES.AUTH_WEAK_PASSWORD;
    }
    if (message.includes('invalid email')) {
      return ERROR_MESSAGES.AUTH_INVALID_EMAIL;
    }
    if (message.includes('session') || message.includes('expired')) {
      return ERROR_MESSAGES.AUTH_SESSION_EXPIRED;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.AUTH_NETWORK_ERROR;
    }
    if (message.includes('too many')) {
      return ERROR_MESSAGES.AUTH_TOO_MANY_REQUESTS;
    }
  }

  // Handle network errors
  if (error?.code === 'NETWORK_ERROR' || error?.toString().includes('Network')) {
    return ERROR_MESSAGES.NETWORK_OFFLINE;
  }

  // Handle timeout errors
  if (error?.code === 'TIMEOUT' || error?.toString().includes('timeout')) {
    return ERROR_MESSAGES.NETWORK_TIMEOUT;
  }

  // Return generic error message
  return error?.message || ERROR_MESSAGES.UNKNOWN_ERROR;
};
