# 🎨 Poppins Font - App-Wide Integration Guide

## ✅ COMPLETED
- [x] Fonts installed in `assets/fonts/`
- [x] Font loading in `App.tsx`
- [x] Theme configuration in `constants/theme.ts`
- [x] **SleepAnalysisScreen** - Fully implemented ✅
- [x] Created `ThemedText` component
- [x] Created font utility helpers

---

## 🚀 THREE METHODS TO ADD POPPINS

### **Method 1: ThemedText Component** (Recommended for new code)
```tsx
import ThemedText from '../components/ThemedText';

<ThemedText variant="bold" size="xl">
  My Title
</ThemedText>

<ThemedText variant="medium" color="secondary">
  Body text here
</ThemedText>
```

### **Method 2: Font Helpers** (Best for existing styles)
```tsx
import { poppinsBold, poppinsMedium, withPoppins } from '../utils/fontHelpers';

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    ...poppinsBold,  // Quick add
  },
  subtitle: {
    fontSize:16,
    ...withPoppins('semibold'),  // Flexible
  }
});
```

### **Method 3: Direct Theme Access** (Most control)
```tsx
import { useAppTheme } from '../hooks/useAppTheme';

const { theme } = useAppTheme();

<Text style={{
  fontFamily: theme.typography.fontFamily.bold,
  fontSize: 20,
}}>
  Title
</Text>
```

---

## 📋 SCREEN UPDATE CHECKLIST

### **Priority 1: Main Screens** ⭐⭐⭐

- [x] **SleepAnalysisScreen.tsx** ✅ DONE
- [ ] **HomeScreen.tsx** - Top priority
- [ ] **JournalScreen.tsx** - High usage
- [ ] **SettingsScreen.tsx** - High visibility
- [ ] **SoundsScreen.tsx** - High usage
- [ ] **SubscriptionScreen.tsx** - Premium screen

### **Priority 2: Auth & Onboarding** ⭐⭐

- [ ] **WelcomeScreen.tsx**
- [ ] **LoginScreen.tsx**
- [ ] **SignupScreen.tsx**
- [ ] **OnboardingScreen.tsx**
- [ ] **SplashScreen.tsx**

### **Priority 3: Feature Screens** ⭐⭐

- [ ] **SleepSessionScreen.tsx**
- [ ] **AlarmsScreen.tsx**
- [ ] **ProfileScreen.tsx**
- [ ] **BedtimeRoutineScreen.tsx**
- [ ] **DreamJournalScreen.tsx**

### **Priority 4: Additional Features** ⭐

- [ ] **MindfulnessScreen.tsx**
- [ ] **SessionPlayerScreen.tsx**
- [ ] **RoomEnvironmentScreen.tsx**
- [ ] **SleepStagesScreen.tsx**
- [ ] **SnoreDetectionScreen.tsx**
- [ ] **HealthTrackingScreen.tsx**
- [ ] **RelaxationLibraryScreen.tsx**
- [ ] **PartnerModeScreen.tsx**
- [ ] **SleepInterruptionsScreen.tsx**
- [ ] **CaffeineCalculatorScreen.tsx**
- [ ] **AchievementsScreen.tsx**
- [ ] **FeatureRequestScreen.tsx**

### **Priority 5: Settings & Info**

- [ ] **HelpSupportScreen.tsx**
- [ ] **PrivacySettingsScreen.tsx**
- [ ] **AboutScreen.tsx**

### **Other Screens**

- [ ] **TrackerScreen.tsx**
- [ ] **ForgotPasswordScreen.tsx**
- [ ] **NotificationTestScreen.tsx**
- [ ] **ClearQueueScreen.tsx**

---

## 🔄 QUICK UPDATE PATTERN

For each screen, follow this pattern:

### **Step 1: Import helper**
```tsx
import { poppinsBold, poppinsMedium, poppinsSemiBold, poppinsRegular } from '../utils/fontHelpers';
```

### **Step 2: Add to key text styles**
```tsx
const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    ...poppinsBold,  // ADD THIS
    color: theme.colors.textPrimary,
  },
  bodyText: {
    fontSize: 14,
    ...poppinsRegular,  // ADD THIS
  },
  label: {
    fontSize: 12,
    ...poppinsSemiBold,  // ADD THIS
  },
});
```

### **Step 3: Test the screen**
- Reload app
- Navigate to the screen
- Verify text looks good
- Check all text elements

---

## 📝 TEXT STYLE MAPPING GUIDE

Use this guide to choose the right font weight:

| Content Type | Font Weight | Helper |
|--------------|-------------|--------|
| **Page Titles** | Bold | `poppinsBold` |
| **Large Numbers** | Bold | `poppinsBold` |
| **Section Headers** | Bold/SemiBold | `poppinsBold` or `poppinsSemiBold` |
| **Button Text** | SemiBold/Bold | `poppinsSemiBold` |
| **Labels** | SemiBold | `poppinsSemiBold` |
| **Body Text** | Regular/Medium | `poppinsRegular` or `poppinsMedium` |
| **Descriptions** | Regular | `poppinsRegular` |
| **Subtle Text** | Regular | `poppinsRegular` |
| **Premium Badges** | Black | `poppinsBlack` |

---

## 🎯 ESTIMATED TIME

- **Per Screen**: 10-15 minutes
- **Total (35 screens)**: ~6-8 hours
- **Can be done incrementally**

---

## ✅ COMPLETION TRACKING

Update this as screens are completed:

```
Progress: 1 / 35 screens (3%)
Next: HomeScreen.tsx
```

---

## 🚨 IMPORTANT NOTES

1. **Don't remove `fontWeight`** - Keep it for Android compatibility
2. **Test on both iOS and Android**
3. **Check loading screens** - Ensure fonts are loaded
4. **Inline styles** - Use `fontFamily: 'Poppins-Bold'` directly
5. **Theme styles** - Use `theme.typography.fontFamily.bold`

---

## 📦 FINAL COMMIT MESSAGE

```
feat: Apply Poppins font across all screens

- Added Poppins font to [SCREEN_NAMES]
- Created ThemedText component for easy font usage
- Created font utility helpers for existing styles
- Maintained consistent typography hierarchy
- All text now uses Poppins font family

Screens updated: [X/35]
```

---

*Last Updated: 2026-01-19*
