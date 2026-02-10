# OTA Update System Guide

This guide explains how the Over-The-Air (OTA) update system works in Sleep Architect and how to publish updates to users.

## Overview

The OTA update system automatically checks for updates when users launch the app and displays a beautiful, engaging modal that **forces** users to download critical updates. The system uses Expo Updates (EAS Updates) for seamless app updates without requiring users to go through the App Store or Play Store.

## Features

✨ **Beautiful Update Modal**
- Stunning gradient design with app logo
- Smooth animations and pulsing effects
- Sparkle decorations for visual appeal
- Progress indicators during download

🔒 **Forced Updates**
- Users cannot dismiss the modal without updating
- Critical/emergency updates are clearly marked
- Download button is the only action available

📊 **Smart Update Detection**
- Automatic check on app startup
- Skips in development mode
- Handles update failures gracefully

## How It Works

### 1. Update Check Flow

```
App Launch → UpdateChecker → Check for Updates → Show Modal (if available) → Download → Apply → Reload
```

### 2. Components

#### `services/updateService.ts`
- Core service for checking and downloading updates
- Handles version comparison
- Manages update download and application

#### `components/UpdateModal.tsx`
- Beautiful UI modal with animations
- Shows update features and benefits
- Handles user interaction and download progress

#### `components/UpdateChecker.tsx`
- Wrapper component that integrates with App.tsx
- Triggers update check on app start
- Shows/hides the UpdateModal

## Publishing Updates

### Step 1: Make Your Changes

Make your code changes, bug fixes, or feature additions to the app.

### Step 2: Update Version (Optional)

Update the version in `app.json`:

```json
{
  "expo": {
    "version": "2.1.1"
  }
}
```

### Step 3: Publish the OTA Update

Run the following command to publish an update:

```bash
# For production
eas update --branch production --message "Bug fixes and performance improvements"

# For preview/staging
eas update --branch preview --message "Testing new features"
```

### Step 4: Add Emergency Flag (Optional)

To mark an update as critical/emergency, add metadata when publishing:

```bash
eas update --branch production --message "Critical security fix" --json '{"emergency": true}'
```

**Note:** The emergency flag will show a red badge and more urgent messaging in the update modal.

## Configuration

### Runtime Version

The app uses runtime version policy set in `app.json`:

```json
{
  "ios": {
    "runtimeVersion": {
      "policy": "appVersion"
    }
  },
  "android": {
    "runtimeVersion": "1.0.0"
  }
}
```

### Update Channel

Updates are published to channels (branches):
- `production` - Live users
- `preview` - Testing/staging
- `development` - Development builds

## Testing Updates

### Test in Development

The update checker is **disabled in development mode** (`__DEV__ === true`). To test updates:

1. Create a preview build:
   ```bash
   eas build --profile preview --platform android
   ```

2. Install the preview build on your device

3. Publish an update to the preview channel:
   ```bash
   eas update --branch preview --message "Test update"
   ```

4. Launch the app - you should see the update modal

### Test Emergency Updates

To test the emergency update UI:

1. Publish with emergency metadata:
   ```bash
   eas update --branch preview --message "Emergency test" --json '{"emergency": true}'
   ```

2. Launch the preview build
3. The modal should show with red badge and urgent messaging

## Update Modal Features

The update modal displays:

- ✨ App logo with pulsing animation
- 📱 Version number
- 🎯 Feature highlights:
  - Enhanced performance and stability
  - New features and improvements
  - Bug fixes and optimizations
- 📥 Download button (forced action)
- ⚡ Emergency badge (for critical updates)
- 🔄 Real-time download progress

## Best Practices

### When to Use OTA Updates

✅ **Use OTA for:**
- Bug fixes
- UI/UX improvements
- Content updates
- Performance optimizations
- Non-native code changes

❌ **Don't use OTA for:**
- Native code changes (requires new build)
- New permissions
- Changes to `app.json` configuration
- Major version updates

### Update Frequency

- **Critical Bugs:** Publish immediately with emergency flag
- **Minor Fixes:** Batch into weekly updates
- **Features:** Monthly or with version releases

### Version Numbering

Follow semantic versioning:
- `2.1.0` → `2.1.1` (patch - bug fixes)
- `2.1.0` → `2.2.0` (minor - new features)
- `2.1.0` → `3.0.0` (major - breaking changes)

## Troubleshooting

### Updates Not Showing

1. Check runtime version compatibility
2. Verify you're on the correct channel/branch
3. Ensure the app is not in development mode
4. Check EAS Update logs: `eas update:list --branch production`

### Update Download Fails

1. Check user's internet connection
2. Verify EAS Update service status
3. Check error logs in console
4. Ensure update size is reasonable (<10MB recommended)

### Users Stuck on Old Version

1. Verify the update was published: `eas update:list`
2. Check if users are on compatible runtime version
3. Consider publishing a new build with the changes

## Monitoring

View update analytics:

```bash
# List all updates
eas update:list --branch production

# View specific update
eas update:view <update-id>

# Check rollout status
eas update:rollout --branch production
```

## Emergency Rollback

If an update causes issues, rollback to previous version:

```bash
# Republish the last good update
eas update:republish --group <previous-update-group-id> --branch production
```

## Additional Resources

- [Expo Updates Documentation](https://docs.expo.dev/eas-update/introduction/)
- [EAS Update Best Practices](https://docs.expo.dev/eas-update/best-practices/)
- [Runtime Versions](https://docs.expo.dev/eas-update/runtime-versions/)

---

**Last Updated:** February 2026
**System Version:** 2.1.0
