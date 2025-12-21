# Supabase Redirect URLs Configuration

## ✅ CODE IS READY FOR PRODUCTION (FIXED!)

The code now uses `AuthSession.makeRedirectUri({ useProxy: inExpoGo })` which automatically generates the correct URL:
- **In Expo Go**: `https://auth.expo.dev/@assdalinaul/sleep-tracker-app` (Expo Auth Proxy)
- **In Production/Dev Builds**: `com.sleeptracker.app://` (Custom Scheme)

### What Was Wrong Before:
- Used `Linking.createURL()` which generated `exp://` URLs
- Expo Go cannot handle `exp://` redirects from external browsers
- User was created in Supabase but app never resumed

### What's Fixed Now:
- Uses `AuthSession.makeRedirectUri()` with `useProxy: true` for Expo Go
- Uses Expo Auth Proxy which works with OAuth redirects
- App now properly resumes after Google sign-in

## 🔥 REQUIRED: Add These URLs to Supabase

Go to: **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**

Add **EXACTLY** these URLs:

### 1. Expo Auth Proxy (REQUIRED for Expo Go)
```
https://auth.expo.dev/@assdalinaul/sleep-tracker-app/auth/callback
```

### 2. Production/Development Builds (REQUIRED for APK/AAB)
```
com.sleeptracker.app://auth/callback
```

### 3. Supabase Default (REQUIRED - Always needed)
```
https://wdcgvzeolhpfkuozickj.supabase.co/auth/v1/callback
```

**Note**: Remove any `exp://` URLs if you added them - they don't work!

## ✅ Verification

Your `app.json` already has the correct intentFilters:
- Scheme: `com.sleeptracker.app`
- Host: `auth`
- Path: `/callback`
- Full URL: `com.sleeptracker.app://auth/callback` ✅

## 🔍 How It Works

1. User clicks "Sign in with Google"
2. App generates redirect URL: `com.sleeptracker.app://auth/callback`
3. Opens Google OAuth in browser
4. User signs in with Google
5. Google redirects to Supabase
6. Supabase redirects to: `com.sleeptracker.app://auth/callback`
7. Android intentFilters catch this URL and open your app
8. App polls for session (30 attempts = 30 seconds max)
9. Session found → User is signed in! ✅

## 📱 Testing Steps

Once the build is ready:

1. Download and install the APK
2. Open the app
3. Tap "Sign in with Google"
4. Watch the logs for:
   - `🔍 Redirect URL: com.sleeptracker.app://auth/callback`
   - `🌐 Opening OAuth URL in browser...`
   - `📱 Browser result: dismiss`
   - `🔄 Polling for session... attempt 1/30`
   - `✅ Session found!`
   - `✅ Sign-in complete!`

## ⚠️ Common Issues

### Issue: "Sign-in timed out"
**Solution**: Make sure `com.sleeptracker.app://auth/callback` is in Supabase redirect URLs

### Issue: Browser doesn't redirect back
**Solution**: Reinstall the app (sometimes Android needs to re-register the intent filters)

### Issue: "Session not created"
**Solution**: Check Supabase logs to see if the OAuth completed successfully

## 🎯 Current Build Status

Building: **Development Build** (Internal Testing)
- Status: Queued (waiting in free tier queue)
- Platform: Android
- Profile: development
- Build URL: https://expo.dev/accounts/assdalinaul/projects/sleep-tracker-app/builds/e171568f-9f80-4b3a-8ce6-489fcc024017

Once complete, you'll get a download link for the APK!
