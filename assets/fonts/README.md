# Poppins Font Installation Guide

## Required Font Files

Download the following Poppins font files from Google Fonts (https://fonts.google.com/specimen/Poppins) and place them in the `assets/fonts/` directory:

### Font Files Needed:
```
assets/fonts/
├── Poppins-Light.ttf
├── Poppins-Regular.ttf
├── Poppins-Medium.ttf
├── Poppins-SemiBold.ttf
├── Poppins-Bold.ttf
├── Poppins-ExtraBold.ttf
└── Poppins-Black.ttf
```

## How to Download:

1. Visit: https://fonts.google.com/specimen/Poppins
2. Click "Download family"
3. Extract the ZIP file
4. Copy the required font files from the ZIP to `assets/fonts/`

## Font Usage in Code:

Use the theme's font family like this:

```tsx
import { useAppTheme } from '../hooks/useAppTheme';

// In your component:
const { theme } = useAppTheme();

<Text style={{
  fontFamily: theme.typography.fontFamily.regular,  // Poppins-Regular
  fontSize: theme.typography.sizes.md,
}}>
  Your text here
</Text>
```

## Available Font Families:

- `theme.typography.fontFamily.light` → Poppins-Light
- `theme.typography.fontFamily.regular` → Poppins-Regular
- `theme.typography.fontFamily.medium` → Poppins-Medium
- `theme.typography.fontFamily.semibold` → Poppins-SemiBold
- `theme.typography.fontFamily.bold` → Poppins-Bold
- `theme.typography.fontFamily.extrabold` → Poppins-ExtraBold
- `theme.typography.fontFamily.black` → Poppins-Black

## Applying Globally:

The fonts are automatically loaded in `App.tsx` using `expo-font`. Make sure to use the `fontFamily` property in all Text components to apply Poppins font.
