import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import { Audio } from 'expo-av';
import { useAppTheme } from '../hooks/useAppTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudio } from '../contexts/AudioContext';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Heart } from 'lucide-react-native';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

interface Story {
  id: string;
  title: string;
  narrator: string;
  duration: string;
  category: string;
  description: string;
  content: string; // Full story text
  uri?: string; // Audio file URL
  available: boolean;
}

interface Sound {
  id: string;
  name: string;
  category: string;
  icon: string;
  uri: string;
  available: boolean;
}

interface MeditationSession {
  id: string;
  title: string;
  duration: string;
  type: 'body-scan' | 'breathing' | 'visualization';
  description: string;
  uri: string;
  available: boolean;
}

const BEDTIME_STORIES: Story[] = [
  {
    id: '1',
    title: 'The Peaceful Forest',
    narrator: 'Sarah Mitchell',
    duration: '30 min',
    category: 'Nature',
    description: 'A gentle journey through a serene forest at twilight',
    content: 'As the sun begins to set, painting the sky in shades of amber and rose, you find yourself at the edge of an ancient forest. The air is cool and fresh, carrying the earthy scent of moss and pine. A soft breeze whispers through the leaves, creating a gentle rustling melody that invites you deeper into the woods.\n\nYou step onto a winding path, carpeted with fallen leaves that crunch softly beneath your feet. Tall trees rise around you like silent guardians, their branches forming a natural cathedral overhead. Dappled sunlight filters through the canopy, creating pools of golden light that dance and shift with each passing moment.\n\nAs you walk, you notice the forest is alive with peaceful sounds. Birds sing their evening songs, their melodies echoing through the trees. In the distance, you hear the gentle babble of a stream, its waters flowing over smooth stones. The rhythm is soothing, like nature\'s own lullaby.\n\nYou continue along the path until you discover a small clearing. In its center stands a magnificent oak tree, ancient and wise. Its massive trunk is covered in soft moss, and its roots create natural seats perfect for resting. You settle against the tree, feeling its solid presence at your back, grounding and comforting.\n\nThe forest embraces you with its tranquility. The last rays of sunlight fade, and fireflies begin to emerge, their soft lights twinkling like earthbound stars. The air grows cooler, more peaceful. You close your eyes and breathe deeply, taking in the pure forest air. With each breath, you feel more relaxed, more connected to this peaceful place.\n\nAs darkness gently falls, the forest transforms into a realm of quiet magic. The moon rises, casting silver light through the trees. Somewhere nearby, an owl hoots softly. The stream continues its peaceful song. And you remain here, safe and calm, cradled by the ancient forest as you drift into peaceful sleep.',
    available: true,
  },
  {
    id: '2',
    title: 'Ocean Waves at Dusk',
    narrator: 'James Cooper',
    duration: '25 min',
    category: 'Nature',
    description: 'Relax to the soothing sounds and story of the evening tide',
    content: 'You stand at the edge of a vast, peaceful beach as the day draws to a close. The sand beneath your feet is still warm from the sun, soft and welcoming. Before you stretches an endless expanse of calm ocean, its surface shimmering with the colors of the setting sun – deep oranges, soft pinks, and brilliant golds.\n\nThe waves roll in with perfect rhythm, each one arriving and departing in its own time. The sound is hypnotic: a gentle rush as the water slides up the sand, a moment of stillness at its peak, then a soft whisper as it retreats back to the sea. Again and again, steady and eternal, the waves continue their dance.\n\nYou walk along the water\'s edge, feeling the cool water wash over your feet with each incoming wave. The sensation is refreshing and grounding. Seabirds glide overhead, their calls mixing with the sound of the surf. The air is filled with the clean, salty scent of the ocean.\n\nYou find a comfortable spot in the sand and sit down, watching the sun sink lower on the horizon. The sky transforms into a masterpiece of color – purples and deep blues begin to emerge where the sun has already passed. Stars start to appear, one by one, like diamonds being placed in the velvet sky.\n\nAs twilight deepens, the ocean takes on a mysterious, peaceful quality. The waves continue their eternal rhythm, but now they seem to glow with their own inner light, phosphorescence sparkling in each crest. The sound becomes even more soothing as night falls – that timeless, primal rhythm of the tide.\n\nYou lie back in the sand, still warm and soft, cradling your body comfortably. Above you, the sky deepens to midnight blue, filled with countless stars. The Milky Way stretches across the heavens like a river of light. And always, always, the waves continue their song – a lullaby as old as time itself, gently rocking you into the deepest, most peaceful sleep.',
    available: true,
  },
  {
    id: '3',
    title: 'Mountain Monastery',
    narrator: 'Emma Thompson',
    duration: '35 min',
    category: 'Peaceful',
    description: 'Find tranquility in an ancient mountain retreat',
    content: 'High in the mountains, far from the bustle of the world below, stands an ancient monastery. You find yourself approaching this sacred place as evening descends. The air is thin and pure, carrying the faint scent of incense and mountain flowers. The setting sun casts long shadows across the stone courtyard, and somewhere in the distance, a bell rings out – clear, pure, resonant.\n\nYou enter through a weathered wooden gate into a peaceful garden. Stone paths wind between carefully tended plants and small ponds where koi fish drift lazily. The sound of water trickling from a bamboo fountain creates a gentle, rhythmic music. Smooth stones, worn by countless footsteps over hundreds of years, lead you deeper into this sanctuary of peace.\n\nIn the center of the courtyard stands a meditation pavilion, open on all sides. Its roof is supported by wooden pillars, each one carved with intricate patterns by craftsmen long ago. You step inside and sit on a cushion that has been placed there, as if waiting just for you. The view from here is breathtaking – mountains stretch away in all directions, their peaks touched with the gold of the dying sun.\n\nAs you settle into stillness, you notice the profound quiet of this place. It\'s not empty silence, but rather a rich, full peace. The wind moves gently through the pavilion, cool and refreshing. Prayer flags flutter nearby, their soft rustling like whispered blessings. A monk passes by, walking slowly, each step deliberate and mindful. They acknowledge you with a gentle nod and a serene smile.\n\nThe sky deepens from blue to indigo. One by one, stars appear, seeming closer here in the thin mountain air than they ever do below. The monastery\'s lanterns are lit, casting a warm, golden glow. Somewhere, monks begin their evening chants – a deep, harmonic sound that seems to resonate in your very bones, ancient and soothing.\n\nYou remain in the pavilion, surrounded by centuries of accumulated peace. The mountains stand eternal and unchanging around you. The stars wheel slowly overhead. The chanting continues, a sound that seems to come from everywhere and nowhere. And in this sacred space, far from all worry and care, you find yourself drifting into the most peaceful, profound rest you have ever known.',
    available: true,
  },
  {
    id: '4',
    title: 'Starry Night Journey',
    narrator: 'Michael Zhang',
    duration: '28 min',
    category: 'Space',
    description: 'Float through the cosmos on a peaceful adventure',
    content: 'Tonight, you find yourself in a place beyond places, floating gently in the vastness of space. There is no up or down, no beginning or end – only the infinite cosmos stretching in all directions. And yet, you feel completely safe, perfectly peaceful, as if cradled by the universe itself.\n\nAround you, stars sparkle in countless numbers. Some are brilliant white, others shimmer with hints of blue or gold or red. They seem close enough to touch, yet you know they are impossibly distant. Each one is a sun in its own right, perhaps with its own family of planets, its own stories to tell. Their light has traveled for years, centuries, even millennia to reach this moment, to shine for you right now.\n\nYou begin to move, drifting slowly through this stellar sea. Nebulae float past – vast clouds of cosmic dust and gas, glowing in surreal colors: deep purples, electric blues, vibrant pinks. They are the birthplaces of stars, nurseries where new suns are being born even now. Their beauty is beyond anything on Earth, ethereal and dreamlike.\n\nA spiral galaxy wheels slowly beneath you (or is it above? – here, such directions have no meaning). Billions upon billions of stars arranged in elegant, sweeping arms, all rotating together in a cosmic dance that has continued for billions of years. The galaxy glows with a soft, diffuse light, beautiful and serene. You drift through its outer reaches, feeling small yet somehow part of something unimaginably grand.\n\nTime seems to have no meaning here. You float peacefully, watching the cosmic ballet. A comet passes in the distance, its tail streaming behind it – a silent wanderer on its ancient orbit. Planets drift by, some ringed, some small and rocky, others gas giants with swirling storms in their atmospheres. Each one is a world unto itself, filled with its own marvels.\n\nGradually, you become aware of a gentle music – the music of the spheres, they used to call it. It\'s not sound, exactly, but rather something you feel, a harmony that underlies all of existence. The vibration of stars, the rotation of galaxies, the expansion of the universe itself – all creating one vast, eternal symphony of peace.\n\nYou continue your drift through the cosmos, completely relaxed, perfectly at peace. The stars shine on, eternal and unchanging. Space cradles you in its infinite embrace. And as you float there, surrounded by the wonder of creation, you slip gently into the deepest, most peaceful sleep, dreaming of distant stars and cosmic shores.',
    available: true,
  },
];

