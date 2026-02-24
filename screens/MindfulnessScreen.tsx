import { useAppTheme } from '../hooks/useAppTheme';
import { isPremiumActive } from '../utils/subscriptionHelpers';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Sparkles,
  Star,
  X,
  Clock,
  BarChart2,
  CheckCircle2,
  Heart,
  Search,
  Settings,
  Mic,
  Timer,
  Pause,
  Square,
  ChevronDown,
  ChevronLeft,
  MoreHorizontal,
  Wind,
  BookOpen,
  Accessibility,
  Play,
  AlertCircle,
  Zap,
  Shield
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import {
  saveMindfulnessSession,
  getMindfulnessStats,
  formatMindfulnessTime,
  type MindfulnessStats,
} from '../utils/mindfulnessTracking';
import BreathingCoach from '../components/BreathingCoach';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';

type RootStackParamList = {
  SessionPlayer: { session: any };
};

interface MindfulnessSession {
  id: string;
  title: string;
  duration: string;
  difficulty: string;
  image: string;
  premium: boolean;
  uri: string;
  description: string;
}

export default function MindfulnessScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPlaying, currentSound, playSound, stopSound } = useAudio();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('meditation');
  const [selectedSession, setSelectedSession] = useState<MindfulnessSession | null>(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showBreathingCoach, setShowBreathingCoach] = useState(false);
  const [breathingPattern, setBreathingPattern] = useState<'box' | '4-7-8' | 'calm'>('box');
  const [mindfulnessStats, setMindfulnessStats] = useState<MindfulnessStats>({
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    lastSessionDate: null,
    sessionHistory: [],
  });

  // Load mindfulness stats on mount and when session modal closes
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const stats = await getMindfulnessStats();
    setMindfulnessStats(stats);
  };

  const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

  const categories = [
    { id: 'quick-relief', name: 'Quick Relief', icon: Zap },
    { id: 'breathing-coach', name: 'Breathing Coach', icon: Wind },
    { id: 'meditation', name: 'Meditation', icon: Sparkles },
    { id: 'breathing', name: 'Breathing', icon: Wind },
    { id: 'stories', name: 'Sleep Stories', icon: BookOpen, premium: true },
    { id: 'yoga', name: 'Yoga', icon: Accessibility, premium: true },
  ];

  const sessions = {
    'quick-relief': [
      {
        id: 'anxiety-relief',
        title: 'Anxiety Relief',
        duration: '3 min',
        difficulty: 'All Levels',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Rapid calming technique to reduce anxiety in just 3 minutes'
      },
      {
        id: 'panic-help',
        title: 'Panic Attack Help',
        duration: '5 min',
        difficulty: 'All Levels',
        image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
        description: 'Grounding exercise to help you through a panic attack'
      },
      {
        id: 'stress-release',
        title: 'Stress Release',
        duration: '4 min',
        difficulty: 'All Levels',
        image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Quick body scan to release accumulated stress'
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
        description: '4-4-4-4 pattern used by Navy SEALs for focus and calm'
      },
      {
        id: '4-7-8-breathing',
        title: '4-7-8 Breathing',
        duration: '5 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80',
        premium: false,
        uri: '',
        description: 'Dr. Weil\'s technique for rapid relaxation and sleep'
      },
      {
        id: 'calm-breathing',
        title: 'Calm Breathing',
        duration: '5 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80',
        premium: false,
        uri: '',
        description: 'Extended exhale pattern for deep relaxation'
      },
    ],
    meditation: [
      {
        id: 'meditation-yoga-nidra',
        title: 'Yoga Nidra (Psychic Sleep)',
        duration: '30 min',
        difficulty: 'All Levels',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
        description: 'Guided deep relaxation based on the ancient practice of Yoga Nidra.'
      },
      {
        id: 'meditation-gratitude',
        title: 'Gratitude for Sleep',
        duration: '10 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'End your day with a positive reflection to calm your mind.'
      },
      {
        id: 'meditation-1',
        title: 'Deep Sleep Meditation',
        duration: '20 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
        description: 'A calming guided meditation to help you drift into deep, restful sleep'
      },
      {
        id: 'meditation-2',
        title: 'Body Scan Relaxation',
        duration: '15 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1536629894121-4d162a042191?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Progressive relaxation technique to release tension throughout your body'
      },
    ],
    breathing: [
      {
        id: 'breathing-pmr',
        title: 'Progressive Muscle Relaxation',
        duration: '15 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Step-by-step physical technique to release body tension before bed.'
      },
      {
        id: 'breathing-1',
        title: '4-7-8 Breathing',
        duration: '10 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Simple breathing technique to reduce anxiety and promote relaxation'
      },
      {
        id: 'breathing-2',
        title: 'Box Breathing',
        duration: '8 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&q=80',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
        description: 'Structured breathing pattern used by focus-driven professionals'
      },
    ],
    stories: [
      {
        id: 'binaural-zeta',
        title: 'Binaural Beats (Zeta)',
        duration: '60 min',
        difficulty: 'Specialist',
        image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
        premium: true,
        uri: `${GITHUB_BASE_URL}/white-noise.mp3`,
        description: 'Advanced frequencies optimized for deep sleep and stress reduction.'
      },
      {
        id: 'story-1',
        title: 'Enchanted Forest Walk',
        duration: '35 min',
        difficulty: 'All Levels',
        image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
        premium: true,
        uri: `${GITHUB_BASE_URL}/forest-ambience.mp3`,
        description: 'A magical journey through an enchanted forest filled with wonder and peace'
      },
      {
        id: 'story-2',
        title: 'Ocean Dreams',
        duration: '40 min',
        difficulty: 'All Levels',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
        premium: true,
        uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`,
        description: 'Drift away on gentle ocean waves in this soothing bedtime story'
      },
    ],
    yoga: [
      {
        id: 'yoga-1',
        title: 'Bedtime Yoga Flow',
        duration: '20 min',
        difficulty: 'Beginner',
        image: 'https://images.unsplash.com/photo-1552196564-97ccf6131f0a?w=400&q=80',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Gentle yoga sequence to release tension and prepare your body for sleep'
      },
    ],
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return theme.colors.accent;
      case 'Intermediate': return theme.colors.premium;
      case 'Advanced': return theme.colors.danger;
      default: return theme.colors.highlight;
    }
  };

  const handleSessionPress = (session: MindfulnessSession) => {
    // Handle breathing coach sessions specially
    if (selectedCategory === 'breathing-coach') {
      const patternMap: { [key: string]: 'box' | '4-7-8' | 'calm' } = {
        'box-breathing': 'box',
        '4-7-8-breathing': '4-7-8',
        'calm-breathing': 'calm',
      };
      setBreathingPattern(patternMap[session.id] || 'box');
      setShowBreathingCoach(true);
      return;
    }

    if (session.premium) {
      // Check if user has premium subscription (including cancelled with valid end date)
      const hasPremiumAccess = isPremiumActive(user?.subscription_status, user?.subscription_end_date, user?.role, user?.email);

      if (!hasPremiumAccess) {
        Alert.alert(
          'Premium Content',
          'This session is part of our premium content. Upgrade to unlock all meditation sessions, sleep stories, breathing exercises, and yoga flows.',
          [
            {
              text: 'Maybe Later',
              style: 'cancel'
            },
            {
              text: 'Upgrade Now',
              onPress: () => navigation.navigate('Subscription' as never)
            }
          ]
        );
        return;
      }
    }

    setSelectedSession(session);
    setShowSessionModal(true);
  };

  const handleStartRecommendation = () => {
    const recommendationSession = {
      id: 'recommendation',
      title: 'Evening Wind Down',
      duration: '15 min',
      difficulty: 'Beginner',
      image: 'https://api.a0.dev/assets/image?text=peaceful%20evening%20meditation%20scene&aspect=16:9',
      premium: false,
      uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
      description: 'Perfect for tonight\'s sleep preparation'
    };
    setSelectedSession(recommendationSession);
    setShowSessionModal(true);
  };

  const handleBeginSession = async () => {
    if (selectedSession) {
      // Save session completion
      const durationMinutes = parseInt(selectedSession.duration) || 15;

      try {
        await saveMindfulnessSession({
          sessionId: selectedSession.id,
          sessionTitle: selectedSession.title,
          category: selectedCategory,
          duration: durationMinutes,
          userId: user?.id,
        });

        // Reload stats
        await loadStats();

        setShowSessionModal(false);
        navigation.navigate('SessionPlayer', { session: selectedSession });
      } catch (error) {
        console.error('Error saving mindfulness session:', error);
        setShowSessionModal(false);
        navigation.navigate('SessionPlayer', { session: selectedSession });
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#f0f4ff', '#ffffff']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.greeting, { color: theme.colors.textPrimary }]}>Mindfulness</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Find your inner peace</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.statsButton, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.navigate('SleepAnalysis' as never)}
          >
            <BarChart2 size={20} color={theme.colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Stats Overview */}
        <View style={[styles.statsContainer, { backgroundColor: theme.colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{mindfulnessStats.totalSessions}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Sessions</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{mindfulnessStats.totalMinutes}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Minutes</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.cardBorder }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{mindfulnessStats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Day Streak</Text>
          </View>
        </View>

        {/* Daily Recommendation */}
        <TouchableOpacity
          style={styles.recommendationCard}
          onPress={handleStartRecommendation}
        >
          <Image
            source={{ uri: 'https://api.a0.dev/assets/image?text=peaceful%20zen%20garden%20at%20sunset&aspect=16:9' }}
            style={styles.recommendationImage}
          />
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.recommendationOverlay}>
            <View style={styles.recommendationContent}>
              <View>
                <Text style={styles.recommendationTag}>RECOMMENDED FOR YOU</Text>
                <Text style={styles.recommendationTitle}>Evening Wind Down</Text>
                <View style={styles.recommendationMeta}>
                  <Clock size={14} color="#fff" />
                  <Text style={styles.recommendationMetaText}>15 min</Text>
                  <View style={styles.metaDot} />
                  <Sparkles size={14} color="#fff" />
                  <Text style={styles.recommendationMetaText}>Beginner</Text>
                </View>
              </View>
              <View style={styles.playButton}>
                <Play size={24} color="#fff" fill="#fff" />
              </View>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  { backgroundColor: isSelected ? theme.colors.accent : theme.colors.card }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Icon size={18} color={isSelected ? '#fff' : theme.colors.textSecondary} />
                <Text style={[
                  styles.categoryText,
                  { color: isSelected ? '#fff' : theme.colors.textSecondary }
                ]}>
                  {category.name}
                </Text>
                {category.premium && !isSelected && (
                  <Star size={10} color={theme.colors.premium} fill={theme.colors.premium} style={styles.premiumStar} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sessions Grid */}
        <View style={styles.sessionsGrid}>
          {(sessions[selectedCategory as keyof typeof sessions] || []).map((session) => (
            <TouchableOpacity
              key={session.id}
              style={[styles.sessionCard, { backgroundColor: theme.colors.card }]}
              onPress={() => handleSessionPress(session)}
            >
              <Image source={{ uri: session.image }} style={styles.sessionImage} />
              {session.premium && (
                <View style={styles.premiumBadge}>
                  <Star size={12} color="#fff" fill="#fff" />
                </View>
              )}
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {session.title}
                </Text>
                <View style={styles.sessionMeta}>
                  <Text style={[styles.sessionDuration, { color: theme.colors.textSecondary }]}>
                    {session.duration}
                  </Text>
                  <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(session.difficulty) + '20' }]}>
                    <Text style={[styles.difficultyText, { color: getDifficultyColor(session.difficulty) }]}>
                      {session.difficulty}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: bottomMargin }} />
      </ScrollView>

      {/* Mini-Player */}
      {isPlaying && (
        <TouchableOpacity
          style={[styles.miniPlayer, { bottom: bottomMargin + 15 }]}
          onPress={() => {
            // Re-open current session detail
            if (selectedSession) setShowSessionModal(true);
          }}
        >
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          {/* Blue tint overlay for visibility */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]} />

          <View style={styles.miniPlayerContent}>
            <Image
              source={{ uri: selectedSession?.image || 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=100' }}
              style={styles.miniArtwork}
            />
            <View style={styles.miniInfo}>
              <Text style={[styles.miniTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {selectedSession?.title || 'Relaxing Session'}
              </Text>
              <Text style={[styles.miniSubtitle, { color: theme.colors.textSecondary }]}>
                {isPlaying ? 'Now Playing' : 'Paused'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.miniPlayButton, { backgroundColor: theme.colors.accent + '20' }]}
              onPress={() => stopSound()}
            >
              <Pause size={20} color={theme.colors.accent} fill={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Session Detail Modal */}
      <Modal
        visible={showSessionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSessionModal(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={styles.modalBlur}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSessionModal(false)}
              >
                <X size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>

              {selectedSession && (
                <>
                  <Image source={{ uri: selectedSession.image }} style={styles.modalImage} />
                  <View style={styles.modalBody}>
                    <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                      {selectedSession.title}
                    </Text>
                    <View style={styles.modalMeta}>
                      <View style={styles.modalMetaItem}>
                        <Clock size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.modalMetaText, { color: theme.colors.textSecondary }]}>
                          {selectedSession.duration}
                        </Text>
                      </View>
                      <View style={styles.modalMetaItem}>
                        <Sparkles size={16} color={theme.colors.textSecondary} />
                        <Text style={[styles.modalMetaText, { color: theme.colors.textSecondary }]}>
                          {selectedSession.difficulty}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                      {selectedSession.description}
                    </Text>

                    <TouchableOpacity
                      style={[styles.beginButton, { backgroundColor: theme.colors.accent }]}
                      onPress={handleBeginSession}
                    >
                      <Play size={20} color="#fff" fill="#fff" />
                      <Text style={styles.beginButtonText}>Begin Session</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Breathing Coach Modal */}
      <Modal
        visible={showBreathingCoach}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBreathingCoach(false)}
      >
        <View style={styles.breathingCoachContainer}>
          <TouchableOpacity
            style={styles.breathingCloseButton}
            onPress={() => setShowBreathingCoach(false)}
          >
            <X size={32} color="#fff" />
          </TouchableOpacity>
          <BreathingCoach
            pattern={breathingPattern}
            onComplete={() => {
              setShowBreathingCoach(false);
              Alert.alert('Complete!', 'Great job! You completed your breathing session.');
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  statsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 20,
    marginBottom: 25,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  recommendationCard: {
    height: 200,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 30,
  },
  recommendationImage: {
    width: '100%',
    height: '100%',
  },
  recommendationOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  recommendationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  recommendationTag: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    opacity: 0.8,
  },
  recommendationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recommendationMetaText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    opacity: 0.9,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff',
    marginHorizontal: 8,
    opacity: 0.5,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  categoriesContainer: {
    marginBottom: 25,
    marginHorizontal: -20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  premiumStar: {
    marginLeft: 6,
  },
  sessionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sessionCard: {
    width: '48%',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionImage: {
    width: '100%',
    height: 120,
  },
  premiumBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    padding: 12,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionDuration: {
    fontSize: 12,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBlur: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalBody: {
    padding: 25,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMeta: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  modalMetaText: {
    fontSize: 14,
    marginLeft: 6,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  beginButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  beginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  breathingCoachContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  breathingCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlayer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  miniPlayerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  miniArtwork: {
    width: 46,
    height: 46,
    borderRadius: 12,
  },
  miniInfo: {
    flex: 1,
    marginLeft: 15,
  },
  miniTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  miniSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  miniPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
