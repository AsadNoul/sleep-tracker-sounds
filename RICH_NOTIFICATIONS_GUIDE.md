# Rich Notifications with Images

## Current Limitation ⚠️

**Expo Push Notifications** don't support images in the notification itself. Here's why:

- Expo uses its own push service (not native FCM/APNs)
- Images require platform-specific notification extensions
- Only works in **production builds**, not Expo Go

## Solutions

### ✅ Option 1: Show Image After Tap (Easiest)

Send image URL in notification data, show modal when user taps:

```bash
curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Feature!",
    "body": "Tap to see amazing update",
    "data": {
      "imageUrl": "https://images.unsplash.com/photo-1618172193763-c511deb635ca?w=800",
      "screen": "Home"
    }
  }'
```

Then in your app, listen for notification taps and show the image.

---

### 🔥 Option 2: Use Firebase (Production Builds Only)

**Step 1:** Install Firebase packages:
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

**Step 2:** Update app.json:
```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

**Step 3:** Send FCM notification with image:
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_FCM_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_TOKEN",
    "notification": {
      "title": "New Update",
      "body": "Check this out!",
      "image": "https://your-image-url.com/banner.jpg"
    }
  }'
```

This will show the image on Android lock screen in production builds.

---

### 💡 Option 3: In-App Banner (Recommended)

Instead of notification images, show beautiful in-app banners:

```typescript
// In HomeScreen.tsx
const [showBanner, setShowBanner] = useState(false);
const [bannerImage, setBannerImage] = useState('');

useEffect(() => {
  // Listen for notification events
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    const imageUrl = notification.request.content.data?.imageUrl;
    if (imageUrl) {
      setBannerImage(imageUrl);
      setShowBanner(true);
    }
  });

  return () => subscription.remove();
}, []);

// Show banner modal
{showBanner && (
  <Modal visible={showBanner} animationType="slide">
    <Image source={{ uri: bannerImage }} style={{ width: '100%', height: 400 }} />
    <TouchableOpacity onPress={() => setShowBanner(false)}>
      <Text>Close</Text>
    </TouchableOpacity>
  </Modal>
)}
```

---

## Comparison

| Method | Image in Notification | Complexity | Works in Expo Go |
|--------|----------------------|------------|------------------|
| Option 1 (Show after tap) | ❌ No | ⭐ Easy | ✅ Yes |
| Option 2 (Firebase FCM) | ✅ Yes (Android only) | ⭐⭐⭐ Hard | ❌ No |
| Option 3 (In-app banner) | ❌ No | ⭐⭐ Medium | ✅ Yes |

---

## Recommended Approach 🎯

For your sleep app, I recommend **Option 3** (In-app banners) because:
- Works immediately in Expo Go
- Better UX than system notifications
- Full control over image display
- Can track user engagement
- Looks more professional

**Current notification with data:**
```bash
curl -X POST https://wdcgvzeolhpfkuozickj.supabase.co/functions/v1/send-push-notification \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkY2d2emVvbGhwZmt1b3ppY2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDU1MjUsImV4cCI6MjA2OTUyMTUyNX0.ajRMS_q7hoFQgnjXeKMEZoTFYm_jHsKW-xUxXUNBdWk" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🌙 New Meditation Available",
    "body": "Tap to explore Ocean Dreams",
    "data": {
      "type": "new_content",
      "imageUrl": "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800",
      "screen": "Mindfulness"
    }
  }'
```

Then handle it in your app to show beautiful modal with the image!

---

## Alternative: Rich Notifications (Production Only)

If you MUST have images in notifications:

1. **Build production APK:**
   ```bash
   eas build --platform android --profile production
   ```

2. **Use FCM directly** (not Expo push service)

3. **Android will show images** on lock screen

4. **iOS requires Notification Service Extension** (complex)

---

## Bottom Line

**For fastest results:** Use current Expo push notifications + show image modal when user opens app

**For maximum quality:** Migrate to Firebase Cloud Messaging + production builds

Current setup works great for engagement! 🚀
