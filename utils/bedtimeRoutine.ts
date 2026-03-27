/**
 * Bedtime Wind-Down Routine
 * Guided pre-sleep routine for relaxation
 */

export interface RoutineActivity {
  id: string;
  name: string;
  description: string;
  duration: number; // in minutes
  category: 'meditation' | 'breathing' | 'music' | 'reading' | 'stretching' | 'journaling';
  intensity: 'low' | 'medium' | 'high'; // activity level
  icon: string;
  instructions: string[];
  optional: boolean;
}

export interface WindDownRoutine {
  id: string;
  name: string;
  totalDuration: number; // in minutes
  activities: RoutineActivity[];
  difficulty: 'easy' | 'medium' | 'advanced';
  description: string;
}

/**
 * Pre-built wind-down routines matching different sleep times
 */
export const PRESET_ROUTINES: Record<string, WindDownRoutine> = {
  express: {
    id: 'express',
    name: 'Express Wind-Down (15 min)',
    totalDuration: 15,
    difficulty: 'easy',
    description: 'Quick routine for busy nights',
    activities: [
      {
        id: 'box-breathing',
        name: 'Box Breathing',
        description: 'Calming breathwork technique',
        duration: 5,
        category: 'breathing',
        intensity: 'low',
        icon: '🌬️',
        instructions: [
          'Breathe in for 4 counts',
          'Hold for 4 counts',
          'Breathe out for 4 counts',
          'Hold for 4 counts',
          'Repeat 5 times',
        ],
        optional: false,
      },
      {
        id: 'body-scan',
        name: 'Body Scan',
        description: 'Progressive relaxation',
        duration: 10,
        category: 'meditation',
        intensity: 'low',
        icon: '🧘',
        instructions: [
          'Start at your toes, tense then release',
          'Move up through each body part',
          'End with your head and face',
          'Notice the relaxation',
        ],
        optional: false,
      },
    ],
  },
  standard: {
    id: 'standard',
    name: 'Standard Routine (30 min)',
    totalDuration: 30,
    difficulty: 'medium',
    description: 'Balanced wind-down with multiple techniques',
    activities: [
      {
        id: 'dim-lights',
        name: 'Dim the Lights',
        description: 'Prepare sleep environment',
        duration: 2,
        category: 'stretching',
        intensity: 'low',
        icon: '🕯️',
        instructions: ['Set lights to <10% brightness', 'Avoid blue light screens'],
        optional: false,
      },
      {
        id: 'gratitude',
        name: 'Gratitude Journal',
        description: 'Reflect on positive moments',
        duration: 5,
        category: 'journaling',
        intensity: 'low',
        icon: '📝',
        instructions: [
          'Write down 3 things you\'re grateful for',
          'Be specific about why they matter',
          'Focus on emotions, not just facts',
        ],
        optional: true,
      },
      {
        id: 'gentle-yoga',
        name: 'Gentle Yoga',
        description: 'Relaxing stretches',
        duration: 8,
        category: 'stretching',
        intensity: 'low',
        icon: '🧘‍♀️',
        instructions: [
          'Child\'s pose (2 min)',
          'Cat-cow stretch (2 min)',
          'Legs up the wall (4 min)',
        ],
        optional: true,
      },
      {
        id: 'guided-meditation',
        name: 'Guided Meditation',
        description: 'Audio-guided relaxation',
        duration: 10,
        category: 'meditation',
        intensity: 'low',
        icon: '🎧',
        instructions: ['Play a guided sleep meditation', 'Focus on the guide\'s voice'],
        optional: true,
      },
      {
        id: '4-7-8-breathing',
        name: '4-7-8 Breathing',
        description: 'Advanced breathing technique',
        duration: 5,
        category: 'breathing',
        intensity: 'medium',
        icon: '🌬️',
        instructions: [
          'Breathe in for 4 counts',
          'Hold for 7 counts',
          'Exhale for 8 counts',
          'Repeat 4 times',
        ],
        optional: true,
      },
    ],
  },
  immersive: {
    id: 'immersive',
    name: 'Deep Immersion (45 min)',
    totalDuration: 45,
    difficulty: 'advanced',
    description: 'Comprehensive relaxation routine',
    activities: [
      {
        id: 'ambient-sound',
        name: 'Nature Sounds',
        description: 'Environmental audio',
        duration: 5,
        category: 'music',
        intensity: 'low',
        icon: '🌧️',
        instructions: ['Start ambient nature sounds', 'Rain, forest, or ocean'],
        optional: false,
      },
      {
        id: 'warm-drink',
        name: 'Herbal Tea',
        description: 'Calming beverage',
        duration: 5,
        category: 'reading',
        intensity: 'low',
        icon: '🍵',
        instructions: [
          'Brew chamomile or valerian tea',
          'Sip slowly while relaxing',
          'Feel the warmth',
        ],
        optional: true,
      },
      {
        id: 'reading',
        name: 'Mindful Reading',
        description: 'Engaging but calming content',
        duration: 10,
        category: 'reading',
        intensity: 'low',
        icon: '📚',
        instructions: ['Read something engaging but not exciting', 'Avoid news or stressful content'],
        optional: true,
      },
      {
        id: 'full-body-scan',
        name: 'Full Body Scan',
        description: 'Deep progressive relaxation',
        duration: 15,
        category: 'meditation',
        intensity: 'low',
        icon: '🧘',
        instructions: [
          'Lie in bed',
          'Systematically tense and release each muscle group',
          'Start from toes, end with head',
          'Notice sensations of relaxation',
        ],
        optional: false,
      },
      {
        id: 'visualization',
        name: 'Peaceful Visualization',
        description: 'Guided mental imagery',
        duration: 10,
        category: 'meditation',
        intensity: 'low',
        icon: '🌙',
        instructions: [
          'Picture a peaceful place',
          'Engage all senses',
          'Stay in the scene for calming effect',
        ],
        optional: true,
      },
    ],
  },
};

