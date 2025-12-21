import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Modal,
  InteractionManager,
  Animated,
  Image,
  ImageBackground,
  Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Search, 
  SlidersHorizontal, 
  Mic, 
  Play, 
  Pause, 
  Heart, 
  Timer, 
  Square, 
  ChevronDown, 
  ChevronLeft,
  MoreHorizontal,
  X,
  CloudRain,
  Wind,
  Waves,
  Flame,
  Music,
  Zap,
  Moon,
  Sun,
  Leaf,
  Bird,
  Volume2,
  Clock,
  Download,
  CheckCircle,
  DownloadCloud
} from 'lucide-react-native';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Sleep timer options in minutes
const SLEEP_TIMER_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 min', value: 5 },
  { label: '10 min', value: 10 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];

// Real sleep sounds - streamed from GitHub
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

// Thumbnail images for sounds (using Unsplash for high-quality free images)
const SOUND_IMAGES: Record<string, string> = {
  // Nature - Rain
  'light-rain': 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400&q=80',
  'heavy-rain': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400&q=80',
  'rain-roof': 'https://images.unsplash.com/photo-1518803194621-27188ba552f2?w=400&q=80',
  'thunderstorm': 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=400&q=80',
  // Nature - Forest
  'forest': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80',
  'birds': 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&q=80',
  'crickets': 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=400&q=80',
  'wind': 'https://images.unsplash.com/photo-1505672678657-cc7037095e60?w=400&q=80',
  // Nature - Ocean
  'ocean-waves': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80',
  'gentle-surf': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  'deep-sea': 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=400&q=80',
  'underwater': 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80',
  // White Noise
  'white-noise': 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80',
  'pink-noise': 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&q=80',
  'brown-noise': 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&q=80',
  'fan-sound': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80',
  // Meditations
  'meditation-1': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
  'meditation-2': 'https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?w=400&q=80',
  'meditation-3': 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?w=400&q=80',
  'meditation-4': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
  // Music
  'piano-sleep': 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80',
  'ambient-music': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80',
  'lullaby': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80',
  // Stories
  'story-1': 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80',
  'story-2': 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=80',
  'story-3': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80',
  // Fire
  'crackling-fire': 'https://images.unsplash.com/photo-1475332363216-4ce76d0db574?w=400&q=80',
};

// Collection cover images
const COLLECTION_IMAGES: Record<string, string> = {
  'rainy-evening': 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=600&q=80',
  'forest-retreat': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80',
  'cozy-fireplace': 'https://images.unsplash.com/photo-1543076659-9380cdf10613?w=600&q=80',
};

// Move static data outside component to prevent re-creation
const CATEGORIES = ['Nature', 'White Noise', 'Music', 'Meditations', 'Stories', 'Favorites'];

const FEATURED_COLLECTIONS = [
  {
    id: 'rainy-evening',
    name: 'Rainy Evening',
    icon: CloudRain,
    soundCount: 12,
    duration: '45 min',
    plays: '2.4k',
    gradient: ['#1e3a8a', '#312e81'] as [string, string],
    available: true,
    sounds: ['light-rain', 'heavy-rain', 'rain-roof', 'thunderstorm'],
  },
  {
    id: 'forest-retreat',
    name: 'Forest Retreat',
    icon: Leaf,
    soundCount: 8,
    duration: '30 min',
    plays: '1.8k',
    gradient: ['#064e3b', '#134e4a'] as [string, string],
    available: true,
    sounds: ['forest', 'birds', 'crickets', 'wind'],
  },
  {
    id: 'cozy-fireplace',
    name: 'Cozy Fireplace',
    icon: Flame,
    soundCount: 6,
    duration: '60 min',
    plays: '3.1k',
    gradient: ['#7c2d12', '#78350f'] as [string, string],
    available: false,
  },
];

