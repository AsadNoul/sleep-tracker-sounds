# RevenueCat Complete Setup Guide

## ✅ What's Been Done

### 1. **App Crash Fixed** ✅
- Added validation to prevent crashes from invalid API keys
- App now runs gracefully even without valid RevenueCat keys
- See [CRASH_FIX_SUMMARY.md](CRASH_FIX_SUMMARY.md) for details

### 2. **Real API Keys Obtained** ✅
- **SDK Key (Public):** `goog_UcCHBgWttuOOhQwaTAIaUWJeiGR` - Added to `.env`
- **Secret Key (Private):** `sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD` - For Supabase secrets

### 3. **Edge Functions Created** ✅
- `revenuecat-webhook` - Handles subscription events from RevenueCat
- `revenuecat-api` - Server-side operations using secret API key

### 4. **iOS Config Removed** ✅
- Cleaned up [app.json](app.json) for Android-only build
- iOS config saved for later deployment

---

## 🚀 Step-by-Step Deployment

### Step 1: Set Supabase Secrets

Run these commands in your terminal:

```bash
cd "d:\MY APPS\sleep app version 2.1\a0-project"

# Set the secret API key (for server-side operations)
npx supabase secrets set REVENUECAT_SECRET_API_KEY=sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD

# Generate and set webhook secret (use any random string)
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_random_string_here_123456789
```

**Verify secrets:**
```bash
npx supabase secrets list
```

You should see:
- ✅ `REVENUECAT_SECRET_API_KEY`
- ✅ `REVENUECAT_WEBHOOK_SECRET`

---

### Step 2: Deploy Edge Functions

**Windows:**
```bash
deploy-edge-functions.bat
```

**Mac/Linux:**
```bash
chmod +x deploy-edge-functions.sh
./deploy-edge-functions.sh
```

**Or manually:**
```bash
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
npx supabase functions deploy revenuecat-api
```

---

### Step 3: Configure RevenueCat Dashboard

#### 3.1 Set Webhook URL

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com/)
2. Select your project
3. Go to **Settings** → **Integrations** → **Webhooks**
4. Click **+ Add Webhook**
5. Enter:
   - **URL:** `https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-webhook`
   - **Authorization Header:** (The `REVENUECAT_WEBHOOK_SECRET` you set)

#### 3.2 Create Products

1. Go to **Products** → **+ New**
2. Create two products:

**Monthly:**
- Product ID: `com.sleeptracker.app.premium.monthly`
- Type: Auto-renewable subscription
- Duration: 1 month

**Yearly:**
- Product ID: `com.sleeptracker.app.premium.yearly`
- Type: Auto-renewable subscription
- Duration: 1 year

#### 3.3 Create Offering

1. Go to **Offerings** → **+ New**
2. Name: `default`
3. Add both products
4. Set as **Current Offering**

#### 3.4 Create Entitlement

1. Go to **Entitlements** → **+ New**
2. Identifier: `premium`
3. Attach both products to this entitlement

---

### Step 4: Set Up Google Play Products

1. Go to [Google Play Console](https://play.google.com/console/)
2. Go to **Monetization** → **Subscriptions**
3. Create the same two products:
   - `com.sleeptracker.app.premium.monthly` - $4.99/month
   - `com.sleeptracker.app.premium.yearly` - $39.99/year

4. Link Google Play to RevenueCat:
   - In Google Play Console: **Setup** → **API access**
   - Create service account → Download JSON
   - In RevenueCat: **Apps** → **Google Play** → Upload JSON

---

### Step 5: Test the App

#### 5.1 Build the App

```bash
# Clear cache
npx expo start --clear

# Or build for release
eas build --platform android --profile production
```

#### 5.2 Test Subscriptions

1. Open app → Settings → Premium
2. You should see:
   - ✅ Monthly subscription option ($4.99)
   - ✅ Yearly subscription option ($39.99)
3. Try purchasing with Google Play test account
4. Verify subscription activates in app

#### 5.3 Check Logs

```bash
# Check edge function logs
npx supabase functions logs revenuecat-webhook --tail
npx supabase functions logs revenuecat-api --tail
```

---

## 🔑 API Keys Reference

### Where Each Key is Used:

| Key Type | Value | Location | Purpose |
|----------|-------|----------|---------|
| **SDK Key (Public)** | `goog_UcCHBgWttuOOhQwaTAIaUWJeiGR` | `.env` file | Initialize RevenueCat in mobile app |
| **Secret Key (Private)** | `sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD` | Supabase Secrets | Server-side API operations |
| **Webhook Secret** | (Your random string) | Supabase Secrets | Verify webhook authenticity |

### Security Best Practices:

✅ **DO:**
- Store SDK key in `.env` (it's client-side safe)
- Store Secret key in Supabase secrets only
- Commit `.env` to git (SDK keys are safe)
- Use secret key only in edge functions

❌ **DON'T:**
- Put secret key in `.env` or mobile app
- Expose secret key publicly
- Use secret key in client-side code
- Share secret key in documentation

---

## 🧪 Testing Checklist

Before releasing to users:

- [ ] SDK key updated in `.env`
- [ ] Secrets set in Supabase
- [ ] Edge functions deployed
- [ ] Webhook URL configured in RevenueCat
- [ ] Products created in RevenueCat dashboard
- [ ] Offering set as current
- [ ] Entitlement created and linked
- [ ] Google Play products created
- [ ] Service account linked
- [ ] Test purchase with test account
- [ ] Subscription activates in app
- [ ] Webhook receives events
- [ ] Database updates correctly

---

## 🔧 Troubleshooting

### App shows "No offerings available"

**Possible causes:**
1. Products not created in RevenueCat
2. Offering not set as "Current"
3. Google Play products not created yet
4. Service account not linked

**Fix:**
- Complete Steps 3 and 4 above
- Wait 10-15 minutes for sync

### Webhook not receiving events

**Check:**
1. Webhook URL correct in RevenueCat
2. Edge function deployed: `npx supabase functions list`
3. Function logs: `npx supabase functions logs revenuecat-webhook`

### Subscription not activating

**Check:**
1. User ID is set in RevenueCat
2. Webhook receiving events
3. Database has `subscriptions` table
4. User profile updates correctly

---

## 📞 Support Resources

- **RevenueCat Docs:** https://docs.revenuecat.com/
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Google Play Billing:** https://developer.android.com/google/play/billing

---

## 📁 Related Files

- [CRASH_FIX_SUMMARY.md](CRASH_FIX_SUMMARY.md) - How the crash was fixed
- [SETUP_REVENUECAT_SECRETS.md](SETUP_REVENUECAT_SECRETS.md) - Detailed secrets guide
- [REVENUECAT_SETUP_QUICK_GUIDE.md](REVENUECAT_SETUP_QUICK_GUIDE.md) - Quick reference
- [IOS_SETUP_GUIDE.md](IOS_SETUP_GUIDE.md) - iOS deployment (for later)
- [supabase/functions/revenuecat-webhook/index.ts](supabase/functions/revenuecat-webhook/index.ts) - Webhook handler
- [supabase/functions/revenuecat-api/index.ts](supabase/functions/revenuecat-api/index.ts) - API operations

---

**Status:** ✅ Ready to Deploy
**Last Updated:** December 15, 2025
