/**
 * Dream Journal Enhancement
 * Track and analyze dreams with mood correlation
 */

export interface DreamEntry {
  id: string;
  date: Date;
  title: string;
  description: string;
  mood: 'happy' | 'sad' | 'scary' | 'peaceful' | 'confusing' | 'vivid';
  lucid: boolean; // was the dream lucid?
  colors: string[]; // dominant colors
  themes: string[]; // tags like 'adventure', 'family', 'work', etc.
  sleepSessionId?: string;
  createdAt: Date;
}

export interface DreamAnalysis {
  totalDreams: number;
  mostCommonMood: string;
  mostCommonTheme: string;
  lucidDreamCount: number;
  averageColorPalette: string[];
  trends: string[];
}

/**
 * Analyze dream patterns
 */
export function analyzeDreamPatterns(dreams: DreamEntry[]): DreamAnalysis {
  if (dreams.length === 0) {
    return {
      totalDreams: 0,
      mostCommonMood: 'none',
      mostCommonTheme: 'none',
      lucidDreamCount: 0,
      averageColorPalette: [],
      trends: [],
    };
  }

  // Most common mood
  const moodCounts = new Map<string, number>();
  dreams.forEach(d => {
    moodCounts.set(d.mood, (moodCounts.get(d.mood) || 0) + 1);
  });
  const mostCommonMood = Array.from(moodCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

  // Most common theme
  const themeCounts = new Map<string, number>();
  dreams.forEach(d => {
    d.themes.forEach(t => {
      themeCounts.set(t, (themeCounts.get(t) || 0) + 1);
    });
  });
  const mostCommonTheme = Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';

  // Lucid dream count
  const lucidDreamCount = dreams.filter(d => d.lucid).length;

  // Average color palette
  const colorCounts = new Map<string, number>();
  dreams.forEach(d => {
    d.colors.forEach(c => {
      colorCounts.set(c, (colorCounts.get(c) || 0) + 1);
    });
  });
  const averageColorPalette = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color]) => color);

  // Generate trends
  const trends: string[] = [];
  if (lucidDreamCount > dreams.length * 0.3) {
    trends.push('You have frequent lucid dreams - great for dream control!');
  }
  if (mostCommonMood === 'scary') {
    trends.push('Your dreams are often intense. Consider stress-reduction techniques.');
  }
  if (mostCommonMood === 'peaceful') {
    trends.push('Your dreams are predominantly peaceful and calm. Great sleep quality!');
  }
  if (themeCounts.get('recurring') && themeCounts.get('recurring')! > dreams.length * 0.2) {
    trends.push('You have recurring dream themes - they may reflect subconscious concerns.');
  }

  return {
    totalDreams: dreams.length,
    mostCommonMood,
    mostCommonTheme,
    lucidDreamCount,
    averageColorPalette,
    trends,
  };
}

/**
 * Get emotion correlation with sleep quality
 */
export function correlateEmotionWithSleep(
  dreams: DreamEntry[],
  sleepQualities: Map<string, number>
): { mood: string; averageQuality: number }[] {
  const moodQualities = new Map<string, number[]>();

  dreams.forEach(d => {
    if (d.sleepSessionId && sleepQualities.has(d.sleepSessionId)) {
      const quality = sleepQualities.get(d.sleepSessionId)!;
      const qualities = moodQualities.get(d.mood) || [];
      qualities.push(quality);
      moodQualities.set(d.mood, qualities);
    }
  });

  return Array.from(moodQualities.entries()).map(([mood, qualities]) => ({
    mood,
    averageQuality: qualities.reduce((a, b) => a + b, 0) / qualities.length,
  }));
}

/**
 * Get dream insights
 */
export function getDreamInsights(dreams: DreamEntry[]): string[] {
  const insights: string[] = [];
  const analysis = analyzeDreamPatterns(dreams);

  if (dreams.length < 3) {
    return ['Log more dreams to identify patterns and get personalized insights.'];
  }

  // Emotional insights
  const moodEmojis: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    scary: '😨',
    peaceful: '😌',
    confusing: '🤔',
    vivid: '✨',
  };

  insights.push(
    `Your most common dream mood is ${moodEmojis[analysis.mostCommonMood]} ${analysis.mostCommonMood}.`
  );

  // Theme insights
  if (analysis.mostCommonTheme === 'work') {
    insights.push('Your dreams often feature work themes - you may have stress to process.');
  } else if (analysis.mostCommonTheme === 'family') {
    insights.push('Family appears frequently in your dreams - reflects close relationships.');
  } else if (analysis.mostCommonTheme === 'adventure') {
    insights.push('Adventure dreams are common - suggests creative, exploratory mindset.');
  }

  // Lucid dream insights
  if (analysis.lucidDreamCount > 0) {
    insights.push(
      `You\'ve had ${analysis.lucidDreamCount} lucid dreams. These offer opportunities for dream control.`
    );
  }

  // Color palette insight
  if (analysis.averageColorPalette.length > 0) {
    insights.push(
      `Your dreams frequently feature ${analysis.averageColorPalette.slice(0, 2).join(' and ')} tones.`
    );
  }

  return insights.slice(0, 4);
}

/**
 * Suggest dream themes
 */
export function suggestDreamThemes(): string[] {
  return [
    'adventure',
    'family',
    'work',
    'travel',
    'relationships',
    'nature',
    'flying',
    'falling',
    'water',
    'animals',
    'houses',
    'recurring',
    'nightmare',
    'fantasy',
    'realistic',
  ];
}

/**
 * Suggest colors for dream description
 */
export function suggestDreamColors(): string[] {
  return [
    'blue',
    'green',
    'purple',
    'red',
    'yellow',
    'orange',
    'pink',
    'brown',
    'black',
    'white',
    'gray',
    'golden',
  ];
}

/**
 * Get dream mood emoji
 */
export function getDreamMoodEmoji(mood: string): string {
  const emojis: Record<string, string> = {
    happy: '😊',
    sad: '😢',
    scary: '😨',
    peaceful: '😌',
    confusing: '🤔',
    vivid: '✨',
  };
  return emojis[mood] || '😐';
}
