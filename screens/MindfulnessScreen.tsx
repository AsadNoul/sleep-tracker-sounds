import { useAppTheme } from '../hooks/useAppTheme';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import analyticsService from '../services/analyticsService';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Sparkles,
  Star,
  X,
  Clock,
  BarChart2,
  Wind,
  BookOpen,
  Accessibility,
  Play,
  Zap,
  Lock,
  Heart,
  Flame,
  Brain,
  Sun,
  Coffee,
  Baby,
  Music2,
  ChevronLeft,
  Pause,
  Trophy,
  Target,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveMindfulnessSession,
  getMindfulnessStats,
  type MindfulnessStats,
} from '../utils/mindfulnessTracking';
import { getPlayablePublicStoriesWithMeta } from '../services/storyContentService';
import BreathingCoach from '../components/BreathingCoach';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';

const { width } = Dimensions.get('window');

// Canvas reference: Rlx-Breathe.dc.html / Rlx-Library.dc.html (+ D- day variants).
// This screen covers more ground than the canvas (breathing coach, body scan,
// PMR, visualization, meditation, yoga, CBT-i course, stories, kids, etc. — all
// as one category-driven library), so the canvas's "Relax" library layout
// (hero pick card + pill filter row + icon list rows) is the direct visual
// match for the categories/sessions UI below, restyled onto the full dataset.
// Everything under "ALL SESSIONS DATA" / nav / tracking logic is unchanged.

type RootStackParamList = {
  SessionPlayer: { session: any };
  Subscription: undefined;
  SleepAnalysis: undefined;
};

interface MindfulnessSessionItem {
  id: string;
  title: string;
  duration: string;
  difficulty: string;
  image: string;
  premium: boolean;
  uri: string;
  description: string;
  tags?: string[];
}

interface Category {
  id: string;
  name: string;
  icon: any;
  premium?: boolean;
  color: string;
}

interface MindfulnessCompletionTracking {
  sessionId: string;
  sessionTitle: string;
  category: string;
  duration: number;
  userId?: string;
}

const FAVOURITES_KEY = '@mindfulness_favourites';
const LAST_CATEGORY_KEY = '@mindfulness_last_category';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

// ─── ALL SESSIONS DATA ───────────────────────────────────────────────────────

