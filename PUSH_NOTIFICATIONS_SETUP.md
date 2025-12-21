# Push Notifications Setup Guide

This guide covers the complete setup for push notifications in your Sleep Tracker app.

## Features Implemented

### 1. Local Notifications (Timezone-Aware)
- **Smart Wake Up** - Wakes user 30 minutes before target time during light sleep window
- **Bedtime Reminders** - Daily reminders 30 minutes before bedtime, automatically respects user timezone
- **Alarm Notifications** - Regular alarm notifications at specified time
- **Milestone Notifications** - Celebrate streaks and sleep quality achievements

### 2. Push Notifications (Server-Triggered)
- Edge Function for sending push notifications to users
- Can send to specific user or broadcast to all users
- Stores Expo push tokens automatically when users sign in

## How It Works

### Local Notifications
Local notifications are scheduled on the device and fire automatically based on timezone:

```typescript
// Schedule bedtime reminder (automatically timezone-aware)
await notificationService.scheduleBedtimeReminder(new Date('2025-01-15T22:00:00'));

// Schedule smart wake up alarm
await notificationService.scheduleSmartAlarm({
  alarmTime: new Date('2025-01-16T07:00:00'),
  sessionId: 'session-123',
  smartAlarm: true
});
```

### Push Notifications
Push notifications are sent from your Supabase Edge Function:

1. User signs in → App registers Expo push token in database
2. Server sends notification → Edge Function fetches tokens from database
3. Edge Function sends to Expo Push API → Expo delivers to devices

## Deployment Steps

### Step 1: Deploy Database Migration

Run this SQL in your Supabase SQL Editor or via CLI:

```bash
# Using Supabase CLI
supabase db reset

# Or manually run the migration file
# Copy contents of supabase_migrations/add_push_token.sql to Supabase SQL Editor
```

The migration adds:
- `expo_push_token` column to `user_profiles` table
- Index for faster lookups

### Step 2: Deploy Edge Function

```bash
# Make sure you're in the project directory
cd "d:\MY APPS\sleep app version 2.1\a0-project"

# Deploy the push notification function
npx supabase functions deploy send-push-notification

# Verify it's deployed
npx supabase functions list
```

### Step 3: Test the Setup

#### Test on Production Build
1. Download and install the production APK (build v10)
2. Sign in with your account
3. Check logs - you should see:
   ```
   📱 Expo Push Token: ExponentPushToken[xxxxxx]
   ✅ Push token saved to database
   ```

#### Test Push Notifications via Edge Function

Use the Edge Function URL to send a test notification:

```bash
# Get your Edge Function URL
# Format: https://[PROJECT_ID].supabase.co/functions/v1/send-push-notification

# Send test notification to specific user
curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "title": "Test Notification",
    "body": "This is a test from Edge Function!"
  }'

# Broadcast to all users
curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello Everyone!",
    "body": "This goes to all users with push tokens"
  }'
```

#### Test Local Notifications

Use the built-in test screen:

```typescript
// In your app, navigate to Settings > Notification Test
// Or use the NotificationService directly:

import notificationService from './services/notificationService';

// Test immediate notification
await notificationService.sendTestNotification();

// Test alarm (fires in 10 seconds)
await notificationService.sendTestAlarm(10);

// Test bedtime reminder (daily at 9:30 PM)
await notificationService.scheduleBedtimeReminder(new Date('2025-01-15T22:00:00'));

// Test smart wake up (30 mins before 7 AM)
await notificationService.scheduleSmartAlarm({
  alarmTime: new Date('2025-01-16T07:00:00'),
  sessionId: 'test-session',
  smartAlarm: true
});
```

## Files Modified/Created

### New Files
- `supabase/functions/send-push-notification/index.ts` - Edge Function for push notifications
- `supabase_migrations/add_push_token.sql` - Database migration

### Modified Files
- `contexts/AuthContext.tsx` - Added `registerPushToken()` function
- `services/notificationService.ts` - Already had Smart Wake Up, enhanced bedtime reminders

## Notification Types

### 1. Smart Wake Up (`scheduleSmartAlarm`)
- Wakes user 30 minutes before target alarm time
- In future: Will analyze sleep stages and wake during light sleep
- Marked with `@alarm_smart` flag in AsyncStorage

### 2. Bedtime Reminder (`scheduleBedtimeReminder`)
- Fires 30 minutes before user's bedtime
- Repeats daily automatically
- Timezone-aware using `hour` and `minute` trigger (not `date`)

### 3. Regular Alarm (`scheduleAlarm`)
- Fires at exact specified time
- Can be cancelled with `cancelAlarm()`

### 4. Push Notifications (via Edge Function)
- Server-triggered notifications
- Can target specific users or broadcast
- Requires user to be signed in (to have push token)

## Troubleshooting

### Push Token Not Saving
**Symptom**: No push token in database after sign in

**Solutions**:
1. Check notification permissions are granted
2. Verify EAS project ID in app.json
3. Check logs for error messages

### Notifications Not Firing
**Symptom**: Scheduled notifications don't appear

**Solutions**:
1. Check notification permissions: Settings > Apps > Sleep Tracker > Notifications
2. Verify battery optimization is disabled for the app
3. Check scheduled notifications: `await Notifications.getAllScheduledNotificationsAsync()`

### Edge Function Failing
**Symptom**: Push notifications not sent from server

**Solutions**:
1. Verify function is deployed: `npx supabase functions list`
2. Check function logs: `npx supabase functions logs send-push-notification`
3. Verify database has `expo_push_token` column
4. Check that users have push tokens in database

## Next Steps

1. **Deploy the migration** - Add expo_push_token column
2. **Deploy the Edge Function** - Enable server-side push notifications
3. **Test in production build** - Download APK and verify push token registration
4. **Test push notifications** - Use curl or Postman to send test notifications
5. **Integrate with app features** - Send notifications for:
   - Sleep session reminders
   - Alarm triggers
   - Achievement milestones
   - Weekly sleep reports

## Production Considerations

### Expo Push Notification Limits
- Free tier: Unlimited notifications
- Rate limits apply to prevent spam
- Monitor delivery receipts for failed notifications

### Database Cleanup
Consider periodically cleaning up old/invalid push tokens:

```sql
-- Remove tokens that haven't been used in 90 days
DELETE FROM user_profiles
WHERE expo_push_token IS NOT NULL
  AND updated_at < NOW() - INTERVAL '90 days';
```

### Security
- Edge Function uses Supabase service role key (already configured)
- Push tokens are tied to user accounts
- Only authenticated requests can trigger push notifications

## API Reference

### Edge Function Endpoint

**POST** `https://[PROJECT_ID].supabase.co/functions/v1/send-push-notification`

**Headers**:
```
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```

**Body**:
```json
{
  "userId": "optional-user-id",  // Omit to broadcast to all users
  "title": "Notification Title",
  "body": "Notification message",
  "data": {                      // Optional custom data
    "type": "custom",
    "sessionId": "123"
  }
}
```

**Response**:
```json
{
  "success": true,
  "sentTo": 5,
  "responses": [
    { "status": "ok", "id": "..." },
    ...
  ]
}
```

## Support

For issues or questions:
1. Check logs in the app
2. Check Edge Function logs: `npx supabase functions logs send-push-notification`
3. Verify database schema matches migration
4. Test with curl commands first before integrating
