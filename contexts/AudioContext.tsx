import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AudioError {
  code: string;
  message: string;
  canRetry: boolean;
}

interface MixedSound {
  sound: Audio.Sound;
  name: string;
  volume: number;
  source: any;
}

interface SoundPreset {
  id: string;
  name: string;
  sounds: Array<{
    soundId: string;
    volume: number;
    name: string;
    source: any;
  }>;
  createdAt: number;
}

interface AudioContextType {
  isPlaying: boolean;
  currentSound: string | null;
  currentSoundName: string | null;
  volume: number;
  isLoading: boolean;
  error: AudioError | null;
  playSound: (soundId: string, source: any, name?: string, retryCount?: number) => Promise<void>;
  pauseSound: () => Promise<void>;
  resumeSound: () => Promise<void>;
  stopSound: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  clearError: () => void;
  retryLastSound: () => Promise<void>;

  // Sound mixing features
  isMixing: boolean;
  activeMix: { [soundId: string]: MixedSound };
  startMixing: () => void;
  stopMixing: () => Promise<void>;
  addSoundToMix: (soundId: string, source: any, name: string) => Promise<void>;
  removeSoundFromMix: (soundId: string) => Promise<void>;
  setMixSoundVolume: (soundId: string, volume: number) => Promise<void>;

  // Preset management
  presets: SoundPreset[];
  loadPresets: () => Promise<void>;
  savePreset: (name: string) => Promise<void>;
  loadPreset: (presetId: string) => Promise<void>;
  deletePreset: (presetId: string) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<string | null>(null);
  const [currentSoundName, setCurrentSoundName] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AudioError | null>(null);

  // Store last sound details for retry
  const [lastSoundAttempt, setLastSoundAttempt] = useState<{
    soundId: string;
    source: any;
    name?: string;
  } | null>(null);

  // Sound mixing state
  const [isMixing, setIsMixing] = useState(false);
  const [activeMix, setActiveMix] = useState<{ [soundId: string]: MixedSound }>({});
  const [presets, setPresets] = useState<SoundPreset[]>([]);

  // Ref to track active mix for cleanup (avoids stale closure)
  const activeMixRef = React.useRef(activeMix);
  useEffect(() => {
    activeMixRef.current = activeMix;
  }, [activeMix]);

