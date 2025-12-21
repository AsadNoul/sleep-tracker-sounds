import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

interface AudioError {
  code: string;
  message: string;
  canRetry: boolean;
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
  downloadSound: (soundId: string, uri: string) => Promise<boolean>;
  isDownloaded: (soundId: string) => Promise<boolean>;
  deleteDownloadedSound: (soundId: string) => Promise<void>;
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

  // Configure audio mode on mount
  useEffect(() => {
    configureAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
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

  const getLocalUri = (soundId: string) => {
    return `${FileSystem.documentDirectory}${soundId}.mp3`;
  };

  const isDownloaded = async (soundId: string) => {
    try {
      const localUri = getLocalUri(soundId);
      const info = await FileSystem.getInfoAsync(localUri);
      return info.exists;
    } catch (e) {
      return false;
    }
  };

  const downloadSound = async (soundId: string, uri: string) => {
    try {
      const localUri = getLocalUri(soundId);
      const downloadResumable = FileSystem.createDownloadResumable(
        uri,
        localUri,
        {}
      );

      const result = await downloadResumable.downloadAsync();
      if (result) {
        console.log('Finished downloading to ', result.uri);
        return true;
      }
    } catch (e) {
      console.error('Download error:', e);
      Alert.alert('Download Failed', 'Could not download the sound for offline use.');
    }
    return false;
  };

  const deleteDownloadedSound = async (soundId: string) => {
    try {
      const localUri = getLocalUri(soundId);
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    } catch (e) {
      console.error('Delete error:', e);
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

      // Check if we have a local version downloaded
      const localUri = getLocalUri(soundId);
      const info = await FileSystem.getInfoAsync(localUri);
      
      let soundSource;
      if (info.exists) {
        soundSource = { uri: localUri };
        console.log(`Using local downloaded file for: ${soundId}`);
      } else {
        soundSource = typeof source === 'string' ? { uri: source } : source;
      }

      // Create and load new sound with timeout
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

  return (
    <AudioContext.Provider
      value={{
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
        downloadSound,
        isDownloaded,
        deleteDownloadedSound,
      }}
    >
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
