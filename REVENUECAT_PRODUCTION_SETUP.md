# 🔧 RevenueCat Production Setup Guide

## ❌ Current Issue:
RevenueCat shows "No products available" in production even though products were configured for testing.

## 🎯 Root Cause:
Products need to be **ACTIVATED** in Google Play Console and properly linked in RevenueCat for production.

---

## ✅ COMPLETE SETUP STEPS

### Step 1: Google Play Console - Activate Products

1. Go to: https://play.google.com/console
2. Select **Sleep Tracker** app
3. Click **Monetize** → **Products** → **In-app products**

You should see your subscription products. They're probably in **"Draft"** status.

#### For EACH Product (Monthly & Yearly):

1. Click on the product
2. Review all details:
   - Product ID (e.g., `premium_monthly`, `premium_yearly`)
   - Name
   - Description
   - Price
3. **Click "Activate"** button
4. Status should change from "Draft" to "Active"

**⚠️ IMPORTANT:**
- Products must be **Active**, not Draft
- If you recently created them, wait 24-48 hours for Google Play to process
- You may need to republish your app for products to work

---

### Step 2: RevenueCat Dashboard - Verify Products

1. Go to: https://app.revenuecat.com
2. Select your project: **Sleep Tracker**
3. Click **Products** tab

#### Check Product Configuration:

You should see your products listed with these details:

**Monthly Subscription:**
- Store: Google Play
- Product ID: (must match Google Play exactly - e.g., `premium_monthly`)
- Status: Active

**Yearly Subscription:**
- Store: Google Play
- Product ID: (must match Google Play exactly - e.g., `premium_yearly`)
- Status: Active

#### If Products Are Missing:

1. Click **Add Product**
2. Select **Google Play**
3. Enter the **exact Product ID** from Google Play Console
4. Save

---

### Step 3: Create "premium" Entitlement

Your app code looks for an entitlement named **"premium"** (see `revenueCatService.ts` line 205).

#### Create Entitlement:

1. In RevenueCat Dashboard
2. Click **Entitlements** tab
3. Click **New Entitlement**
4. Enter identifier: **`premium`** (must be exactly this - lowercase)
5. Enter display name: "Premium Access"
6. Click **Save**

#### Attach Products to Entitlement:

1. Click on your new **premium** entitlement
2. Click **Attach Products**
3. Select **both** your monthly and yearly products
4. Click **Save**

Now your entitlement should show:
- premium ✅
  - premium_monthly
  - premium_yearly

---

### Step 4: Verify Offering Configuration

1. In RevenueCat Dashboard
2. Click **Offerings** tab
3. You should have a **default** offering

#### If No Offering Exists:

1. Click **New Offering**
2. Identifier: `default`
3. Display Name: "Premium Plans"
4. Click **Save**

#### Add Packages to Offering:

1. Click on **default** offering
2. Click **Add Package**

**For Monthly:**
- Identifier: `monthly` (your code looks for this keyword)
- Product: Select your monthly product
- Click **Save**

**For Yearly:**
- Identifier: `annual` (your code looks for "annual", "yearly", or "year")
- Product: Select your yearly product
- Click **Save**

---

### Step 5: Verify Product IDs Match Code Requirements

Your code (`SubscriptionScreen.tsx` lines 117-124) looks for product identifiers containing:
- **"monthly"** or **"month"** → for monthly plan
- **"annual"**, **"yearly"**, or **"year"** → for yearly plan

#### Check Your Product IDs:

In Google Play Console, your product IDs should be named like:
- `premium_monthly` ✅
- `sleep_tracker_monthly` ✅
- `com.sleeptracker.monthly` ✅

OR for yearly:
- `premium_yearly` ✅
- `premium_annual` ✅
- `sleep_tracker_year` ✅

**❌ BAD Examples:**
- `product_1` (doesn't contain "monthly" or "yearly")
- `sub_premium` (doesn't indicate duration)

---

### Step 6: Test in Production

After completing steps 1-5:

1. **Wait 1-2 hours** for changes to propagate
2. **Reinstall the app** from Play Store
3. Open **Subscription Screen**
4. You should now see your products!

---

## 🔍 TROUBLESHOOTING

### Products Still Not Showing?

#### Check 1: Console Logs

When you open subscription screen, check logs:
```
📦 Loading RevenueCat offerings...
✅ Loaded packages: [monthly, annual]
```

If you see:
```
⚠️ No offerings available
```

Then products aren't configured correctly.

#### Check 2: RevenueCat API Key

Verify in `.env` file:
```
REVENUECAT_ANDROID_API_KEY=goog_UcCHBgWttuOOhQwaTAIaUWJeiGR
```

This should start with `goog_` for Android.

Also check `eas.json` has this in the production build env vars.

#### Check 3: Google Play Product Status

1. Go to Google Play Console
2. Monetize → In-app products
3. **Both products must show "Active"**
4. If "Inactive" → Activate them
5. If "Draft" → Complete setup and activate

#### Check 4: RevenueCat Entitlement

1. RevenueCat Dashboard → Entitlements
2. Must have entitlement named: **`premium`** (lowercase, exactly)
3. Must have both products attached

#### Check 5: App Version

Make sure you're testing with:
- **Latest version from Play Store** (not an old APK)
- **Production build** (not development/preview)

---

## 📊 VERIFICATION CHECKLIST

Before expecting products to show:

- [ ] Google Play products are **ACTIVE** (not draft)
- [ ] Product IDs contain "monthly" or "yearly" keywords
- [ ] RevenueCat products are added with exact Product IDs
- [ ] RevenueCat entitlement "premium" exists
- [ ] Both products attached to "premium" entitlement
- [ ] Offering "default" exists with both packages
- [ ] Waited 1-2 hours for changes to propagate
- [ ] Tested with fresh install from Play Store

---

## 🎯 EXPECTED RESULT

After proper configuration:

1. User opens Subscription screen
2. Screen loads for 1-2 seconds
3. Shows two plan options:
   - **Monthly** - with price from Google Play
   - **Yearly** - with price from Google Play (with savings badge)
4. User can select and purchase

---

## 🚨 COMMON MISTAKES

1. **Product IDs don't match** between Google Play and RevenueCat
2. **Products are in Draft** status instead of Active
3. **Entitlement name is wrong** (must be exactly "premium")
4. **Testing with old APK** instead of Play Store version
5. **Not waiting** for Google Play to process changes (takes 24-48 hours)

---

## 📞 STILL NOT WORKING?

If products still don't show after following all steps:

1. **Check RevenueCat Dashboard → Customers**
   - Search for your test user email
   - See if any transactions are recorded

2. **Enable RevenueCat Debug Logs**
   - In `revenueCatService.ts`, `LOG_LEVEL.DEBUG` is already enabled
   - Check console logs for errors

3. **Contact RevenueCat Support**
   - Dashboard → Support
   - Provide: Product IDs, Entitlement name, App package name
   - They can check if products are synced

---

## 💡 WHY THIS HAPPENS

### Test vs Production:

**During Testing:**
- Used test products in Google Play
- RevenueCat Sandbox mode
- Everything worked ✅

**In Production:**
- Need real products (Active status)
- RevenueCat production mode
- Products must be published ❌ (yours probably aren't activated yet)

### The Fix:

Simply **activate your products in Google Play Console** and wait for propagation.

---

**Bottom Line:** Your products are probably in "Draft" status. Activate them in Google Play Console, configure RevenueCat entitlements properly, and wait 1-2 hours. Then they'll show up!
