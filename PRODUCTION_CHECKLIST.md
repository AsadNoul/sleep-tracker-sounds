# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

## ⚠️ CRITICAL FIXES REQUIRED

### 1. ✅ Account Deletion Fixed
- [x] Updated `deleteAccount()` to use Promise.all for parallel deletions
- [x] Created Supabase Edge Function for proper auth user deletion
- [ ] **ACTION: Deploy edge function:** `supabase functions deploy delete-user-account`
- [ ] **ACTION: Test deletion flow end-to-end**

### 2. ✅ Analytics Optimized  
- [x] Added batching (10 events per batch)
- [x] Auto-flush every 5 seconds
- [x] Reduced database calls by 90%
- [ ] **ACTION: Test analytics in production mode**

### 3. ✅ Logging Improved
- [x] Created production-safe logger
- [ ] **ACTION: Replace all console.log with logger** (search & replace needed)

---

## 🔒 SECURITY ISSUES TO FIX

### Environment Variables
**Check these files DON'T have hardcoded secrets:**
```bash
grep -r "SUPABASE_ANON_KEY\|REVENUECAT.*KEY" --include="*.ts" --include="*.tsx"
```

### API Keys in @env
- [ ] Verify `.env` file is in `.gitignore`
- [ ] Check no keys committed to Git history
- [ ] Use EAS Secrets for production: `eas secret:create`

### Row Level Security
- [ ] Enable RLS on ALL tables in Supabase
- [ ] Test users can't access others' data
- [ ] Run: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;`

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### Database Queries
- [ ] Add indexes on frequently queried columns:
  ```sql
  CREATE INDEX idx_sleep_sessions_user_id ON sleep_sessions(user_id);
  CREATE INDEX idx_sleep_sessions_created_at ON sleep_sessions(created_at);
  CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
  CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
  ```

### Image Optimization
- [ ] Run: `npm run optimize-images` (if script exists)
- [ ] Compress app icon and splash screen
- [ ] Use WebP format where possible

### Bundle Size
```bash
npx expo-doctor
eas build:inspect --platform android --profile production
```
- [ ] Check bundle size < 50MB
- [ ] Remove unused dependencies
- [ ] Enable Hermes engine (already enabled in build config)

### Memory Leaks
- [ ] Clear intervals on component unmount (check SleepContext smartAlarmInterval)
- [ ] Unsubscribe from all listeners
- [ ] Check Audio context cleanup

---

## 🐛 BUG FIXES NEEDED

### 1. Guest Mode Issues
**File:** `contexts/SleepContext.tsx:237`
```typescript
// Issue: Device ID generation might create duplicates
const getDeviceId = async (): Promise<string> => {
  // Add UUID library for better uniqueness
  deviceId = `guest_${uuid.v4()}`;
}
```
- [ ] Install: `npm install uuid @types/uuid`
- [ ] Replace custom ID generation with proper UUID

### 2. Smart Alarm Intervals
**File:** `contexts/SleepContext.tsx:120`
- [ ] Ensure intervals are cleared on unmount
- [ ] Test wake lock behavior in background

### 3. RevenueCat Error Handling
**File:** `services/revenueCatService.ts`
- [ ] Handle "No offerings available" gracefully
- [ ] Add retry logic for failed purchases
- [ ] Test offline purchase restoration

---

## 📱 TESTING CHECKLIST

### Functionality Testing
- [ ] Test on Android 8, 10, 12, 13, 14
- [ ] Test with/without Google Play Services
- [ ] Test offline mode completely
- [ ] Test guest mode → sign up migration
- [ ] Test all subscription flows
- [ ] Test account deletion (end-to-end)
- [ ] Test push notifications
- [ ] Test alarms and wake locks
- [ ] Test audio playback in background
- [ ] Test data export

### Edge Cases
- [ ] No internet connection
- [ ] Airplane mode
- [ ] Low battery mode
- [ ] Device rotation
- [ ] App backgrounded during sleep tracking
- [ ] Subscription expires while app open
- [ ] Multiple devices same account

### Performance Testing
- [ ] App size < 100MB
- [ ] Cold start time < 3 seconds
- [ ] Hot start time < 1 second
- [ ] Memory usage < 200MB
- [ ] No memory leaks after 30 min use
- [ ] Battery drain < 5% per hour

---

## 📝 COMPLIANCE & POLICIES

### Google Play Requirements
- [x] Data safety form completed
- [x] Account deletion implemented
- [x] Privacy policy published
- [ ] **ACTION: Update store listing with new data deletion URL**
- [ ] Target API 34 (Android 14)
- [ ] 64-bit support enabled
- [ ] App bundle format (.aab)

### Privacy Compliance
- [ ] GDPR compliance (EU users)
- [ ] CCPA compliance (California users)  
- [ ] Data retention policy documented
- [ ] Cookie policy (if using web views)

---

## 🔧 BUILD CONFIGURATION

### EAS Build Settings
Check `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