const POPULAR_SOUNDS = [
  {
    id: 'piano-sleep',
    name: 'Sleep Piano',
    category: 'Music',
    duration: '∞',
    plays: '15.2k',
    likes: '3.4k',
    icon: Music,
    gradient: ['#ec4899', '#8b5cf6'] as [string, string],
    uri: `${GITHUB_BASE_URL}/piano-sleep.mp3`,
    available: true,
  },
  {
    id: 'wind-storm',
    name: 'Wind & Storm',
    category: 'Nature',
    duration: '∞',
    plays: '8.1k',
    likes: '1.2k',
    icon: Wind,
    gradient: ['#3b82f6', '#2dd4bf'] as [string, string],
    uri: `${GITHUB_BASE_URL}/wind-storm.mp3`,
    available: true,
  },
  {
    id: 'ocean-waves',
    name: 'Ocean Waves - Gentle',
    category: 'Nature',
    duration: '45 min',
    plays: '12.4k',
    likes: '2.1k',
    icon: Waves,
    gradient: ['#6366f1', '#8b5cf6'] as [string, string],
    uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`,
    available: true,
  },
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    category: 'Nature',
    duration: '60 min',
    plays: '9.8k',
    likes: '1.5k',
    icon: Zap,
    gradient: ['#10b981', '#14b8a6'] as [string, string],
    uri: `${GITHUB_BASE_URL}/rain-thunder.mp3`,
    available: true,
  },
  {
    id: 'crackling-fire',
    name: 'Crackling Fire',
    category: 'Ambience',
    duration: '90 min',
    plays: '15.2k',
    likes: '3.4k',
    icon: Flame,
    gradient: ['#f97316', '#eab308'] as [string, string],
    available: false,
  },
];

const BROWSE_CATEGORIES = [
  { id: 'rain', name: 'Rain Sounds', icon: CloudRain, count: 24, color: '#8b5cf6', available: true },
  { id: 'ocean', name: 'Ocean Waves', icon: Waves, count: 18, color: '#6366f1', available: true },
  { id: 'forest', name: 'Forest Ambience', icon: Leaf, count: 15, color: '#10b981', available: true },
  { id: 'wind', name: 'Wind & Storm', icon: Wind, count: 12, color: '#f97316', available: false },
  { id: 'fire', name: 'Fire & Crackling', icon: Flame, count: 9, color: '#eab308', available: false },
  { id: 'night', name: 'Night Ambience', icon: Moon, count: 21, color: '#8b5cf6', available: false },
];

const ALL_SOUNDS: Record<string, any[]> = {
  'Nature': [
    { id: 'forest', name: 'Forest Ambience', duration: '∞', icon: Leaf, uri: `${GITHUB_BASE_URL}/forest-ambience.mp3`, available: true },
    { id: 'birds', name: 'Birds Chirping', duration: '∞', icon: Bird, uri: `${GITHUB_BASE_URL}/birds-chirping.mp3`, available: true },
    { id: 'crickets', name: 'Night Crickets', duration: '∞', icon: Moon, uri: `${GITHUB_BASE_URL}/night-crickets.mp3`, available: true },
    { id: 'wind', name: 'Wind in Trees', duration: '∞', icon: Wind, uri: `${GITHUB_BASE_URL}/wind-trees.mp3`, available: true },
    { id: 'light-rain', name: 'Light Rain', duration: '∞', icon: CloudRain, uri: `${GITHUB_BASE_URL}/rain-light.mp3`, available: true },
    { id: 'heavy-rain', name: 'Heavy Downpour', duration: '∞', icon: CloudRain, uri: `${GITHUB_BASE_URL}/rain-heavy.mp3`, available: true },
    { id: 'rain-roof', name: 'Rain on Roof', duration: '∞', icon: CloudRain, uri: `${GITHUB_BASE_URL}/rain-roof.mp3`, available: true },
    { id: 'thunderstorm', name: 'Thunderstorm', duration: '∞', icon: Zap, uri: `${GITHUB_BASE_URL}/rain-thunder.mp3`, available: true },
    { id: 'ocean-waves', name: 'Ocean Waves', duration: '∞', icon: Waves, uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`, available: true },
    { id: 'gentle-surf', name: 'Gentle Surf', duration: '∞', icon: Waves, uri: `${GITHUB_BASE_URL}/ocean-surf.mp3`, available: true },
    { id: 'deep-sea', name: 'Deep Sea', duration: '∞', icon: Waves, uri: `${GITHUB_BASE_URL}/ocean-deep.mp3`, available: true },
    { id: 'underwater', name: 'Underwater', duration: '∞', icon: Waves, uri: `${GITHUB_BASE_URL}/ocean-underwater.mp3`, available: true },
    { id: 'wind-storm', name: 'Wind & Storm', duration: '∞', icon: Wind, uri: `${GITHUB_BASE_URL}/wind-storm.mp3`, available: true },
    { id: 'crackling-fire', name: 'Crackling Fire', duration: '∞', icon: Flame, uri: `${GITHUB_BASE_URL}/crackling-fire.mp3`, available: true },
    { id: 'night-ambience', name: 'Night Ambience', duration: '∞', icon: Moon, uri: `${GITHUB_BASE_URL}/night-ambience.mp3`, available: true },
  ],
  'White Noise': [
    { id: 'white-noise', name: 'White Noise', duration: '∞', icon: Volume2, uri: `${GITHUB_BASE_URL}/white-noise.mp3`, available: true },
    { id: 'pink-noise', name: 'Pink Noise', duration: '∞', icon: Volume2, uri: `${GITHUB_BASE_URL}/pink-noise.mp3`, available: true },
    { id: 'brown-noise', name: 'Brown Noise', duration: '∞', icon: Volume2, uri: `${GITHUB_BASE_URL}/brown-noise.mp3`, available: true },
    { id: 'fan-sound', name: 'Fan Sound', duration: '∞', icon: Volume2, uri: `${GITHUB_BASE_URL}/fan-sound.mp3`, available: true },
  ],
  'Music': [
    { id: 'piano-sleep', name: 'Sleep Piano', duration: '∞', icon: Music, uri: `${GITHUB_BASE_URL}/piano-sleep.mp3`, available: true },
    { id: 'ambient-music', name: 'Ambient Dreams', duration: '∞', icon: Music, uri: `${GITHUB_BASE_URL}/ambient-music.mp3`, available: true },
    { id: 'lullaby', name: 'Soft Lullaby', duration: '∞', icon: Music, uri: `${GITHUB_BASE_URL}/lullaby.mp3`, available: true },
  ],
  'Meditations': [
    { id: 'meditation-1', name: 'Calm Meditation', duration: '∞', icon: Heart, uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`, available: true },
    { id: 'meditation-2', name: 'Deep Sleep', duration: '∞', icon: Heart, uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`, available: true },
    { id: 'meditation-3', name: 'Mindfulness', duration: '∞', icon: Heart, uri: `${GITHUB_BASE_URL}/meditation-mindfulness.mp3`, available: true },
    { id: 'meditation-4', name: 'Sleep Frequencies', duration: '∞', icon: Heart, uri: `${GITHUB_BASE_URL}/meditation-sleep.mp3`, available: true },
    { id: 'meditation-long', name: 'Deep Meditation', duration: '∞', icon: Heart, uri: `${GITHUB_BASE_URL}/meditation-long.mp3`, available: true },
  ],
  'Stories': [
    { id: 'story-1', name: 'Enchanted Forest', duration: '20 min', icon: Moon, available: false },
    { id: 'story-2', name: 'Starry Night', duration: '15 min', icon: Moon, available: false },
    { id: 'story-3', name: 'Ocean Journey', duration: '25 min', icon: Moon, available: false },
  ],
  'Favorites': [],
};

