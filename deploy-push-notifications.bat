@echo off
echo ========================================
echo Push Notifications Deployment Script
echo ========================================
echo.

echo Step 1: Deploying Edge Function...
echo.
npx supabase functions deploy send-push-notification
echo.

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Edge Function deployment failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run the database migration in Supabase SQL Editor
echo    File: supabase_migrations/add_push_token.sql
echo.
echo 2. Download and install production build v10 when ready
echo    URL: https://expo.dev/accounts/assdalinaul/projects/sleep-tracker-app/builds/20b05954-5255-4db1-8137-1eaa71a7f50c
echo.
echo 3. Test push notifications with curl:
echo    curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/send-push-notification \
echo      -H "Authorization: Bearer YOUR_ANON_KEY" \
echo      -H "Content-Type: application/json" \
echo      -d "{\"title\":\"Test\",\"body\":\"Hello from Edge Function!\"}"
echo.
echo See PUSH_NOTIFICATIONS_SETUP.md for full documentation
echo.
pause
