# 🔍 GET EXACT CRASH LOGS FROM ANDROID STUDIO

## You're Testing: Play Store Build (Before Fixes)

The app crashing is the **OLD version** that doesn't have our fixes yet. Let's get the exact crash logs!

---

## ✅ FASTEST WAY: Get Logs from Android Studio

### Step 1: Open Android Studio
1. Launch Android Studio
2. Connect your Android device via USB
3. Make sure USB Debugging is enabled on phone

### Step 2: Open Logcat
1. In Android Studio → Bottom toolbar
2. Click **"Logcat"** tab
3. Should show your device name

### Step 3: Filter for Your App
In Logcat window:
1. In the search/filter box, type: **sleep** (or your app package name)
2. Or select your app from dropdown: **com.sleeptracker.app**

### Step 4: Reproduce the Crash
1. Clear Logcat: Click 🗑️ (trash icon) to clear old logs
2. Open the app on your phone
3. Watch it crash
4. **Logcat will show EXACT error!**

### Step 5: Look for Red Lines
In Logcat, look for:
- **Red lines** = Errors/Crashes
- Lines containing: **"FATAL"**, **"AndroidRuntime"**, **"crash"**

---

## 📋 ALTERNATIVE: Command Line (If Android Studio Doesn't Work)

### Method 1: Using ADB directly

```bash
# Connect device via USB
# Enable USB Debugging on phone

# Check device is connected
adb devices

# Get crash logs (run this, then open app to crash)
adb logcat -c && adb logcat | grep -E "(FATAL|AndroidRuntime|crash|Error)"
```

### Method 2: Save logs to file

```bash
# Clear old logs
adb logcat -c

# Start logging to file
adb logcat > crash_log.txt

# Now open app on phone (let it crash)
# Wait 10 seconds
# Press Ctrl+C to stop logging

# Check the file
cat crash_log.txt | grep -E "FATAL" -A 50
```

---

## 🎯 WHAT TO LOOK FOR

Once you have the logs, search for these patterns:

### Pattern 1: FATAL EXCEPTION
```
FATAL EXCEPTION: main
Process: com.sleeptracker.app, PID: 12345
java.lang.RuntimeException: Unable to create application...
```

### Pattern 2: Native Crash
```
A/libc: Fatal signal 11 (SIGSEGV), code 1
```

### Pattern 3: JavaScript Error
```
ERROR: Invariant Violation: ...
ERROR: Cannot read property 'x' of undefined
```

### Pattern 4: RevenueCat Error
```
PurchasesError: There is no singleton instance
```

---

## 📤 SHARE THE LOGS

Once you get the crash logs, share:

1. **The FATAL EXCEPTION section** (usually 20-50 lines)
2. **Stack trace** (shows which file/line caused crash)
3. **Any RED errors** right before crash

Example of what to share:
```
12-16 19:30:45.123  1234  1234 E AndroidRuntime: FATAL EXCEPTION: main
12-16 19:30:45.123  1234  1234 E AndroidRuntime: Process: com.sleeptracker.app, PID: 1234
12-16 19:30:45.123  1234  1234 E AndroidRuntime: java.lang.RuntimeException: Unable to start activity
12-16 19:30:45.123  1234  1234 E AndroidRuntime:     at android.app.ActivityThread.performLaunchActivity
12-16 19:30:45.123  1234  1234 E AndroidRuntime: Caused by: java.lang.NullPointerException
12-16 19:30:45.123  1234  1234 E AndroidRuntime:     at com.sleeptracker.app.MainActivity.onCreate
```

---

## 🚀 AFTER YOU GET LOGS

Once we see the exact error:

1. **I'll fix the specific issue**
2. **Build new version**
3. **Upload to Play Store**
4. **Problem solved!**

---

## ⚡ QUICK COMMANDS REFERENCE

```bash
# Check device connected
adb devices

# Clear logs and watch for crashes
adb logcat -c && adb logcat *:E

# Save to file
adb logcat -c && adb logcat > crash.txt

# Filter for your app only
adb logcat | grep "com.sleeptracker.app"

# Show only fatal crashes
adb logcat | grep "FATAL" -A 30
```

---

## 💡 IMPORTANT NOTES

1. **The Play Store version is OLD** - doesn't have our fixes yet
2. **After we see logs** - we'll know exact issue
3. **We'll build new version** - with proper fix
4. **Upload to Play Store** - problem solved

The logs will tell us EXACTLY what's crashing (RevenueCat? Theme? Some other module?)

---

**Ready?** Open Android Studio Logcat and share the red error lines!
