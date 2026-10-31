import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ChevronLeft, Play, Trash2, CloudRain, Waves, Moon, Music, Flame, Lock } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../contexts/AuthContext';
import { useAudio } from '../contexts/AudioContext';
import analyticsService from '../services/analyticsService';

const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/AsadNoul/sleep-tracker-sounds/main';

interface ReadyMadeMix {
  id: string;
  name: string;
  subtitle: string;
  icon: any;
  premium: boolean;
  sounds: Array<{ soundId: string; name: string; source: string; volume: number }>;
}

const READY_MADE_MIXES: ReadyMadeMix[] = [
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    subtitle: 'Rain · Thunder',
    icon: CloudRain,
    premium: false,
    sounds: [
      { soundId: 'heavy-rain', name: 'Heavy Rain', source: `${GITHUB_BASE_URL}/rain-heavy.mp3`, volume: 0.7 },
      { soundId: 'thunderstorm', name: 'Thunderstorm', source: `${GITHUB_BASE_URL}/rain-thunder.mp3`, volume: 0.4 },
    ],
  },
  {
    id: 'forest-camp',
    name: 'Forest camp',
    subtitle: 'Crickets · Fire',
    icon: Flame,
    premium: false,
    sounds: [
      { soundId: 'crickets', name: 'Night Crickets', source: `${GITHUB_BASE_URL}/night-crickets.mp3`, volume: 0.6 },
    ],
  },
  {
    id: 'ocean-night',
    name: 'Ocean night',
    subtitle: 'Waves · Wind',
    icon: Waves,
    premium: false,
    sounds: [
      { soundId: 'ocean-waves', name: 'Ocean Waves', source: `${GITHUB_BASE_URL}/ocean-waves.mp3`, volume: 0.7 },
      { soundId: 'wind', name: 'Wind in Trees', source: `${GITHUB_BASE_URL}/wind-trees.mp3`, volume: 0.3 },
    ],
  },
  {
    id: 'deep-focus',
    name: 'Deep focus',
    subtitle: 'Pink noise · Piano',
    icon: Music,
    premium: true,
    sounds: [
      { soundId: 'pink-noise', name: 'Pink Noise', source: `${GITHUB_BASE_URL}/pink-noise.mp3`, volume: 0.5 },
      { soundId: 'piano-sleep', name: 'Sleep Piano', source: `${GITHUB_BASE_URL}/piano-sleep.mp3`, volume: 0.4 },
    ],
  },
  {
    id: 'moonlit-drift',
    name: 'Moonlit drift',
    subtitle: 'Brown noise · Fan',
    icon: Moon,
    premium: true,
    sounds: [
      { soundId: 'brown-noise', name: 'Brown Noise', source: `${GITHUB_BASE_URL}/brown-noise.mp3`, volume: 0.5 },
      { soundId: 'fan-sound', name: 'Fan Sound', source: `${GITHUB_BASE_URL}/fan-sound.mp3`, volume: 0.3 },
    ],
  },
];

const SavedMixesScreen = () => {
  const { theme } = useAppTheme();
  const s = styles(theme);
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isPremium = user?.isPremium ?? false;
  const {
    presets,
    loadPreset,
    deletePreset,
    isMixing,
    activeMix,
    isPlaying,
    startMixing,
    stopMixing,
    addSoundToMix,
  } = useAudio();

  const activePresetSoundNames = useMemo(
    () => new Set(Object.values(activeMix).map((s: any) => s.name)),
    [activeMix]
  );

  const isPresetPlaying = (preset: { sounds: Array<{ name: string }> }) =>
    isMixing && isPlaying && preset.sounds.length > 0 && preset.sounds.every((s) => activePresetSoundNames.has(s.name));

  const handlePlayPreset = async (presetId: string) => {
    await loadPreset(presetId);
    navigation.goBack();
  };

  const handleDeletePreset = (presetId: string, name: string) => {
    Alert.alert('Delete mix', `Delete "${name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePreset(presetId) },
    ]);
  };

  const handlePlayReadyMade = async (mix: ReadyMadeMix) => {
    if (mix.premium && !isPremium) {
      analyticsService.trackFeatureGateHit('ready_made_mix').catch(() => {});
      navigation.navigate('Subscription', { source: 'ready_made_mix' });
      return;
    }
    await stopMixing();
    startMixing();
    for (const sound of mix.sounds) {
      await addSoundToMix(sound.soundId, sound.source, sound.name);
    }
    navigation.goBack();
  };

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: bottomMargin + 20, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} accessibilityLabel="Back">
            <ChevronLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Saved mixes</Text>
            <Text style={s.subtitle}>
              {presets.length} of your own · {READY_MADE_MIXES.length} ready-made
            </Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Your mixes</Text>
        {presets.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>Build a mix on the Sounds screen and save it to see it here.</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {presets.map((preset, index) => {
              const playing = isPresetPlaying(preset);
              return (
                <View
                  key={preset.id}
                  style={[s.row, index < presets.length - 1 && s.rowDivided]}
                >
                  <View style={s.rowIcon}>
                    <Music size={18} color={theme.colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowName} numberOfLines={1}>{preset.name}</Text>
                    <Text style={s.rowSub} numberOfLines={1}>
                      {preset.sounds.map((snd) => snd.name).join(' · ')}
                    </Text>
                  </View>
                  {playing ? (
                    <View style={s.playingPill}>
                      <Text style={s.playingPillText}>Playing</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={s.playBtn}
                      onPress={() => handlePlayPreset(preset.id)}
                      accessibilityLabel={`Play ${preset.name}`}
                    >
                      <Play size={14} color={theme.colors.accent} fill={theme.colors.accent} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => handleDeletePreset(preset.id, preset.name)}
                    accessibilityLabel={`Delete ${preset.name}`}
                  >
                    <Trash2 size={15} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[s.sectionLabel, { marginTop: 24 }]}>Ready-made</Text>
        <View style={s.readyGrid}>
          {READY_MADE_MIXES.map((mix) => {
            const locked = mix.premium && !isPremium;
            const MixIcon = mix.icon;
            return (
              <TouchableOpacity
                key={mix.id}
                style={s.readyCard}
                onPress={() => handlePlayReadyMade(mix)}
                activeOpacity={0.8}
              >
                <View style={s.readyIconWrap}>
                  <MixIcon size={22} color={theme.colors.accent} />
                </View>
                <View style={s.readyTextRow}>
                  <Text style={s.readyName} numberOfLines={1}>{mix.name}</Text>
                  {locked && <Lock size={12} color={theme.colors.premiumBadgeText} />}
                </View>
                <Text style={s.readySubtitle} numberOfLines={1}>{mix.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 22,
    letterSpacing: -0.2,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 12,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 20,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 14,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  rowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  rowSub: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 1,
  },
  playingPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: theme.colors.accentLight,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
  },
  playingPillText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 11,
    color: theme.colors.accent,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  readyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  readyCard: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    padding: 14,
    rowGap: 6,
  },
  readyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  readyTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readyName: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 14,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  readySubtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
});

export default SavedMixesScreen;