// Category map for browse - defined outside component
const CATEGORY_MAP: Record<string, string> = {
  'rain': 'Nature',
  'ocean': 'Nature',
  'forest': 'Nature',
};

export default function SoundsScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { 
    isPlaying, 
    currentSound, 
    volume, 
    playSound, 
    pauseSound, 
    stopSound, 
    setVolume,
    downloadSound,
    isDownloaded,
    deleteDownloadedSound
  } = useAudio();
  const [selectedCategory, setSelectedCategory] = useState('Nature');
  const [searchQuery, setSearchQuery] = useState('');
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonMessage, setComingSoonMessage] = useState('');
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [downloadedSounds, setDownloadedSounds] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});
  
  // Sleep timer state
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Check which sounds are downloaded on mount and when category changes
  useEffect(() => {
    const checkDownloads = async () => {
      const sounds = ALL_SOUNDS[selectedCategory] || [];
      const status: Record<string, boolean> = {};
      for (const s of sounds) {
        status[s.id] = await isDownloaded(s.id);
      }
      setDownloadedSounds(prev => ({ ...prev, ...status }));
    };
    checkDownloads();
  }, [selectedCategory, isDownloaded]);

  // Sleep timer effect
  useEffect(() => {
    if (sleepTimerRemaining > 0 && isPlaying) {
      sleepTimerRef.current = setInterval(() => {
        setSleepTimerRemaining(prev => {
          if (prev <= 1) {
            // Timer finished - fade out and stop
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }).start(async () => {
              await stopSound();
              fadeAnim.setValue(1);
              setSleepTimerMinutes(0);
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (sleepTimerRef.current) {
        clearInterval(sleepTimerRef.current);
      }
    };
  }, [sleepTimerRemaining, isPlaying, stopSound, fadeAnim]);

  // Clear timer when sound stops
  useEffect(() => {
    if (!isPlaying && sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
    }
  }, [isPlaying]);

  const formatTimerDisplay = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleSetTimer = useCallback((minutes: number) => {
    setSleepTimerMinutes(minutes);
    setSleepTimerRemaining(minutes * 60);
    setShowTimerPicker(false);
  }, []);

  const handleCancelTimer = useCallback(() => {
    setSleepTimerMinutes(0);
    setSleepTimerRemaining(0);
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
    }
  }, []);

  // Memoize styles to prevent recreation on every render
  const themedStyles = useMemo(() => createStyles(theme), [theme]);

  const handleComingSoon = useCallback((feature: string) => {
    setComingSoonMessage(feature);
    setShowComingSoon(true);
  }, []);

  const togglePlaySound = useCallback(async (sound: any) => {
    if (!sound.available) {
      handleComingSoon(`"${sound.name}" is coming soon!`);
      return;
    }
    
    if (currentSound === sound.id && isPlaying) {
      await pauseSound();
    } else {
      // Use InteractionManager to defer audio loading for smoother UI
      InteractionManager.runAfterInteractions(() => {
        playSound(sound.id, sound.uri, sound.name);
      });
    }
  }, [currentSound, isPlaying, pauseSound, playSound, handleComingSoon]);

  const handlePlayCollection = useCallback(async (collection: any) => {
    if (!collection.available) {
      handleComingSoon(`"${collection.name}" collection is coming soon!`);
      return;
    }
    // Play first sound of collection
    const firstSoundId = collection.sounds?.[0];
    const sound = ALL_SOUNDS['Nature'].find(s => s.id === firstSoundId);
    if (sound) {
      InteractionManager.runAfterInteractions(() => {
        playSound(sound.id, sound.uri, sound.name);
      });
    }
  }, [playSound, handleComingSoon]);

  const handlePlayPopular = useCallback(async (sound: any) => {
    if (!sound.available) {
      handleComingSoon(`"${sound.name}" is coming soon!`);
      return;
    }
    if (currentSound === sound.id && isPlaying) {
      await pauseSound();
    } else {
      InteractionManager.runAfterInteractions(() => {
        playSound(sound.id, sound.uri, sound.name);
      });
    }
  }, [currentSound, isPlaying, pauseSound, playSound, handleComingSoon]);

  const handleDownload = useCallback(async (sound: any) => {
    if (profile?.subscription_status === 'free') {
      Alert.alert(
        'Premium Feature',
        'Downloading sounds for offline use is a premium feature. Upgrade to Sleep Architect VIP to unlock!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => navigation.navigate('Subscription' as never) }
        ]
      );
      return;
    }

    if (downloadedSounds[sound.id]) {
      Alert.alert(
        'Remove Download',
        'Do you want to remove this sound from your offline library?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: async () => {
              await deleteDownloadedSound(sound.id);
              setDownloadedSounds(prev => ({ ...prev, [sound.id]: false }));
            }
          }
        ]
      );
      return;
    }

    setIsDownloading(prev => ({ ...prev, [sound.id]: true }));
    const success = await downloadSound(sound.id, sound.uri);
    setIsDownloading(prev => ({ ...prev, [sound.id]: false }));
    
    if (success) {
      setDownloadedSounds(prev => ({ ...prev, [sound.id]: true }));
    }
  }, [profile, downloadedSounds, downloadSound, deleteDownloadedSound, navigation]);

  const handleBrowseCategory = useCallback((category: any) => {
    if (!category.available) {
      handleComingSoon(`"${category.name}" category is coming soon!`);
      return;
    }
    setSelectedCategory(CATEGORY_MAP[category.id] || 'Nature');
  }, [handleComingSoon]);

  const handleCloseComingSoon = useCallback(() => {
    setShowComingSoon(false);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setIsPlayerExpanded(false);
  }, []);

  const handleOpenPlayer = useCallback(() => {
    setIsPlayerExpanded(true);
  }, []);

  const handleStopAll = useCallback(async () => {
    await stopSound();
    setIsPlayerExpanded(false);
  }, [stopSound]);

  const handleMainPlayPause = useCallback(() => {
    if (isPlaying) {
      pauseSound();
    } else if (currentSound) {
      const sound = findSoundById(currentSound);
      if (sound) {
        if (sound.uri) {
          playSound(currentSound, sound.uri, sound.name);
        }
      }
    }
  }, [isPlaying, currentSound, pauseSound, playSound]);

  // Filter sounds based on search
  const filteredSounds = useMemo(() => {
    const sounds = ALL_SOUNDS[selectedCategory] || [];
    if (!searchQuery.trim()) return sounds;
    return sounds.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [selectedCategory, searchQuery]);

  // Get current playing sound info
  const currentPlayingSound = useMemo(() => {
    return findSoundById(currentSound);
  }, [currentSound]);

  return (
    <View style={themedStyles.container}>
      <LinearGradient
        colors={['#0F0F1E', '#161632', '#0F0F1E']}
        style={themedStyles.bgGradient}
      />
      
      <View style={[themedStyles.blob, { top: -100, right: -50, backgroundColor: theme.colors.accent, opacity: 0.1 }]} />
      <View style={[themedStyles.blob, { top: 200, left: -100, backgroundColor: theme.colors.premium, opacity: 0.05 }]} />

      <ScrollView 
        style={themedStyles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingTop: insets.top + 20,
          paddingBottom: currentSound ? insets.bottom + 220 : insets.bottom + 140 
        }}
      >
        {/* Header */}
        <View style={themedStyles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={themedStyles.backButton}
            >
              <ChevronLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ marginLeft: 12 }}>
              <Text style={themedStyles.title}>Sounds Library</Text>
              <Text style={themedStyles.subtitle}>VIP Sleep Architect Suite</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={themedStyles.filterButton}
            onPress={() => handleComingSoon('Filter options coming soon!')}
          >
            <SlidersHorizontal size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={themedStyles.searchContainer}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <Search size={20} color={theme.colors.textSecondary} style={themedStyles.searchIcon} />
          <TextInput
            style={themedStyles.searchInput}
            placeholder="Search sounds, collections..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity 
            style={themedStyles.micButton}
            onPress={() => handleComingSoon('Voice search coming soon!')}
          >
            <Mic size={16} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Category Pills */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={themedStyles.categoryScroll}
          contentContainerStyle={themedStyles.categoryScrollContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                themedStyles.categoryPill,
                selectedCategory === cat && themedStyles.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[
                themedStyles.categoryPillText,
                selectedCategory === cat && themedStyles.categoryPillTextActive,
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Featured Collections */}
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <Text style={themedStyles.sectionTitle}>Featured Collections</Text>
            <TouchableOpacity onPress={() => handleComingSoon('More collections coming soon!')}>
              <Text style={themedStyles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={themedStyles.collectionsScroll}
          >
            {FEATURED_COLLECTIONS.map((collection) => (
              <TouchableOpacity
                key={collection.id}
                onPress={() => handlePlayCollection(collection)}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={{ uri: COLLECTION_IMAGES[collection.id] }}
                  style={themedStyles.collectionCard}
                  imageStyle={themedStyles.collectionCardImage}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(15, 15, 30, 0.9)']}
                    style={themedStyles.collectionOverlay}
                  >
                    <View style={themedStyles.collectionContent}>
                      <View style={themedStyles.collectionIcon}>
                        <collection.icon size={20} color={theme.colors.premium} />
                      </View>
                      <Text style={themedStyles.collectionName}>{collection.name}</Text>
                      <Text style={themedStyles.collectionMeta}>
                        {collection.soundCount} sounds • {collection.duration}
                      </Text>
                      <View style={themedStyles.collectionActions}>
                        <View style={themedStyles.playAllButton}>
                          <Play size={14} color="#000" fill="#000" />
                          <Text style={themedStyles.playAllText}>Listen Now</Text>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popular This Week */}
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <Text style={themedStyles.sectionTitle}>Popular This Week</Text>
          </View>
          <View style={themedStyles.popularList}>
            {POPULAR_SOUNDS.map((sound) => (
              <TouchableOpacity
                key={sound.id}
                style={themedStyles.popularCard}
                onPress={() => handlePlayPopular(sound)}
                activeOpacity={0.7}
              >
                <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={themedStyles.popularIconContainer}>
                  <Image 
                    source={{ uri: SOUND_IMAGES[sound.id] }} 
                    style={themedStyles.popularImage}
                  />
                  <View style={themedStyles.popularImageIcon}>
                    <sound.icon size={14} color={theme.colors.premium} />
                  </View>
                </View>
                <View style={themedStyles.popularInfo}>
                  <Text style={themedStyles.popularName}>{sound.name}</Text>
                  <Text style={themedStyles.popularMeta}>{sound.category} • {sound.duration}</Text>
                </View>
                <View style={[
                  themedStyles.playButton,
                  currentSound === sound.id && isPlaying && themedStyles.playButtonActive
                ]}>
                  {currentSound === sound.id && isPlaying ? (
                    <Pause size={20} color="#000" fill="#000" />
                  ) : (
                    <Play size={20} color={theme.colors.accent} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Browse by Category */}
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <Text style={themedStyles.sectionTitle}>Browse by Category</Text>
          </View>
          <View style={themedStyles.categoryGrid}>
            {BROWSE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={themedStyles.browseCard}
                onPress={() => handleBrowseCategory(category)}
                activeOpacity={0.7}
              >
                <BlurView intensity={15} tint="dark" style={StyleSheet.absoluteFill} />
                <View style={[themedStyles.browseGlow, { backgroundColor: category.color }]} />
                <View style={[themedStyles.browseIcon, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <category.icon size={24} color={category.color} />
                </View>
                <Text style={themedStyles.browseName}>{category.name}</Text>
                <Text style={themedStyles.browseCount}>{category.count} sounds</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* All Sounds in Selected Category */}
        {filteredSounds.length > 0 && (
          <View style={themedStyles.section}>
            <View style={themedStyles.sectionHeader}>
              <Text style={themedStyles.sectionTitle}>{selectedCategory} Sounds</Text>
            </View>
            <View style={themedStyles.soundsList}>
              {filteredSounds.map((sound) => (
                <TouchableOpacity
                  key={sound.id}
                  style={themedStyles.soundItem}
                  onPress={() => togglePlaySound(sound)}
                  activeOpacity={0.7}
                >
                  <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={themedStyles.soundItemImageContainer}>
                    {SOUND_IMAGES[sound.id] ? (
                      <Image 
                        source={{ uri: SOUND_IMAGES[sound.id] }}
                        style={themedStyles.soundItemImage}
                      />
                    ) : (
                      <View style={[
                        themedStyles.soundItemIcon,
                        currentSound === sound.id && isPlaying && themedStyles.soundItemIconActive
                      ]}>
                        <sound.icon 
                          size={20} 
                          color={currentSound === sound.id && isPlaying ? '#000' : theme.colors.accent} 
                        />
                      </View>
                    )}
                  </View>
                  <View style={themedStyles.soundItemInfo}>
                    <Text style={themedStyles.soundItemName}>{sound.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={themedStyles.soundItemDuration}>
                        {sound.available ? sound.duration : 'Coming Soon'}
                      </Text>
                      {downloadedSounds[sound.id] && (
                        <View style={themedStyles.downloadedBadge}>
                          <CheckCircle size={10} color={theme.colors.premium} />
                          <Text style={themedStyles.downloadedText}>Offline</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {sound.available && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDownload(sound);
                        }}
                        style={themedStyles.downloadButton}
                      >
                        {isDownloading[sound.id] ? (
                          <Animated.View style={{ transform: [{ rotate: '0deg' }] }}>
                            <DownloadCloud size={20} color={theme.colors.textSecondary} />
                          </Animated.View>
                        ) : downloadedSounds[sound.id] ? (
                          <CheckCircle size={20} color={theme.colors.premium} />
                        ) : (
                          <Download size={20} color={theme.colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    )}

                    {currentSound === sound.id && isPlaying ? (
                      <View style={themedStyles.playingIndicator}>
                        <View style={themedStyles.playingBar} />
                        <View style={themedStyles.playingBar} />
                        <View style={themedStyles.playingBar} />
                      </View>
                    ) : (
                      sound.available ? (
                        <Play size={24} color={theme.colors.accent} />
                      ) : (
                        <Clock size={24} color={theme.colors.textSecondary} />
                      )
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Now Playing Bar - Positioned below with enhanced blur */}
      {currentSound && currentPlayingSound && (
        <Animated.View style={[themedStyles.nowPlayingContainer, { opacity: fadeAnim }]}>
          <BlurView intensity={100} tint="dark" style={themedStyles.nowPlayingBar}>
            <LinearGradient
              colors={['rgba(212, 175, 55, 0.05)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <TouchableOpacity 
              style={themedStyles.nowPlayingContent}
              onPress={handleOpenPlayer}
              activeOpacity={0.9}
            >
              <View style={themedStyles.nowPlayingIconContainer}>
                {SOUND_IMAGES[currentPlayingSound.id] ? (
                  <Image 
                    source={{ uri: SOUND_IMAGES[currentPlayingSound.id] }}
                    style={themedStyles.nowPlayingImage}
                  />
                ) : (
                  <LinearGradient
                    colors={[theme.colors.accent, theme.colors.highlight]}
                    style={themedStyles.nowPlayingIconFallback}
                  >
                    <currentPlayingSound.icon size={20} color="#fff" />
                  </LinearGradient>
                )}
              </View>
              <View style={themedStyles.nowPlayingInfo}>
                <Text style={themedStyles.nowPlayingTitle} numberOfLines={1}>
                  {currentPlayingSound.name}
                </Text>
                <View style={themedStyles.nowPlayingMeta}>
                  <Text style={themedStyles.nowPlayingSubtitle}>
                    {selectedCategory}
                  </Text>
                  {sleepTimerRemaining > 0 && (
                    <View style={themedStyles.timerBadge}>
                      <Timer size={10} color={theme.colors.premium} />
                      <Text style={themedStyles.timerBadgeText}>
                        {formatTimerDisplay(sleepTimerRemaining)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={themedStyles.nowPlayingControls}>
                <TouchableOpacity 
                  style={themedStyles.mainPlayButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleMainPlayPause();
                  }}
                >
                  {isPlaying ? (
                    <Pause size={24} color="#000" fill="#000" />
                  ) : (
                    <Play size={24} color="#000" fill="#000" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={themedStyles.controlButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleStopAll();
                  }}
                >
                  <Square size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}

      {/* Coming Soon Modal */}
      <Modal
        visible={showComingSoon}
        transparent
        animationType="fade"
        onRequestClose={handleCloseComingSoon}
      >
        <TouchableOpacity 
          style={themedStyles.modalOverlay}
          activeOpacity={1}
          onPress={handleCloseComingSoon}
        >
          <BlurView intensity={40} tint="dark" style={themedStyles.comingSoonModal}>
            <View style={themedStyles.comingSoonIcon}>
              <Clock size={40} color={theme.colors.accent} />
            </View>
            <Text style={themedStyles.comingSoonTitle}>Coming Soon!</Text>
            <Text style={themedStyles.comingSoonMessage}>{comingSoonMessage}</Text>
            <TouchableOpacity 
              style={themedStyles.comingSoonButton}
              onPress={handleCloseComingSoon}
            >
              <Text style={themedStyles.comingSoonButtonText}>Got it</Text>
            </TouchableOpacity>
          </BlurView>
        </TouchableOpacity>
      </Modal>

      {/* Expanded Player Modal */}
      <Modal
        visible={isPlayerExpanded}
        transparent
        animationType="slide"
        onRequestClose={handleClosePlayer}
      >
        <BlurView intensity={95} tint="dark" style={themedStyles.expandedPlayer}>
          <View style={themedStyles.expandedHeader}>
            <TouchableOpacity onPress={handleClosePlayer}>
              <ChevronDown size={28} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={themedStyles.expandedHeaderTitle}>Now Playing</Text>
            <TouchableOpacity onPress={() => handleComingSoon('More options coming soon!')}>
              <MoreHorizontal size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={themedStyles.expandedContent}>
            {currentPlayingSound && SOUND_IMAGES[currentPlayingSound.id] ? (
              <View style={themedStyles.expandedArtworkContainer}>
                <Image 
                  source={{ uri: SOUND_IMAGES[currentPlayingSound.id] }}
                  style={themedStyles.expandedArtworkImage}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)']}
                  style={themedStyles.expandedArtworkOverlay}
                />
              </View>
            ) : (
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.highlight]}
                style={themedStyles.expandedArtwork}
              >
                {currentPlayingSound && <currentPlayingSound.icon size={80} color="#fff" />}
              </LinearGradient>
            )}

            <Text style={themedStyles.expandedTitle}>{currentPlayingSound?.name || 'Unknown'}</Text>
            <Text style={themedStyles.expandedSubtitle}>{selectedCategory}</Text>

            {/* Sleep Timer Display */}
            {sleepTimerRemaining > 0 && (
              <View style={themedStyles.activeTimerContainer}>
                <Timer size={18} color={theme.colors.accent} />
                <Text style={themedStyles.activeTimerText}>
                  Sound stops in {formatTimerDisplay(sleepTimerRemaining)}
                </Text>
                <TouchableOpacity onPress={handleCancelTimer}>
                  <X size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Volume Slider */}
            <View style={themedStyles.volumeContainer}>
              <Volume2 size={20} color={theme.colors.textSecondary} />
              <Slider
                style={themedStyles.volumeSlider}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                onValueChange={setVolume}
                minimumTrackTintColor={theme.colors.accent}
                maximumTrackTintColor={theme.colors.disabled}
                thumbTintColor={theme.colors.accent}
              />
              <Volume2 size={20} color={theme.colors.textSecondary} />
            </View>

            {/* Controls */}
            <View style={themedStyles.expandedControls}>
              <TouchableOpacity onPress={() => setShowTimerPicker(true)}>
                <Timer 
                  size={24} 
                  color={sleepTimerRemaining > 0 ? theme.colors.accent : theme.colors.textSecondary} 
                />
              </TouchableOpacity>
              <TouchableOpacity>
                <Square size={32} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={themedStyles.expandedMainButton}
                onPress={handleMainPlayPause}
              >
                {isPlaying ? (
                  <Pause size={40} color="#fff" />
                ) : (
                  <Play size={40} color="#fff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity>
                <Square size={32} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity>
                <Square size={24} color={theme.colors.accent} />
              </TouchableOpacity>
            </View>

            {/* Timer & Stop */}
            <View style={themedStyles.timerRow}>
              <TouchableOpacity 
                style={[
                  themedStyles.timerButton, 
                  sleepTimerRemaining > 0 && themedStyles.timerButtonActive
                ]}
                onPress={() => setShowTimerPicker(true)}
              >
                <Timer 
                  size={20} 
                  color={sleepTimerRemaining > 0 ? theme.colors.accent : theme.colors.textSecondary} 
                />
                <Text style={[
                  themedStyles.timerText,
                  sleepTimerRemaining > 0 && { color: theme.colors.accent }
                ]}>
                  {sleepTimerRemaining > 0 ? formatTimerDisplay(sleepTimerRemaining) : 'Sleep Timer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={themedStyles.stopAllButton}
                onPress={handleStopAll}
              >
                <Square size={20} color={theme.colors.error} />
                <Text style={[themedStyles.timerText, { color: theme.colors.error }]}>Stop All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Sleep Timer Picker Modal */}
      <Modal
        visible={showTimerPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimerPicker(false)}
      >
        <TouchableOpacity 
          style={themedStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimerPicker(false)}
        >
          <BlurView intensity={60} tint="dark" style={themedStyles.timerPickerModal}>
            <Text style={themedStyles.timerPickerTitle}>Sleep Timer</Text>
            <Text style={themedStyles.timerPickerSubtitle}>
              Sound will fade out and stop after the selected time
            </Text>
            <View style={themedStyles.timerOptionsGrid}>
              {SLEEP_TIMER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    themedStyles.timerOption,
                    sleepTimerMinutes === option.value && themedStyles.timerOptionActive
                  ]}
                  onPress={() => handleSetTimer(option.value)}
                >
                  <Text style={[
                    themedStyles.timerOptionText,
                    sleepTimerMinutes === option.value && themedStyles.timerOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {sleepTimerRemaining > 0 && (
              <TouchableOpacity 
                style={themedStyles.cancelTimerButton}
                onPress={() => {
                  handleCancelTimer();
                  setShowTimerPicker(false);
                }}
              >
                <Text style={themedStyles.cancelTimerText}>Cancel Timer</Text>
              </TouchableOpacity>
            )}
          </BlurView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Helper function to find sound by ID
function findSoundById(soundId: string | null): any {
  if (!soundId) return null;
  for (const category of Object.values(ALL_SOUNDS)) {
    const found = category.find(s => s.id === soundId);
    if (found) return found;
  }
  return POPULAR_SOUNDS.find(s => s.id === soundId);
}

// Styles defined outside component to prevent recreation
const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.premium,
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 24,
    overflow: 'hidden',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  micButton: {
    padding: 8,
  },
  categoryScroll: {
    marginBottom: 32,
  },
  categoryScrollContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryPillActive: {
    backgroundColor: theme.colors.premium,
    borderColor: theme.colors.premium,
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryPillTextActive: {
    color: '#000',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  viewAll: {
    fontSize: 14,
    color: theme.colors.premium,
    fontWeight: '600',
  },
  collectionsScroll: {
    paddingHorizontal: 24,
    gap: 16,
  },
  collectionCard: {
    width: 280,
    height: 180,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  collectionCardImage: {
    borderRadius: 24,
  },
  collectionOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
  },
  collectionContent: {
    gap: 4,
  },
  collectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  collectionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  collectionMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  collectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.premium,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  playAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
  popularList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  popularCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  popularIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 16,
  },
  popularImage: {
    width: '100%',
    height: '100%',
  },
  popularImageIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  popularInfo: {
    flex: 1,
  },
  popularName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  popularMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  playButtonActive: {
    backgroundColor: theme.colors.premium,
    borderColor: theme.colors.premium,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
  },
  browseCard: {
    width: (width - 48 - 12) / 2,
    height: 120,
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  browseGlow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
  },
  browseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  browseName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  browseCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  soundsList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  soundItemImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
  },
  soundItemImage: {
    width: '100%',
    height: '100%',
  },
  soundItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundItemIconActive: {
    backgroundColor: theme.colors.premium,
  },
  soundItemInfo: {
    flex: 1,
  },
  soundItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  soundItemDuration: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    gap: 4,
  },
  downloadedText: {
    fontSize: 10,
    color: theme.colors.premium,
    fontWeight: '600',
  },
  downloadButton: {
    padding: 8,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 20,
    paddingRight: 8,
  },
  playingBar: {
    width: 3,
    height: 12,
    backgroundColor: theme.colors.premium,
    borderRadius: 1.5,
  },
  nowPlayingContainer: {
    position: 'absolute',
    bottom: 100, // Positioned above the tab bar
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  nowPlayingBar: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    backgroundColor: 'rgba(15, 15, 30, 0.8)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nowPlayingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  nowPlayingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nowPlayingImage: {
    width: '100%',
    height: '100%',
  },
  nowPlayingIconFallback: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  nowPlayingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  nowPlayingSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  timerBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.premium,
  },
  nowPlayingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainPlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.premium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonModal: {
    width: width - 64,
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#161632',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  comingSoonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  comingSoonMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  comingSoonButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.premium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  expandedPlayer: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  expandedHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  expandedContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  expandedArtworkContainer: {
    width: width - 64,
    height: width - 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  expandedArtworkImage: {
    width: '100%',
    height: '100%',
  },
  expandedArtwork: {
    width: width - 64,
    height: width - 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  expandedArtworkOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  expandedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  expandedSubtitle: {
    fontSize: 18,
    color: theme.colors.premium,
    fontWeight: '600',
    marginBottom: 48,
  },
  activeTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  activeTimerText: {
    fontSize: 14,
    color: theme.colors.premium,
    fontWeight: '600',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 48,
    gap: 12,
  },
  volumeSlider: {
    flex: 1,
  },
  expandedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 48,
  },
  expandedMainButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.premium,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowColor: theme.colors.premium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerButtonActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: theme.colors.premium,
  },
  timerText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  stopAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 115, 115, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229, 115, 115, 0.2)',
  },
  timerPickerModal: {
    width: width - 48,
    borderRadius: 32,
    padding: 24,
    backgroundColor: '#161632',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  timerPickerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  timerPickerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  timerOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  timerOption: {
    width: (width - 48 - 48 - 24) / 3,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerOptionActive: {
    backgroundColor: theme.colors.premium,
    borderColor: theme.colors.premium,
  },
  timerOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  timerOptionTextActive: {
    color: '#000',
  },
  cancelTimerButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(229, 115, 115, 0.1)',
    alignItems: 'center',
  },
  cancelTimerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E57373',
  },
});
