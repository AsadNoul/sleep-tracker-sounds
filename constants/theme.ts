// Dark Theme Colors
export const darkTheme = {
  colors: {
    background: '#0F0F1E',
    backgroundSecondary: '#161632',
    backgroundTertiary: '#0A0A14',
    card: '#1B1B3A',
    cardOverlay: 'rgba(27, 27, 58, 0.7)',
    cardBorder: 'rgba(139, 92, 246, 0.2)',

    accent: '#8B5CF6',
    accentLight: 'rgba(139, 92, 246, 0.1)',
    accentBorder: 'rgba(139, 92, 246, 0.3)',

    highlight: '#6366F1',
    highlightLight: 'rgba(99, 102, 241, 0.1)',

    textPrimary: '#FFFFFF',
    textSecondary: '#A8B5C7',

    success: '#7EC8A3',
    warning: '#E8C547',
    error: '#E57373',
    danger: '#E57373',

    premium: '#D4AF37',

    inactive: '#5A6B7D',
    disabled: '#2C3E50',
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
  },

  typography: {
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
    primary: ['#8B5CF6', '#6366F1'],
    background: ['#0F0F1E', '#161632'],
    backgroundAlt: ['#0F0F1E', '#161632', '#0F0F1E'],
    premium: ['#8B5CF6', '#D4AF37'],
    disabled: ['#5A6B7D', '#5A6B7D'],
  },

  tabBar: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
} as const;

// Light Theme Colors
export const lightTheme = {
  colors: {
    background: '#F5F7FA',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#E8EDF3',
    card: '#FFFFFF',
    cardOverlay: 'rgba(255, 255, 255, 0.9)',
    cardBorder: 'rgba(13, 27, 42, 0.1)',

    accent: '#B8941F',
    accentLight: 'rgba(184, 148, 31, 0.1)',
    accentBorder: 'rgba(184, 148, 31, 0.3)',

    highlight: '#7B5FC7',
    highlightLight: 'rgba(123, 95, 199, 0.1)',

    textPrimary: '#0D1B2A',
    textSecondary: '#4A5568',

    success: '#5BA87C',
    warning: '#D4A72E',
    error: '#D64545',
    danger: '#D64545',

    premium: '#C9A227',

    inactive: '#8A9AAD',
    disabled: '#C5D0DD',
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
  },

  typography: {
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
    primary: ['#B8941F', '#7B5FC7'],
    background: ['#F5F7FA', '#FFFFFF'],
    backgroundAlt: ['#F5F7FA', '#FFFFFF', '#F5F7FA'],
    premium: ['#C9A227', '#B8941F'],
    disabled: ['#C5D0DD', '#C5D0DD'],
  },

  tabBar: {
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
} as const;

// Default export (dark theme for backwards compatibility)
export const theme = darkTheme;

export type Theme = typeof darkTheme | typeof lightTheme;