const ALL_SESSIONS: Record<string, MindfulnessSessionItem[]> = {
  'quick-relief': [
    {
      id: 'anxiety-relief',
      title: 'Anxiety Relief',
      duration: '3 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Rapid calming technique to reduce anxiety in just 3 minutes using grounding and breath.',
      tags: ['anxiety', 'fast', 'grounding'],
    },
    {
      id: 'panic-help',
      title: 'Panic Attack Help',
      duration: '5 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: '5-4-3-2-1 grounding exercise to anchor you through a panic attack.',
      tags: ['panic', 'grounding', 'emergency'],
    },
    {
      id: 'stress-release',
      title: 'Stress Release',
      duration: '4 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Quick body scan to release accumulated stress from head to toe.',
      tags: ['stress', 'body scan'],
    },
    {
      id: 'thought-defusion',
      title: 'Thought Defusion',
      duration: '5 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'ACT technique to detach from anxious thoughts and observe them without judgment.',
      tags: ['thoughts', 'ACT', 'anxiety'],
    },
    {
      id: 'worry-postponement',
      title: 'Worry Postponement',
      duration: '6 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'CBT technique to schedule your worries so they stop invading bedtime.',
      tags: ['CBT', 'worry', 'sleep'],
    },
  ],

  'breathing-coach': [
    {
      id: 'box-breathing',
      title: 'Box Breathing',
      duration: '5 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
      premium: false,
      uri: '',
      description: '4-4-4-4 pattern used by Navy SEALs for instant focus and calm.',
    },
    {
      id: '4-7-8-breathing',
      title: '4-7-8 Breathing',
      duration: '5 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80',
      premium: false,
      uri: '',
      description: "Dr. Weil's technique for rapid relaxation — fall asleep faster.",
    },
    {
      id: 'calm-breathing',
      title: 'Calm Breathing',
      duration: '5 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80',
      premium: false,
      uri: '',
      description: 'Extended exhale pattern activates your parasympathetic nervous system.',
    },
    {
      id: 'coherent-breathing',
      title: 'Coherent Breathing',
      duration: '10 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: '5 breaths per minute to improve HRV and reduce stress long term.',
    },
    {
      id: 'wim-hof',
      title: 'Wim Hof Method',
      duration: '20 min',
      difficulty: 'Intermediate',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Energizing breathwork technique to boost energy, focus, and resilience.',
    },
    {
      id: 'alternate-nostril',
      title: 'Nadi Shodhana',
      duration: '8 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Alternate nostril breathing to balance left and right brain hemispheres.',
    },
    {
      id: 'bhramari',
      title: 'Humming Bee Breath',
      duration: '5 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Bhramari pranayama — instant anxiety relief through gentle humming vibrations.',
    },
  ],

  meditation: [
    {
      id: 'meditation-gratitude',
      title: 'Gratitude for Sleep',
      duration: '10 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'End your day with a positive reflection to calm your mind for sleep.',
    },
    {
      id: 'meditation-1',
      title: 'Deep Sleep Meditation',
      duration: '20 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'A calming guided meditation to help you drift into deep, restful sleep.',
    },
    {
      id: 'meditation-2',
      title: 'Body Scan Relaxation',
      duration: '15 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1536629894121-4d162a042191?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Progressive relaxation technique to release tension from every muscle.',
    },
    {
      id: 'meditation-yoga-nidra',
      title: 'Yoga Nidra',
      duration: '30 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Guided deep relaxation — 30 min of Yoga Nidra equals 4 hours of sleep.',
    },
    {
      id: 'nsdr',
      title: 'NSDR Protocol',
      duration: '20 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Non-Sleep Deep Rest — Huberman Lab protocol for rapid mental recovery.',
    },
    {
      id: 'loving-kindness',
      title: 'Loving-Kindness (Metta)',
      duration: '15 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Cultivate compassion for yourself and others — powerful for self-criticism.',
    },
    {
      id: 'open-awareness',
      title: 'Open Awareness',
      duration: '10 min',
      difficulty: 'Intermediate',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'No focus object — pure effortless awareness of the present moment.',
    },
    {
      id: 'walking-meditation',
      title: 'Walking Meditation',
      duration: '10 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1476611317561-60117649dd94?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Turn your evening walk into a moving meditation — no sitting required.',
    },
  ],

  breathing: [
    {
      id: 'breathing-pmr',
      title: 'Progressive Muscle Relaxation',
      duration: '15 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Step-by-step physical technique to release body tension before bed.',
    },
    {
      id: 'breathing-1',
      title: '4-7-8 Breathing',
      duration: '10 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Simple breathing technique to reduce anxiety and promote relaxation.',
    },
    {
      id: 'breathing-2',
      title: 'Box Breathing',
      duration: '8 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Structured breathing pattern used by focus-driven professionals.',
    },
    {
      id: 'diaphragmatic',
      title: 'Diaphragmatic Breathing',
      duration: '8 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Belly breathing to activate the relaxation response and calm the nervous system.',
    },
  ],

  stories: [],

  yoga: [
    {
      id: 'yoga-1',
      title: 'Bedtime Yoga Flow',
      duration: '20 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1552196564-97ccf6131f0a?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Gentle yoga sequence to release tension and prepare your body for sleep.',
    },
    {
      id: 'legs-up-wall',
      title: 'Legs Up the Wall',
      duration: '10 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'The single best pre-sleep yoga pose — reduces cortisol and calms the nervous system.',
    },
    {
      id: 'childs-pose',
      title: "Child's Pose Flow",
      duration: '12 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1588286840104-8957b019727f?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Full gentle sequence anchored by the most restorative yoga pose.',
    },
    {
      id: 'restorative-yoga',
      title: 'Restorative Yoga',
      duration: '30 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Props-optional deeply relaxing poses held for 3–5 minutes each.',
    },
  ],

  'cbti-course': [
    {
      id: 'cbti-week1',
      title: 'Week 1 — Sleep Education',
      duration: '15 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Understand the science of sleep, why you wake up, and how CBT-i works.',
    },
    {
      id: 'cbti-week2',
      title: 'Week 2 — Sleep Restriction',
      duration: '20 min',
      difficulty: 'Intermediate',
      image: 'https://images.unsplash.com/photo-1495364141860-b0d03eccd065?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Consolidate your sleep using controlled sleep restriction — the core of CBT-i.',
    },
    {
      id: 'cbti-week3',
      title: 'Week 3 — Stimulus Control',
      duration: '15 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Retrain your brain to associate bed with sleep only — not screens or worry.',
    },
    {
      id: 'cbti-week4',
      title: 'Week 4 — Cognitive Restructuring',
      duration: '20 min',
      difficulty: 'Intermediate',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Challenge and reframe unhelpful thoughts about sleep and wakefulness.',
    },
    {
      id: 'cbti-week5',
      title: 'Week 5 — Relaxation Training',
      duration: '25 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Master evidence-based relaxation techniques for bedtime anxiety.',
    },
    {
      id: 'cbti-week6',
      title: 'Week 6 — Maintenance Plan',
      duration: '20 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Build your personalised long-term sleep plan to stay well after CBT-i.',
    },
  ],

  morning: [
    {
      id: 'morning-gratitude',
      title: 'Gratitude Wake-Up',
      duration: '5 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Start the day with 3 deep breaths and a moment of genuine gratitude.',
    },
    {
      id: 'morning-intention',
      title: 'Set Your Intention',
      duration: '5 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Choose one word to guide your day. A simple but powerful morning ritual.',
    },
    {
      id: 'morning-energy',
      title: 'Energy Activation',
      duration: '8 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Breathwork + gentle movement to wake up your body without coffee.',
    },
    {
      id: 'morning-focus',
      title: 'Focus Meditation',
      duration: '10 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Single-pointed concentration practice to sharpen morning focus.',
    },
    {
      id: 'morning-sun-salutation',
      title: 'Sun Salutation Breath',
      duration: '12 min',
      difficulty: 'Beginner',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'A flowing breathwork sequence inspired by the traditional yoga sun salutation.',
    },
  ],

  'power-nap': [
    {
      id: 'nap-10min',
      title: '10-Min NASA Nap',
      duration: '10 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1531353826977-0941b4779a1c?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'NASA-researched 10-minute nap — maximum alertness boost, no grogginess.',
    },
    {
      id: 'nap-20min',
      title: '20-Min Power Restore',
      duration: '20 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'Stage 1–2 sleep nap with gentle wake-up. Restores focus and mood.',
    },
    {
      id: 'nap-90min',
      title: '90-Min Full Cycle',
      duration: '90 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`,
      description: 'A full 90-min sleep cycle including REM — complete cognitive reset.',
    },
    {
      id: 'nap-coffee',
      title: 'Coffee Nap',
      duration: '20 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Drink coffee then nap immediately — caffeine kicks in just as you wake up.',
    },
  ],

  music: [
    {
      id: 'theta-waves',
      title: 'Theta Waves (Focus)',
      duration: '30 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/white-noise.mp3`,
      description: 'Theta binaural beats (4–8 Hz) for deep focus, creativity, and meditation.',
    },
    {
      id: 'delta-waves',
      title: 'Delta Waves (Sleep)',
      duration: '60 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/white-noise.mp3`,
      description: 'Delta wave frequencies clinically linked to deep, restorative sleep.',
    },
    {
      id: 'alpha-creativity',
      title: 'Alpha Waves (Calm)',
      duration: '30 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/white-noise.mp3`,
      description: 'Alpha waves (8–12 Hz) for relaxed alertness, light creativity, and calm.',
    },
    {
      id: 'ambient-music',
      title: 'Sleep Ambient Music',
      duration: '45 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`,
      description: 'Slowly evolving ambient soundscape composed specifically for sleep.',
    },
    {
      id: 'solfeggio',
      title: 'Solfeggio 528 Hz',
      duration: '40 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/white-noise.mp3`,
      description: '528 Hz "miracle tone" — associated with DNA repair and deep cellular calm.',
    },
  ],

  kids: [
    {
      id: 'kids-bunny-breath',
      title: 'Bunny Breathing',
      duration: '3 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Three quick sniffs in, one long out — a bunny breathing pattern kids love.',
    },
    {
      id: 'kids-cloud-float',
      title: 'Float on a Cloud',
      duration: '10 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1534794048419-b5b9daee8975?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'A gentle visualisation — lying on a soft cloud drifting through a pink sky.',
    },
    {
      id: 'kids-superhero',
      title: 'Superhero Pose',
      duration: '5 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1547558902-c0e053aba3c3?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Stand tall, breathe deep — become your favourite superhero before bed.',
    },
    {
      id: 'kids-sleepy-caterpillar',
      title: 'Sleepy Caterpillar',
      duration: '8 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1587855049254-351f4e55fe2a?w=400&q=80',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
      description: 'A cosy bedtime story about a caterpillar winding down for the night.',
    },
    {
      id: 'kids-magic-garden',
      title: 'Magic Garden Dream',
      duration: '12 min',
      difficulty: 'All Levels',
      image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
      premium: true,
      uri: `${GITHUB_BASE_URL}/forest-ambience.mp3`,
      description: 'A narrated journey through a magical, colourful garden full of friendly animals.',
    },
  ],
};

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