  // Configure audio mode on mount
  useEffect(() => {
    configureAudio();
    loadPresets();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      // Cleanup all mixed sounds using the ref to avoid stale closure
      Object.values(activeMixRef.current).forEach(mixedSound => {
        mixedSound.sound.unloadAsync();
      });
    };
  }, []);

  const configureAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true, // Always allow so recorder can work alongside music
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error configuring audio:', error);
    }
  };

  const playSound = async (soundId: string, source: any, name?: string, retryCount = 0) => {
    try {
      setIsLoading(true);
      setError(null);

      // Store for retry
      setLastSoundAttempt({ soundId, source, name });

      // Validate source
      if (!source) {
        const err: AudioError = {
          code: 'INVALID_SOURCE',
          message: 'Invalid sound source provided',
          canRetry: false,
        };
        setError(err);
        setIsLoading(false);
        return;
      }

      // If there's already a sound playing, stop it first
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (e) {
          console.warn('Error unloading previous sound:', e);
        }
        setSound(null);
      }

      // Create and load new sound with timeout
      const soundSource = typeof source === 'string' ? { uri: source } : source;
      const soundPromise = Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true, volume, isLooping: true },
        onPlaybackStatusUpdate
      );

      // Add 15 second timeout for loading
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Sound loading timeout - network may be slow')),
          15000
        );
      });

      const { sound: newSound } = await Promise.race([soundPromise, timeoutPromise]);

      setSound(newSound);
      setCurrentSound(soundId);
      setCurrentSoundName(name || soundId);
      setIsPlaying(true);
      setError(null);
      setIsLoading(false);

      console.log(`✓ Playing: ${name || soundId}`);
    } catch (error: any) {
      console.error('Error playing sound:', error);

      // Determine error type and whether we can retry
      let audioError: AudioError;
      const errorMessage = error?.message || 'Unknown error';

      if (errorMessage.includes('timeout') || errorMessage.includes('timeout')) {
        audioError = {
          code: 'NETWORK_TIMEOUT',
          message: 'Network connection slow. Tap to retry.',
          canRetry: true,
        };
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        audioError = {
          code: 'NOT_FOUND',
          message: 'Sound file not found',
          canRetry: false,
        };
      } else if (errorMessage.includes('Network') || errorMessage.includes('network')) {
        audioError = {
          code: 'NETWORK_ERROR',
          message: 'Network error. Check your connection and try again.',
          canRetry: true,
        };
      } else if (errorMessage.includes('permission')) {
        audioError = {
          code: 'PERMISSION_ERROR',
          message: 'Permission denied to play audio',
          canRetry: false,
        };
      } else {
        audioError = {
          code: 'PLAYBACK_ERROR',
          message: 'Failed to play audio: ' + errorMessage,
          canRetry: retryCount < 2, // Allow up to 2 retries
        };
      }

      setError(audioError);
      setIsLoading(false);

      // Show user-friendly error
      let alertMessage = audioError.message;
      if (audioError.canRetry) {
        alertMessage += '\n\nTap "Retry" to try again.';
      }

      Alert.alert('Audio Error', alertMessage, [
        ...(audioError.canRetry ? [{
          text: 'Retry',
          onPress: async () => {
            if (retryCount < 2) {
              await playSound(soundId, source, name, retryCount + 1);
            }
          },
        }] : []),
        { text: 'Cancel', onPress: () => setError(null) },
      ]);
    }
  };

  const pauseSound = async () => {
    try {
      if (sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error pausing sound:', error);
    }
  };

  const resumeSound = async () => {
    try {
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error resuming sound:', error);
    }
  };

  const stopSound = async () => {
    try {
      if (sound) {
        console.log('Stopping sound...');
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setCurrentSound(null);
        setCurrentSoundName(null);
        setIsPlaying(false);
        console.log('Sound stopped successfully');
      }
    } catch (error) {
      console.error('Error stopping sound:', error);
      // Force reset state even if there's an error
      setSound(null);
      setCurrentSound(null);
      setCurrentSoundName(null);
      setIsPlaying(false);
    }
  };

  const setVolume = async (newVolume: number) => {
    try {
      setVolumeState(newVolume);
      if (sound) {
        await sound.setVolumeAsync(newVolume);
      }
    } catch (error) {
      console.error('Error setting volume:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
    } else if (status.error) {
      console.error('Playback error:', status.error);
      const audioError: AudioError = {
        code: 'PLAYBACK_FAILED',
        message: 'Playback failed. Check your connection.',
        canRetry: true,
      };
      setError(audioError);
      Alert.alert(
        'Playback Error',
        'An error occurred during playback.\n\nTap "Retry" to try again.',
        [
          {
            text: 'Retry',
            onPress: async () => {
              if (lastSoundAttempt) {
                await playSound(
                  lastSoundAttempt.soundId,
                  lastSoundAttempt.source,
                  lastSoundAttempt.name
                );
              }
            },
          },
          { text: 'Cancel', onPress: () => setError(null) },
        ]
      );
    }
  };

  const clearError = () => {
    setError(null);
  };

  const retryLastSound = async () => {
    if (lastSoundAttempt) {
      await playSound(
        lastSoundAttempt.soundId,
        lastSoundAttempt.source,
        lastSoundAttempt.name
      );
    }
  };

  // ===== Sound Mixing Functions =====

  const startMixing = () => {
    // Stop single sound if playing
    if (sound) {
      stopSound();
    }
    setIsMixing(true);
    setIsPlaying(true);
  };

  const stopMixing = async () => {
    try {
      // Unload all mixed sounds
      const unloadPromises = Object.values(activeMix).map(mixedSound =>
        mixedSound.sound.unloadAsync()
      );
      await Promise.all(unloadPromises);

      setActiveMix({});
      setIsMixing(false);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error stopping mix:', error);
    }
  };

  const addSoundToMix = async (soundId: string, source: any, name: string) => {
    try {
      setIsLoading(true);

      // Check if already in mix
      if (activeMix[soundId]) {
        setIsLoading(false);
        return;
      }

      // Create new sound
      const soundSource = typeof source === 'string' ? { uri: source } : source;
      const { sound: newSound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true, volume: 0.5, isLooping: true }
      );

      setActiveMix(prev => ({
        ...prev,
        [soundId]: {
          sound: newSound,
          name,
          volume: 0.5,
          source,
        },
      }));

      setIsLoading(false);
      console.log(`✓ Added to mix: ${name}`);
    } catch (error) {
      console.error('Error adding sound to mix:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to add sound to mix');
    }
  };

  const removeSoundFromMix = async (soundId: string) => {
    try {
      const mixedSound = activeMix[soundId];
      if (mixedSound) {
        await mixedSound.sound.unloadAsync();

        const newMix = { ...activeMix };
        delete newMix[soundId];
        setActiveMix(newMix);

        console.log(`✓ Removed from mix: ${mixedSound.name}`);
      }
    } catch (error) {
      console.error('Error removing sound from mix:', error);
    }
  };

  const setMixSoundVolume = async (soundId: string, volume: number) => {
    try {
      const mixedSound = activeMix[soundId];
      if (mixedSound) {
        await mixedSound.sound.setVolumeAsync(volume);

        setActiveMix(prev => ({
          ...prev,
          [soundId]: {
            ...prev[soundId],
            volume,
          },
        }));
      }
    } catch (error) {
      console.error('Error setting mix sound volume:', error);
    }
  };

  // ===== Preset Management Functions =====

  const loadPresets = async () => {
    try {
      const presetsJson = await AsyncStorage.getItem('sound_presets');
      if (presetsJson) {
        const loadedPresets = JSON.parse(presetsJson);
        setPresets(loadedPresets);
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  };

  const savePreset = async (name: string) => {
    try {
      if (Object.keys(activeMix).length === 0) {
        Alert.alert('Error', 'Add at least one sound to save a preset');
        return;
      }

      const preset: SoundPreset = {
        id: Date.now().toString(),
        name,
        sounds: Object.entries(activeMix).map(([soundId, mixedSound]) => ({
          soundId,
          volume: mixedSound.volume,
          name: mixedSound.name,
          source: mixedSound.source,
        })),
        createdAt: Date.now(),
      };

      const updatedPresets = [...presets, preset];
      await AsyncStorage.setItem('sound_presets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);

      Alert.alert('Success', `Preset "${name}" saved!`);
    } catch (error) {
      console.error('Error saving preset:', error);
      Alert.alert('Error', 'Failed to save preset');
    }
  };

  const loadPreset = async (presetId: string) => {
    try {
      const preset = presets.find(p => p.id === presetId);
      if (!preset) {
        Alert.alert('Error', 'Preset not found');
        return;
      }

      // Stop current mix
      await stopMixing();

      // Start mixing mode
      setIsMixing(true);
      setIsPlaying(true);

      // Load all sounds from preset
      for (const soundConfig of preset.sounds) {
        await addSoundToMix(soundConfig.soundId, soundConfig.source, soundConfig.name);
        await setMixSoundVolume(soundConfig.soundId, soundConfig.volume);
      }

      console.log(`✓ Loaded preset: ${preset.name}`);
    } catch (error) {
      console.error('Error loading preset:', error);
      Alert.alert('Error', 'Failed to load preset');
    }
  };

  const deletePreset = async (presetId: string) => {
    try {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      await AsyncStorage.setItem('sound_presets', JSON.stringify(updatedPresets));
      setPresets(updatedPresets);
    } catch (error) {
      console.error('Error deleting preset:', error);
      Alert.alert('Error', 'Failed to delete preset');
    }
  };

  const value = useMemo(() => ({
    isPlaying,
    currentSound,
    currentSoundName,
    volume,
    isLoading,
    error,
    playSound,
    pauseSound,
    resumeSound,
    stopSound,
    setVolume,
    clearError,
    retryLastSound,

    // Sound mixing
    isMixing,
    activeMix,
    startMixing,
    stopMixing,
    addSoundToMix,
    removeSoundFromMix,
    setMixSoundVolume,

    // Presets
    presets,
    loadPresets,
    savePreset,
    loadPreset,
    deletePreset,
  }), [
    isPlaying,
    currentSound,
    currentSoundName,
    volume,
    isLoading,
    error,
    isMixing,
    activeMix, // Keep it here because components need to see the updates, but it's a trade-off
    presets
  ]);

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
