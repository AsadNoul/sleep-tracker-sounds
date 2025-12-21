#!/bin/bash

# Deploy RevenueCat Edge Functions to Supabase
# Run this after setting up secrets

echo "🚀 Deploying RevenueCat Edge Functions..."
echo ""

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null
then
    echo "⚠️  Supabase CLI not found globally. Using npx..."
    SUPABASE_CMD="npx supabase"
else
    SUPABASE_CMD="supabase"
fi

# Check if secrets are set
echo "📋 Checking secrets..."
$SUPABASE_CMD secrets list

echo ""
echo "🔧 Deploying revenuecat-webhook function..."
$SUPABASE_CMD functions deploy revenuecat-webhook --no-verify-jwt

echo ""
echo "🔧 Deploying revenuecat-api function..."
$SUPABASE_CMD functions deploy revenuecat-api

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Test the webhook endpoint"
echo "2. Configure webhook URL in RevenueCat dashboard"
echo "3. Test subscription flow in the app"
echo ""
echo "🔗 Webhook URL:"
echo "https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-webhook"
echo ""
echo "🔗 API URL:"
echo "https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-api"
