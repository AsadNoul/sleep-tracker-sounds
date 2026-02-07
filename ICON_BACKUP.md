# Icon Backup - Ionicons to Lucide Migration

## Date: January 17, 2026

This file documents all Ionicons usage before migration to Lucide React Native.
If you need to restore Ionicons, use this reference.

---

## HOW TO RESTORE

1. Install Ionicons (if removed):
```bash
npx expo install @expo/vector-icons
```

2. Import in your file:
```tsx
import { Ionicons } from '@expo/vector-icons';
```

3. Use the icon:
```tsx
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
```

---

## SCREEN-BY-SCREEN BACKUP

### 1. CaffeineCalculatorScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usage:**
```tsx
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
```

**Lucide Replacement:**
```tsx
import { ChevronLeft } from 'lucide-react-native';
// Usage:
<ChevronLeft size={28} color={theme.colors.textPrimary} />
```

---

### 2. HealthTrackingScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usage:**
```tsx
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
```

**Lucide Replacement:**
```tsx
import { ChevronLeft } from 'lucide-react-native';
// Usage:
<ChevronLeft size={28} color={theme.colors.textPrimary} />
```

---

### 3. PartnerModeScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usages:**
```tsx
// Back button
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />

// Stats/Analytics
<Ionicons name="stats-chart" size={24} color={theme.colors.accent} />

// Calendar
<Ionicons name="calendar" size={20} color={theme.colors.textSecondary} />

// Ideas/Insights
<Ionicons name="bulb" size={24} color={theme.colors.premium} />

// Trending
<Ionicons name="trending-up" size={20} color="#10B981" />

// Moon/Sleep
<Ionicons name="moon" size={20} color={theme.colors.accent} />

// Fitness/Exercise
<Ionicons name="fitness" size={20} color={theme.colors.highlight} />

// Bed/Sleep
<Ionicons name="bed" size={20} color={theme.colors.accent} />

// Phone/Device
<Ionicons name="phone-portrait" size={20} color={theme.colors.textSecondary} />

// Temperature
<Ionicons name="thermometer" size={20} color={theme.colors.danger} />

// Volume/Sound
<Ionicons name="volume-mute" size={20} color={theme.colors.textSecondary} />
```

**Lucide Replacements:**
```tsx
import {
  ChevronLeft,
  BarChart2,
  Calendar,
  Lightbulb,
  TrendingUp,
  Moon,
  Activity,
  Bed,
  Smartphone,
  Thermometer,
  VolumeX
} from 'lucide-react-native';

// Mappings:
// chevron-back → ChevronLeft
// stats-chart → BarChart2
// calendar → Calendar
// bulb → Lightbulb
// trending-up → TrendingUp
// moon → Moon
// fitness → Activity
// bed → Bed (or BedDouble)
// phone-portrait → Smartphone
// thermometer → Thermometer
// volume-mute → VolumeX
```

---

### 4. RelaxationLibraryScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usages:**
```tsx
// Back button
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />

// Close button (modal)
<Ionicons name="close" size={28} color={theme.colors.textPrimary} />
```

**Lucide Replacements:**
```tsx
import { ChevronLeft, X } from 'lucide-react-native';
// chevron-back → ChevronLeft
// close → X
```

---

### 5. SessionPlayerScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usages:**
```tsx
// Play button
<Ionicons name="play" size={32} color="#fff" />

// Pause button
<Ionicons name="pause" size={32} color="#fff" />

// Stop button
<Ionicons name="stop" size={24} color={theme.colors.textSecondary} />

// Close button
<Ionicons name="close" size={28} color={theme.colors.textPrimary} />
```

**Lucide Replacements:**
```tsx
import { Play, Pause, Square, X } from 'lucide-react-native';
// play → Play
// pause → Pause
// stop → Square
// close → X
```

---

### 6. SleepInterruptionsScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usage:**
```tsx
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
```

**Lucide Replacement:**
```tsx
import { ChevronLeft } from 'lucide-react-native';
```

---

### 7. SleepStagesScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usage:**
```tsx
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
```

**Lucide Replacement:**
```tsx
import { ChevronLeft } from 'lucide-react-native';
```

---

### 8. SnoreDetectionScreen.tsx

**Original Import:**
```tsx
import { Ionicons } from '@expo/vector-icons';
```

**Original Usage:**
```tsx
<Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
```

**Lucide Replacement:**
```tsx
import { ChevronLeft } from 'lucide-react-native';
```

---

## IONICONS TO LUCIDE MAPPING REFERENCE

| Ionicons Name | Lucide Name | Notes |
|---------------|-------------|-------|
| chevron-back | ChevronLeft | Navigation back |
| chevron-forward | ChevronRight | Navigation forward |
| close | X | Close/dismiss |
| play | Play | Media play |
| pause | Pause | Media pause |
| stop | Square | Media stop |
| stats-chart | BarChart2 | Analytics/charts |
| calendar | Calendar | Date selection |
| bulb | Lightbulb | Ideas/insights |
| trending-up | TrendingUp | Positive trend |
| trending-down | TrendingDown | Negative trend |
| moon | Moon | Sleep/night |
| sunny | Sun | Day/wake |
| fitness | Activity | Exercise |
| bed | Bed | Sleep/bed |
| phone-portrait | Smartphone | Device |
| thermometer | Thermometer | Temperature |
| volume-mute | VolumeX | Sound off |
| volume-high | Volume2 | Sound on |
| heart | Heart | Favorites |
| star | Star | Rating |
| settings | Settings | Settings |
| person | User | Profile |
| notifications | Bell | Alerts |
| search | Search | Search |
| add | Plus | Add new |
| trash | Trash2 | Delete |
| checkmark | Check | Confirm |
| alert-circle | AlertCircle | Warning |
| information-circle | Info | Information |
| help-circle | HelpCircle | Help |

---

## NOTES

- Lucide icons use PascalCase (e.g., `ChevronLeft`)
- Ionicons use kebab-case strings (e.g., `"chevron-back"`)
- Lucide icons are imported directly, Ionicons use name prop
- Both support `size` and `color` props
- Lucide also supports `strokeWidth` for line thickness
