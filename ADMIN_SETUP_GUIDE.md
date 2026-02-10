# Admin Setup & Testing Guide

## 🎯 Overview
This guide will help you set up the admin functionality with proper RLS policies and test the complete admin system.

---

## ✅ Completed Steps

1. ✅ Admin screen UI created ([AdminScreen.tsx](screens/AdminScreen.tsx))
2. ✅ Admin navigation integrated in Settings (only visible to admin@naulx.com)
3. ✅ Admin screen added to App.tsx navigation stack
4. ✅ RLS policies SQL file created ([setup_security_and_admin.sql](supabase_migrations/setup_security_and_admin.sql))

---

## 📋 Remaining Steps

### Step 1: Execute RLS Policies in Supabase

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/wdcgvzeolhpfkuozickj
   - Navigate to: `SQL Editor` in the left sidebar

2. **Run the RLS Setup SQL**:
   - Open the file: `supabase_migrations/setup_security_and_admin.sql`
   - Copy ALL the SQL content
   - Paste it into the Supabase SQL Editor
   - Click **RUN** button

3. **Verify Success**:
   You should see messages like:
   ```
   ✓ CREATE INDEX
   ✓ CREATE FUNCTION
   ✓ ALTER TABLE
   ✓ DROP POLICY
   ✓ CREATE POLICY
   ```

4. **What This Does**:
   - Creates indexes on all `user_id` columns for performance
   - Creates `is_admin()` function that checks if user email is `admin@naulx.com`
   - Enables RLS on all tables (8 tables total)
   - Creates policies: users see only their data, admin sees everything

---

### Step 2: Create Admin Account

1. **Sign up for a new account**:
   - Open your app
   - Sign up with:
     - Email: `admin@naulx.com`
     - Password: `Asad@0313`
   
2. **Verify Admin Account**:
   - Check your email for verification link
   - Click the verification link
   - Log back into the app

3. **Confirm Admin Access**:
   - Navigate to Settings
   - You should now see **"Admin Dashboard"** option in the Account section
   - If you don't see it, check that you're logged in with exactly `admin@naulx.com`

---

### Step 3: Test Admin Functionality

#### 3.1 Test Admin Dashboard Access

1. **Navigate to Admin Dashboard**:
   - Go to Settings → Account → Admin Dashboard
   - You should see:
     - ✓ Total Users card
     - ✓ Premium Users card
     - ✓ Total Sessions card
     - ✓ List of all users

2. **Test User List**:
   - Verify you can see ALL users in the system
   - Check that each user shows:
     - Email
     - Full name (if available)
     - Subscription status (Free/Premium)
     - Total sleep sessions
     - Last active date

3. **Test Search**:
   - Type in the search box
   - Verify filtering works by email or name

#### 3.2 Test View User Details

1. **Click "View Details" on any user**:
   - Should show an Alert with:
     - User ID
     - Email
     - Full Name
     - Subscription Status
     - Total Sleep Sessions
     - Created At
     - Last Active

#### 3.3 Test Delete User

1. **Click "Delete" on a test user**:
   - Should show confirmation alert
   - Choose "Delete" to proceed
   - User should be removed from the list
   - Stats should update automatically

2. **Verify Database Cleanup**:
   - Go to Supabase Dashboard
   - Check that user data was removed from all tables:
     - `auth.users`
     - `user_profiles`
     - `sleep_sessions`
     - `sleep_insights`
     - `analytics_events`
     - `journal_entries`
     - etc.

#### 3.4 Test Regular User Access

1. **Create a regular user account** (not admin):
   - Sign up with a different email (e.g., test@example.com)
   - Log in with this account

2. **Verify Regular User Restrictions**:
   - ✓ Settings → Account section should NOT show "Admin Dashboard" option
   - ✓ User can only see their own data in Journal, Sleep Sessions, etc.
   - ✓ User CANNOT see other users' data

3. **Test RLS Policies**:
   - Go to Journal screen → verify only your journal entries appear
   - Go to Home screen → verify only your sleep sessions appear
   - Try to manually query other users' data (should be blocked by RLS)

---

### Step 4: Test Production Build

1. **Build Production APK**:
   ```bash
   eas build --platform android --profile production
   ```

