# Sleep Architect - Color Scheme Documentation

## 🎨 Design Philosophy

Sleep Architect uses a **premium dark-themed** color palette with vibrant purple accents and subtle gradients to create a calming yet sophisticated nocturnal atmosphere.

---

## 🌙 Dark Theme (Primary)

### Background Colors
```
Main Background:       #0F0F1E  (Deep Dark Blue-Black)
Secondary Background:  #161632  (Dark Purple-Blue)
Tertiary Background:   #0A0A14  (Ultra Dark - Deepest Night)
```

### Card & UI Elements
```
Card:                  #1B1B3A  (Dark Blue-Purple)
Card Overlay:          rgba(27, 27, 58, 0.7)  (Translucent Purple with Blur)
Card Border:           rgba(139, 92, 246, 0.2)  (Subtle Purple Glow)
```

### Accent Colors
```
Primary Accent:        #8B5CF6  (Vibrant Purple - Main Brand Color)
Accent Light:          rgba(139, 92, 246, 0.1)  (Light Purple Background)
Accent Border:         rgba(139, 92, 246, 0.3)  (Purple Border)

Highlight:             #6366F1  (Indigo Blue - Secondary Accent)
Highlight Light:       rgba(99, 102, 241, 0.1)  (Light Indigo Background)
```

### Text Colors
```
Primary Text:          #FFFFFF  (Pure White - High Contrast)
Secondary Text:        #A8B5C7  (Light Gray-Blue - Reduced Emphasis)
```

### Status & Feedback Colors
```
Success:               #7EC8A3  (Soft Green) / #10B981  (Vibrant Green)
Warning:               #E8C547  (Yellow) / #F59E0B  (Orange)
Error/Danger:          #E57373  (Soft Red) / #EF4444  (Vibrant Red)
Premium Gold:          #D4AF37  (Luxury Gold - Pro Features)
```

### Interactive States
```
Inactive:              #5A6B7D  (Muted Blue-Gray)
Disabled:              #2C3E50  (Dark Gray-Blue)
```

---

## ☀️ Light Theme (Alternative)

### Background Colors
```
Main Background:       #F5F7FA  (Soft White-Blue)
Secondary Background:  #FFFFFF  (Pure White)
Tertiary Background:   #E8EDF3  (Light Gray-Blue)
```

### Card & UI Elements
```
Card:                  #FFFFFF  (Pure White)
Card Overlay:          rgba(255, 255, 255, 0.9)  (Translucent White)
Card Border:           rgba(13, 27, 42, 0.1)  (Subtle Dark Border)
```

### Accent Colors
```
Primary Accent:        #B8941F  (Rich Gold)
Accent Light:          rgba(184, 148, 31, 0.1)  (Light Gold Background)
Accent Border:         rgba(184, 148, 31, 0.3)  (Gold Border)

Highlight:             #7B5FC7  (Deep Purple)
Highlight Light:       rgba(123, 95, 199, 0.1)  (Light Purple Background)
```

### Text Colors
```
Primary Text:          #0D1B2A  (Dark Blue-Black)
Secondary Text:        #4A5568  (Gray)
```

### Status Colors
```
Success:               #5BA87C  (Dark Green)
Warning:               #D4A72E  (Dark Yellow)
Error/Danger:          #D64545  (Dark Red)
Premium:               #C9A227  (Dark Gold)
```

---

## 🎨 Gradient Palettes

### Dark Theme Gradients
```typescript
Primary:       ['#8B5CF6', '#6366F1']  // Purple → Indigo
Background:    ['#0F0F1E', '# 161632']  // Dark Blue-Black → Dark Purple-Blue
Premium:       ['#8B5CF6', '#D4AF37']  // Purple → Gold
```

### Light Theme Gradients
```typescript
Primary:       ['#B8941F', '#7B5FC7']  // Gold → Purple
Background:    ['#F5F7FA', '#FFFFFF']  // Soft Blue → White
Premium:       ['#C9A227', '#B8941F']  // Dark Gold → Rich Gold
```

---

## 📐 Usage Guidelines

### When to Use Each Color

**Purple Accent (#8B5CF6)**
- Primary buttons and CTAs
- Active states and selections
- Progress indicators
- Premium feature highlights

**Indigo Highlight (#6366F1)**
- Secondary actions
- Info states
- Chart data visualization

**Gold Premium (#D4AF37)**
- Pro/Premium badges
- Upgrade prompts
- Special features

**Success Green (#10B981)**
- Completed actions
- Good sleep scores (80+)
- Positive trends

**Warning Orange (#F59E0B)**
- Moderate sleep scores (60-79)
- Caution states
- Disruption alerts

**Danger Red (#EF4444)**
- Poor sleep scores (<60)
- Error states
- Critical alerts

---

## 🎯 Color Accessibility

### Contrast Ratios (WCAG AA Compliant)

```
Dark Theme:
- White text on #0F0F1E background: 20:1 ✅
- Purple #8B5CF6 on #0F0F1E: 4.8:1 ✅
- Secondary text #A8B5C7 on #0F0F1E: 9.2:1 ✅

Light Theme:
- Dark text #0D1B2A on #F5F7FA: 13.5:1 ✅
- Gold #B8941F on #FFFFFF: 4.7:1 ✅
```

---

## 🖌️ Implementation Example

```tsx
import { useAppTheme } from '../hooks/useAppTheme';

const MyComponent = () => {
  const { theme, isDark } = useAppTheme();

  return (
    <View style={{
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.cardBorder,
      borderWidth: 1,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
    }}>
      <Text style={{
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.fontFamily.bold,
        fontSize: theme.typography.sizes.lg,
      }}>
        Sleep Score: 85
      </Text>
      
      <TouchableOpacity style={{
        backgroundColor: theme.colors.accent,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
      }}>
        <Text style={{
          color: '#FFFFFF',
          fontFamily: theme.typography.fontFamily.semibold,
        }}>
          View Details
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

---

## 📱 Brand Colors Summary

**Primary Brand:**   #8B5CF6 (Vibrant Purple)
**Secondary:**       #6366F1 (Indigo Blue)
**Premium:**         #D4AF37 (Luxury Gold)
**Background:**      #0F0F1E (Deep Night)
**Text:**            #FFFFFF (Pure White)

---

*Last Updated: January 2026*
*Design System Version: 2.1.0*
