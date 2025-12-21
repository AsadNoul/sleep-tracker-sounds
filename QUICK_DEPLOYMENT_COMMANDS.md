# Quick Deployment Commands

## 🚀 Deploy Everything in 5 Minutes

### Step 1: Set Secrets (One-time setup)
```bash
cd "d:\MY APPS\sleep app version 2.1\a0-project"

npx supabase secrets set REVENUECAT_SECRET_API_KEY=sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD
npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_random_string_12345
```

### Step 2: Deploy Edge Functions
```bash
npx supabase functions deploy revenuecat-webhook --no-verify-jwt
npx supabase functions deploy revenuecat-api
```

### Step 3: Build & Test App
```bash
npx expo start --clear
```

---

## 📋 Verify Everything Works

```bash
# Check secrets are set
npx supabase secrets list

# Check functions are deployed
npx supabase functions list

# Watch function logs
npx supabase functions logs revenuecat-webhook --tail
```

---

## 🔗 Important URLs

**Webhook URL for RevenueCat:**
```
https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-webhook
```

**API URL (for client calls):**
```
https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-api
```

---

## 🔑 Your API Keys

**In `.env` (Mobile App):**
```env
REVENUECAT_ANDROID_API_KEY=goog_UcCHBgWttuOOhQwaTAIaUWJeiGR
```

**In Supabase Secrets (Server):**
```
REVENUECAT_SECRET_API_KEY=sk_IqhURRoNZdyDsTSZMzzBIVaAIyMdD
```

---

## ⚡ Common Commands

```bash
# Rebuild app
npx expo start --clear

# Build for Android release
eas build --platform android --profile production

# View function logs
npx supabase functions logs revenuecat-webhook
npx supabase functions logs revenuecat-api

# Update secrets
npx supabase secrets set KEY_NAME=value

# Redeploy functions
npx supabase functions deploy function-name
```

---

## ✅ Current Status

- ✅ **App crash fixed** - Validation added
- ✅ **SDK key configured** - In `.env` file
- ✅ **Secret key ready** - For Supabase secrets
- ✅ **Edge functions created** - Ready to deploy
- ✅ **iOS config removed** - Safe for Play Store
- ⏳ **Secrets need to be set** - Run Step 1 above
- ⏳ **Functions need deployment** - Run Step 2 above

---

**See [REVENUECAT_COMPLETE_SETUP.md](REVENUECAT_COMPLETE_SETUP.md) for full details**
