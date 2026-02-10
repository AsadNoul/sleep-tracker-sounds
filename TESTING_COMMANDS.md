# Testing Commands for Admin & Production

## 🧪 Test Account Deletion Edge Function

### Test 1: Via Terminal (cURL)
```bash
# Replace USER_ID with actual user ID from Supabase auth.users table
curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/delete-user-account \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"userId": "USER_ID_HERE"}'
```

### Test 2: Via JavaScript (Node.js)
```javascript
const fetch = require('node-fetch');

async function testDeleteUser() {
  const response = await fetch(
    'https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/delete-user-account',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY'
      },
      body: JSON.stringify({
        userId: 'USER_ID_HERE'
      })
    }
  );
  
  const result = await response.json();
  console.log('Result:', result);
}

testDeleteUser();
```

---

## 🔍 Verify RLS Policies

### Test as Regular User
```sql
-- Login as regular user in Supabase SQL Editor
-- Then run these queries

-- Should only return YOUR data
SELECT * FROM sleep_sessions;
SELECT * FROM journal_entries;
SELECT * FROM user_profiles;

-- Should return 0 rows (other users' data)
SELECT * FROM sleep_sessions WHERE user_id != auth.uid();
```

### Test as Admin
```sql
-- Login as admin@naulx.com in Supabase SQL Editor
-- Then run these queries

-- Should return ALL users' data
SELECT * FROM sleep_sessions;
SELECT * FROM journal_entries;
SELECT * FROM user_profiles;

-- Should return TRUE
SELECT is_admin();
```

---

## 📊 Check Database Indexes

```sql
-- Verify indexes were created
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%user_id%'
ORDER BY tablename;
```

Expected output:
- idx_analytics_events_user_id
- idx_bedtime_routines_user_id
- idx_journal_entries_user_id
- idx_room_environment_user_id
- idx_sleep_insights_user_id
- idx_sleep_sessions_user_id
- idx_user_profiles_user_id
- idx_user_settings_user_id

---

## 🚀 Build Production APK

### Option 1: EAS Build (Recommended)
```bash
cd a0-project

# Build for Android
eas build --platform android --profile production

# Build for iOS (if configured)
eas build --platform ios --profile production

# Build for both
eas build --platform all --profile production
```

### Option 2: Local Build
```bash
cd a0-project

# Generate Android APK locally
npx expo prebuild --platform android
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

---

## 🧹 Clean Build Cache (if needed)

```bash
cd a0-project

# Clear Expo cache
npx expo start --clear

# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules
npm install

# For Android, clean Gradle
cd android
./gradlew clean
cd ..
```

---

## 📱 Test on Device

### Install APK on Android Device
```bash
# Connect device via USB with USB debugging enabled
adb devices

# Install APK
adb install path/to/app-release.apk

# View logs
adb logcat | grep ReactNativeJS
```

---

## 🔐 Verify Environment Variables

### Check .env file
```bash
cat .env
```

Should contain:
```
SUPABASE_URL=https://wdcgvzeolhpfkuozickj.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
REVENUECAT_ANDROID_API_KEY=goog_xxxxx
REVENUECAT_IOS_API_KEY=appl_xxxxx
```

---

## 🎯 Admin Testing Checklist

### 1. Admin Access
- [ ] Sign up as admin@naulx.com / Asad@0313
- [ ] Verify email (check inbox)
- [ ] Log into app
- [ ] Navigate to Settings → Account
- [ ] Confirm "Admin Dashboard" appears

### 2. Admin Dashboard
- [ ] Click "Admin Dashboard"
- [ ] Verify user list loads
- [ ] Check stats cards show correct numbers
- [ ] Test search functionality
- [ ] Click "View Details" on a user
- [ ] Click "Delete" and confirm it works

### 3. Regular User
- [ ] Log out from admin account
- [ ] Sign up as regular user (test@example.com)
- [ ] Navigate to Settings → Account
- [ ] Confirm "Admin Dashboard" does NOT appear
- [ ] Verify only own data visible in app

### 4. Database Verification
- [ ] Go to Supabase dashboard
- [ ] Check auth.users table
- [ ] Verify admin account exists
- [ ] Check user_profiles has correct data
- [ ] Verify RLS policies are active

---

## 🐛 Debug Common Issues

### Issue: Admin dashboard not showing
```javascript
// Add this in SettingsScreen.tsx temporarily to debug
console.log('Current user email:', user?.email);
console.log('Is admin?', user?.email === 'admin@naulx.com');
```

### Issue: Can't see other users' data
```sql
-- Run this in Supabase SQL Editor while logged in as admin
SELECT current_setting('request.jwt.claims', true)::json->>'email' as current_email;
SELECT is_admin() as is_admin;

-- Should show:
-- current_email: admin@naulx.com
-- is_admin: true
```

### Issue: Build fails
```bash
# Clear everything and rebuild
cd a0-project
rm -rf node_modules package-lock.json
npm install
npx expo start --clear
```

---

## 📈 Monitor Production

### Supabase Logs
1. Go to: https://supabase.com/dashboard/project/wdcgvzeolhpfkuozickj
2. Click: Logs → Edge Functions
3. Filter by: delete-user-account
4. Check for errors

### Analytics Events
```sql
-- Check recent analytics events
SELECT 
  event_type,
  COUNT(*) as count
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY count DESC;
```

### User Activity
```sql
-- Check active users in last 7 days
SELECT 
  COUNT(DISTINCT user_id) as active_users
FROM sleep_sessions
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 🔄 Update Edge Functions

### Deploy single function
```bash
cd a0-project
npx supabase functions deploy delete-user-account --project-ref wdcgvzeolhpfkuozickj
```

### Deploy all functions
```bash
cd a0-project
npx supabase functions deploy revenuecat-webhook --project-ref wdcgvzeolhpfkuozickj
npx supabase functions deploy delete-user-account --project-ref wdcgvzeolhpfkuozickj
npx supabase functions deploy revenuecat-api --project-ref wdcgvzeolhpfkuozickj
```

---

## ✅ Pre-Submission Checklist

- [ ] All tests passed
- [ ] Admin functionality works
- [ ] Account deletion tested
- [ ] RLS policies verified
- [ ] Production build successful
- [ ] APK tested on device
- [ ] Data Safety form filled
- [ ] Privacy policy accessible
- [ ] No console.errors in production
- [ ] All features working

---

**Ready for Google Play Submission!** 🚀
