@echo off
REM Deploy RevenueCat Edge Functions to Supabase (Windows)
REM Run this after setting up secrets

echo 🚀 Deploying RevenueCat Edge Functions...
echo.

echo 📋 Checking secrets...
call npx supabase secrets list

echo.
echo 🔧 Deploying revenuecat-webhook function...
call npx supabase functions deploy revenuecat-webhook --no-verify-jwt

echo.
echo 🔧 Deploying revenuecat-api function...
call npx supabase functions deploy revenuecat-api

echo.
echo ✅ Deployment complete!
echo.
echo 📝 Next steps:
echo 1. Test the webhook endpoint
echo 2. Configure webhook URL in RevenueCat dashboard
echo 3. Test subscription flow in the app
echo.
echo 🔗 Webhook URL:
echo https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-webhook
echo.
echo 🔗 API URL:
echo https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/revenuecat-api

pause
