import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, Modal } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useAudio } from '../contexts/AudioContext';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  Play,
  Pause,
  Volume2,
  Clock,
  Save,
  Trash2,
  ChevronLeft,
  BookOpen,
  Music2,
  Sparkles,
  X,
} from 'lucide-react-native';

// Canvas reference: Rlx-Library.dc.html (+ D-Rlx-Library.dc.html day variant).
// Canvas layout: back-button header, hero "Tonight's pick" card with glow +
// Start button, horizontal pill filter row, then one bordered card containing
// icon-row list entries with duration/category subtext and a play/unlock
// control. That shape is reused here for all three tabs (Stories / Sounds /
// Meditation) — the pill row becomes the tab selector, the hero card
// highlights the first item of the active tab, and each tab's existing data
// renders through the shared icon-row list. All state/logic below (tab
// selection, sound mixer, custom mixes, sleep timer, story modal, AsyncStorage
// persistence) is unchanged — only JSX/styling was rebuilt.

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
  const {
    playSound, currentSound, isPlaying, pauseSound, stopSound,
    isMixing, activeMix, startMixing, stopMixing, pauseMixing, resumeMixing,
    addSoundToMix, removeSoundFromMix, setMixSoundVolume,
  } = useAudio();
  const [selectedTab, setSelectedTab] = useState<'stories' | 'sounds' | 'meditation'>('stories');
  const [activeSounds, setActiveSounds] = useState<string[]>([]);
  const [soundVolumes, setSoundVolumes] = useState<{ [key: string]: number }>({});
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [mixPlaying, setMixPlaying] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [customMixes, setCustomMixes] = useState<{ name: string, sounds: string[] }[]>([]);

  useEffect(() => {
    loadCustomMixes();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mixPlaying && sleepTimer && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            pauseMix();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mixPlaying, sleepTimer, timeLeft]);

  const loadCustomMixes = async () => {
    try {
      const stored = await AsyncStorage.getItem('custom_sound_mixes');
      if (stored) setCustomMixes(JSON.parse(stored));
    } catch (e) { console.error(e); }
  };

  const saveCurrentMix = async () => {
    if (activeSounds.length === 0) return;
    Alert.prompt('Save Mix', 'Enter a name for your custom mix', async (name) => {
      if (name) {
        const newMixes = [...customMixes, { name, sounds: activeSounds }];
        setCustomMixes(newMixes);
        await AsyncStorage.setItem('custom_sound_mixes', JSON.stringify(newMixes));
      }
    });
  };

  const deleteMix = async (index: number) => {
    const newMixes = customMixes.filter((_, i) => i !== index);
    setCustomMixes(newMixes);
    await AsyncStorage.setItem('custom_sound_mixes', JSON.stringify(newMixes));
  };

  const loadMix = async (soundIds: string[]) => {
    await stopMixing();
    startMixing();
    setActiveSounds([]);
    for (const id of soundIds) {
      const sound = SOUNDS.find(s => s.id === id);
      if (sound) {
        await addSoundToMix(sound.id, sound.uri, sound.name);
        setActiveSounds(prev => [...prev, sound.id]);
      }
    }
    setMixPlaying(true);
  };

  const startTimer = (mins: number) => {
    setSleepTimer(mins);
    setTimeLeft(mins * 60);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const toggleSound = async (sound: Sound) => {
    if (!sound.available) {
      Alert.alert('Coming Soon', 'This sound will be available in a future update.');
      return;
    }

    if (!isMixing) startMixing();

    if (activeMix[sound.id]) {
      await removeSoundFromMix(sound.id);
      setActiveSounds(prev => prev.filter(id => id !== sound.id));
    } else {
      await addSoundToMix(sound.id, sound.uri, sound.name);
      setActiveSounds(prev => [...prev, sound.id]);
      setSoundVolumes(prev => ({ ...prev, [sound.id]: 0.5 }));
      setMixPlaying(true); // addSoundToMix starts playback immediately
    }
  };

  const playStory = (story: Story) => {
    if (!story.available) {
      Alert.alert('Coming Soon', 'This story will be available in a future update.');
      return;
    }
    setSelectedStory(story);
  };

  const playMix = () => {
    if (activeSounds.length === 0) return;
    resumeMixing();
    setMixPlaying(true);
  };

  const pauseMix = () => {
    pauseMixing();
    setMixPlaying(false);
  };

  const startMeditation = async (meditation: MeditationSession) => {
    if (!meditation.available) {
      Alert.alert('Coming Soon', 'This meditation will be available in a future update.');
      return;
    }
    await playSound(meditation.id, meditation.uri, meditation.title);
  };

  const s = styles(theme);

  const TABS: { id: 'stories' | 'sounds' | 'meditation'; label: string; icon: any }[] = [
    { id: 'stories', label: 'Stories', icon: BookOpen },
    { id: 'sounds', label: 'Sounds', icon: Music2 },
    { id: 'meditation', label: 'Meditation', icon: Sparkles },
  ];

  const heroStory = BEDTIME_STORIES[0];
  const heroMeditation = MEDITATIONS[0];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header — canvas: back button + Fraunces title */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={[s.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            Relax
          </Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            Stories, sounds &amp; guided meditation
          </Text>
        </View>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero card — canvas: "Tonight's pick" with glow + Start button */}
        {selectedTab === 'stories' && heroStory && (
          <TouchableOpacity
            style={[s.heroCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.accentBorder }]}
            onPress={() => playStory(heroStory)}
            activeOpacity={0.9}
          >
            <View pointerEvents="none" style={[s.heroGlow, { backgroundColor: theme.colors.accentLight }]} />
            <Text style={[s.heroEyebrow, { color: theme.colors.textTertiary }]}>TONIGHT'S PICK</Text>
            <Text style={[s.heroTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
              {heroStory.title}
            </Text>
            <Text style={[s.heroSubtitle, { color: theme.colors.textSecondary }]}>
              {heroStory.duration} · {heroStory.description}
            </Text>
            <View style={[s.heroButton, { backgroundColor: theme.colors.ctaBackground }]}>
              <Play size={14} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
              <Text style={[s.heroButtonText, { color: theme.colors.ctaText }]}>Start</Text>
            </View>
          </TouchableOpacity>
        )}

        {selectedTab === 'meditation' && heroMeditation && (
          <TouchableOpacity
            style={[s.heroCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.accentBorder }]}
            onPress={() => startMeditation(heroMeditation)}
            activeOpacity={0.9}
          >
            <View pointerEvents="none" style={[s.heroGlow, { backgroundColor: theme.colors.accentLight }]} />
            <Text style={[s.heroEyebrow, { color: theme.colors.textTertiary }]}>TONIGHT'S PICK</Text>
            <Text style={[s.heroTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
              {heroMeditation.title}
            </Text>
            <Text style={[s.heroSubtitle, { color: theme.colors.textSecondary }]}>
              {heroMeditation.duration} · {heroMeditation.description}
            </Text>
            <View style={[s.heroButton, { backgroundColor: theme.colors.ctaBackground }]}>
              <Play size={14} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
              <Text style={[s.heroButtonText, { color: theme.colors.ctaText }]}>Start</Text>
            </View>
          </TouchableOpacity>
        )}

        {selectedTab === 'sounds' && (
          <View style={[s.heroCard, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.accentBorder }]}>
            <View pointerEvents="none" style={[s.heroGlow, { backgroundColor: theme.colors.accentLight }]} />
            <Text style={[s.heroEyebrow, { color: theme.colors.textTertiary }]}>MIX &amp; MATCH</Text>
            <Text style={[s.heroTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
              Build your sound mix
            </Text>
            <Text style={[s.heroSubtitle, { color: theme.colors.textSecondary }]}>
              Tap sounds below to layer them together
            </Text>
          </View>
        )}

        {/* Pill filter row — canvas: horizontal scroll of category pills, reused as tab selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.pillRow}
          contentContainerStyle={s.pillRowContent}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  s.pill,
                  {
                    backgroundColor: isSelected ? theme.colors.textPrimary : theme.colors.card,
                    borderColor: isSelected ? theme.colors.textPrimary : theme.colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedTab(tab.id)}
              >
                <Icon size={14} color={isSelected ? theme.colors.background : theme.colors.textSecondary} />
                <Text
                  style={[
                    s.pillText,
                    { color: isSelected ? theme.colors.background : theme.colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedTab === 'stories' && (
          <View style={[s.listCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            {BEDTIME_STORIES.map((story, index) => (
              <TouchableOpacity
                key={story.id}
                style={[s.listRow, index < BEDTIME_STORIES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder }]}
                onPress={() => playStory(story)}
                activeOpacity={0.8}
              >
                <View style={[s.listRowIcon, { backgroundColor: theme.colors.backgroundTertiary }]}>
                  <BookOpen size={18} color={theme.colors.accent} />
                </View>
                <View style={s.listRowTextCol}>
                  <Text style={[s.listRowTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {story.title}
                  </Text>
                  <Text style={[s.listRowSub, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                    {story.category} · {story.duration} · {story.narrator}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.listRowPlay, { borderColor: theme.colors.accent }]}
                  onPress={() => playStory(story)}
                >
                  <Play size={13} color={theme.colors.accent} fill={theme.colors.accent} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedTab === 'sounds' && (
          <View>
            <View style={s.soundGrid}>
              {SOUNDS.map((sound) => {
                const isActive = activeSounds.includes(sound.id);
                return (
                  <TouchableOpacity
                    key={sound.id}
                    style={[
                      s.soundCard,
                      {
                        backgroundColor: isActive ? theme.colors.selectedBackground : theme.colors.card,
                        borderColor: isActive ? theme.colors.accent : theme.colors.cardBorder,
                      },
                    ]}
                    onPress={() => toggleSound(sound)}
                  >
                    <Text style={s.soundIcon}>{sound.icon}</Text>
                    <Text
                      style={[
                        s.soundName,
                        { color: isActive ? theme.colors.accent : theme.colors.textPrimary },
                      ]}
                    >
                      {sound.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {customMixes.length > 0 && (
              <View style={s.sectionHeader}>
                <Text style={[s.sectionTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
                  Your Mixes
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.mixList}>
                  {customMixes.map((mix, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[s.mixChip, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                      onPress={() => loadMix(mix.sounds)}
                    >
                      <Text style={[s.mixChipText, { color: theme.colors.textPrimary }]}>{mix.name}</Text>
                      <TouchableOpacity onPress={() => deleteMix(idx)}>
                        <Trash2 size={14} color={theme.colors.error} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {activeSounds.length > 0 && (
              <View style={[s.mixerCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <View style={s.mixerHeader}>
                  <Heart size={20} color={theme.colors.accent} />
                  <Text style={[s.mixerTitle, { color: theme.colors.textPrimary }]}>
                    Active Mix ({activeSounds.length})
                  </Text>
                  <Volume2 size={18} color={theme.colors.textSecondary} />
                </View>

                <View style={s.remixList}>
                  {activeSounds.map((soundId) => {
                    const sound = SOUNDS.find(sd => sd.id === soundId);
                    const mixedVolume = activeMix[soundId]?.volume ?? 0.5;
                    return (
                      <View key={soundId} style={[s.remixRow, { borderColor: theme.colors.cardBorder }]}>
                        <Text style={[s.activeSoundText, { color: theme.colors.accent }]}>
                          {sound?.icon} {sound?.name}
                        </Text>
                        <Slider
                          style={s.remixSlider}
                          value={mixedVolume}
                          onValueChange={(v) => setMixSoundVolume(soundId, v)}
                          minimumValue={0}
                          maximumValue={1}
                          minimumTrackTintColor={theme.colors.accent}
                          maximumTrackTintColor={theme.colors.cardBorder}
                          thumbTintColor={theme.colors.accent}
                        />
                        <TouchableOpacity onPress={() => toggleSound(sound!)}>
                          <Trash2 size={16} color={theme.colors.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                <View style={[s.timerSection, { backgroundColor: theme.colors.backgroundTertiary }]}>
                  <View style={s.timerHeader}>
                    <Clock size={14} color={theme.colors.textSecondary} />
                    <Text style={[s.timerTitle, { color: theme.colors.textSecondary }]}>
                      {timeLeft > 0 ? `Ends in ${formatTime(timeLeft)}` : 'Sleep Timer'}
                    </Text>
                  </View>
                  <View style={s.timerOptions}>
                    {[5, 15, 30, 60].map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => startTimer(m)}
                        style={[
                          s.timerBtn,
                          { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder },
                          sleepTimer === m && { backgroundColor: theme.colors.selectedBackground, borderColor: theme.colors.accent },
                        ]}
                      >
                        <Text style={[s.timerBtnText, { color: theme.colors.textPrimary }]}>{m}m</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => { setSleepTimer(null); setTimeLeft(0); }}
                      style={[s.timerBtn, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
                    >
                      <Trash2 size={14} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.playerControls}>
                  <TouchableOpacity style={s.controlButton} onPress={saveCurrentMix}>
                    <Save size={22} color={theme.colors.accent} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.mainPlayButton, { backgroundColor: theme.colors.ctaBackground }]}
                    onPress={mixPlaying ? pauseMix : playMix}
                  >
                    {mixPlaying ? (
                      <Pause size={26} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
                    ) : (
                      <Play size={26} color={theme.colors.ctaText} fill={theme.colors.ctaText} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={s.controlButton} onPress={async () => { await stopMixing(); setActiveSounds([]); setMixPlaying(false); }}>
                    <Trash2 size={22} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>

                {mixPlaying && (
                  <View style={s.playingIndicator}>
                    <View style={[s.playingDot, { backgroundColor: theme.colors.accent }]} />
                    <Text style={[s.playingText, { color: theme.colors.accent }]}>
                      Now Playing
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {selectedTab === 'meditation' && (
          <View style={[s.listCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
            {MEDITATIONS.map((meditation, index) => (
              <TouchableOpacity
                key={meditation.id}
                style={[s.listRow, index < MEDITATIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.cardBorder }]}
                onPress={() => startMeditation(meditation)}
                activeOpacity={0.8}
              >
                <View style={[s.listRowIcon, { backgroundColor: theme.colors.backgroundTertiary }]}>
                  <Sparkles size={18} color={theme.colors.accent} />
                </View>
                <View style={s.listRowTextCol}>
                  <Text style={[s.listRowTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {meditation.title}
                  </Text>
                  <Text style={[s.listRowSub, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                    {meditation.type} · {meditation.duration}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[s.listRowPlay, { borderColor: theme.colors.accent }]}
                  onPress={() => startMeditation(meditation)}
                >
                  <Play size={13} color={theme.colors.accent} fill={theme.colors.accent} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={s.bottomSpacing} />
      </ScrollView>

      <Modal
        visible={selectedStory !== null}
        animationType="slide"
        onRequestClose={() => setSelectedStory(null)}
      >
        <SafeAreaView style={[s.modalContainer, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
          <View style={[s.modalHeader, { borderBottomColor: theme.colors.cardBorder }]}>
            <TouchableOpacity
              onPress={() => setSelectedStory(null)}
              style={[s.closeButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
            >
              <X size={20} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text
              style={[s.modalTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}
              numberOfLines={1}
            >
              {selectedStory?.title}
            </Text>
          </View>
          <ScrollView style={s.modalContent}>
            <Text style={[s.modalNarrator, { color: theme.colors.textSecondary }]}>
              Narrated by {selectedStory?.narrator}
            </Text>
            <Text style={[s.modalStoryText, { color: theme.colors.textPrimary }]}>
              {selectedStory?.content}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    padding: 18,
    rowGap: 8,
    marginBottom: 16,
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  heroEyebrow: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 22,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
  },
  heroButton: {
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginTop: 4,
  },
  heroButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 14,
  },
  pillRow: {
    marginBottom: 16,
  },
  pillRowContent: {
    columnGap: 8,
    paddingRight: 8,
  },
  pill: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 99,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 7,
  },
  pillText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    marginBottom: 16,
  },
  listCard: {
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    marginBottom: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  listRowTextCol: {
    flex: 1,
    rowGap: 2,
  },
  listRowTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
  },
  listRowSub: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
  },
  listRowPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12, columnGap: 12,
    marginBottom: 20,
  },
  soundCard: {
    width: '47%',
    aspectRatio: 1.5,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  soundName: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 14,
    textAlign: 'center',
  },
  mixerCard: {
    padding: 20,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    marginBottom: 20,
  },
  mixerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    columnGap: 12,
  },
  mixerTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    flex: 1,
    marginLeft: 4,
  },
  remixList: {
    rowGap: 10,
    marginBottom: 20,
  },
  remixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  remixSlider: {
    flex: 1,
    height: 32,
  },
  activeSoundText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 13,
    minWidth: 90,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 24,
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
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  playingText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 13,
  },
  timerSection: {
    marginBottom: 20,
    padding: 12,
    borderRadius: theme.borderRadius.md,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 10,
  },
  timerTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  timerOptions: {
    flexDirection: 'row',
    columnGap: 8,
  },
  timerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerBtnText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  mixList: {
    marginTop: 10,
  },
  mixChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  mixChipText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    padding: 20,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalNarrator: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalStoryText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 16,
    lineHeight: 28,
  },
});