2. **Test on Physical Device**:
   - Install the APK on your Android device
   - Log in as admin (admin@naulx.com)
   - Verify admin dashboard works
   - Log out and create a regular user
   - Verify regular user cannot access admin features

---

## 🔍 Troubleshooting

### Issue: Admin Dashboard Not Showing in Settings

**Solution**:
- Verify you're logged in with exactly `admin@naulx.com` (case-sensitive)
- Check browser console for errors
- Restart the app

### Issue: Admin Can't See Other Users' Data

**Solution**:
- Verify RLS SQL was executed successfully in Supabase
- Check `is_admin()` function exists:
  ```sql
  SELECT is_admin();
  ```
- Should return `true` when logged in as admin@naulx.com

### Issue: Regular Users Can See Admin Dashboard

**Solution**:
- Check SettingsScreen.tsx line ~650:
  ```tsx
  {user?.email === 'admin@naulx.com' && (
  ```
- Verify the condition is exact match

### Issue: Delete User Fails

**Solution**:
- Check edge function is deployed: `delete-user-account`
- Verify service role key is set in Supabase secrets
- Check function logs in Supabase Dashboard

---

## 📊 Database Schema Reference

### Tables with RLS Policies:

1. **sleep_sessions** - User's sleep tracking data
2. **sleep_insights** - AI-generated sleep insights
3. **analytics_events** - User behavior tracking
4. **journal_entries** - Dream journal entries
5. **bedtime_routines** - Custom bedtime routines
6. **room_environment** - Room conditions during sleep
7. **user_settings** - User preferences
8. **user_profiles** - User profile information

### Policy Pattern:
```sql
-- Regular users see only their data
SELECT * WHERE user_id = auth.uid()

-- Admin sees everything
SELECT * WHERE user_id = auth.uid() OR is_admin()
```

---

## 🚀 Next Steps After Testing

1. **Submit to Google Play**:
   - Build production APK
   - Upload to Play Console
   - Submit updated Data Safety form
   - Submit for review

2. **Monitor Production**:
   - Check Sentry for errors
   - Monitor Supabase logs
   - Track analytics events

3. **Create Backup Admin Account** (recommended):
   - Create a second admin account
   - Update `is_admin()` function to check for multiple emails:
     ```sql
     CREATE OR REPLACE FUNCTION is_admin()
     RETURNS BOOLEAN AS $$
     BEGIN
       RETURN (
         SELECT email IN ('admin@naulx.com', 'backup@naulx.com')
         FROM auth.users
         WHERE id = auth.uid()
       );
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;
     ```

---

## 📱 Admin Dashboard Features

### Implemented:
- ✅ View all users with stats
- ✅ Search users by email/name
- ✅ View individual user details
- ✅ Delete users (cascade deletion)
- ✅ Real-time stats (total users, premium users, total sessions)
- ✅ Pull to refresh
- ✅ Loading states
- ✅ Error handling

### Available for Future Enhancement:
- 📧 Send push notifications to users
- 🔒 Ban/suspend users
- 💰 Manually grant premium access
- 📊 Advanced analytics dashboard
- 📝 View user activity logs
- 🛠️ Manage feature flags

---

## 🔐 Security Notes

1. **Admin Email is Hardcoded**:
   - Only `admin@naulx.com` has admin access
   - This cannot be changed from the app
   - To add more admins, update `is_admin()` function in Supabase

2. **RLS Policies Are Enforced**:
   - All database queries go through RLS
   - Even if someone manually queries the database, they can only see their data
   - Admin bypass is only possible when logged in as admin

3. **Edge Function Security**:
   - Uses service role key (admin privileges)
   - Only accessible via HTTP POST with user ID
   - CORS headers prevent unauthorized access

---

## 📞 Support

If you encounter any issues:
1. Check Supabase logs for database errors
2. Check Sentry for app crashes
3. Review edge function logs in Supabase Dashboard
4. Test with console.logs in development mode

---

**Admin Credentials**:
- Email: admin@naulx.com
- Password: Asad@0313

**Supabase Project**: wdcgvzeolhpfkuozickj
**GitHub Repo**: https://github.com/AsadNoul/sleep-tracker-sounds
