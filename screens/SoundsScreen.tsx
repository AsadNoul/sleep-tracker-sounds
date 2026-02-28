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
  useWindowDimensions,
  Modal,
  InteractionManager,
  Animated,
  Image,
  ImageBackground,
  Alert,
  StatusBar,
  FlatList,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  SkipBack,
  SkipForward,
  Share2,
  ListMusic,
  Bell,
  StopCircle,
  Activity,
  Maximize2,
  Star,
  Settings,
  Coffee,
  Sparkles,
  VolumeX,
  Repeat
} from 'lucide-react-native';
import { Share } from 'react-native';
import { useAudio } from '../contexts/AudioContext';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

const SOUND_IMAGES: Record<string, string> = {
  'light-rain': 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400&q=80',
  'heavy-rain': 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=400&q=80',
  'rain-roof': 'https://images.unsplash.com/photo-1518803194621-27188ba552f2?w=400&q=80',
  'thunderstorm': 'https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?w=400&q=80',
  'forest': 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80',
  'birds': 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400&q=80',
  'crickets': 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=400&q=80',
  'wind': 'https://images.unsplash.com/photo-1505672678657-cc7037095e60?w=400&q=80',
  'ocean-waves': 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80',
  'gentle-surf': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  'deep-sea': 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=400&q=80',
  'underwater': 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=400&q=80',
  'white-noise': 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80',
  'pink-noise': 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&q=80',
  'brown-noise': 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&q=80',
  'fan-sound': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&q=80',
  'piano-sleep': 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80',
  'ambient-music': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80',
  'lullaby': 'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400&q=80',
  'crackling-fire': 'https://images.unsplash.com/photo-1475332363216-4ce76d0db574?w=400&q=80',
};

const CATEGORIES = ['All', 'Nature', 'White Noise', 'Music', 'Meditations'];

const ALL_SOUNDS: Record<string, any[]> = {
  'Nature': [
    { id: 'forest', name: 'Forest Ambience', duration: '45m', icon: Leaf, uri: `${GITHUB_BASE_URL}/forest-ambience.mp3`, available: true },
    { id: 'birds', name: 'Birds Chirping', duration: '30m', icon: Bird, uri: `${GITHUB_BASE_URL}/birds-chirping.mp3`, available: true },
    { id: 'crickets', name: 'Night Crickets', duration: '40m', icon: Moon, uri: `${GITHUB_BASE_URL}/night-crickets.mp3`, available: true },
    { id: 'wind', name: 'Wind in Trees', duration: '35m', icon: Wind, uri: `${GITHUB_BASE_URL}/wind-trees.mp3`, available: true },
    { id: 'light-rain', name: 'Light Rain', duration: '50m', icon: CloudRain, uri: `${GITHUB_BASE_URL}/rain-light.mp3`, available: true },
    { id: 'heavy-rain', name: 'Heavy Rain', duration: '55m', icon: CloudRain, uri: `${GITHUB_BASE_URL}/rain-heavy.mp3`, available: true },
    { id: 'rain-roof', name: 'Rain on Roof', duration: '60m', icon: CloudRain, uri: `${GITHUB_BASE_URL}/rain-roof.mp3`, available: true },
    { id: 'thunderstorm', name: 'Thunderstorm', duration: '45m', icon: Zap, uri: `${GITHUB_BASE_URL}/rain-thunder.mp3`, available: true },
    { id: 'ocean-waves', name: 'Ocean Waves', duration: '55m', icon: Waves, uri: `${GITHUB_BASE_URL}/ocean-waves.mp3`, available: true },
    { id: 'gentle-surf', name: 'Gentle Surf', duration: '40m', icon: Waves, uri: `${GITHUB_BASE_URL}/ocean-surf.mp3`, available: true },
  ],
  'White Noise': [
    { id: 'white-noise', name: 'White Noise', duration: '120m', icon: Volume2, uri: `${GITHUB_BASE_URL}/white-noise.mp3`, available: true, color: '#A0AEC0' },
    { id: 'pink-noise', name: 'Pink Noise', duration: '120m', icon: Volume2, uri: `${GITHUB_BASE_URL}/pink-noise.mp3`, available: true, color: '#F687B3' },
    { id: 'brown-noise', name: 'Brown Noise', duration: '120m', icon: Volume2, uri: `${GITHUB_BASE_URL}/brown-noise.mp3`, available: true, color: '#B7791F' },
    { id: 'fan-sound', name: 'Fan Sound', duration: '90m', icon: Volume2, uri: `${GITHUB_BASE_URL}/fan-sound.mp3`, available: true, color: '#4FD1C5' },
  ],
  'Music': [
    { id: 'piano-sleep', name: 'Sleep Piano', duration: '50m', icon: Music, uri: `${GITHUB_BASE_URL}/piano-sleep.mp3`, available: true },
    { id: 'ambient-music', name: 'Ambient Dreams', duration: '45m', icon: Music, uri: `${GITHUB_BASE_URL}/ambient-music.mp3`, available: true },
    { id: 'lullaby', name: 'Soft Lullaby', duration: '35m', icon: Music, uri: `${GITHUB_BASE_URL}/lullaby.mp3`, available: true },
  ],
  'Meditations': [
    { id: 'meditation-1', name: 'Calm Mind', duration: '25m', icon: Heart, uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`, available: true },
    { id: 'meditation-2', name: 'Deep Sleep', duration: '40m', icon: Heart, uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`, available: true },
  ],
};

