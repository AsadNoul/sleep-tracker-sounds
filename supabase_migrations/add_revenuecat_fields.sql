-- Add RevenueCat fields to subscriptions table
-- This allows us to track RevenueCat subscriptions alongside Stripe ones

-- Add revenuecat_customer_id and product_id columns if they don't exist
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS revenuecat_customer_id TEXT,
ADD COLUMN IF NOT EXISTS product_id TEXT;

-- Update user_profiles table to support both Stripe and RevenueCat
-- (These columns should already exist, but this ensures they're there)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_customer
ON subscriptions(revenuecat_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id
ON subscriptions(user_id);

-- Add unique constraint on user_id to prevent duplicate subscriptions per user
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_user_id_key;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