const CATEGORIES: Category[] = [
  { id: 'quick-relief', name: 'Quick Relief', icon: Zap, color: '#F59E0B' },
  { id: 'breathing-coach', name: 'Breathe', icon: Wind, color: '#60A5FA' },
  { id: 'meditation', name: 'Meditation', icon: Sparkles, color: '#8B5CF6' },
  { id: 'breathing', name: 'Breathing', icon: Wind, color: '#34D399' },
  { id: 'morning', name: 'Morning', icon: Sun, color: '#FBBF24' },
  { id: 'power-nap', name: 'Power Nap', icon: Coffee, color: '#A78BFA' },
  { id: 'music', name: 'Music & Beats', icon: Music2, color: '#EC4899', premium: true },
  { id: 'stories', name: 'Sleep Stories', icon: BookOpen, color: '#10B981' },
  { id: 'yoga', name: 'Yoga', icon: Accessibility, color: '#F87171', premium: true },
  { id: 'cbti-course', name: 'CBT-i Course', icon: Brain, color: '#6366F1', premium: true },
  { id: 'kids', name: 'Kids Wind Down', icon: Baby, color: '#FB923C' },
];

const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function MindfulnessScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPlaying, stopSound } = useAudio();
  const { user } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('meditation');
  const [selectedSession, setSelectedSession] = useState<MindfulnessSessionItem | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const activeSessionRef = useRef<MindfulnessSessionItem | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showBreathingCoach, setShowBreathingCoach] = useState(false);
  const [breathingPattern, setBreathingPattern] = useState<'box' | '4-7-8' | 'calm'>('box');
  const [pendingBreathingSession, setPendingBreathingSession] = useState<MindfulnessSessionItem | null>(null);
  const [mindfulnessStats, setMindfulnessStats] = useState<MindfulnessStats>({
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    lastSessionDate: null,
    sessionHistory: [],
  });
  const [favourites, setFavourites] = useState<Set<string>>(new Set());
  const [showFavourites, setShowFavourites] = useState(false);
  const [publicStories, setPublicStories] = useState<MindfulnessSessionItem[]>([]);
  const [isStoriesLoading, setIsStoriesLoading] = useState(false);
  const [storiesLastUpdated, setStoriesLastUpdated] = useState<number | null>(null);
  const [storiesSource, setStoriesSource] = useState<'cache' | 'network' | 'cache-stale' | 'fallback'>('network');
  const [dailyGoal] = useState(10); // minutes

  const hasPremium = isPremiumActive(
    user?.subscription_status,
    user?.subscription_end_date,
    user?.role,
    user?.email,
  );

  // Load stats, favourites, and last category on mount
  const loadStats = useCallback(async () => {
    const stats = await getMindfulnessStats(user?.id);
    setMindfulnessStats(stats);
  }, [user?.id]);

  useEffect(() => {
    loadStats();
    loadFavourites();
    loadLastCategory();
    loadPublicStories();
  }, [loadStats]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const loadPublicStories = useCallback(async () => {
    setIsStoriesLoading(true);
    try {
      const result = await getPlayablePublicStoriesWithMeta(10);
      const mappedStories: MindfulnessSessionItem[] = result.stories.map((story) => ({
        id: story.id,
        title: story.title,
        duration: `${story.durationMinutes} min`,
        difficulty: 'All Levels',
        image: story.image,
        premium: false,
        uri: story.uri,
        description: story.description,
        tags: ['public-domain', 'story'],
      }));
      setPublicStories(mappedStories);
      setStoriesLastUpdated(result.lastUpdated);
      setStoriesSource(result.source);
    } catch (_) {
      setPublicStories([]);
      setStoriesLastUpdated(null);
      setStoriesSource('fallback');
    } finally {
      setIsStoriesLoading(false);
    }
  }, []);

  const loadFavourites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVOURITES_KEY);
      if (stored) setFavourites(new Set(JSON.parse(stored)));
    } catch (_) {}
  };

  const loadLastCategory = async () => {
    try {
      const last = await AsyncStorage.getItem(LAST_CATEGORY_KEY);
      if (!last) return;

      if (VALID_CATEGORY_IDS.has(last)) {
        setSelectedCategory(last);
        return;
      }

      setSelectedCategory('meditation');
      await AsyncStorage.setItem(LAST_CATEGORY_KEY, 'meditation');
    } catch (_) {}
  };

  const handleCategorySelect = useCallback(async (id: string) => {
    const selectedCategoryMeta = CATEGORIES.find((category) => category.id === id);
    if (selectedCategoryMeta?.premium && !hasPremium) {
      Alert.alert(
        '⭐ Premium Category',
        `"${selectedCategoryMeta.name}" is available in Sleep App Premium.`,
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => { analyticsService.trackFeatureGateHit('mindfulness_category').catch(() => {}); navigation.navigate('Subscription', { source: 'mindfulness_category' }); } },
        ],
      );
      return;
    }

    setSelectedCategory(id);
    if (id === 'stories' && publicStories.length === 0 && !isStoriesLoading) {
      loadPublicStories();
    }
    try { await AsyncStorage.setItem(LAST_CATEGORY_KEY, id); } catch (_) {}
  }, [publicStories.length, isStoriesLoading, loadPublicStories, hasPremium, navigation]);

  const toggleFavourite = useCallback(async (sessionId: string) => {
    setFavourites(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      AsyncStorage.setItem(FAVOURITES_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  // Smart daily recommendation based on time & stats
  const getDailyRecommendation = (): MindfulnessSessionItem => {
    const hour = new Date().getHours();
    if (hour < 10) {
      return ALL_SESSIONS['morning'][0]; // Morning gratitude
    }
    if (hour >= 14 && hour <= 16) {
      return ALL_SESSIONS['power-nap'][0]; // Afternoon nap
    }
    if (mindfulnessStats.currentStreak === 0) {
      return ALL_SESSIONS['quick-relief'][0]; // Anxiety relief to re-engage
    }
    return ALL_SESSIONS['meditation'][4]; // NSDR default evening
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return theme.colors.success;
      case 'Intermediate': return theme.colors.warning;
      case 'Advanced': return theme.colors.error;
      case 'Specialist': return theme.colors.accent;
      default: return theme.colors.textSecondary;
    }
  };

  const saveCompletedSession = useCallback(async (
    session: MindfulnessSessionItem,
    categoryOverride?: string,
  ) => {
    const durationMinutes = parseInt(session.duration.match(/\d+/)?.[0] || '15', 10);
    const categoryForSave = categoryOverride ?? selectedCategory;

    try {
      await saveMindfulnessSession({
        sessionId: session.id,
        sessionTitle: session.title,
        category: categoryForSave,
        duration: durationMinutes,
        userId: user?.id,
      });
      await loadStats();
    } catch (_) {}
  }, [selectedCategory, user?.id, loadStats]);

  const handleSessionPress = useCallback((session: MindfulnessSessionItem) => {
    if (session.premium && !hasPremium) {
      Alert.alert(
        '⭐ Premium Content',
        `"${session.title}" is included in Sleep App Premium.\n\nUpgrade to unlock all sessions, stories, courses, and more.`,
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => { analyticsService.trackFeatureGateHit('mindfulness_session').catch(() => {}); navigation.navigate('Subscription', { source: 'mindfulness_session' }); } },
        ],
      );
      return;
    }

    // Breathing coach: launch modal directly
    if (selectedCategory === 'breathing-coach') {
      const patternMap: Record<string, 'box' | '4-7-8' | 'calm'> = {
        'box-breathing': 'box',
        '4-7-8-breathing': '4-7-8',
        'calm-breathing': 'calm',
        'coherent-breathing': 'calm',
        'alternate-nostril': 'calm',
        bhramari: 'calm',
      };
      setBreathingPattern(patternMap[session.id] || 'box');
      setPendingBreathingSession(session);
      setShowBreathingCoach(true);
      return;
    }

    setSelectedSession(session);
    setShowSessionModal(true);
  }, [selectedCategory, hasPremium, navigation]);

  const handleStartRecommendation = useCallback(() => {
    const rec = getDailyRecommendation();
    handleSessionPress(rec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mindfulnessStats.currentStreak, handleSessionPress]);

  const handleBeginSession = async () => {
    if (!selectedSession) return;

    setShowSessionModal(false);

    // Sessions with no audio URI → launch breathing coach modal instead
    if (!selectedSession.uri) {
      const patternMap: Record<string, 'box' | '4-7-8' | 'calm'> = {
        'box-breathing': 'box',
        '4-7-8-breathing': '4-7-8',
        'calm-breathing': 'calm',
        'coherent-breathing': 'calm',
        'alternate-nostril': 'calm',
        'bhramari': 'calm',
      };
      setPendingBreathingSession(selectedSession);
      setBreathingPattern(patternMap[selectedSession.id] || 'box');
      setShowBreathingCoach(true);
      return;
    }

    const durationMinutes = parseInt(selectedSession.duration.match(/\d+/)?.[0] || '15', 10);
    const completionTracking: MindfulnessCompletionTracking = {
      sessionId: selectedSession.id,
      sessionTitle: selectedSession.title,
      category: selectedCategory === 'breathing-coach' ? 'breathing' : selectedCategory,
      duration: durationMinutes,
      userId: user?.id,
    };

    // Keep ref so mini-player can re-open
    activeSessionRef.current = selectedSession;
    navigation.navigate('SessionPlayer', {
      session: selectedSession,
      mindfulnessCompletionTracking: completionTracking,
    });
  };

  // Daily goal progress (capped at 100%)
  const todayMinutes = mindfulnessStats.sessionHistory
    .filter(s => new Date(s.completedAt).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.duration, 0);
  const goalProgress = Math.min(todayMinutes / dailyGoal, 1);

  // All favourited sessions for the favourites tab
  const favouriteSessions: MindfulnessSessionItem[] = [...Object.values(ALL_SESSIONS).flat(), ...publicStories]
    .filter(s => favourites.has(s.id));

  const baseSessions = selectedCategory === 'stories'
    ? publicStories
    : (ALL_SESSIONS[selectedCategory] || []);

  const displayedSessions = showFavourites
    ? favouriteSessions
    : baseSessions;

  const isStoryGridLoading = !showFavourites
    && selectedCategory === 'stories'
    && isStoriesLoading
    && displayedSessions.length === 0;

  const s = styles(theme);
  const storyStatusText = (() => {
    if (isStoriesLoading) return 'Updating stories...';

    const prefix = storiesSource === 'cache-stale'
      ? 'Showing cached stories'
      : storiesSource === 'cache'
        ? 'From cache'
        : storiesSource === 'fallback'
          ? 'Fallback stories'
          : 'Updated';

    if (!storiesLastUpdated) return prefix;

    return `${prefix} • ${new Date(storiesLastUpdated).toLocaleString()}`;
  })();

  const storyStatusColor = (() => {
    if (isStoriesLoading) return theme.colors.textSecondary;
    if (storiesSource === 'network' || storiesSource === 'cache') return theme.colors.success;
    if (storiesSource === 'cache-stale') return theme.colors.warning;
    return theme.colors.textSecondary;
  })();

  const recommendation = getDailyRecommendation();

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 16 }]}
      >
        {/* ── HEADER ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <TouchableOpacity
              style={[s.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
            </TouchableOpacity>
            <View style={s.headerTitleBlock}>
              <Text style={[s.title, { color: theme.colors.textPrimary }]}>Mindfulness</Text>
              <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>Find your inner peace</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            {mindfulnessStats.currentStreak > 0 && (
              <View style={[s.headerStreakPill, { backgroundColor: theme.colors.accentLight, borderColor: theme.colors.accentBorder }]}>
                <Flame size={13} color={theme.colors.warning} />
                <Text style={[s.headerStreakText, { color: theme.colors.warning }]}>{mindfulnessStats.currentStreak}d</Text>
              </View>
            )}
            <TouchableOpacity
              style={[s.statsButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
              onPress={() => navigation.navigate('SleepAnalysis')}
            >
              <BarChart2 size={18} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STATS ROW ── */}
        <View style={[s.statsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={s.statItem}>
            <View style={s.statIconRow}>
              <Sparkles size={13} color={theme.colors.accent} />
              <Text style={[s.statValue, { color: theme.colors.textPrimary }]}>
                {mindfulnessStats.totalSessions}
              </Text>
            </View>
            <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>Sessions</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
          <View style={s.statItem}>
            <View style={s.statIconRow}>
              <Clock size={13} color={theme.colors.accent} />
              <Text style={[s.statValue, { color: theme.colors.textPrimary }]}>
                {mindfulnessStats.totalMinutes}
              </Text>
            </View>
            <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>Minutes</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
          <View style={s.statItem}>
            <View style={s.statIconRow}>
              <Flame size={14} color={mindfulnessStats.currentStreak >= 3 ? theme.colors.warning : theme.colors.textTertiary} />
              <Text style={[s.statValue, { color: mindfulnessStats.currentStreak >= 3 ? theme.colors.warning : theme.colors.textPrimary }]}>
                {mindfulnessStats.currentStreak}
              </Text>
            </View>
            <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>Day Streak</Text>
          </View>
        </View>

        {/* ── DAILY GOAL PROGRESS ── */}
        <View style={[s.goalCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
          <View style={s.goalHeader}>
            <View style={s.goalHeaderLeft}>
              <Target size={15} color={theme.colors.accent} />
              <Text style={[s.goalLabel, { color: theme.colors.textPrimary }]}>
                Daily Goal
              </Text>
            </View>
            <View style={s.goalHeaderRight}>
              <Text style={[s.goalProgress, { color: goalProgress >= 1 ? theme.colors.success : theme.colors.accent }]}>
                {todayMinutes}/{dailyGoal} min
              </Text>
              <Text style={[s.goalPct, { color: goalProgress >= 1 ? theme.colors.success : theme.colors.textSecondary }]}>
                {' '}· {Math.min(Math.round(goalProgress * 100), 100)}%
              </Text>
            </View>
          </View>
          <View style={[s.goalTrack, { backgroundColor: theme.colors.cardBorder }]}>
            <View
              style={[
                s.goalFill,
                {
                  backgroundColor: goalProgress >= 1 ? theme.colors.success : theme.colors.accent,
                  width: `${Math.min(Math.max(goalProgress * 100, 0), 100).toFixed(1)}%` as any,
                },
              ]}
            />
          </View>
          {goalProgress >= 1 && (
            <View style={s.goalCompleteRow}>
              <Trophy size={14} color={theme.colors.warning} />
              <Text style={[s.goalCompleteText, { color: theme.colors.success }]}>
                Goal complete! Great work today.
              </Text>
            </View>
          )}
        </View>

        {/* ── TONIGHT'S PICK (canvas: Rlx-Library hero card) ── */}
        <TouchableOpacity
          style={[s.pickCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.accentBorder }]}
          onPress={handleStartRecommendation}
          activeOpacity={0.9}
        >
          <View pointerEvents="none" style={[s.pickGlow, { backgroundColor: theme.colors.accentLight }]} />
          <View style={s.pickImageRow}>
            <Image source={{ uri: recommendation.image }} style={s.pickImage} />
            <View style={s.pickTextCol}>
              <Text style={[s.pickEyebrow, { color: theme.colors.textTertiary }]}>TONIGHT'S PICK</Text>
              <Text style={[s.pickTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {recommendation.title}
              </Text>
              <View style={s.pickMetaRow}>
                <Clock size={12} color={theme.colors.textSecondary} />
                <Text style={[s.pickMetaText, { color: theme.colors.textSecondary }]}>{recommendation.duration}</Text>
                <View style={[s.pickMetaDot, { backgroundColor: theme.colors.textTertiary }]} />
                <Text style={[s.pickMetaText, { color: theme.colors.textSecondary }]}>{recommendation.difficulty}</Text>
              </View>
            </View>
          </View>
          <View style={[s.pickStartButton, { backgroundColor: theme.colors.ctaBackground }]}>
            <Play size={14} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
            <Text style={[s.pickStartText, { color: theme.colors.ctaText }]}>Start</Text>
          </View>
        </TouchableOpacity>

        {/* ── FAVOURITES TOGGLE ── */}
        <View style={s.favRow}>
          <TouchableOpacity
            style={[
              s.favToggle,
              {
                backgroundColor: showFavourites ? theme.colors.selectedBackground : theme.colors.card,
                borderColor: showFavourites ? theme.colors.accent : theme.colors.cardBorder,
              },
            ]}
            onPress={() => setShowFavourites(v => !v)}
          >
            <Heart
              size={15}
              color={showFavourites ? theme.colors.accent : theme.colors.textSecondary}
              fill={showFavourites ? theme.colors.accent : 'none'}
            />
            <Text
              style={[
                s.favToggleText,
                { color: showFavourites ? theme.colors.accent : theme.colors.textSecondary },
              ]}
            >
              {showFavourites ? `Favourites (${favouriteSessions.length})` : 'My Favourites'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── CATEGORIES — canvas: Rlx-Library pill filter row ── */}
        {!showFavourites && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.categoriesContainer}
            contentContainerStyle={s.categoriesContent}
          >
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              const locked = cat.premium && !hasPremium;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    s.categoryChip,
                    {
                      backgroundColor: isSelected ? theme.colors.ctaBackground : theme.colors.card,
                      borderColor: isSelected ? theme.colors.ctaBackground : theme.colors.cardBorder,
                      opacity: locked ? 0.7 : 1,
                    },
                  ]}
                  onPress={() => handleCategorySelect(cat.id)}
                >
                  <Icon size={14} color={isSelected ? theme.colors.ctaText : theme.colors.textSecondary} />
                  <Text
                    style={[
                      s.categoryChipText,
                      { color: isSelected ? theme.colors.ctaText : theme.colors.textSecondary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                  {locked && (
                    <Lock size={10} color={isSelected ? theme.colors.ctaText : theme.colors.premium} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {!showFavourites && selectedCategory === 'stories' && (
          <View style={s.storyStatusRow}>
            <Text style={[s.storyStatusText, { color: storyStatusColor }]}>
              {storyStatusText}
            </Text>
          </View>
        )}

        {/* ── SESSIONS LIST — canvas: Rlx-Library icon-row list ── */}
        {isStoryGridLoading ? (
          <View style={[s.sessionsListCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            {Array.from({ length: 4 }).map((_, index) => (
              <View
                key={`story-loading-row-${index}`}
                style={[s.sessionRow, index < 3 && { borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder }]}
              >
                <View style={[s.sessionRowIcon, s.loadingBlock, { backgroundColor: theme.colors.cardBorder }]} />
                <View style={s.sessionRowTextCol}>
                  <View style={[s.loadingLinePrimary, { backgroundColor: theme.colors.cardBorder }]} />
                  <View style={[s.loadingLineSecondary, { backgroundColor: theme.colors.cardBorder }]} />
                </View>
                <View style={[s.loadingPill, { backgroundColor: theme.colors.cardBorder }]} />
              </View>
            ))}
          </View>
        ) : displayedSessions.length === 0 ? (
          <View style={s.emptyFav}>
            <View style={[s.emptyFavCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.cardBorder }]}>
              <View pointerEvents="none" style={[s.pickGlow, { backgroundColor: theme.colors.accentLight }]} />
              <Text style={s.emptyFavEmoji}>
                {showFavourites ? '🤍' : selectedCategory === 'stories' ? '📖' : '🧘'}
              </Text>
              <Text style={[s.emptyFavTitle, { color: theme.colors.textPrimary }]}>
                {showFavourites ? 'No favourites yet' : selectedCategory === 'stories' ? 'No stories found' : 'Nothing here yet'}
              </Text>
              <Text style={[s.emptyFavText, { color: theme.colors.textSecondary }]}>
                {showFavourites
                  ? 'Tap the heart on any session to save it here for quick access.'
                  : selectedCategory === 'stories'
                    ? isStoriesLoading
                      ? 'Loading public stories...'
                      : 'No playable stories found right now. Pull to refresh.'
                    : 'No sessions available in this category.'}
              </Text>
              {!showFavourites && selectedCategory === 'stories' && !isStoriesLoading && (
                <TouchableOpacity
                  style={[s.beginButton, { backgroundColor: theme.colors.ctaBackground, marginTop: 16, paddingHorizontal: 24, alignSelf: 'center' }]}
                  onPress={loadPublicStories}
                >
                  <Text style={[s.beginButtonText, { color: theme.colors.ctaText }]}>Retry Loading Stories</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={[s.sessionsListCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            {displayedSessions.map((session, index) => {
              const isFav = favourites.has(session.id);
              const locked = session.premium && !hasPremium;
              const isLast = index === displayedSessions.length - 1;
              return (
                <TouchableOpacity
                  key={session.id}
                  style={[s.sessionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder }]}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.8}
                >
                  <View style={s.sessionRowThumbWrap}>
                    {failedImages.has(session.id) ? (
                      <View style={[s.sessionRowThumb, { backgroundColor: theme.colors.backgroundTertiary }]} />
                    ) : (
                      <Image
                        source={{ uri: session.image }}
                        style={s.sessionRowThumb}
                        onError={() => setFailedImages(prev => new Set([...prev, session.id]))}
                      />
                    )}
                    {locked && (
                      <View style={s.sessionRowLockOverlay}>
                        <Lock size={13} color={theme.colors.ctaText} />
                      </View>
                    )}
                  </View>
                  <View style={s.sessionRowTextCol}>
                    <Text style={[s.sessionRowTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {session.title}
                    </Text>
                    <View style={s.sessionRowSubRow}>
                      <Text style={[s.sessionRowSub, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                        {session.duration}
                      </Text>
                      <View style={[s.sessionRowSubDot, { backgroundColor: theme.colors.textTertiary }]} />
                      <Text
                        style={[s.sessionRowSub, { color: getDifficultyColor(session.difficulty) }]}
                        numberOfLines={1}
                      >
                        {session.difficulty}
                      </Text>
                      {session.premium && (
                        <>
                          <View style={[s.sessionRowSubDot, { backgroundColor: theme.colors.textTertiary }]} />
                          <Star size={9} color={theme.colors.premium} fill={theme.colors.premium} />
                        </>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      s.sessionRowFavBtn,
                      isFav && { backgroundColor: theme.colors.selectedBackground },
                    ]}
                    onPress={(event) => {
                      event.stopPropagation();
                      toggleFavourite(session.id);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Heart
                      size={15}
                      color={isFav ? theme.colors.accent : theme.colors.textTertiary}
                      fill={isFav ? theme.colors.accent : 'none'}
                    />
                  </TouchableOpacity>
                  {locked ? (
                    <View style={[s.sessionRowUnlockBtn, { backgroundColor: theme.colors.premiumBadgeBackground }]}>
                      <Text style={[s.sessionRowUnlockText, { color: theme.colors.premiumBadgeText }]}>Unlock</Text>
                    </View>
                  ) : (
                    <View style={[s.sessionRowPlayBtn, { borderColor: theme.colors.accent }]}>
                      <Play size={13} color={theme.colors.accent} fill={theme.colors.accent} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: bottomMargin + 16 }} />
      </ScrollView>

      {/* ── MINI PLAYER ── */}
      {isPlaying && (
        <TouchableOpacity
          style={[s.miniPlayer, { bottom: bottomMargin + 12, borderColor: theme.colors.accentBorder }]}
          onPress={() => {
            if (activeSessionRef.current) {
              setSelectedSession(activeSessionRef.current);
              setShowSessionModal(true);
            }
          }}
        >
          <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.accentLight }]} />
          <View style={[s.miniPlayerAccent, { backgroundColor: theme.colors.accent }]} />
          <View style={s.miniPlayerContent}>
            <Image
              source={{
                uri:
                  activeSessionRef.current?.image ||
                  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=100',
              }}
              style={s.miniArtwork}
            />
            <View style={s.miniInfo}>
              <Text
                style={[s.miniTitle, { color: theme.colors.textPrimary }]}
                numberOfLines={1}
              >
                {activeSessionRef.current?.title || 'Playing'}
              </Text>
              <View style={s.miniLiveRow}>
                <View style={[s.miniLiveDot, { backgroundColor: theme.colors.success }]} />
                <Text style={[s.miniSubtitle, { color: theme.colors.textSecondary }]}>
                  Now Playing
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[s.miniStopBtn, { backgroundColor: theme.colors.accentLight }]}
              onPress={() => stopSound()}
            >
              <Pause size={18} color={theme.colors.accent} fill={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* ── SESSION DETAIL MODAL ── */}
      <Modal
        visible={showSessionModal}
        transparent
        animationType='slide'
        onRequestClose={() => setShowSessionModal(false)}
      >
        <View style={s.modalContainer}>
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={s.modalBlur}>
            <View style={[s.modalContent, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity
                style={[s.closeButton, { backgroundColor: theme.colors.backgroundTertiary }]}
                onPress={() => setShowSessionModal(false)}
              >
                <X size={20} color={theme.colors.textPrimary} />
              </TouchableOpacity>

              {selectedSession && (
                <>
                  {failedImages.has(selectedSession.id) ? (
                    <View style={[s.modalImage, { backgroundColor: theme.colors.backgroundTertiary }]} />
                  ) : (
                    <Image
                      source={{ uri: selectedSession.image }}
                      style={s.modalImage}
                      onError={() => setFailedImages(prev => new Set([...prev, selectedSession.id]))}
                    />
                  )}
                  <View style={s.modalBody}>
                    <Text style={[s.modalTitle, { color: theme.colors.textPrimary }]}>
                      {selectedSession.title}
                    </Text>
                    <View style={s.modalMetaRow}>
                      <View style={s.modalMetaItem}>
                        <Clock size={15} color={theme.colors.textSecondary} />
                        <Text style={[s.modalMetaText, { color: theme.colors.textSecondary }]}>
                          {selectedSession.duration}
                        </Text>
                      </View>
                      <View style={s.modalMetaItem}>
                        <Sparkles size={15} color={theme.colors.textSecondary} />
                        <Text style={[s.modalMetaText, { color: theme.colors.textSecondary }]}>
                          {selectedSession.difficulty}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.modalDescription, { color: theme.colors.textSecondary }]}>
                      {selectedSession.description}
                    </Text>

                    {/* Tags */}
                    {selectedSession.tags && selectedSession.tags.length > 0 && (
                      <View style={s.tagsRow}>
                        {selectedSession.tags.map(tag => (
                          <View
                            key={tag}
                            style={[s.tag, { backgroundColor: theme.colors.accentLight }]}
                          >
                            <Text style={[s.tagText, { color: theme.colors.accent }]}>
                              #{tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity
                      style={[s.beginButton, { backgroundColor: theme.colors.ctaBackground }]}
                      onPress={handleBeginSession}
                      activeOpacity={0.88}
                    >
                      <Play size={18} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
                      <Text style={[s.beginButtonText, { color: theme.colors.ctaText }]}>Begin Session</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* ── BREATHING COACH MODAL — canvas: Rlx-Breathe.dc.html chrome ── */}
      <Modal
        visible={showBreathingCoach}
        transparent
        animationType='fade'
        onRequestClose={() => setShowBreathingCoach(false)}
      >
        <View style={[s.breathingContainer, { backgroundColor: theme.colors.background }]}>
          <TouchableOpacity
            style={[s.breathingClose, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            onPress={() => {
              setShowBreathingCoach(false);
              setPendingBreathingSession(null);
            }}
          >
            <X size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <BreathingCoach
            pattern={breathingPattern}
            onComplete={async () => {
              if (pendingBreathingSession) {
                await saveCompletedSession(pendingBreathingSession, 'breathing');
              }
              setShowBreathingCoach(false);
              setPendingBreathingSession(null);
              Alert.alert('Well done!', 'You completed your breathing session.');
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
// Theme-driven throughout — no hardcoded hex values. Matches the canvas's
// Fraunces (display) + DM Sans (body) split, card radii, and warm accent
// treatment from Rlx-Breathe / Rlx-Library. rowGap/columnGap/margins used in
// place of bare `gap:` per project convention.

function styles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingHorizontal: 20 },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitleBlock: { marginLeft: 12 },
    title: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 24,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      marginTop: 2,
    },
    statsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },

    headerStreakPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
    },
    headerStreakText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 12,
      marginLeft: 4,
    },

    // Stats
    statsCard: {
      flexDirection: 'row',
      padding: 18,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      marginBottom: 14,
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    statItem: { alignItems: 'center' },
    statIconRow: { flexDirection: 'row', alignItems: 'center', columnGap: 4 },
    statValue: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 19 },
    statLabel: { fontFamily: theme.typography.fontFamily.body, fontSize: 11, marginTop: 3 },
    statDivider: { width: 1, height: 28 },

    // Goal
    goalCard: {
      padding: 16,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      marginBottom: 20,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    goalHeaderLeft: { flexDirection: 'row', alignItems: 'center', columnGap: 8 },
    goalHeaderRight: { flexDirection: 'row', alignItems: 'center' },
    goalLabel: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 14 },
    goalProgress: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 13 },
    goalPct: { fontFamily: theme.typography.fontFamily.bodyMedium, fontSize: 12 },
    goalTrack: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    goalFill: {
      height: 8,
      borderRadius: 4,
      minWidth: 8,
    },
    goalCompleteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, columnGap: 6 },
    goalCompleteText: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 12 },

    // Tonight's pick (canvas hero card)
    pickCard: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      padding: 16,
      marginBottom: 20,
      rowGap: 14,
    },
    pickGlow: {
      position: 'absolute',
      right: -50,
      top: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
    },
    pickImageRow: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
    pickImage: { width: 64, height: 64, borderRadius: 16 },
    pickTextCol: { flex: 1, rowGap: 3 },
    pickEyebrow: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 11,
      letterSpacing: 1,
    },
    pickTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 19,
    },
    pickMetaRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
    pickMetaText: { fontFamily: theme.typography.fontFamily.body, fontSize: 12 },
    pickMetaDot: { width: 3, height: 3, borderRadius: 1.5 },
    pickStartButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
      height: 44,
      paddingHorizontal: 20,
      borderRadius: 16,
    },
    pickStartText: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 14 },

    // Favourites toggle
    favRow: { marginBottom: 16 },
    favToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      borderWidth: 1,
      columnGap: 8,
    },
    favToggleText: { fontFamily: theme.typography.fontFamily.bodySemibold, fontSize: 13 },

    // Categories (canvas pill filter row)
    categoriesContainer: { marginBottom: 20, marginHorizontal: -20 },
    categoriesContent: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      marginRight: 8,
      columnGap: 6,
    },
    categoryChipText: { fontFamily: theme.typography.fontFamily.bodySemibold, fontSize: 13 },
    storyStatusRow: { marginTop: -8, marginBottom: 14 },
    storyStatusText: { fontFamily: theme.typography.fontFamily.bodyMedium, fontSize: 12 },

    // Sessions list (canvas: icon-row list card)
    sessionsListCard: {
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      paddingHorizontal: 14,
    },
    sessionRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      paddingVertical: 12,
    },
    sessionRowThumbWrap: { position: 'relative' },
    sessionRowThumb: { width: 50, height: 50, borderRadius: 14 },
    sessionRowLockOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 14,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionRowTextCol: { flex: 1, rowGap: 3 },
    sessionRowTitle: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 15 },
    sessionRowSubRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
    sessionRowSub: { fontFamily: theme.typography.fontFamily.body, fontSize: 12 },
    sessionRowSubDot: { width: 3, height: 3, borderRadius: 1.5 },
    sessionRowFavBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionRowPlayBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1.5,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionRowUnlockBtn: {
      height: 32,
      paddingHorizontal: 12,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sessionRowUnlockText: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 12 },

    loadingBlock: { opacity: 0.55 },
    loadingLinePrimary: { height: 13, borderRadius: 6, width: '70%', opacity: 0.6 },
    loadingLineSecondary: { height: 10, borderRadius: 5, width: 90, opacity: 0.5, marginTop: 8 },
    loadingPill: { height: 32, borderRadius: 16, width: 36, opacity: 0.5 },

    emptyFav: { alignItems: 'center', paddingVertical: 10 },
    emptyFavCard: {
      position: 'relative',
      overflow: 'hidden',
      alignItems: 'center',
      paddingVertical: 36,
      paddingHorizontal: 24,
      borderRadius: theme.borderRadius.card,
      width: '100%',
      borderWidth: 1,
    },
    emptyFavEmoji: { fontSize: 44, marginBottom: 14 },
    emptyFavTitle: { fontFamily: theme.typography.fontFamily.displaySemibold, fontSize: 18, marginBottom: 8 },
    emptyFavText: { fontFamily: theme.typography.fontFamily.body, fontSize: 14, textAlign: 'center', lineHeight: 21 },

    // Modal
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalBlur: { flex: 1, justifyContent: 'flex-end' },
    modalContent: {
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingBottom: 36,
      overflow: 'hidden',
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalImage: { width: '100%', height: 230 },
    modalBody: { padding: 22 },
    modalTitle: { fontFamily: theme.typography.fontFamily.displaySemibold, fontSize: 22, marginBottom: 10 },
    modalMetaRow: { flexDirection: 'row', marginBottom: 14, columnGap: 20 },
    modalMetaItem: { flexDirection: 'row', alignItems: 'center', columnGap: 6 },
    modalMetaText: { fontFamily: theme.typography.fontFamily.body, fontSize: 13 },
    modalDescription: { fontFamily: theme.typography.fontFamily.body, fontSize: 15, lineHeight: 23, marginBottom: 16 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
    tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 8, marginBottom: 6 },
    tagText: { fontFamily: theme.typography.fontFamily.bodySemibold, fontSize: 11 },
    beginButton: {
      flexDirection: 'row',
      height: 56,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      columnGap: 10,
    },
    beginButtonText: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 17 },

    // Breathing
    breathingContainer: { flex: 1 },
    breathingClose: {
      position: 'absolute',
      top: 56,
      right: 20,
      zIndex: 10,
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Mini player
    miniPlayer: {
      position: 'absolute',
      left: 16,
      right: 16,
      height: 70,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
    },
    miniPlayerAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
      zIndex: 2,
    },
    miniPlayerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 18,
      paddingRight: 12,
      columnGap: 12,
    },
    miniArtwork: { width: 46, height: 46, borderRadius: 10 },
    miniInfo: { flex: 1 },
    miniTitle: { fontFamily: theme.typography.fontFamily.bodyBold, fontSize: 14 },
    miniLiveRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, columnGap: 5 },
    miniSubtitle: { fontFamily: theme.typography.fontFamily.body, fontSize: 11 },
    miniLiveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    miniStopBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}
