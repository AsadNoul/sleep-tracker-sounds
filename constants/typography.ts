/**
 * Unified Typography System
 * Apple HIG-compliant type scale for consistent visual hierarchy
 * 
 * Usage:
 * import { typography } from '../constants/typography';
 * <Text style={typography.hero}>Sleep Score</Text>
 */

export const TYPOGRAPHY_SCALE = {
  // Hero - Large display text (sleep score, main KPIs)
  hero: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },

  // Title 1 - Section headers, major headings
  title1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },

  // Title 2 - Subsection headers
  title2: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
  },

  // Title 3 - Card titles, list headers
  title3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },

  // Body - Primary body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },

  // Body Small - Secondary body text
  bodySmall: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },

  // Caption - Supporting text, labels
  caption: {
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },

  // Footnote - Small supporting text
  footnote: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 16,
  },

  // Label - Button text, badges, tags
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },

  // Label Small - Small button text
  labelSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },

  // Stat Value - Large numbers
  statValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
  },

  // Stat Label - Numbers' labels
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
} as const;

/**
 * Apply typography with theme font families
 * Usage: {fontFamily: theme.typography.fontFamily.semibold, ...typography.title1}
 */
export type TypographyKey = keyof typeof TYPOGRAPHY_SCALE;
