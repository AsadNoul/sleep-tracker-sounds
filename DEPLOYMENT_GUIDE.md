# 🚀 Deployment Guide - Sleep Architect

## 📦 Prerequisites

### 1. GitHub Secrets Setup
Add these secrets to your GitHub repository:
- Go to: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

```
SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxxxxxxx
SUPABASE_PROJECT_ID=wdcgvzeolhpfkuozickj
```

**How to get these:**
1. **SUPABASE_ACCESS_TOKEN**: 
   - Go to https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Copy and add to GitHub secrets

2. **SUPABASE_PROJECT_ID**: 
   - Your project ref: `wdcgvzeolhpfkuozickj`
   - Found in Supabase Dashboard URL

### 2. Environment Variables (.env)
Ensure your `.env` file has:
```env
SUPABASE_URL=https://wdcgvzeolhpfkuozickj.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
REVENUECAT_ANDROID_API_KEY=goog_xxxxx
REVENUECAT_IOS_API_KEY=appl_xxxxx
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
```

⚠️ **IMPORTANT**: Never commit `.env` file to Git!

---

## 🔧 Manual Deployment (First Time)

### Step 1: Deploy Edge Functions
```bash
cd supabase

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref wdcgvzeolhpfkuozickj

# Deploy all functions
npx supabase functions deploy delete-user-account
npx supabase functions deploy revenuecat-webhook
npx supabase functions deploy revenuecat-api
```

### Step 2: Set Function Secrets
```bash
# Set environment variables for edge functions
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
npx supabase secrets set REVENUECAT_SECRET_API_KEY=your_revenuecat_api_key
```

### Step 3: Run Database Migrations
```bash
# If you have new SQL migrations
npx supabase db push
```

---

## 🤖 Automatic Deployment (CI/CD)

Once GitHub secrets are set up, deployment happens automatically:

### Trigger Automatic Deployment:
```bash
# Make changes to edge functions
git add supabase/functions/
git commit -m "Update edge functions"
git push origin master
```

The GitHub Action (`.github/workflows/deploy-supabase.yml`) will:
1. ✅ Detect changes in `supabase/functions/`
2. ✅ Deploy all edge functions
3. ✅ Notify you of success/failure

### Manual Trigger:
You can also manually trigger deployment:
1. Go to: **Actions** tab in GitHub
2. Select: **Deploy Supabase Edge Functions**
3. Click: **Run workflow**

---

## 📱 Build & Deploy App

### Development Build
```bash
# Build for testing
eas build --platform android --profile preview

# Install on device
adb install path/to/app.apk
```

### Production Build
```bash
# Build production AAB
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --latest
```

### Pre-Production Checklist
Before running production build:
- [ ] All edge functions deployed
- [ ] Database indexes created
- [ ] RLS enabled on all tables
- [ ] Environment variables set in EAS
- [ ] Testing completed
- [ ] Crash reporting configured

---

## 🔍 Verification

### Test Edge Functions
```bash
# Test delete-user-account function
curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/delete-user-account \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json"

# Check function logs
npx supabase functions logs delete-user-account
```

### Test Account Deletion in App
1. Create a test account
2. Add some sleep data
3. Go to Settings → Data & Privacy → Delete Account
4. Verify:
   - All data deleted from tables
   - User signed out
   - Can't sign in again
   - No errors in console

---

## 🐛 Troubleshooting

### Edge Function Not Deploying
```bash
# Check Supabase CLI version
npx supabase --version

# Update to latest
npm install -g supabase

# Check function logs
npx supabase functions logs delete-user-account --tail
```

### Authentication Errors
```bash
# Re-login to Supabase
npx supabase logout
npx supabase login

# Re-link project
npx supabase link --project-ref wdcgvzeolhpfkuozickj
```

### Build Failures
```bash
# Clear EAS build cache
eas build:clear-cache

# Clean local build
cd android && ./gradlew clean && cd ..

# Rebuild
eas build --platform android --profile production --clear-cache
```

---

## 📊 Monitoring

### Check Function Health
- Supabase Dashboard → Edge Functions → Select function
- View logs, invocations, errors
- Set up alerts for high error rates

### App Monitoring
- Play Console → Quality → Crashes & ANRs
- Check crash-free users rate (target: >99%)
- Monitor API response times

---

## 🔄 Rollback Plan

### If Edge Function Breaks:
```bash
# Deploy previous version
git checkout <previous-commit>
npx supabase functions deploy delete-user-account
git checkout master
```

### If App Build Breaks:
1. Halt rollout in Play Console
2. Mark build as bad in EAS
3. Submit previous working build
4. Fix issue and redeploy

---

## ✅ Post-Deployment

After successful deployment:
1. [ ] Test account deletion on production
2. [ ] Monitor error logs for 24 hours
3. [ ] Check analytics are flowing
4. [ ] Verify push notifications work
5. [ ] Test subscription flows
6. [ ] Monitor Play Store reviews
7. [ ] Update documentation

---

## 📞 Support

If deployment issues persist:
- Check logs: `npx supabase functions logs <function-name>`
- Supabase Status: https://status.supabase.com
- Community: https://github.com/supabase/supabase/discussions

**Emergency Contact:** asadalibscs20@gmail.com

---

**Last Updated:** February 7, 2026  
**App Version:** 2.1.0  
**Build:** 31
