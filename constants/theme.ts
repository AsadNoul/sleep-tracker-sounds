// ============================================================================
// Sleep Architect — Theme Tokens
// ============================================================================
// Checkpoint A (redesign/ui-ux-v3): introduces the real "Night" / "Day" theme
// pair that backs the new 3-way mode system ('sunset' | 'night' | 'day').
// `darkTheme` / `lightTheme` are kept as exported aliases of `nightTheme` /
// `dayTheme` so the ~30 existing screens that import them directly keep
// working unchanged in this checkpoint.
//
// Shape note: every existing key from the old darkTheme/lightTheme is kept
// (colors, sleepQuality, spacing, borderRadius, typography, shadows,
// gradients, tabBar) — nothing was removed or renamed. New tokens needed by
// the redesign (ctaBackground, premium badge colors, nav colors, secondary
// accent, new radii) are ADDED as extra keys alongside the old ones.
// ============================================================================

// Night Theme (formerly "dark") — exact palette from design files
export const nightTheme = {
  colors: {
    // --- existing keys (kept for backwards compatibility) ---
    background: '#050302',
    backgroundSecondary: '#0C0704',
    backgroundTertiary: '#120B06',
    card: '#120B06',
    cardOverlay: 'rgba(18, 11, 6, 0.7)',
    // Was #33200F (contrast ratio ~1.3 against the #050302 background — a
    // 1px border at that ratio is nearly invisible on a real screen).
    // Brightened to #5A3A20 (~2.0 ratio) so card edges and row dividers
    // actually read as a border rather than disappearing into the dark
    // background, across every screen that uses this token.
    cardBorder: '#5A3A20',

    accent: '#E8A35E',
    accentLight: 'rgba(232, 163, 94, 0.1)',
    accentBorder: 'rgba(232, 163, 94, 0.3)',
    // Brighter than accentLight — for a selected pill/card/row's fill, where
    // accentLight alone reads too dim against a near-black background, and
    // combining it with an Android `elevation` shadow renders as a dark
    // rectangle instead of a glow (elevation always draws a hard-edged drop
    // shadow, never a soft ambient one). Selected-state styling should use
    // this background + a brighter border instead of shadow/elevation.
    selectedBackground: 'rgba(232, 163, 94, 0.22)',

    highlight: '#F06A2E',
    highlightLight: 'rgba(240, 106, 46, 0.1)',

    textPrimary: '#FFF3E6',
    textSecondary: '#EBD3BA',

    success: '#7EC8A3',
    warning: '#E8C547',
    error: '#E57373',
    danger: '#E57373',

    premium: '#FFD27A',

    inactive: '#CBB096',
    disabled: '#33200F',

    // --- new tokens for the redesign ---
    // Accent (icons/highlights) and CTA (buttons) are intentionally distinct
    // in night mode — do not collapse into one token.
    textTertiary: '#CBB096',
    ctaBackground: '#F06A2E',
    ctaText: '#FFF3E6',

    premiumBadgeBackground: '#2A2009',
    premiumBadgeBorder: '#5A4A20',
    premiumBadgeText: '#FFD27A',

    navBackground: '#0C0704',
    navActiveBackground: '#24160B',
  },

  // "Sleep Print" brand mark — the radial 72-bar burst used on Splash, Welcome,
  // and Home (mini version). Bar color by stage: deep/light/rem/awake.
  sleepPrintMark: {
    deep: '#C2572B',
    light: '#E89A55',
    rem: '#FFCB8E',
    awake: '#FFEBD2',
  },

  // Sleep Quality Color System - single source of truth
  sleepQuality: {
    optimal: { color: '#10B981', label: 'Optimal', emoji: '🏆', gradient: ['#10B981', '#059669'], minScore: 90 },
    excellent: { color: '#10B981', label: 'Excellent', emoji: '🌟', gradient: ['#10B981', '#059669'], minScore: 75 },
    good: { color: '#F59E0B', label: 'Good', emoji: '✨', gradient: ['#F59E0B', '#D97706'], minScore: 60 },
    fair: { color: '#F97316', label: 'Fair', emoji: '⚖️', gradient: ['#F97316', '#EA580C'], minScore: 50 },
    poor: { color: '#EF4444', label: 'Poor', emoji: '😴', gradient: ['#EF4444', '#DC2626'], minScore: 0 },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
    // New tokens needed by the redesign's card/glass-panel surfaces.
    // (Screen-root 44px radius is NOT added here — that value in the design
    // files is a design-canvas mockup-frame convention, not a real RN
    // screen-container radius; see commit message for the investigation.)
    card: 22,
    glass: 22,
  },

  typography: {
    fontFamily: {
      // Legacy Poppins keys kept as-is so any un-migrated screen reading
      // these specific keys still resolves to a loaded font.
      light: 'Poppins-Light',
      regular: 'Poppins-Regular',
      medium: 'Poppins-Medium',
      semibold: 'Poppins-SemiBold',
      bold: 'Poppins-Bold',
      extrabold: 'Poppins-ExtraBold',
      black: 'Poppins-Black',

      // New redesign typography: Fraunces (display/headings) + DM Sans (body/UI)
      display: 'Fraunces-Regular',
      displaySemibold: 'Fraunces-SemiBold',
      body: 'DMSans-Regular',
      bodyMedium: 'DMSans-Medium',
      bodySemibold: 'DMSans-SemiBold',
      bodyBold: 'DMSans-Bold',
    },
    sizes: {
      xs: 10,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
      huge: 32,
      massive: 72,
    },
    weights: {
      light: '200' as const,
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  gradients: {
    primary: ['#E8A35E', '#F06A2E'],
    background: ['#050302', '#120B06'],
    backgroundAlt: ['#050302', '#120B06', '#050302'],
    premium: ['#E8A35E', '#FFD27A'],
    disabled: ['#33200F', '#33200F'],
  },

  tabBar: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
} as const;

// Day Theme (formerly "light") — exact palette from design files
export const dayTheme = {
  colors: {
    // --- existing keys (kept for backwards compatibility) ---
    background: '#F6F1E7',
    backgroundSecondary: '#FFFDF8',
    backgroundTertiary: '#F6E2D3',
    card: '#FFFDF8',
    cardOverlay: 'rgba(255, 253, 248, 0.9)',
    // Was #E6DCCB (contrast ratio ~1.2 against the #F6F1E7 background —
    // same low-visibility issue as night mode's cardBorder, just less
    // obvious to the eye on a light background). Brightened to #CDBFA8
    // (~1.6 ratio), matching the canvas's own darker border tone used on
    // bordered buttons in Day mode.
    cardBorder: '#CDBFA8',

    accent: '#B8471C',
    accentLight: 'rgba(184, 71, 28, 0.1)',
    accentBorder: 'rgba(184, 71, 28, 0.3)',
    // See nightTheme's selectedBackground for why this exists — a brighter
    // fill for selected pills/cards/rows than accentLight alone provides.
    selectedBackground: 'rgba(184, 71, 28, 0.16)',

    highlight: '#4F6B4A',
    highlightLight: 'rgba(79, 107, 74, 0.1)',

    textPrimary: '#1F1A14',
    textSecondary: '#574C40',

    success: '#4F6B4A',
    warning: '#D4A72E',
    error: '#D64545',
    danger: '#D64545',

    premium: '#B8471C',

    inactive: '#5E5347',
    disabled: '#E6DCCB',

    // --- new tokens for the redesign ---
    // Day mode uses a single accent for both icon-highlights and CTAs
    // (unlike night mode's split accent/CTA) — both point at the same hex.
    textTertiary: '#5E5347',
    ctaBackground: '#B8471C',
    ctaText: '#FFFDF8',

    // Secondary green accent, used for positive/good indicators
    secondaryAccent: '#4F6B4A',

    premiumBadgeBackground: '#F6E2D3',
    premiumBadgeBorder: '#B8471C',
    premiumBadgeText: '#B8471C',

    navBackground: '#FFFDF8',
    navActiveBackground: '#F6E2D3',
  },

  // "Sleep Print" brand mark — the radial 72-bar burst used on Splash, Welcome,
  // and Home (mini version). Bar color by stage: deep/light/rem/awake.
  sleepPrintMark: {
    deep: '#1F1A14',
    light: '#B8471C',
    rem: '#4F6B4A',
    awake: '#D9A441',
  },

  // Sleep Quality Color System - single source of truth
  sleepQuality: {
    optimal: { color: '#10B981', label: 'Optimal', emoji: '🏆', gradient: ['#10B981', '#059669'], minScore: 90 },
    excellent: { color: '#10B981', label: 'Excellent', emoji: '🌟', gradient: ['#10B981', '#059669'], minScore: 75 },
    good: { color: '#F59E0B', label: 'Good', emoji: '✨', gradient: ['#F59E0B', '#D97706'], minScore: 60 },
    fair: { color: '#F97316', label: 'Fair', emoji: '⚖️', gradient: ['#F97316', '#EA580C'], minScore: 50 },
    poor: { color: '#EF4444', label: 'Poor', emoji: '😴', gradient: ['#EF4444', '#DC2626'], minScore: 0 },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 30,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
    card: 22,
    glass: 22,
  },

  typography: {
    fontFamily: {
      light: 'Poppins-Light',
      regular: 'Poppins-Regular',
      medium: 'Poppins-Medium',
      semibold: 'Poppins-SemiBold',
      bold: 'Poppins-Bold',
      extrabold: 'Poppins-ExtraBold',
      black: 'Poppins-Black',

      display: 'Fraunces-Regular',
      displaySemibold: 'Fraunces-SemiBold',
      body: 'DMSans-Regular',
      bodyMedium: 'DMSans-Medium',
      bodySemibold: 'DMSans-SemiBold',
      bodyBold: 'DMSans-Bold',
    },
    sizes: {
      xs: 10,
      sm: 12,
      base: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 28,
      huge: 32,
      massive: 72,
    },
    weights: {
      light: '200' as const,
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
  },

  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  gradients: {
    primary: ['#B8471C', '#4F6B4A'],
    background: ['#F6F1E7', '#FFFDF8'],
    backgroundAlt: ['#F6F1E7', '#FFFDF8', '#F6F1E7'],
    premium: ['#B8471C', '#B8471C'],
    disabled: ['#E6DCCB', '#E6DCCB'],
  },

  tabBar: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
} as const;

// Backwards-compatible aliases — kept so existing imports of darkTheme /
// lightTheme across ~30 screens continue to work unchanged in this checkpoint.
export const darkTheme = nightTheme;
export const lightTheme = dayTheme;

// Default export (night theme for backwards compatibility)
export const theme = nightTheme;

export type Theme = typeof nightTheme | typeof dayTheme;
