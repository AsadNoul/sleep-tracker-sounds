import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  Timer,
  X,
  CloudRain,
  Wind,
  Waves,
  Flame,
  Music,
  Zap,
  Moon,
  Leaf,
  Bird,
  Volume2,
  Play,
  Pause,
  Plus,
  Lock,
  Save,
  ListMusic,
  Sparkles,
} from 'lucide-react-native';
import { useAudio } from '../contexts/AudioContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import analyticsService from '../services/analyticsService';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

const CATEGORIES = [
  { name: 'All', image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&q=80' },
  { name: 'Nature', image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80' },
  { name: 'White Noise', image: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80' },
  { name: 'Music', image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80' },
  { name: 'Meditations', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80' },
];

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
    { id: 'white-noise', name: 'White Noise', duration: '120m', icon: Volume2, uri: `${GITHUB_BASE_URL}/white-noise.mp3`, available: true },
    { id: 'pink-noise', name: 'Pink Noise', duration: '120m', icon: Volume2, uri: `${GITHUB_BASE_URL}/pink-noise.mp3`, available: true },
    { id: 'brown-noise', name: 'Brown Noise', duration: '120m', icon: Wind, uri: `${GITHUB_BASE_URL}/brown-noise.mp3`, available: true },
    { id: 'fan-sound', name: 'Fan Sound', duration: '90m', icon: Volume2, uri: `${GITHUB_BASE_URL}/fan-sound.mp3`, available: true },
  ],
  'Music': [
    { id: 'piano-sleep', name: 'Sleep Piano', duration: '50m', icon: Music, uri: `${GITHUB_BASE_URL}/piano-sleep.mp3`, available: true },
    { id: 'ambient-music', name: 'Ambient Dreams', duration: '45m', icon: Music, uri: `${GITHUB_BASE_URL}/ambient-music.mp3`, available: true },
    { id: 'lullaby', name: 'Soft Lullaby', duration: '35m', icon: Music, uri: `${GITHUB_BASE_URL}/lullaby.mp3`, available: true },
  ],
  'Meditations': [
    { id: 'meditation-1', name: 'Calm Mind', duration: '25m', icon: Flame, uri: `${GITHUB_BASE_URL}/meditation-calm.mp3`, available: true },
    { id: 'meditation-2', name: 'Deep Sleep', duration: '40m', icon: Flame, uri: `${GITHUB_BASE_URL}/meditation-deep.mp3`, available: true },
  ],
};

const SOUND_CATEGORY: Record<string, string> = {};
Object.entries(ALL_SOUNDS).forEach(([cat, sounds]) => {
  sounds.forEach((s) => { SOUND_CATEGORY[s.id] = cat; });
});

const TIMER_OPTIONS = [15, 30, 45, 60];

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function SoundsScreen() {
  const { theme, isDark } = useAppTheme();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const isPremium = user?.isPremium ?? false;
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const {
    isPlaying,
    isMixing,
    activeMix,
    startMixing,
    addSoundToMix,
    removeSoundFromMix,
    setMixSoundVolume,
    pauseMixing,
    resumeMixing,
    stopMixing,
    savePreset,
  } = useAudio();

  const themedStyles = useMemo(() => createStyles(theme, width), [theme, width]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [timerEndAt, setTimerEndAt] = useState<number | null>(null);
  const [timerLabel, setTimerLabel] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [mixerExpanded, setMixerExpanded] = useState(false);
  const timerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mixIds = Object.keys(activeMix);
  const hasMix = mixIds.length > 0;

  // Live countdown tick while a sleep timer is armed
  useEffect(() => {
    if (!timerEndAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timerEndAt]);

  // Clear the timer if the mix is stopped manually
  useEffect(() => {
    if (!hasMix && timerEndAt) {
      setTimerEndAt(null);
      setTimerLabel(null);
      if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
    }
  }, [hasMix]);

  useEffect(() => {
    return () => {
      if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
    };
  }, []);

  const displayedSounds = useMemo(() => {
    if (selectedCategory === 'All') {
      const sounds: any[] = [];
      Object.keys(ALL_SOUNDS).forEach((cat) => sounds.push(...ALL_SOUNDS[cat]));
      return sounds;
    }
    return ALL_SOUNDS[selectedCategory] || [];
  }, [selectedCategory]);

  const mixName = mixIds.length > 0
    ? Object.values(activeMix).slice(0, 2).map((s: any) => s.name).join(' + ') + (mixIds.length > 2 ? ` +${mixIds.length - 2}` : '')
    : '';

  const handleToggleSound = (sound: any) => {
    if (!sound?.uri) {
      Alert.alert('Sound unavailable', 'This sound is currently unavailable. Please try another one.');
      return;
    }

    if (!isPremium && !FREE_SOUND_IDS.has(sound.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      analyticsService.trackFeatureGateHit('sleep_sound').catch(() => {});
      navigation.navigate('Subscription', { source: 'sleep_sound' });
      return;
    }

    if (activeMix[sound.id]) {
      removeSoundFromMix(sound.id);
      return;
    }

    if (!isMixing) startMixing();
    addSoundToMix(sound.id, sound.uri, sound.name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePlayPauseMix = () => {
    if (isPlaying) {
      pauseMixing();
    } else {
      resumeMixing();
    }
  };

  const armTimer = (minutes: number) => {
    setShowTimerPicker(false);
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
    const endAt = Date.now() + minutes * 60 * 1000;
    setTimerEndAt(endAt);
    setTimerLabel(minutes);
    setNow(Date.now());
    timerTimeoutRef.current = setTimeout(() => {
      stopMixing();
      setTimerEndAt(null);
      setTimerLabel(null);
    }, minutes * 60 * 1000);
  };

  const cancelTimer = () => {
    setShowTimerPicker(false);
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
    setTimerEndAt(null);
    setTimerLabel(null);
  };

  const [saveName, setSaveNameState] = useState('');
  const handleSaveMix = () => {
    if (!hasMix) return;
    setSaveNameState(mixName || 'My mix');
    setShowSaveModal(true);
  };

  const timeLeftMs = timerEndAt ? timerEndAt - now : 0;

  return (
    <View style={themedStyles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: bottomMargin + (hasMix ? 140 : 40),
          paddingHorizontal: 20,
        }}
      >
        <View style={themedStyles.header}>
          <Text style={themedStyles.headerTitle}>Sounds</Text>
          <TouchableOpacity style={themedStyles.savedMixesBtn} onPress={() => navigation.navigate('SavedMixes')} activeOpacity={0.7}>
            <ListMusic size={15} color={theme.colors.textPrimary} />
            <Text style={themedStyles.savedMixesBtnText}>Saved mixes</Text>
          </TouchableOpacity>
        </View>

        {!isPremium && (
          <TouchableOpacity
            style={themedStyles.promoBanner}
            activeOpacity={0.85}
            onPress={() => {
              analyticsService.trackFeatureGateHit('sounds_banner').catch(() => {});
              navigation.navigate('Subscription', { source: 'sounds_banner' });
            }}
          >
            <View style={themedStyles.promoBannerIcon}>
              <Sparkles size={20} color={theme.colors.premiumBadgeText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={themedStyles.promoBannerTitle}>Unlock the full sound library</Text>
              <Text style={themedStyles.promoBannerSubtitle}>Binaural beats, lofi, and premium mixes</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Category carousel — rectangular photo thumbnails */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={themedStyles.categoryRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.name}
                onPress={() => setSelectedCategory(cat.name)}
                activeOpacity={0.85}
                style={[themedStyles.categoryThumb, active && themedStyles.categoryThumbActive]}
              >
                <ImageBackground
                  source={{ uri: cat.image }}
                  style={themedStyles.categoryThumbImage}
                  imageStyle={{ borderRadius: 14 }}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.65)']}
                    style={themedStyles.categoryThumbOverlay}
                  >
                    <Text style={themedStyles.categoryThumbText}>{cat.name}</Text>
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sound grid — add-to-mix cards */}
        <View style={themedStyles.soundGrid}>
          {displayedSounds.map((sound) => {
            const isLocked = !isPremium && !FREE_SOUND_IDS.has(sound.id);
            const inMix = !!activeMix[sound.id];
            const SoundIcon = sound.icon || Music;
            return (
              <TouchableOpacity
                key={sound.id}
                onPress={() => handleToggleSound(sound)}
                activeOpacity={0.8}
                style={[themedStyles.soundCard, inMix && themedStyles.soundCardActive]}
              >
                <View style={themedStyles.soundCardTop}>
                  <SoundIcon size={20} color={inMix ? theme.colors.accent : theme.colors.textSecondary} strokeWidth={2} />
                  {isLocked ? (
                    <View style={themedStyles.premiumChip}>
                      <Lock size={11} color={theme.colors.premiumBadgeText} />
                      <Text style={themedStyles.premiumChipText}>Premium</Text>
                    </View>
                  ) : inMix ? (
                    <View style={themedStyles.inMixChip}>
                      <Text style={themedStyles.inMixChipText}>In mix</Text>
                    </View>
                  ) : (
                    <Plus size={18} color={theme.colors.textTertiary} />
                  )}
                </View>
                <View>
                  <Text style={themedStyles.soundCardName} numberOfLines={1}>{sound.name}</Text>
                  <Text style={themedStyles.soundCardCategory}>{SOUND_CATEGORY[sound.id]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating mixer / mini-player — bottom of screen */}
      {hasMix && (
        <View style={[themedStyles.mixerCard, { bottom: bottomMargin + 10 }]}>
          <TouchableOpacity
            style={themedStyles.mixerTopRow}
            activeOpacity={0.7}
            onPress={() => setMixerExpanded((v) => !v)}
          >
            <View style={{ flex: 1 }}>
              <Text style={themedStyles.mixerLabel}>Your mix</Text>
              <Text style={themedStyles.mixerTitle} numberOfLines={1}>{mixName}</Text>
            </View>
            {timerEndAt && (
              <View style={themedStyles.timerPill}>
                <Timer size={13} color={theme.colors.success} />
                <Text style={themedStyles.timerPillText}>{formatCountdown(timeLeftMs)} left</Text>
              </View>
            )}
          </TouchableOpacity>

          {mixerExpanded && (
            <View style={{ rowGap: 12, marginTop: 14 }}>
              {mixIds.map((soundId) => {
                const mixed: any = activeMix[soundId];
                const def = Object.values(ALL_SOUNDS).flat().find((s: any) => s.id === soundId);
                const SoundIcon = def?.icon || Music;
                const volumePct = Math.round((mixed.volume ?? 0.5) * 100);
                return (
                  <View key={soundId} style={themedStyles.mixerSliderRow}>
                    <View style={themedStyles.mixerSliderIcon}>
                      <SoundIcon size={16} color={theme.colors.accent} />
                    </View>
                    <Text style={themedStyles.mixerSliderLabel} numberOfLines={1}>{mixed.name}</Text>
                    <Slider
                      style={{ flex: 1 }}
                      minimumValue={0}
                      maximumValue={1}
                      value={mixed.volume ?? 0.5}
                      minimumTrackTintColor={theme.colors.accent}
                      maximumTrackTintColor={theme.colors.cardBorder}
                      thumbTintColor={theme.colors.accent}
                      onValueChange={(v) => setMixSoundVolume(soundId, v)}
                    />
                    <Text style={themedStyles.mixerSliderValue}>{volumePct}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={themedStyles.mixerControlsRow}>
            <TouchableOpacity
              style={themedStyles.mixerSecondaryBtn}
              onPress={() => setShowTimerPicker(true)}
              activeOpacity={0.7}
            >
              <Timer size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={themedStyles.mixerPlayBtn}
              onPress={handlePlayPauseMix}
              activeOpacity={0.85}
            >
              {isPlaying ? (
                <Pause size={24} color={theme.colors.background} fill={theme.colors.background} />
              ) : (
                <Play size={24} color={theme.colors.background} fill={theme.colors.background} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={themedStyles.mixerSecondaryBtn}
              onPress={handleSaveMix}
              activeOpacity={0.7}
            >
              <Save size={18} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sleep timer picker */}
      {showTimerPicker && (
        <View style={themedStyles.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowTimerPicker(false)} />
          <View style={themedStyles.pickerSheet}>
            <Text style={themedStyles.pickerTitle}>Sleep timer</Text>
            <Text style={themedStyles.pickerSubtitle}>Auto-stop the mix after</Text>
            <View style={{ rowGap: 10, marginTop: 16 }}>
              {TIMER_OPTIONS.map((mins) => (
                <TouchableOpacity key={mins} style={themedStyles.pickerOption} onPress={() => armTimer(mins)} activeOpacity={0.7}>
                  <Text style={themedStyles.pickerOptionText}>{mins} minutes</Text>
                </TouchableOpacity>
              ))}
              {timerEndAt && (
                <TouchableOpacity style={themedStyles.pickerCancelOption} onPress={cancelTimer} activeOpacity={0.7}>
                  <X size={16} color={theme.colors.danger} />
                  <Text style={themedStyles.pickerCancelText}>Cancel timer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Save mix sheet */}
      {showSaveModal && (
        <View style={themedStyles.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowSaveModal(false)} />
          <View style={themedStyles.pickerSheet}>
            <Text style={themedStyles.pickerTitle}>Save this mix</Text>
            <Text style={themedStyles.pickerSubtitle}>{mixName}</Text>
            <TouchableOpacity
              style={themedStyles.saveConfirmBtn}
              onPress={async () => {
                const name = saveName.trim() || 'My mix';
                setShowSaveModal(false);
                await savePreset(name);
                showSuccess(`"${name}" saved to your mixes`);
              }}
              activeOpacity={0.85}
            >
              <Text style={themedStyles.saveConfirmText}>Save mix</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any, width: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    color: theme.colors.textPrimary,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  savedMixesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  savedMixesBtnText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },

  // Promo banner — sits where the mixer card used to be, up top
  promoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    backgroundColor: theme.colors.premiumBadgeBackground,
    borderWidth: 1,
    borderColor: theme.colors.premiumBadgeBorder,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 16,
  },
  promoBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoBannerTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  promoBannerSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // Mixer card — floats as a mini-player bar above the bottom tab bar
  mixerCard: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    zIndex: 10000,
  },
  mixerTopRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  mixerLabel: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
  mixerTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    color: theme.colors.textPrimary,
    fontSize: 18,
    marginTop: 2,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: theme.colors.success + '1F',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
  },
  timerPillText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.success,
    fontSize: 12,
  },

  mixerSliderRow: { flexDirection: 'row', alignItems: 'center', columnGap: 10 },
  mixerSliderIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  mixerSliderLabel: {
    width: 84,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    color: theme.colors.textPrimary,
    fontSize: 13,
    flexShrink: 0,
  },
  mixerSliderValue: {
    width: 28,
    textAlign: 'right',
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 12,
  },

  mixerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 24,
    marginTop: 16,
  },
  mixerSecondaryBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixerPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixerPlayBtnDisabled: { opacity: 0.4 },

  // Category pills
  categoryRow: { columnGap: 10, marginBottom: 16 },
  categoryThumb: {
    width: 120,
    height: 72,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryThumbActive: { borderColor: theme.colors.accent },
  categoryThumbImage: { width: '100%', height: '100%' },
  categoryThumbOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 10,
  },
  categoryThumbText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: '#FFFFFF',
    fontSize: 13,
  },

  // Sound grid
  soundGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  soundCard: {
    width: (width - 40 - 10) / 2,
    minHeight: 92,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    padding: 14,
    justifyContent: 'space-between',
    rowGap: 10,
  },
  soundCardActive: {
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.selectedBackground,
  },
  soundCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  soundCardName: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  soundCardCategory: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    fontSize: 12,
    marginTop: 1,
  },
  premiumChip: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  premiumChipText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.premiumBadgeText,
    fontSize: 11,
  },
  inMixChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: theme.colors.accentLight,
  },
  inMixChipText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.accent,
    fontSize: 10,
    textTransform: 'uppercase',
  },

  // Picker sheets (timer / save)
  pickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 20000,
    elevation: 25,
  },
  pickerSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    padding: 24,
    paddingBottom: 40,
  },
  pickerTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    color: theme.colors.textPrimary,
    fontSize: 20,
  },
  pickerSubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  pickerOption: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  pickerCancelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    height: 52,
    borderRadius: 14,
  },
  pickerCancelText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.danger,
    fontSize: 15,
  },
  saveConfirmBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveConfirmText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.background,
    fontSize: 15,
  },
});