### ProGuard/R8 (Android)
- [ ] Enable code obfuscation
- [ ] Test app after obfuscation
- [ ] Keep necessary classes (RevenueCat, Supabase)

### Android Manifest
Check permissions are minimal:
- [ ] Remove unused permissions
- [ ] Add permission rationale strings
- [ ] Test permission flow

---

## 🚫 REMOVE BEFORE PRODUCTION

### Development Code
Search and remove:
- [ ] `console.log` → Replace with logger
- [ ] `console.error` → Keep but ensure no sensitive data logged
- [ ] Debug flags
- [ ] Test credentials
- [ ] Commented code blocks

### Test Data
- [ ] Remove test accounts from database
- [ ] Clear test analytics events
- [ ] Remove debug menu (if any)

### Unused Dependencies
```bash
npx depcheck
```
- [ ] Remove unused npm packages
- [ ] Update outdated dependencies: `npm outdated`

---

## 📊 MONITORING SETUP

### Crash Reporting
**File:** `services/crashLogger.ts`
- [ ] Verify Sentry DSN is set
- [ ] Test crash reports are received
- [ ] Set up alerts for critical errors
- [ ] Add user context to crashes

### Analytics
- [ ] Set up Supabase Analytics dashboard
- [ ] Track key metrics:
  - Daily active users
  - Session duration
  - Feature usage
  - Conversion rate
  - Crash-free users

### Performance Monitoring
- [ ] Set up performance tracking
- [ ] Monitor API response times
- [ ] Track slow database queries
- [ ] Monitor memory usage

---

## 🎨 UX IMPROVEMENTS

### Error Messages
Make user-friendly:
- [ ] "Network error" → "Please check your internet connection"
- [ ] "Auth failed" → "Unable to sign in. Please try again"
- [ ] Generic errors → Specific actionable messages

### Loading States
- [ ] Add skeleton loaders everywhere
- [ ] Show progress for long operations
- [ ] Implement pull-to-refresh

### Offline Experience
- [ ] Queue failed operations
- [ ] Show offline indicator
- [ ] Sync when back online

---

## 🚀 DEPLOYMENT STEPS

### Pre-Deployment
1. [ ] Run all tests: `npm test`
2. [ ] Build locally: `eas build --platform android --profile production --local`
3. [ ] Test .aab file on physical devices
4. [ ] Check app size and permissions
5. [ ] Review ProGuard mapping

### Supabase Setup
```bash
# Deploy edge functions
supabase functions deploy delete-user-account
supabase functions deploy revenuecat-webhook

# Run migrations
supabase db push

# Enable RLS
# Run in SQL Editor: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### EAS Build
```bash
# Production build
eas build --platform android --profile production

# After build completes:
eas submit --platform android --latest
```

### Post-Deployment
1. [ ] Monitor crash reports (first 24 hours)
2. [ ] Check analytics events coming through
3. [ ] Test push notifications on production
4. [ ] Monitor Play Store reviews
5. [ ] Watch for ANR (Application Not Responding) reports

---

## 📈 METRICS TO TRACK

### Week 1
- Crash-free users rate (target: >99%)
- ANR rate (target: <0.5%)
- Install→Open rate
- Sign-up conversion
- Critical errors count

### Month 1
- DAU/MAU ratio
- Retention (Day 1, 7, 30)
- Premium conversion rate
- Average session duration
- Feature adoption rates

---

## 🆘 ROLLBACK PLAN

If issues occur:
1. [ ] Halt rollout in Play Console
2. [ ] Document the issue
3. [ ] Fix and test locally
4. [ ] Create hotfix build
5. [ ] Submit emergency update

---

## ✅ SIGN-OFF

- [ ] Code reviewed by: ___________
- [ ] Testing completed by: ___________  
- [ ] Security audit by: ___________
- [ ] Final approval by: ___________

**Date:** ___________  
**Build Version:** ___________  
**Release Notes:** ___________

---

## 🎯 IMMEDIATE PRIORITY (DO THESE FIRST)

1. **Deploy delete-user-account edge function**
2. **Replace all console.log with logger**
3. **Add database indexes**
4. **Test account deletion end-to-end**
5. **Enable RLS on all tables**
6. **Run security audit on API keys**
7. **Build and test production .aab**

---

**Good luck with your launch! 🚀**
