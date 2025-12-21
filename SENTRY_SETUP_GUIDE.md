# Sentry Crash Reporting Setup Guide

## What is Sentry?

Sentry is a **crash reporting and error tracking** service that will:
- Send you **email alerts** when your app crashes
- Provide **detailed stack traces** showing exactly where errors occurred
- Track **which users** are affected
- Monitor **app performance** and slow screens
- Show **error trends** across different app versions

## Quick Setup (5 Minutes)

### Step 1: Create Sentry Account

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up with your email
3. Choose "Create a new project"
4. Select **React Native** as the platform
5. Name your project: `sleep-tracker-app`
6. Click "Create Project"

### Step 2: Get Your DSN

After creating the project, you'll see a **DSN (Data Source Name)** like:
```
https://1234567890abcdef@o123456.ingest.sentry.io/7654321
```

Copy this DSN - you'll need it next.

### Step 3: Add DSN to Your App

1. Open the `.env` file in your project
2. Find this line:
   ```env
   SENTRY_DSN=https://YOUR_SENTRY_DSN_HERE@sentry.io/YOUR_PROJECT_ID
   ```
3. Replace it with your actual DSN:
   ```env
   SENTRY_DSN=https://1234567890abcdef@o123456.ingest.sentry.io/7654321
   ```
4. Save the file

### Step 4: Configure Email Notifications

1. In Sentry dashboard, click **Settings** (⚙️)
2. Go to **Alerts** → **Alert Rules**
3. Click **Create Alert Rule**
4. Choose **Issues**
5. Set conditions:
   - **When**: An issue is first seen
   - **Then**: Send a notification to **Email**
6. Add your email address
7. Click **Save Rule**

### Step 5: Build and Test

```bash
# Clear cache and rebuild
npx expo start --clear

# Or build for production
eas build --platform android --profile production
```

---

## How It Works

### Automatic Crash Reporting

Sentry is now integrated into your app and will automatically:

1. **Catch all crashes** - Even native crashes in production
2. **Send email alerts** - You'll receive emails within minutes of a crash
3. **Provide context** - User ID, device info, OS version, etc.
4. **Track stack traces** - See exactly which line of code caused the crash

### What Gets Tracked

✅ **JavaScript Errors** - Uncaught exceptions in your code
✅ **Native Crashes** - Android/iOS native module crashes
✅ **Unhandled Promise Rejections** - Async errors
✅ **Out of Memory Crashes** - OOM errors
✅ **Network Errors** - API call failures
✅ **Component Errors** - React component render errors

### Email Alerts

You'll receive emails like:

```
Subject: [Sentry] New Issue: TypeError: Cannot read property 'user' of undefined

Environment: production
Device: Samsung Galaxy S21 (Android 12)
User: user@example.com
First seen: Dec 15, 2024 at 3:45 PM

Stack Trace:
  at ProfileScreen (screens/ProfileScreen.tsx:45)
  at renderWithHooks (react-native/Libraries/Renderer/...)
```

---

## Sentry Dashboard Features

### 1. Issues Overview
See all crashes and errors in one place:
- **Error type and message**
- **Number of users affected**
- **Frequency** (how often it occurs)
- **First seen** and **Last seen** timestamps

### 2. Issue Details
Click any issue to see:
- **Full stack trace** with file names and line numbers
- **User information** (email, user ID)
- **Device details** (model, OS version)
- **Breadcrumbs** (user actions before crash)
- **Release version** (which app version)

### 3. Performance Monitoring
Track slow operations:
- **Screen load times**
- **API call duration**
- **Slow database queries**

### 4. Releases
Compare error rates across versions:
- See if new version has more or fewer crashes
- Track which version has highest crash rate

---

## Alert Configuration Options

### Email Alerts
Get notified for:
- New issues (first time seen)
- Issue frequency spikes (sudden increase)
- Regressions (issue returns after being fixed)

