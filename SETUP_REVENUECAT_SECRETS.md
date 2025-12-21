# Set Up RevenueCat Secrets in Supabase

## 🔐 Understanding the Two Keys

You have **two different RevenueCat keys** with different purposes:

### 1. **SDK API Key (Public)** - `goog_UcCHBgWttuOOhQwaTAIaUWJeiGR`
- ✅ **Used in:** Mobile app (`.env` file)
- ✅ **Purpose:** Initialize RevenueCat SDK in your React Native app
- ✅ **Security:** Can be public - it's in the app bundle anyway
- ✅ **Already configured** in `.env` file

### 2. **Secret API Key (Private)** - `sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD`
- 🔒 **Used in:** Supabase Edge Functions (server-side only)
- 🔒 **Purpose:** Make RevenueCat REST API calls from backend
- 🔒 **Security:** MUST be kept secret - never in `.env` or client code
- 🔒 **Needs to be set** as Supabase secret

---

## 📋 Step-by-Step: Set Supabase Secrets

### Method 1: Using Supabase CLI (Recommended)

Run these commands in your terminal:

```bash
# Navigate to project folder
cd "d:\MY APPS\sleep app version 2.1\a0-project"

# Set the RevenueCat secret API key
npx supabase secrets set REVENUECAT_SECRET_API_KEY=sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD

# Optional: Set webhook secret (generate a random string for this)
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_random_webhook_secret_here
```

### Method 2: Using Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **Sleep Tracker**
3. Go to **Settings** → **Edge Functions** → **Secrets**
4. Click **Add New Secret**
5. Add these secrets:

| Secret Name | Secret Value |
|------------|--------------|
| `REVENUECAT_SECRET_API_KEY` | `sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD` |
| `REVENUECAT_WEBHOOK_SECRET` | (generate random string) |

---

## 🔄 Verify Secrets Are Set

```bash
# List all secrets (values will be hidden)
npx supabase secrets list
```

You should see:
```
REVENUECAT_SECRET_API_KEY
REVENUECAT_WEBHOOK_SECRET
SUPABASE_SERVICE_ROLE_KEY (already exists)
SUPABASE_URL (already exists)
```

---

## 🚀 Deploy Edge Functions

After setting secrets, redeploy your edge functions:

```bash
# Deploy the webhook function
npx supabase functions deploy revenuecat-webhook

# Deploy any other function that needs the secret key
npx supabase functions deploy revenuecat-api
```

---

## 🧪 Test the Setup

1. **Test mobile app** (uses SDK key):
   ```bash
   npx expo start --clear
   ```
   - Open app → Settings → Premium
   - You should see subscription offerings

2. **Test edge function** (uses secret key):
   ```bash
   curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-api \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action": "get_subscriber", "user_id": "test_user"}'
   ```

---

## 📝 Important Notes

### ✅ DO:
- ✅ Store SDK key (`goog_...`) in `.env` file
- ✅ Store Secret key (`sk_...`) in Supabase secrets
- ✅ Commit `.env` to git (SDK keys are safe to commit)
- ✅ Use secret key only in edge functions

### ❌ DON'T:
- ❌ Put secret key in `.env` file
- ❌ Use secret key in mobile app code
- ❌ Share secret key publicly
- ❌ Commit secret key to git

---

## 🔧 When to Use Each Key

| Task | Use This Key |
|------|-------------|
| Initialize SDK in app | SDK Key (`goog_...`) |
| Purchase subscription | SDK Key (automatic) |
| Restore purchases | SDK Key (automatic) |
| Get subscriber info from backend | Secret Key (`sk_...`) |
| Refund a purchase | Secret Key (`sk_...`) |
| Grant promotional access | Secret Key (`sk_...`) |
| Validate webhook | Webhook Secret |

---

## 📞 Need Help?

If secrets aren't working:
1. Check secret names match exactly (case-sensitive)
2. Redeploy edge functions after setting secrets
3. Check function logs: `npx supabase functions logs revenuecat-webhook`

---

**Last Updated:** December 15, 2025
