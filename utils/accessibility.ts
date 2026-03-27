/**
 * Accessibility Utilities
 * Standardized accessibility properties for common components
 */

export const a11y = {
  // Button accessibility
  button: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button' as const,
  }),

  // Icon button accessibility
  iconButton: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button' as const,
  }),

  // Tab/Link accessibility
  link: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'link' as const,
  }),

  // Toggle/Switch accessibility
  switch: (label: string, isChecked: boolean, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'switch' as const,
    accessibilityState: { checked: isChecked },
  }),

  // Header accessibility
  header: (label: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'header' as const,
  }),

  // Text input accessibility
  textInput: (label: string, hint?: string) => ({
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
  }),

  // Screen reader only text
  srOnly: (text: string) => ({
    accessible: true,
    accessibilityLabel: text,
    accessibilityLiveRegion: 'polite' as const,
  }),

  // Image/Icon description
  image: (description: string) => ({
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image' as const,
  }),

  // Chart/Visualization description
  chart: (title: string, description: string) => ({
    accessible: true,
    accessibilityLabel: title,
    accessibilityHint: description,
  }),

  // Score card accessibility
  scoreCard: (label: string, value: number, unit: string) => ({
    accessible: true,
    accessibilityLabel: `${label}: ${value} ${unit}`,
    accessibilityRole: 'text' as const,
    accessibilityLiveRegion: 'polite' as const,
  }),

  // Navigation
  navigation: (screenName: string, hint?: string) => ({
    accessible: true,
    accessibilityLabel: screenName,
    accessibilityHint: hint || `Navigate to ${screenName}`,
    accessibilityRole: 'button' as const,
  }),
};

/**
 * Create accessible stat display
 * Usage: <Text {...a11y.stat('Heart Rate', 72, 'bpm')}>72</Text>
 */
export function createStatA11y(label: string, value: number | string, unit: string) {
  return {
    accessible: true,
    accessibilityLabel: `${label}: ${value} ${unit}`,
    accessibilityRole: 'text' as const,
  };
}

/**
 * Create accessible list item
 * Usage: <View {...a11y.listItem('Monday sleep', 'See full details')}>...</View>
 */
export function createListItemA11y(label: string, hint?: string) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRole: 'button' as const,
  };
}