/**
 * Get routine recommendation based on sleep time
 */
export function getRecommendedRoutine(minutesToSleep: number): WindDownRoutine {
  if (minutesToSleep <= 15) return PRESET_ROUTINES.express;
  if (minutesToSleep <= 30) return PRESET_ROUTINES.standard;
  return PRESET_ROUTINES.immersive;
}

/**
 * Create custom routine from activities
 */
export function createCustomRoutine(
  name: string,
  activities: RoutineActivity[]
): WindDownRoutine {
  const totalDuration = activities.reduce((sum, a) => sum + a.duration, 0);
  const difficulty = totalDuration < 20 ? 'easy' : totalDuration < 40 ? 'medium' : 'advanced';

  return {
    id: `custom-${Date.now()}`,
    name,
    totalDuration,
    activities,
    difficulty,
    description: 'Custom wind-down routine',
  };
}

/**
 * Get health benefits of an activity
 */
export function getActivityBenefits(activity: RoutineActivity): string[] {
  const benefits: Record<string, string[]> = {
    meditation: [
      'Reduces anxiety and stress',
      'Lowers heart rate',
      'Promotes deeper sleep',
    ],
    breathing: [
      'Calms nervous system',
      'Increases oxygen flow',
      'Reduces muscle tension',
    ],
    music: [
      'Promotes relaxation',
      'Reduces cortisol (stress hormone)',
      'Improves sleep quality',
    ],
    reading: [
      'Distracts from day\'s stress',
      'Engages mind calmly',
      'Natural fatigue inducer',
    ],
    stretching: [
      'Releases muscle tension',
      'Improves flexibility',
      'Promotes circulation',
    ],
    journaling: [
      'Clears racing thoughts',
      'Emotional processing',
      'Reduces mental burden',
    ],
  };

  return benefits[activity.category] || ['Promotes relaxation'];
}
