import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  SessionPlayer: { session: any };
};

export default function MindfulnessScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPlaying, currentSound, playSound, stopSound } = useAudio();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('meditation');
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

  const categories = [
    { id: 'meditation', name: 'Meditation', icon: 'leaf' },
    { id: 'breathing', name: 'Breathing', icon: 'pulse' },
    { id: 'stories', name: 'Sleep Stories', icon: 'book', premium: true },
    { id: 'yoga', name: 'Yoga', icon: 'body', premium: true },
  ];

  const sessions = {
    meditation: [
      {
        id: 'meditation-1',
        title: 'Deep Sleep Meditation',
        duration: '20 min',
        difficulty: 'Beginner',
        image: 'https://api.a0.dev/assets/image?text=peaceful%20meditation%20scene%20with%20soft%20lighting&aspect=4:3',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
        description: 'A calming guided meditation to help you drift into deep, restful sleep'
      },
      {
        id: 'meditation-2',
        title: 'Body Scan Relaxation',
        duration: '15 min',
        difficulty: 'Beginner',
        image: 'https://api.a0.dev/assets/image?text=serene%20body%20relaxation%20visualization&aspect=4:3',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Progressive relaxation technique to release tension throughout your body'
      },
      {
        id: 'meditation-3',
        title: 'Mindful Sleep Journey',
        duration: '30 min',
        difficulty: 'Intermediate',
        image: 'https://api.a0.dev/assets/image?text=dreamy%20sleep%20journey%20landscape&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-mindfulness.mp3`,
        description: 'Extended mindfulness practice for deeper relaxation and peaceful sleep'
      },
      {
        id: 'meditation-4',
        title: 'Advanced Sleep Mastery',
        duration: '45 min',
        difficulty: 'Advanced',
        image: 'https://api.a0.dev/assets/image?text=advanced%20meditation%20temple%20scene&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-sleep.mp3`,
        description: 'Comprehensive meditation session for complete mind-body relaxation'
      },
    ],
    breathing: [
      {
        id: 'breathing-1',
        title: '4-7-8 Breathing',
        duration: '10 min',
        difficulty: 'Beginner',
        image: 'https://api.a0.dev/assets/image?text=calming%20breathing%20exercise%20visualization&aspect=4:3',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Simple breathing technique to reduce anxiety and promote relaxation'
      },
      {
        id: 'breathing-2',
        title: 'Box Breathing',
        duration: '8 min',
        difficulty: 'Beginner',
        image: 'https://api.a0.dev/assets/image?text=geometric%20breathing%20pattern%20visualization&aspect=4:3',
        premium: false,
        uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
        description: 'Structured breathing pattern used by athletes and Navy SEALs for stress relief'
      },
      {
        id: 'breathing-3',
        title: 'Pranayama Sleep Prep',
        duration: '25 min',
        difficulty: 'Advanced',
        image: 'https://api.a0.dev/assets/image?text=ancient%20breathing%20technique%20scene&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-mindfulness.mp3`,
        description: 'Ancient yogic breathing exercises to prepare mind and body for deep sleep'
      },
    ],
    stories: [
      {
        id: 'story-1',
        title: 'Enchanted Forest Walk',
        duration: '35 min',
        difficulty: 'All Levels',
        image: 'https://api.a0.dev/assets/image?text=magical%20enchanted%20forest%20path&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/forest-ambience.mp3`,
        description: 'A magical journey through an enchanted forest filled with wonder and peace'
      },
      {
        id: 'story-2',
        title: 'Ocean Dreams',
        duration: '40 min',
        difficulty: 'All Levels',
        image: 'https://api.a0.dev/assets/image?text=peaceful%20ocean%20dreams%20seascape&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`,
        description: 'Drift away on gentle ocean waves in this soothing bedtime story'
      },
      {
        id: 'story-3',
        title: 'Mountain Cabin Retreat',
        duration: '50 min',
        difficulty: 'All Levels',
        image: 'https://api.a0.dev/assets/image?text=cozy%20mountain%20cabin%20retreat&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/rain-light.mp3`,
        description: 'Cozy retreat in a peaceful mountain cabin with gentle rain on the roof'
      },
    ],
    yoga: [
      {
        id: 'yoga-1',
        title: 'Bedtime Yoga Flow',
        duration: '20 min',
        difficulty: 'Beginner',
        image: 'https://api.a0.dev/assets/image?text=gentle%20bedtime%20yoga%20poses&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
        description: 'Gentle yoga sequence to release tension and prepare your body for sleep'
      },
      {
        id: 'yoga-2',
        title: 'Restorative Yoga',
        duration: '30 min',
        difficulty: 'All Levels',
        image: 'https://api.a0.dev/assets/image?text=restorative%20yoga%20peaceful%20setting&aspect=4:3',
        premium: true,
        uri: `${GITHUB_BASE_URL}/meditation-sleep.mp3`,
        description: 'Deep relaxation through supported poses held for extended periods'
      },
    ],
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return '#00FFD1';
      case 'Intermediate': return '#FFD700';
      case 'Advanced': return '#FF6B6B';
      default: return '#33C6FF';
    }
  };

  const handleSessionPress = (session) => {
    if (session.premium) {
      // Check if user has premium subscription
      const isPremium = user?.subscription_status === 'premium_monthly' || 
                       user?.subscription_status === 'premium_yearly';
      
      if (!isPremium) {
        Alert.alert(
          '🔒 Premium Content',
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

  const handleBeginSession = () => {
    if (selectedSession) {
      closeSessionModal();
      navigation.navigate('SessionPlayer', { session: selectedSession });
    }
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setSelectedSession(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F111A', '#1B1D2A']}
        style={styles.gradient}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Mindfulness</Text>
            <Text style={styles.subtitle}>Guided sessions for better sleep</Text>
          </View>

          {/* Today's Recommendation */}
          <BlurView intensity={20} tint="dark" style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <Text style={styles.recommendationTitle}>Today's Recommendation</Text>
              <Ionicons name="sparkles" size={20} color="#FFD700" />
            </View>
            <View style={styles.recommendationContent}>
              <Image
                source={{ uri: 'https://api.a0.dev/assets/image?text=peaceful%20evening%20meditation%20scene&aspect=16:9' }}
                style={styles.recommendationImage}
                onError={(e) => console.log('Recommendation image load error:', e.nativeEvent.error)}
                defaultSource={require('../assets/icon.png')}
              />
              <View style={styles.recommendationInfo}>
                <Text style={styles.recommendationSessionTitle}>Evening Wind Down</Text>
                <Text style={styles.recommendationDescription}>Perfect for tonight's sleep preparation</Text>
                <View style={styles.recommendationMeta}>
                  <Text style={styles.recommendationDuration}>15 min</Text>
                  <View style={styles.dot} />
                  <Text style={styles.recommendationDifficulty}>Beginner</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.startButton} onPress={handleStartRecommendation}>
              <LinearGradient
                colors={['#00FFD1', '#33C6FF']}
                style={styles.startButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="play" size={16} color="#000" />
                <Text style={styles.startButtonText}>Start Session</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>

          {/* Category Selector */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoryContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Ionicons 
                  name={category.icon} 
                  size={18} 
                  color={selectedCategory === category.id ? '#000' : category.premium ? '#FFD700' : '#00FFD1'} 
                />
                <Text style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive
                ]}>
                  {category.name}
                </Text>
                {category.premium && (
                  <Ionicons name="star" size={12} color={selectedCategory === category.id ? '#000' : '#FFD700'} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Sessions List */}
          <View style={styles.sessionsList}>
            {sessions[selectedCategory]?.map((session) => (
              <BlurView key={session.id} intensity={20} tint="dark" style={styles.sessionCard}>
                <TouchableOpacity
                  style={styles.sessionContent}
                  onPress={() => handleSessionPress(session)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: session.image }}
                    style={styles.sessionImage}
                    onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                    defaultSource={require('../assets/icon.png')}
                  />
                  <View style={styles.sessionInfo}>
                    <View style={styles.sessionHeader}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      {session.premium && (
                        <View style={styles.premiumBadge}>
                          <Ionicons name="star" size={10} color="#000" />
                        </View>
                      )}
                    </View>
                    <View style={styles.sessionMeta}>
                      <Text style={styles.sessionDuration}>{session.duration}</Text>
                      <View style={styles.dot} />
                      <Text style={[
                        styles.sessionDifficulty,
                        { color: getDifficultyColor(session.difficulty) }
                      ]}>
                        {session.difficulty}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.playButtonContainer}>
                    {currentSound === session.id && isPlaying && (
                      <View style={styles.nowPlayingBadge}>
                        <View style={styles.playingDot} />
                        <Text style={styles.nowPlayingText}>Playing</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.playButton,
                        currentSound === session.id && isPlaying && styles.playButtonActive
                      ]}
                      onPress={() => handleSessionPress(session)}
                    >
                      <Ionicons
                        name={currentSound === session.id && isPlaying ? 'pause' : 'play'}
                        size={20}
                        color={currentSound === session.id && isPlaying ? '#000' : '#00FFD1'}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </BlurView>
            )) || (
              <Text style={{ color: '#A0AEC0', textAlign: 'center', marginTop: 20 }}>
                No sessions available in this category
              </Text>
            )}
          </View>

          {/* Progress Section */}
          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Your Progress</Text>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color="#000" />
                <Text style={styles.premiumText}>PRO</Text>
              </View>
            </View>
            
            <View style={styles.progressStats}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>12</Text>
                <Text style={styles.progressLabel}>Sessions Completed</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>4h 30m</Text>
                <Text style={styles.progressLabel}>Total Time</Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>7</Text>
                <Text style={styles.progressLabel}>Day Streak</Text>
              </View>
            </View>

            <View style={styles.streakContainer}>
              <Text style={styles.streakText}>🔥 Keep your streak going!</Text>
              <Text style={styles.streakSubtext}>Complete today's session to maintain your 7-day streak</Text>
            </View>
          </BlurView>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>

      {/* Session Player Modal */}
      <Modal
        visible={showSessionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeSessionModal}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeSessionModal}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Session Image */}
              {selectedSession && (
                <>
                  <Image
                    source={{ uri: selectedSession.image }}
                    style={styles.modalImage}
                    defaultSource={require('../assets/icon.png')}
                  />

                  {/* Session Info */}
                  <Text style={styles.modalTitle}>{selectedSession.title}</Text>

                  {selectedSession.description && (
                    <Text style={styles.modalDescription}>{selectedSession.description}</Text>
                  )}

                  <View style={styles.modalMeta}>
                    <View style={styles.modalMetaItem}>
                      <Ionicons name="time-outline" size={20} color="#00FFD1" />
                      <Text style={styles.modalMetaText}>{selectedSession.duration}</Text>
                    </View>
                    <View style={styles.modalMetaItem}>
                      <Ionicons name="bar-chart-outline" size={20} color={getDifficultyColor(selectedSession.difficulty)} />
                      <Text style={styles.modalMetaText}>{selectedSession.difficulty}</Text>
                    </View>
                  </View>

                  {/* Session Instructions */}
                  <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsTitle}>What to Expect:</Text>
                    <View style={styles.instructionItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#00FFD1" />
                      <Text style={styles.instructionText}>Find a quiet, comfortable space</Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#00FFD1" />
                      <Text style={styles.instructionText}>Use headphones for best experience</Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#00FFD1" />
                      <Text style={styles.instructionText}>Follow along with guided instructions</Text>
                    </View>
                    <View style={styles.instructionItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#00FFD1" />
                      <Text style={styles.instructionText}>Relax and enjoy the session</Text>
                    </View>
                  </View>

                  {/* Play Button */}
                  <TouchableOpacity
                    style={styles.modalPlayButton}
                    onPress={handleBeginSession}
                  >
                    <LinearGradient
                      colors={['#00FFD1', '#33C6FF']}
                      style={styles.modalPlayGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="play" size={24} color="#000" />
                      <Text style={styles.modalPlayText}>Begin Session</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F111A',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0AEC0',
  },
  recommendationCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recommendationContent: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  recommendationImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationSessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#A0AEC0',
    marginBottom: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationDuration: {
    fontSize: 12,
    color: '#00FFD1',
  },
  recommendationDifficulty: {
    fontSize: 12,
    color: '#00FFD1',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#A0AEC0',
    marginHorizontal: 6,
  },
  startButton: {
    alignSelf: 'flex-start',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryButtonActive: {
    backgroundColor: '#00FFD1',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 6,
    marginRight: 4,
  },
  categoryTextActive: {
    color: '#000',
  },
  sessionsList: {
    marginBottom: 20,
  },
  sessionCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  sessionImage: {
    width: 60,
    height: 45,
    borderRadius: 8,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDuration: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  sessionDifficulty: {
    fontSize: 12,
    fontWeight: '500',
  },
  playButtonContainer: {
    alignItems: 'center',
    gap: 6,
  },
  nowPlayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  playingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FFD1',
  },
  nowPlayingText: {
    fontSize: 10,
    color: '#00FFD1',
    fontWeight: '600',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.3)',
  },
  playButtonActive: {
    backgroundColor: '#00FFD1',
    borderColor: '#00FFD1',
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
    marginLeft: 2,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00FFD1',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  streakContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 4,
  },
  streakSubtext: {
    fontSize: 14,
    color: '#A0AEC0',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    backgroundColor: 'rgba(27, 29, 42, 0.95)',
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 24,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalMetaText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0, 255, 209, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 209, 0.2)',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#A0AEC0',
    flex: 1,
  },
  modalPlayButton: {
    width: '100%',
  },
  modalPlayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  modalPlayText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});