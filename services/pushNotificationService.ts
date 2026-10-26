import { supabase } from '../lib/supabase';

// Sends a REMOTE push notification to a DIFFERENT device, via Expo's own
// push HTTP API (https://exp.host/--/api/v2/push/send). This is distinct
// from notificationService.ts's sendImmediateNotification, which only
// schedules a LOCAL notification on the calling device — it cannot reach
// another user's phone. Nudging a partner needs this one.

interface SendPushResult {
  success: boolean;
  error?: string;
}

async function sendPushToToken(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<SendPushResult> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        data: data || {},
        sound: 'default',
      }),
    });

    const result = await response.json();
    if (result?.data?.status === 'error') {
      return { success: false, error: result.data.message || 'Push send failed' };
    }
    return { success: true };
  } catch (error) {
    console.error('[pushNotificationService] Failed to send push:', error);
    return { success: false, error: 'Network error sending push' };
  }
}

/** Looks up a user's push token in user_profiles, then sends to it. */
async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<SendPushResult> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('expo_push_token')
    .eq('id', userId)
    .single();

  if (error || !profile?.expo_push_token) {
    return { success: false, error: 'Recipient has no push token registered' };
  }

  return sendPushToToken(profile.expo_push_token, title, body, data);
}

export default {
  sendPushToToken,
  sendPushToUser,
};
