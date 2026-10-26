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
  Repeat,
  Lock,
  Plus,
} from 'lucide-react-native';
import { Share } from 'react-native';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import analyticsService from '../services/analyticsService';
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

// First 4 sounds are free. Everything else requires Premium.
const FREE_SOUND_IDS = new Set(['forest', 'birds', 'crickets', 'wind']);

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

export default function SoundsScreen() {
  const { theme, isDark } = useAppTheme();
  const { user } = useAuth();
  const isPremium = user?.isPremium ?? false;
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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
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

    // Gate premium sounds for free users
    if (!isPremium && !FREE_SOUND_IDS.has(sound.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      analyticsService.trackFeatureGateHit('sleep_sound').catch(() => {});
      navigation.navigate('Subscription', { source: 'sleep_sound' });
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <Animated.View style={[themedStyles.header, {
        paddingTop: insets.top + 10,
        backgroundColor: scrollY.interpolate({
          inputRange: [0, 80],
          outputRange: ['transparent', theme.colors.background],
          extrapolate: 'clamp'
        })
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={themedStyles.iconButton}>
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={themedStyles.headerContent}>
          <Text style={themedStyles.headerTitle}>Sounds</Text>
          <Text style={themedStyles.headerSubtitle}>SLEEP LIBRARY</Text>
        </View>
        <TouchableOpacity onPress={() => isMixing ? stopMixing() : startMixing()} style={[themedStyles.iconButton, isMixing && themedStyles.activeIconButton]}>
          <Activity size={20} color={isMixing ? theme.colors.background : theme.colors.textPrimary} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomMargin + 100 }}
      >
        <View style={themedStyles.searchBox}>
          <View style={themedStyles.searchInner}>
            <Search size={20} color={theme.colors.textTertiary} />
            <TextInput
              placeholder="Search library..."
              placeholderTextColor={theme.colors.textTertiary}
              style={themedStyles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Active Mix — shown when mixing with sounds selected (canvas-style mixer card) */}
        {isMixing && Object.keys(activeMix).length > 0 && (
          <View style={themedStyles.section}>
            <View style={themedStyles.mixerCard}>
              <View style={themedStyles.mixerTopRow}>
                <View style={themedStyles.mixerPlayRow}>
                  <TouchableOpacity onPress={handlePlayCurrentSound} style={themedStyles.mixerPlayBtn}>
                    {isPlaying ? (
                      <Pause size={22} color={theme.colors.background} fill={theme.colors.background} />
                    ) : (
                      <Play size={22} color={theme.colors.background} fill={theme.colors.background} />
                    )}
                  </TouchableOpacity>
                  <View>
                    <Text style={themedStyles.mixerTitle}>Active Mix</Text>
                    <Text style={themedStyles.mixerSubtitle}>{Object.keys(activeMix).length} sound{Object.keys(activeMix).length === 1 ? '' : 's'} playing</Text>
                  </View>
                </View>
              </View>
              <View style={themedStyles.mixerDivider} />
              {Object.entries(activeMix).map(([soundId, s]: [string, any]) => (
                <View key={soundId} style={themedStyles.mixerRow}>
                  <Text style={themedStyles.mixerRowName} numberOfLines={1}>{s.name}</Text>
                  <TouchableOpacity onPress={() => removeSoundFromMix(soundId)} style={themedStyles.mixerRemoveBtn}>
                    <X size={14} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

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
                    if (!isPremium && !FREE_SOUND_IDS.has(primarySound.id)) {
                      analyticsService.trackFeatureGateHit('featured_collection').catch(() => {});
                      navigation.navigate('Subscription', { source: 'featured_collection' });
                      return;
                    }
                    playSound(primarySound.id, primarySound.uri, primarySound.name);
                  }}
                  style={themedStyles.featuredCard}
                >
                  <ImageBackground source={{ uri: item.image }} style={themedStyles.featuredImage} imageStyle={{ borderRadius: theme.borderRadius.card }}>
                    <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.72)']} style={themedStyles.featuredOverlay}>
                      <View style={themedStyles.featuredBadge}><Sparkles size={12} color={theme.colors.premiumBadgeText} /><Text style={themedStyles.featuredBadgeText}>FEATURED</Text></View>
                      <View><Text style={themedStyles.featuredTitle}>{item.name}</Text><Text style={themedStyles.featuredSubtitle}>{item.subtitle}</Text></View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
              ItemSeparatorComponent={() => <View style={{ width: 15 }} />}
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

        {/* Sound list — canvas-style rows (icon chip + name/category + play or unlock) */}
        <View style={themedStyles.section}>
          <View style={themedStyles.sectionHeader}>
            <Text style={themedStyles.sectionLabel}>{selectedCategory.toUpperCase()} COLLECTION</Text>
          </View>
          <View style={themedStyles.listCard}>
            {displayedSounds.map((sound, index) => {
              const isLocked = !isPremium && !FREE_SOUND_IDS.has(sound.id);
              const isActive = currentSound === sound.id;
              const SoundIcon = sound.icon || Music;
              return (
                <TouchableOpacity
                  key={sound.id}
                  onPress={() => toggleSound(sound)}
                  activeOpacity={0.7}
                  style={[
                    themedStyles.soundRow,
                    index < displayedSounds.length - 1 && themedStyles.soundRowDivided,
                  ]}
                >
                  <View style={[themedStyles.soundIconChip, isLocked && themedStyles.soundIconChipLocked]}>
                    <SoundIcon size={20} color={isLocked ? theme.colors.premiumBadgeText : theme.colors.accent} strokeWidth={2} />
                  </View>
                  <View style={themedStyles.soundRowText}>
                    <Text style={themedStyles.soundRowName} numberOfLines={1}>{sound.name}</Text>
                    <Text style={[themedStyles.soundRowSub, isLocked && themedStyles.soundRowSubLocked]}>
                      {isLocked ? `Premium · ${sound.duration}` : sound.duration}
                    </Text>
                  </View>
                  {isLocked ? (
                    <View style={themedStyles.unlockBadge}>
                      <Lock size={13} color={theme.colors.premiumBadgeText} />
                      <Text style={themedStyles.unlockBadgeText}>Unlock</Text>
                    </View>
                  ) : isActive && isPlaying ? (
                    <View style={themedStyles.playingBadge}>
                      <Pause size={16} color={theme.colors.accent} />
                    </View>
                  ) : (
                    <View style={themedStyles.playBadge}>
                      <Play size={14} color={theme.colors.accent} fill={theme.colors.accent} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Mini Player */}
      {currentSound && currentPlayingSound && (
        <View style={[themedStyles.playerContainer, { bottom: bottomMargin + 10 }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setShowFullPlayer(true)} style={themedStyles.playerInner}>
            {currentSound && failedImages.has(currentSound) ? (
              <View style={[themedStyles.miniArtwork, { backgroundColor: theme.colors.backgroundTertiary }]} />
            ) : (
              <Image
                source={{ uri: (currentSound ? SOUND_IMAGES[currentSound] : null) || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100' }}
                style={themedStyles.miniArtwork}
                onError={() => currentSound && setFailedImages(prev => new Set([...prev, currentSound]))}
              />
            )}
            <View style={themedStyles.playerControls}>
              <View style={themedStyles.playerInfo}>
                <Text style={themedStyles.playerName} numberOfLines={1}>{currentPlayingSound?.name || 'Unknown'}</Text>
                <Text style={themedStyles.playerStatus}>Now playing</Text>
              </View>
              <View style={themedStyles.playerButtons}>
                <TouchableOpacity onPress={handlePlayCurrentSound} style={themedStyles.mainPlayBtn}>
                  {isPlaying ? <Pause size={22} color={theme.colors.background} /> : <Play size={22} color={theme.colors.background} />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => stopSound()} style={themedStyles.stopBtn}>
                  <X size={18} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Full Player Modal */}
      <Modal visible={showFullPlayer} animationType="slide" transparent>
        <View style={themedStyles.fullPlayerBg}>
          <ImageBackground source={{ uri: (currentSound ? SOUND_IMAGES[currentSound] : null) || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800' }} style={themedStyles.playerBgImage} blurRadius={14}>
            <LinearGradient colors={[theme.colors.gradients.background[0] + '99', theme.colors.background]} style={StyleSheet.absoluteFill} />

            <View style={[themedStyles.playerHeader, { paddingTop: insets.top + 20 }]}>
              <TouchableOpacity onPress={() => setShowFullPlayer(false)} style={themedStyles.closePlayerBtn}>
                <ChevronDown size={28} color={theme.colors.textPrimary} />
              </TouchableOpacity>
              <Text style={themedStyles.playerHeaderTitle}>Now Playing</Text>
              <TouchableOpacity
                style={themedStyles.playerActionBtn}
                onPress={async () => {
                  try {
                    await Share.share({ message: `I'm listening to "${currentPlayingSound?.name}" to sleep better with Sleep Architect.` });
                  } catch {}
                }}
              ><Share2 size={24} color={theme.colors.textPrimary} /></TouchableOpacity>
            </View>

            <View style={themedStyles.playerMainContent}>
              <View style={themedStyles.artworkContainer}>
                {currentSound && failedImages.has(currentSound) ? (
                  <View style={[themedStyles.largeArtwork, { backgroundColor: theme.colors.backgroundTertiary }]} />
                ) : (
                  <Image
                    source={{ uri: (currentSound ? SOUND_IMAGES[currentSound] : null) || 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400' }}
                    style={themedStyles.largeArtwork}
                    onError={() => currentSound && setFailedImages(prev => new Set([...prev, currentSound]))}
                  />
                )}
              </View>

              <View style={themedStyles.trackInfoContainer}>
                <Text style={themedStyles.trackName}>{currentPlayingSound?.name || 'Unknown Sound'}</Text>
                <Text style={themedStyles.trackCategory}>Sleep Soundscape</Text>
              </View>

              <View style={themedStyles.playbackControlsContainer}>
                <TouchableOpacity onPress={() => {/* repeat is ambient, always looping */}}><Repeat size={24} color={theme.colors.accent} /></TouchableOpacity>
                <TouchableOpacity
                  style={themedStyles.skipBtn}
                  onPress={() => {
                    const sounds: any[] = [];
                    Object.keys(ALL_SOUNDS).forEach(cat => sounds.push(...ALL_SOUNDS[cat]));
                    const idx = sounds.findIndex(s => s.id === currentSound);
                    const prev = sounds[(idx - 1 + sounds.length) % sounds.length];
                    if (!prev?.uri) return;
                    if (!isPremium && !FREE_SOUND_IDS.has(prev.id)) {
                      setShowFullPlayer(false);
                      analyticsService.trackFeatureGateHit('sleep_sound_skip').catch(() => {});
                      navigation.navigate('Subscription', { source: 'sleep_sound_skip' });
                      return;
                    }
                    playSound(prev.id, prev.uri, prev.name);
                  }}
                ><SkipBack size={32} color={theme.colors.textPrimary} /></TouchableOpacity>
                <TouchableOpacity onPress={handlePlayCurrentSound} style={themedStyles.largePlayBtn}>
                  {isPlaying ? <Pause size={42} color={theme.colors.background} fill={theme.colors.background} /> : <Play size={42} color={theme.colors.background} fill={theme.colors.background} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={themedStyles.skipBtn}
                  onPress={() => {
                    const sounds: any[] = [];
                    Object.keys(ALL_SOUNDS).forEach(cat => sounds.push(...ALL_SOUNDS[cat]));
                    const idx = sounds.findIndex(s => s.id === currentSound);
                    const next = sounds[(idx + 1) % sounds.length];
                    if (!next?.uri) return;
                    if (!isPremium && !FREE_SOUND_IDS.has(next.id)) {
                      setShowFullPlayer(false);
                      analyticsService.trackFeatureGateHit('sleep_sound_skip').catch(() => {});
                      navigation.navigate('Subscription', { source: 'sleep_sound_skip' });
                      return;
                    }
                    playSound(next.id, next.uri, next.name);
                  }}
                ><SkipForward size={32} color={theme.colors.textPrimary} /></TouchableOpacity>
                <TouchableOpacity onPress={() => stopSound()}><VolumeX size={24} color={theme.colors.textSecondary} /></TouchableOpacity>
              </View>

              {isMixing && Object.keys(activeMix).length > 0 && (
                <View style={themedStyles.mixContainer}>
                  <Text style={themedStyles.mixTitle}>Active Mix</Text>
                  {Object.entries(activeMix).map(([soundId, s]: [string, any]) => (
                    <View key={soundId} style={themedStyles.mixItem}>
                      <Text style={themedStyles.mixItemName}>{s.name}</Text>
                      <TouchableOpacity onPress={() => removeSoundFromMix(soundId)}><X size={16} color={theme.colors.error} /></TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={[themedStyles.playerFooter, { paddingBottom: insets.bottom + 40 }]}>
              <TouchableOpacity
                style={themedStyles.timerBtn}
                onPress={() => {
                  setShowFullPlayer(false);
                  Alert.alert(
                    'Sleep Timer',
                    'Auto-stop sound after:',
                    [
                      { text: '15 minutes', onPress: () => setTimeout(() => stopSound(), 15 * 60 * 1000) },
                      { text: '30 minutes', onPress: () => setTimeout(() => stopSound(), 30 * 60 * 1000) },
                      { text: '45 minutes', onPress: () => setTimeout(() => stopSound(), 45 * 60 * 1000) },
                      { text: '1 hour', onPress: () => setTimeout(() => stopSound(), 60 * 60 * 1000) },
                      { text: 'Cancel', style: 'cancel' },
                    ]
                  );
                }}
              ><Timer size={20} color={theme.colors.accent} /><Text style={themedStyles.timerText}>Sleep Timer</Text></TouchableOpacity>
            </View>
          </ImageBackground>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any, width: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
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
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder
  },
  activeIconButton: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    color: theme.colors.textPrimary,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.accent,
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 4,
  },
  searchBox: { paddingHorizontal: 20, marginTop: 155, marginBottom: 24 },
  searchInner: {
    height: 56,
    borderRadius: theme.borderRadius.card,
    backgroundColor: theme.colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    columnGap: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  section: { marginBottom: 28 },
  sectionHeader: { paddingHorizontal: 20, marginBottom: 14 },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textTertiary,
    fontSize: 11,
    letterSpacing: 2,
  },

  // Active mix card
  mixerCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 18,
  },
  mixerTopRow: { flexDirection: 'row', alignItems: 'center' },
  mixerPlayRow: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  mixerPlayBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixerTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  mixerSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  mixerDivider: { height: 1, backgroundColor: theme.colors.cardBorder, marginVertical: 14 },
  mixerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  mixerRowName: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  mixerRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  // Featured
  featuredCard: { width: width * 0.75, height: 170, borderRadius: theme.borderRadius.card, overflow: 'hidden' },
  featuredImage: { width: '100%', height: '100%' },
  featuredOverlay: { flex: 1, padding: 22, justifyContent: 'space-between' },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  featuredBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: '#FFF',
    fontSize: 9,
  },
  featuredTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    color: '#FFF',
    fontSize: 22,
  },
  featuredSubtitle: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 2,
  },

  // Category pills
  categoryRow: { paddingHorizontal: 20, columnGap: 10, marginBottom: 24 },
  categoryPill: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  activeCategoryPill: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  categoryText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  activeCategoryText: { color: theme.colors.background },

  // Sound list (canvas-style rows)
  listCard: {
    marginHorizontal: 20,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
  },
  soundRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
  },
  soundRowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  soundIconChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIconChipLocked: {
    backgroundColor: theme.colors.premiumBadgeBackground,
  },
  soundRowText: { flex: 1 },
  soundRowName: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  soundRowSub: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 13,
    marginTop: 1,
  },
  soundRowSubLocked: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.premiumBadgeText,
  },
  unlockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.premiumBadgeBackground,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
  },
  unlockBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.premiumBadgeText,
    fontSize: 13,
  },
  playBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Mini player
  playerContainer: { position: 'absolute', left: 15, right: 15, zIndex: 10000 },
  playerInner: {
    height: 80,
    borderRadius: theme.borderRadius.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    overflow: 'hidden',
  },
  miniArtwork: { width: 56, height: 56, borderRadius: theme.borderRadius.md },
  playerControls: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 14, marginRight: 8 },
  playerInfo: { flex: 1 },
  playerName: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  playerStatus: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.accent,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  playerButtons: { flexDirection: 'row', alignItems: 'center', columnGap: 12 },
  mainPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Full player modal
  fullPlayerBg: { flex: 1, backgroundColor: theme.colors.background },
  playerBgImage: { flex: 1, paddingHorizontal: 30 },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  closePlayerBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  playerHeaderTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 2,
    opacity: 0.7,
  },
  playerActionBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
  playerMainContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  artworkContainer: {
    width: width - 80,
    aspectRatio: 1,
    borderRadius: 40,
    borderBottomLeftRadius: 100,
    borderTopRightRadius: 100,
    overflow: 'hidden',
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  largeArtwork: { width: '100%', height: '100%' },
  trackInfoContainer: { alignItems: 'center', marginTop: 40 },
  trackName: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    color: theme.colors.textPrimary,
    fontSize: 30,
    textAlign: 'center',
  },
  trackCategory: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.accent,
    fontSize: 12,
    letterSpacing: 2,
    marginTop: 8,
  },
  playbackControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 50,
  },
  skipBtn: { padding: 10 },
  largePlayBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 15,
  },
  mixContainer: { marginTop: 40, width: '100%', rowGap: 10 },
  mixTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
  },
  mixItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 12,
    borderRadius: theme.borderRadius.lg,
  },
  mixItemName: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  playerFooter: { alignItems: 'center' },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 10,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
  },
  timerText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
});