### Slack Integration
1. Go to **Settings** → **Integrations**
2. Enable **Slack**
3. Connect your Slack workspace
4. Configure which channels get alerts

### Discord Integration
1. Go to **Settings** → **Integrations**
2. Enable **Discord**
3. Add webhook URL
4. Configure alert types

---

## Testing Your Setup

### Test Crash Reporting

Add a test button to your app:

```typescript
import * as Sentry from '@sentry/react-native';

// In your component
<TouchableOpacity onPress={() => {
  Sentry.captureException(new Error('Test crash from app'));
}}>
  <Text>Test Sentry</Text>
</TouchableOpacity>
```

After clicking the button:
1. Check Sentry dashboard (refresh after 1-2 minutes)
2. You should see the test error
3. You should receive an email notification

---

## Best Practices

### 1. Set User Context
Track which users experience crashes:

```typescript
import * as Sentry from '@sentry/react-native';

// When user logs in
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});

// When user logs out
Sentry.setUser(null);
```

### 2. Add Breadcrumbs
Track user actions before crash:

```typescript
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to Profile screen',
  level: 'info',
});
```

### 3. Tag Errors
Categorize errors for filtering:

```typescript
Sentry.setTag('screen', 'ProfileScreen');
Sentry.setTag('feature', 'subscription');
```

### 4. Custom Context
Add extra debugging info:

```typescript
Sentry.setContext('subscription', {
  status: user.subscriptionStatus,
  plan: user.subscriptionPlan,
  expiresAt: user.subscriptionExpiresAt,
});
```

---

## Privacy & Data Collection

### What Sentry Collects:
- Error messages and stack traces
- User ID and email (if you set it)
- Device model and OS version
- App version
- Timestamp of error

### What Sentry Does NOT Collect:
- Passwords or sensitive data
- Full app state
- User's personal files
- Payment information

### GDPR Compliance:
- User data is encrypted
- You can delete user data on request
- Data retention configurable (default 90 days)

---

## Troubleshooting

### Not Receiving Errors in Sentry?

**Check:**
1. DSN is correct in `.env` file
2. App was rebuilt after adding DSN
3. Error actually occurred in production (not caught by try/catch)
4. Internet connection available when error occurred

**Test with:**
```typescript
Sentry.captureException(new Error('Test error'));
```

### Not Receiving Email Alerts?

**Check:**
1. Alert rule is created in Sentry dashboard
2. Email address is correct
3. Check spam folder
4. Alert rule conditions are met

---

## Pricing

**Free Tier:**
- 5,000 errors per month
- 10,000 performance transactions
- 7-day data retention
- Unlimited projects
- **Perfect for your app!**

**Paid Plans:**
- Start at $26/month
- 50,000 errors/month
- 90-day data retention
- Priority support

---

## Support Links

- **Sentry Documentation**: https://docs.sentry.io/platforms/react-native/
- **Dashboard**: https://sentry.io/
- **Status Page**: https://status.sentry.io/

---

## Quick Commands

```bash
# Install Sentry (already done)
npx expo install sentry-expo

# Clear cache and rebuild
npx expo start --clear

# Build for Android
eas build --platform android --profile production

# Test error reporting
# Add Sentry.captureException(new Error('Test')) to your code
```

---

## Current Setup Status

✅ **Sentry installed** - `sentry-expo` package added
✅ **App configured** - Sentry initialized in App.tsx
✅ **Error boundary integrated** - Errors automatically reported
✅ **DSN placeholder added** - Ready for your DSN
⏳ **Awaiting DSN** - Need to create Sentry account and get DSN
⏳ **Email alerts** - Need to configure in Sentry dashboard

---

## Next Steps

1. Create Sentry account at [https://sentry.io/signup/](https://sentry.io/signup/)
2. Get your DSN
3. Add DSN to `.env` file
4. Configure email alerts in dashboard
5. Build and deploy app
6. Monitor crashes in Sentry dashboard

**That's it!** You'll now receive email alerts whenever your app crashes.