const FEATURED_COLLECTIONS = [
  { id: 'rainy-evening', name: 'Autumn Rain', subtitle: 'Deep relaxation', image: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&q=80', sounds: ['light-rain', 'heavy-rain'] },
  { id: 'ocean-drift', name: 'Midnight Coast', subtitle: 'Gentle waves', image: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80', sounds: ['ocean-waves', 'gentle-surf'] },
];

const GlassView = ({ style, children, intensity = 20, tint = "dark" }: any) => {
  if (Platform.OS === 'android') {
    return (
      <View style={[style, { backgroundColor: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden' }]}>
        {children}
      </View>
    );
  }
  return (
    <BlurView intensity={intensity} tint={tint} style={[style, { overflow: 'hidden' }]}>
      {children}
    </BlurView>
  );
};

export default function SoundsScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const navigation = useNavigation<any>();
  const { width, height: screenHeight } = useWindowDimensions();
  const {
    isPlaying,
    currentSound,
    playSound,
    pauseSound,
    resumeSound,
    stopSound,
    isMixing,
    startMixing,
    stopMixing,
    activeMix,
    removeSoundFromMix,
  } = useAudio();

  const themedStyles = useMemo(() => createStyles(theme, width), [theme, width]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFullPlayer, setShowFullPlayer] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const findSoundById = (id: string | null) => {
    if (!id) return null;
    let found = null;
    Object.keys(ALL_SOUNDS).forEach(cat => {
      const s = ALL_SOUNDS[cat].find(x => x.id === id);
      if (s) found = s;
    });
    return found;
  };

  const getFeaturedPrimarySound = (soundIds: string[]) => {
    for (const soundId of soundIds) {
      const sound = findSoundById(soundId);
      if (sound?.uri) {
        return sound;
      }
    }
    return null;
  };

  const currentPlayingSound: any = useMemo(() => findSoundById(currentSound), [currentSound]);

  const displayedSounds = useMemo(() => {
    let sounds: any[] = [];
    if (selectedCategory === 'All') {
      Object.keys(ALL_SOUNDS).forEach(cat => sounds.push(...ALL_SOUNDS[cat]));
    } else {
      sounds = ALL_SOUNDS[selectedCategory] || [];
    }

    if (searchQuery.trim()) {
      return sounds.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return sounds;
  }, [selectedCategory, searchQuery]);

  const toggleSound = (sound: any) => {
    if (!sound?.uri) {
      Alert.alert('Sound unavailable', 'This sound is currently unavailable. Please try another one.');
      return;
    }

    if (currentSound === sound.id && isPlaying) {
      pauseSound();
    } else {
      playSound(sound.id, sound.uri, sound.name);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePlayCurrentSound = () => {
    if (isPlaying) {
      pauseSound();
      return;
    }

    if (currentSound && currentPlayingSound?.uri) {
      playSound(currentSound, currentPlayingSound.uri, currentPlayingSound.name);
      return;
    }

    resumeSound();
  };

  return (
    <View style={themedStyles.container}>
      <StatusBar barStyle="light-content" />

      {/* Massive Sounds Header */}
      <Animated.View style={[themedStyles.header, {
        paddingTop: insets.top + 10,
        backgroundColor: scrollY.interpolate({
          inputRange: [0, 80],
          outputRange: ['transparent', 'rgba(15, 15, 30, 0.98)'],
          extrapolate: 'clamp'
        })
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={themedStyles.iconButton}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={themedStyles.headerContent}>
          <Text style={themedStyles.headerTitle}>Sounds</Text>
          <Text style={themedStyles.headerSubtitle}>SLEEP LIBRARY</Text>
        </View>
        <TouchableOpacity onPress={() => isMixing ? stopMixing() : startMixing()} style={[themedStyles.iconButton, isMixing && themedStyles.activeIconButton]}>
          <Activity size={20} color={isMixing ? "#000" : "#FFF"} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomMargin + 100 }}
      >
        <View style={themedStyles.searchBox}>
          <GlassView intensity={10} style={themedStyles.searchInner}>
            <Search size={20} color="rgba(255,255,255,0.4)" />
            <TextInput
              placeholder="Search library..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={themedStyles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </GlassView>
        </View>

        {/* Featured Collections */}
        {!searchQuery && (
          <View style={themedStyles.section}>
            <FlatList
              data={FEATURED_COLLECTIONS}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => {
                    const primarySound = getFeaturedPrimarySound(item.sounds);
                    if (!primarySound?.uri) {
                      Alert.alert('Collection unavailable', 'Featured collection is currently unavailable.');
                      return;
                    }
                    playSound(primarySound.id, primarySound.uri, primarySound.name);
                  }}
                  style={themedStyles.featuredCard}
                >
                  <ImageBackground source={{ uri: item.image }} style={themedStyles.featuredImage} imageStyle={{ borderRadius: 32 }}>
                    <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']} style={themedStyles.featuredOverlay}>
                      <View style={themedStyles.featuredBadge}><Sparkles size={12} color="#F59E0B" /><Text style={themedStyles.featuredBadgeText}>FEATURED</Text></View>
                      <View><Text style={themedStyles.featuredTitle}>{item.name}</Text><Text style={themedStyles.featuredSubtitle}>{item.subtitle}</Text></View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 15 }}
            />
          </View>
        )}

        {/* Category Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={themedStyles.categoryRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[themedStyles.categoryPill, selectedCategory === cat && themedStyles.activeCategoryPill]}
            >
              <Text style={[themedStyles.categoryText, selectedCategory === cat && themedStyles.activeCategoryText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 2x2 Grid for EVERYTHING */}
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <Text style={themedStyles.sectionLabel}>{selectedCategory.toUpperCase()} COLLECTION</Text>
          </View>
          <View style={themedStyles.grid}>
            {displayedSounds.map(sound => (
              <TouchableOpacity
                key={sound.id}
                onPress={() => toggleSound(sound)}
                style={themedStyles.gridItem}
              >
                <GlassView intensity={12} style={[themedStyles.gridInner, currentSound === sound.id && { borderColor: '#8B5CF6', borderWidth: 1.5 }]}>
                  <Image source={{ uri: SOUND_IMAGES[sound.id] || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80' }} style={themedStyles.gridImage} />
                  <View style={themedStyles.gridOverlay}>
                    <Text style={themedStyles.gridName} numberOfLines={1}>{sound.name}</Text>
                  </View>
                  {currentSound === sound.id && isPlaying && (
                    <View style={themedStyles.gridActiveIndicator}>
                      <Pause size={20} color="#FFF" />
                    </View>
                  )}
                </GlassView>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Prominent Music Player - Floating well above navigation */}
      {currentSound && currentPlayingSound && (
        <View style={[themedStyles.playerContainer, { bottom: bottomMargin + 10 }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowFullPlayer(true)}>
            <View style={themedStyles.playerInner}>
              <BlurView intensity={90} tint="dark" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.4)' }]} />
              {/* Blue tint overlay for visibility */}
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} />

              <Image source={{ uri: (currentSound ? SOUND_IMAGES[currentSound] : null) || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100' }} style={themedStyles.miniArtwork} />
              <View style={themedStyles.playerControls}>
                <View style={themedStyles.playerInfo}>
                  <Text style={themedStyles.playerName} numberOfLines={1}>{currentPlayingSound?.name || 'Unknown'}</Text>
                  <Text style={themedStyles.playerStatus}>Now playing</Text>
                </View>
                <View style={themedStyles.playerButtons}>
                  <TouchableOpacity onPress={handlePlayCurrentSound} style={themedStyles.mainPlayBtn}>
                    {isPlaying ? <Pause size={22} color="#000" /> : <Play size={22} color="#000" />}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => stopSound()} style={themedStyles.stopBtn}>
                    <X size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Full Player Modal */}
      <Modal visible={showFullPlayer} animationType="slide" transparent>
        <View style={themedStyles.fullPlayerBg}>
          <ImageBackground source={{ uri: (currentSound ? SOUND_IMAGES[currentSound] : null) || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800' }} style={themedStyles.playerBgImage} blurRadius={10}>
            <LinearGradient colors={['rgba(15,23,42,0.6)', 'rgba(10,10,20,0.95)']} style={StyleSheet.absoluteFill} />

            <View style={[themedStyles.playerHeader, { paddingTop: insets.top + 20 }]}>
              <TouchableOpacity onPress={() => setShowFullPlayer(false)} style={themedStyles.closePlayerBtn}>
                <ChevronDown size={28} color="#FFF" />
              </TouchableOpacity>
              <Text style={themedStyles.playerHeaderTitle}>Now Playing</Text>
              <TouchableOpacity style={themedStyles.playerActionBtn}><Share2 size={24} color="#FFF" /></TouchableOpacity>
            </View>

            <View style={themedStyles.playerMainContent}>
              <View style={themedStyles.artworkContainer}>
                <Image source={{ uri: (currentSound ? SOUND_IMAGES[currentSound] : null) || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400' }} style={themedStyles.largeArtwork} />
              </View>

              <View style={themedStyles.trackInfoContainer}>
                <Text style={themedStyles.trackName}>{currentPlayingSound?.name || 'Unknown Sound'}</Text>
                <Text style={themedStyles.trackCategory}>Sleep Soundscape</Text>
              </View>

              <View style={themedStyles.playbackControlsContainer}>
                <TouchableOpacity><Repeat size={24} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
                <TouchableOpacity style={themedStyles.skipBtn}><SkipBack size={32} color="#FFF" /></TouchableOpacity>
                <TouchableOpacity onPress={handlePlayCurrentSound} style={themedStyles.largePlayBtn}>
                  {isPlaying ? <Pause size={42} color="#000" fill="#000" /> : <Play size={42} color="#000" fill="#000" />}
                </TouchableOpacity>
                <TouchableOpacity style={themedStyles.skipBtn}><SkipForward size={32} color="#FFF" /></TouchableOpacity>
                <TouchableOpacity><VolumeX size={24} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
              </View>

              {isMixing && Object.keys(activeMix).length > 0 && (
                <View style={themedStyles.mixContainer}>
                  <Text style={themedStyles.mixTitle}>Active Mix</Text>
                  {Object.entries(activeMix).map(([soundId, s]: [string, any]) => (
                    <View key={soundId} style={themedStyles.mixItem}>
                      <Text style={themedStyles.mixItemName}>{s.name}</Text>
                      <TouchableOpacity onPress={() => removeSoundFromMix(soundId)}><X size={16} color="#EF4444" /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[themedStyles.playerFooter, { paddingBottom: insets.bottom + 40 }]}>
              <TouchableOpacity style={themedStyles.timerBtn}><Timer size={20} color="#8B5CF6" /><Text style={themedStyles.timerText}>Sleep Timer</Text></TouchableOpacity>
            </View>
          </ImageBackground>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any, width: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A14' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1000,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  activeIconButton: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 34, fontWeight: '900', letterSpacing: -0.8 },
  headerSubtitle: { color: '#8B5CF6', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginTop: 4 },
  searchBox: { paddingHorizontal: 20, marginTop: 165, marginBottom: 24 },
  searchInner: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16, marginLeft: 16 },
  section: { marginBottom: 32 },
  sectionHeader: { paddingHorizontal: 25, marginBottom: 16 },
  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  featuredCard: { width: width * 0.75, height: 180, borderRadius: 32, overflow: 'hidden' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { flex: 1, padding: 24, justifyContent: 'space-between' },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  featuredBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  featuredTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  featuredSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  categoryRow: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  categoryPill: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  activeCategoryPill: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  categoryText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '700' },
  activeCategoryText: { color: '#FFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, gap: 10 },
  gridItem: { width: (width - 40) / 2 },
  gridInner: {
    height: 140,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  gridImage: { width: '100%', height: '100%', opacity: 0.78 },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 15, backgroundColor: 'rgba(0,0,0,0.52)' },
  gridName: { color: '#FFF', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  gridActiveIndicator: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(139, 92, 246, 0.4)', justifyContent: 'center', alignItems: 'center' },
  playerContainer: { position: 'absolute', left: 15, right: 15, zIndex: 10000 },
  playerInner: {
    height: 84,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.9,
    shadowRadius: 35,
    elevation: 25,
    overflow: 'hidden'
  },
  miniArtwork: { width: 60, height: 60, borderRadius: 22 },
  playerControls: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginRight: 8 },
  playerInfo: { flex: 1 },
  playerName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  playerStatus: { color: '#8B5CF6', fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  playerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mainPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  stopBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  fullPlayerBg: { flex: 1, backgroundColor: '#000' },
  playerBgImage: { flex: 1, paddingHorizontal: 30 },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closePlayerBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  playerHeaderTitle: { color: '#FFF', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.6 },
  playerActionBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  playerMainContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  artworkContainer: { width: width - 80, aspectRatio: 1, borderRadius: 40, borderBottomLeftRadius: 100, borderTopRightRadius: 100, overflow: 'hidden', elevation: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.8, shadowRadius: 30 },
  largeArtwork: { width: '100%', height: '100%' },
  trackInfoContainer: { alignItems: 'center', marginTop: 40 },
  trackName: { color: '#FFF', fontSize: 32, fontWeight: '900', textAlign: 'center' },
  trackCategory: { color: '#8B5CF6', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginTop: 8 },
  playbackControlsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 50 },
  skipBtn: { padding: 10 },
  largePlayBtn: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 15 },
  mixContainer: { marginTop: 40, width: '100%', gap: 10 },
  mixTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  mixItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 15 },
  mixItemName: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  playerFooter: { alignItems: 'center' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  timerText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