const SOUNDS: Sound[] = [
  { id: '1', name: 'Rain', category: 'Nature', icon: '🌧️', uri: `${GITHUB_BASE_URL}/rain-light.mp3`, available: true },
  { id: '2', name: 'Ocean Waves', category: 'Nature', icon: '🌊', uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`, available: true },
  { id: '3', name: 'Forest', category: 'Nature', icon: '🌲', uri: `${GITHUB_BASE_URL}/forest-ambience.mp3`, available: true },
  { id: '4', name: 'Thunderstorm', category: 'Nature', icon: '⛈️', uri: `${GITHUB_BASE_URL}/rain-thunder.mp3`, available: true },
  { id: '5', name: 'Fan', category: 'White Noise', icon: '💨', uri: `${GITHUB_BASE_URL}/fan-sound.mp3`, available: true },
  { id: '6', name: 'Brown Noise', category: 'White Noise', icon: '📻', uri: `${GITHUB_BASE_URL}/brown-noise.mp3`, available: true },
  { id: '7', name: 'Pink Noise', category: 'White Noise', icon: '🎵', uri: `${GITHUB_BASE_URL}/pink-noise.mp3`, available: true },
  { id: '8', name: 'Fireplace', category: 'Ambient', icon: '🔥', uri: `${GITHUB_BASE_URL}/crackling-fire.mp3`, available: true },
  { id: '9', name: 'Night Crickets', category: 'Nature', icon: '🦗', uri: `${GITHUB_BASE_URL}/night-crickets.mp3`, available: true },
  { id: '10', name: 'Wind', category: 'Nature', icon: '💨', uri: `${GITHUB_BASE_URL}/wind-trees.mp3`, available: true },
];

const MEDITATIONS: MeditationSession[] = [
  {
    id: '1',
    title: 'Progressive Body Scan',
    duration: '20 min',
    type: 'body-scan',
    description: 'Release tension from head to toe with guided relaxation',
    uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`,
    available: true,
  },
  {
    id: '2',
    title: '4-7-8 Breathing',
    duration: '10 min',
    type: 'breathing',
    description: 'Calm your nervous system with rhythmic breathing',
    uri: `${GITHUB_BASE_URL}/meditation-mindfulness.mp3`,
    available: true,
  },
  {
    id: '3',
    title: 'Beach Visualization',
    duration: '15 min',
    type: 'visualization',
    description: 'Transport yourself to a peaceful beach at sunset',
    uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`,
    available: true,
  },
  {
    id: '4',
    title: 'Deep Muscle Relaxation',
    duration: '25 min',
    type: 'body-scan',
    description: 'Systematically relax every muscle group',
    uri: `${GITHUB_BASE_URL}/meditation-sleep.mp3`,
    available: true,
  },
];

export default function RelaxationLibraryScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const { playSound, currentSound, isPlaying, pauseSound, stopSound } = useAudio();
  const [selectedTab, setSelectedTab] = useState<'stories' | 'sounds' | 'meditation'>('stories');
  const [activeSounds, setActiveSounds] = useState<string[]>([]);
  const [soundVolumes, setSoundVolumes] = useState<{ [key: string]: number }>({});
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [mixPlaying, setMixPlaying] = useState(false);

  const toggleSound = async (sound: Sound) => {
    if (!sound.available) {
      Alert.alert('Coming Soon', 'This sound will be available in a future update.');
      return;
    }

    if (activeSounds.includes(sound.id)) {
      setActiveSounds(activeSounds.filter(id => id !== sound.id));
      stopSound();
    } else {
      setActiveSounds([...activeSounds, sound.id]);
      setSoundVolumes({ ...soundVolumes, [sound.id]: 0.5 });
      await playSound(sound);
    }
  };

  const playStory = (story: Story) => {
    if (!story.available) {
      Alert.alert('Coming Soon', 'This story will be available in a future update.');
      return;
    }
    setSelectedStory(story);
  };

  const playMix = async () => {
    if (activeSounds.length === 0) return;
    const firstSound = SOUNDS.find(s => s.id === activeSounds[0]);
    if (firstSound) {
      await playSound(firstSound);
      setMixPlaying(true);
    }
  };

  const pauseMix = () => {
    pauseSound();
    setMixPlaying(false);
  };

  const startMeditation = async (meditation: MeditationSession) => {
    if (!meditation.available) {
      Alert.alert('Coming Soon', 'This meditation will be available in a future update.');
      return;
    }
    await playSound(meditation);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Relaxation Library</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Stories, sounds & guided meditation
          </Text>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'stories' && { backgroundColor: theme.colors.accent }]}
          onPress={() => setSelectedTab('stories')}
        >
          <Text style={[styles.tabText, selectedTab === 'stories' && styles.tabTextActive]}>
            Stories
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sounds' && { backgroundColor: theme.colors.accent }]}
          onPress={() => setSelectedTab('sounds')}
        >
          <Text style={[styles.tabText, selectedTab === 'sounds' && styles.tabTextActive]}>
            Sounds
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'meditation' && { backgroundColor: theme.colors.accent }]}
          onPress={() => setSelectedTab('meditation')}
        >
          <Text style={[styles.tabText, selectedTab === 'meditation' && styles.tabTextActive]}>
            Meditation
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedTab === 'stories' && (
          <View>
            {BEDTIME_STORIES.map((story) => (
              <TouchableOpacity
                key={story.id}
                style={[styles.card, { backgroundColor: theme.colors.card }]}
                onPress={() => playStory(story)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>{story.title}</Text>
                  <Text style={[styles.duration, { color: theme.colors.textSecondary }]}>
                    {story.duration}
                  </Text>
                </View>
                <Text style={[styles.narrator, { color: theme.colors.textSecondary }]}>
                  Narrated by {story.narrator}
                </Text>
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                  {story.description}
                </Text>
                <View style={[styles.categoryBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Text style={[styles.categoryText, { color: theme.colors.accent }]}>
                    {story.category}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedTab === 'sounds' && (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Mix & Match Sounds
            </Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              Tap sounds to add them to your mix
            </Text>

            <View style={styles.soundGrid}>
              {SOUNDS.map((sound) => (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.soundCard,
                    { backgroundColor: theme.colors.card },
                    activeSounds.includes(sound.id) && { backgroundColor: theme.colors.accent },
                  ]}
                  onPress={() => toggleSound(sound)}
                >
                  <Text style={styles.soundIcon}>{sound.icon}</Text>
                  <Text
                    style={[
                      styles.soundName,
                      { color: activeSounds.includes(sound.id) ? '#fff' : theme.colors.textPrimary },
                    ]}
                  >
                    {sound.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeSounds.length > 0 && (
              <View style={[styles.mixerCard, { backgroundColor: theme.colors.card }]}>
                <View style={styles.mixerHeader}>
                  <Heart size={24} color={theme.colors.accent} />
                  <Text style={[styles.mixerTitle, { color: theme.colors.textPrimary }]}>
                    Active Mix ({activeSounds.length} sounds)
                  </Text>
                  <Volume2 size={20} color={theme.colors.textSecondary} />
                </View>

                <View style={styles.soundsList}>
                  {activeSounds.map((soundId) => {
                    const sound = SOUNDS.find(s => s.id === soundId);
                    return (
                      <View key={soundId} style={[styles.activeSoundChip, { backgroundColor: theme.colors.accent + '20', borderColor: theme.colors.accent + '40' }]}>
                        <Text style={[styles.activeSoundText, { color: theme.colors.accent }]}>
                          {sound?.icon} {sound?.name}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={styles.playerControls}>
                  <TouchableOpacity style={styles.controlButton}>
                    <SkipBack size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.mainPlayButton, { backgroundColor: theme.colors.accent }]}
                    onPress={mixPlaying ? pauseMix : playMix}
                  >
                    {mixPlaying ? (
                      <Pause size={28} color="#fff" fill="#fff" />
                    ) : (
                      <Play size={28} color="#fff" fill="#fff" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.controlButton}>
                    <SkipForward size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {mixPlaying && (
                  <View style={styles.playingIndicator}>
                    <View style={[styles.playingDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={[styles.playingText, { color: theme.colors.accent }]}>
                      Now Playing
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {selectedTab === 'meditation' && (
          <View>
            {MEDITATIONS.map((meditation) => (
              <TouchableOpacity
                key={meditation.id}
                style={[styles.card, { backgroundColor: theme.colors.card }]}
                onPress={() => startMeditation(meditation)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
                    {meditation.title}
                  </Text>
                  <Text style={[styles.duration, { color: theme.colors.textSecondary }]}>
                    {meditation.duration}
                  </Text>
                </View>
                <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                  {meditation.description}
                </Text>
                <View style={[styles.categoryBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Text style={[styles.categoryText, { color: theme.colors.accent }]}>
                    {meditation.type}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selectedStory !== null}
        animationType="slide"
        onRequestClose={() => setSelectedStory(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedStory(null)} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              {selectedStory?.title}
            </Text>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={[styles.modalNarrator, { color: theme.colors.textSecondary }]}>
              Narrated by {selectedStory?.narrator}
            </Text>
            <Text style={[styles.modalStoryText, { color: theme.colors.textPrimary }]}>
              {selectedStory?.content}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  tabBar: {
    flexDirection: 'row',
    margin: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  duration: {
    fontSize: 14,
  },
  narrator: {
    fontSize: 14,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  soundCard: {
    width: '47%',
    aspectRatio: 1.5,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  soundName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  mixerCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  mixerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  mixerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
  },
  soundsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  activeSoundChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeSoundText: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixerRow: {
    paddingVertical: 8,
  },
  mixerSound: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalNarrator: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalStoryText: {
    fontSize: 16,
    lineHeight: 28,
  },
});


