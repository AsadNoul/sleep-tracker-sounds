# Release Notes - Version 48

**Build Date:** February 13, 2026  
**Version Code:** 48  
**Build Type:** Production Release

## 🎉 What's New

### Enhanced User Engagement
- **Push Notification Prompts**: New intelligent notification permission system
  - Beautiful animated prompt appears after onboarding completion
  - Helpful banner in Settings for users who haven't enabled notifications
  - Clear benefits explanation to encourage opt-in
  - 7-day cooldown period if declined

- **App Rating System**: Encourage users to share their feedback
  - Rating prompt appears after completing 3+ sleep sessions
  - Direct link to Play Store for easy rating
  - Persistent reminders until user rates the app
  - Beautiful star rating interface

### Sleep Recordings Feature
- **Recordings Now in Insights**: Sleep recordings are now easily accessible
  - View all your sleep recordings directly in the Sleep Analysis screen
  - Play/pause audio recordings with one tap
  - Visual progress bars showing playback status
  - Event type labels (snoring, sleep talk, noise, dreaming)
  - No more hunting in Settings to find your recordings

### UI/UX Improvements
- **Sleep Session Screen**: Improved back button placement
  - Back button moved lower for better reachability
  - More comfortable one-handed operation

- **Control Center Update**: Quick access to Caffeine Calculator
  - "Log Sleep" button replaced with "Caffeine Calculator"
  - Faster access to track caffeine intake
  - New coffee-themed brown gradient design

## 🔧 Technical Improvements

### Performance & Architecture
- **React Native New Architecture**: Enabled new architecture for better performance
  - Required for latest Reanimated library
  - Improved animation performance
  - Better app responsiveness

### Analytics Enhancement
- **Mixpanel Integration**: Pure JavaScript HTTP API implementation
  - Country tracking for better insights
  - Expo Go compatible
  - No native dependencies required

## 🐛 Bug Fixes
- **Admin Dashboard**: Fixed data loading error for new users metric
  - Resolved "Property 'newUsersToday' doesn't exist" error
  - Improved statistics accuracy

## 📦 Build Information
- **Platform:** Android
- **Build Profile:** Production
- **Archive Size:** 183 MB
- **Build System:** EAS Build
- **Gradle Version:** 8.14.3
- **Target SDK:** 36

## 🔗 Links
- **Play Store:** https://play.google.com/store/apps/details?id=com.sleeptracker.app
- **Build Artifact:** https://expo.dev/artifacts/eas/cYiWwnUAP79KPDCojaR58e.aab

## 📝 Deployment Notes
This release includes all features from the previous development cycle:
- Enhanced user onboarding experience
- Improved notification engagement strategy
- Better feature discoverability
- Performance optimizations

---

## For Play Store Release Description

**What's New in This Version:**

✨ New Features:
• Sleep recordings now easily accessible in Insights with audio playback
• Smart notification permission prompts for better engagement
• In-app rating system to share your feedback
• Quick access to Caffeine Calculator from home screen

🎨 Improvements:
• Better button placement on sleep session screen
• Enhanced user interface animations
• Improved app performance

🐛 Bug Fixes:
• Fixed admin dashboard metrics
• Various stability improvements

Thank you for using our app! Your sleep journey matters to us. Please rate us on the Play Store if you're enjoying the app! 💙

---

## Internal Testing Checklist

Before full production rollout, verify:
- [ ] Push notification prompts appear correctly after onboarding
- [ ] Rating prompt shows after 3+ sleep sessions
- [ ] Sleep recordings play correctly in analysis screen
- [ ] Caffeine Calculator opens from home screen control center
- [ ] Back button positioning comfortable on sleep session screen
- [ ] Settings banner appears for users without push permissions
- [ ] Play Store link opens correctly from rating prompt
- [ ] All animations smooth and responsive
- [ ] No crashes on startup or during normal operation
- [ ] Country tracking working in analytics

## Rollout Strategy

**Recommended Approach:**
1. Deploy to Internal Testing track first (10-20 testers, 24-48 hours)
2. Promote to Closed Beta (100-500 users, 3-5 days)
3. Open Beta (if desired, 1-2 weeks)
4. Production rollout (staged at 10%, 25%, 50%, 100%)

**Monitor:**
- Crash rates
- Push notification opt-in rates
- Rating prompt completion rates
- Audio playback issues
- Performance metrics
