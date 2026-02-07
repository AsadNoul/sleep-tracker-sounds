#!/bin/bash

# Deploy all Supabase Edge Functions
# Usage: ./scripts/deploy-edge-functions.sh

set -e

echo "🚀 Starting Supabase Edge Functions Deployment..."
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run: supabase login"
    exit 1
fi

echo "✅ Authentication successful"
echo ""

# Navigate to supabase directory
cd "$(dirname "$0")/.." || exit

# Deploy edge functions
echo "📦 Deploying Edge Functions..."
echo ""

echo "1️⃣ Deploying delete-user-account..."
supabase functions deploy delete-user-account --project-ref wdcgvzeolhpfkuozickj || {
    echo "❌ Failed to deploy delete-user-account"
    exit 1
}
echo "✅ delete-user-account deployed"
echo ""

echo "2️⃣ Deploying revenuecat-webhook..."
supabase functions deploy revenuecat-webhook --project-ref wdcgvzeolhpfkuozickj || {
    echo "❌ Failed to deploy revenuecat-webhook"
    exit 1
}
echo "✅ revenuecat-webhook deployed"
echo ""

echo "3️⃣ Deploying revenuecat-api..."
supabase functions deploy revenuecat-api --project-ref wdcgvzeolhpfkuozickj || {
    echo "❌ Failed to deploy revenuecat-api"
    exit 1
}
echo "✅ revenuecat-api deployed"
echo ""

echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "  1. Test the functions in Supabase Dashboard"
echo "  2. Check function logs for any errors"
echo "  3. Test account deletion in the app"
echo ""
echo "View logs: supabase functions logs <function-name>"
