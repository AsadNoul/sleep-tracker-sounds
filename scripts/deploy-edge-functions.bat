@echo off
REM Deploy all Supabase Edge Functions (Windows)
REM Usage: scripts\deploy-edge-functions.bat

echo 🚀 Starting Supabase Edge Functions Deployment...
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Supabase CLI not found. Installing...
    call npm install -g supabase
)

REM Check if logged in
echo 🔐 Checking Supabase authentication...
call supabase projects list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Not logged in to Supabase. Please run: supabase login
    exit /b 1
)

echo ✅ Authentication successful
echo.

REM Navigate to project root
cd /d "%~dp0\.."

REM Deploy edge functions
echo 📦 Deploying Edge Functions...
echo.

echo 1️⃣ Deploying delete-user-account...
call supabase functions deploy delete-user-account --project-ref wdcgvzeolhpfkuozickj
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy delete-user-account
    exit /b 1
)
echo ✅ delete-user-account deployed
echo.

echo 2️⃣ Deploying revenuecat-webhook...
call supabase functions deploy revenuecat-webhook --project-ref wdcgvzeolhpfkuozickj
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy revenuecat-webhook
    exit /b 1
)
echo ✅ revenuecat-webhook deployed
echo.

echo 3️⃣ Deploying revenuecat-api...
call supabase functions deploy revenuecat-api --project-ref wdcgvzeolhpfkuozickj
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy revenuecat-api
    exit /b 1
)
echo ✅ revenuecat-api deployed
echo.

echo 🎉 All Edge Functions deployed successfully!
echo.
echo 📋 Next steps:
echo   1. Test the functions in Supabase Dashboard
echo   2. Check function logs for any errors
echo   3. Test account deletion in the app
echo.
echo View logs: supabase functions logs ^<function-name^>

pause
