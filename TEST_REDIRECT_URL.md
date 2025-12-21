# Google Sign-In Redirect URLs - FIXED ✅

## Your Expo Account
- **Username**: assdalinaul
- **App Slug**: sleep-tracker-app

## Fixed Error:
- Installed `expo-linking` package
- Changed import from `react-native` Linking to `expo-linking`
- Now `Linking.createURL()` works correctly!

## CRITICAL: Add These URLs to Supabase

Go to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs

Add **ALL** of these URLs:

### 1. Expo Go (Development)
```
https://auth.expo.io/@assdalinaul/sleep-tracker-app/auth/callback
```

### 2. Production (Play Store/APK)
```
com.sleeptracker.app://auth/callback
```

### 3. Supabase Callback (Required)
```
https://wdcgvzeolhpfkuozickj.supabase.co/auth/v1/callback
```

## What the code does now:

The updated `signInWithGoogle()` function uses `Linking.createURL('auth/callback')` which:

- **In Expo Go**: Generates `https://auth.expo.io/@assdalinaul/sleep-tracker-app/auth/callback`
- **In Production Build**: Generates `com.sleeptracker.app://auth/callback`

Both are automatically handled by Expo!

## Testing Steps:

1. Add the Expo auth proxy URL to Supabase (if not already added)
2. Reload the app in Expo Go
3. Try Google Sign-in
4. Watch the logs - you should see the redirect URL logged
5. After Google auth, the app should automatically get the session

## Why this works:

- Expo's auth proxy receives the callback from Google
- It then redirects to your app using deep linking
- Supabase session is created automatically
- The code polls for the session every second for up to 30 seconds
