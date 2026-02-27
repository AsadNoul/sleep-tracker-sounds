import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronDown,
  Music,
  CircleStop,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
  Headphones,
  LucideIcon
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useAudio } from '../contexts/AudioContext';
import { useAppTheme } from '../hooks/useAppTheme';

const { width } = Dimensions.get('window');

interface NowPlayingModalProps {
  visible: boolean;
  onClose: () => void;
  soundIcon?: LucideIcon;
}

export default function NowPlayingModal({
  visible,
  onClose,
  soundIcon: SoundIcon = Music,
}: NowPlayingModalProps) {
  const { theme } = useAppTheme();
  const { isPlaying, currentSoundName, volume, pauseSound, resumeSound, stopSound, setVolume } =
    useAudio();

  const handleStop = async () => {
    await stopSound();
    onClose();
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseSound();
    } else {
      await resumeSound();
    }
  };

  const themedStyles = styles(theme);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={themedStyles.modalOverlay}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={100} tint="dark" style={themedStyles.modalBlur}>
            <LinearGradient
              colors={['rgba(15, 15, 30, 0.8)', 'rgba(22, 22, 50, 0.9)', '#0F0F1E']}
              style={StyleSheet.absoluteFill}
            />
            <View style={themedStyles.modalContent}>
              <ModalHeader theme={theme} onClose={onClose} themedStyles={themedStyles} />
              <ArtworkSection SoundIcon={SoundIcon} theme={theme} themedStyles={themedStyles} />
              <TrackInfo currentSoundName={currentSoundName} themedStyles={themedStyles} />
              <PlaybackStatus isPlaying={isPlaying} theme={theme} themedStyles={themedStyles} />
              <VolumeSection volume={volume} setVolume={setVolume} theme={theme} themedStyles={themedStyles} />
              <ControlsSection
                isPlaying={isPlaying}
                volume={volume}
                setVolume={setVolume}
                handleStop={handleStop}
                handlePlayPause={handlePlayPause}
                theme={theme}
                themedStyles={themedStyles}
              />
              <InfoSection theme={theme} themedStyles={themedStyles} />
            </View>
          </BlurView>
        ) : (
          <View style={themedStyles.modalBlur}>
            <LinearGradient
              colors={['#0F0F1E', '#1A1A3A', '#0F0F1E']}
              style={StyleSheet.absoluteFill}
            />
            <View style={themedStyles.modalContent}>
              <ModalHeader theme={theme} onClose={onClose} themedStyles={themedStyles} />
              <ArtworkSection SoundIcon={SoundIcon} theme={theme} themedStyles={themedStyles} />
              <TrackInfo currentSoundName={currentSoundName} themedStyles={themedStyles} />
              <PlaybackStatus isPlaying={isPlaying} theme={theme} themedStyles={themedStyles} />
              <VolumeSection volume={volume} setVolume={setVolume} theme={theme} themedStyles={themedStyles} />
              <ControlsSection
                isPlaying={isPlaying}
                volume={volume}
                setVolume={setVolume}
                handleStop={handleStop}
                handlePlayPause={handlePlayPause}
                theme={theme}
                themedStyles={themedStyles}
              />
              <InfoSection theme={theme} themedStyles={themedStyles} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const ModalHeader = ({ theme, onClose, themedStyles }: any) => (
  <View style={themedStyles.header}>
    <TouchableOpacity onPress={onClose} style={themedStyles.closeButton}>
      <ChevronDown size={28} color={theme.colors.textPrimary} />
    </TouchableOpacity>
    <View style={themedStyles.headerTextContainer}>
      <Text style={themedStyles.headerTitle}>Now Playing</Text>
      <Text style={themedStyles.headerSubtitle}>Sleep Architect Suite</Text>
    </View>
    <View style={{ width: 44 }} />
  </View>
);

const ArtworkSection = ({ SoundIcon, theme, themedStyles }: any) => (
  <View style={themedStyles.artworkContainer}>
    <View style={themedStyles.artworkGlow} />
    <LinearGradient
      colors={['#D4AF37', '#F9E29C', '#D4AF37']}
      style={themedStyles.artworkBorder}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={themedStyles.artworkInner}>
        <LinearGradient
          colors={['#1A1A3A', '#0F0F1E']}
          style={StyleSheet.absoluteFill}
        />
        <SoundIcon size={100} color={theme.colors.premium} />
      </View>
    </LinearGradient>
  </View>
);

const TrackInfo = ({ currentSoundName, themedStyles }: any) => (
  <View style={themedStyles.trackInfo}>
    <Text style={themedStyles.trackName}>{currentSoundName || 'Celestial Drift'}</Text>
    <Text style={themedStyles.trackArtist}>Sleep Architect • Ambient Collection</Text>
  </View>
);

const PlaybackStatus = ({ isPlaying, theme, themedStyles }: any) => (
  <View style={themedStyles.statusContainer}>
    {isPlaying ? (
      <View style={themedStyles.playingIndicator}>
        <View style={themedStyles.waveBar} />
        <View style={[themedStyles.waveBar, { height: 24 }]} />
        <View style={[themedStyles.waveBar, { height: 16 }]} />
        <View style={[themedStyles.waveBar, { height: 20 }]} />
      </View>
    ) : (
      <View style={themedStyles.pausedIndicator}>
        <Pause size={20} color={theme.colors.textSecondary} />
      </View>
    )}
  </View>
);

const VolumeSection = ({ volume, setVolume, theme, themedStyles }: any) => (
  <View style={themedStyles.volumeSection}>
    <View style={themedStyles.volumeHeader}>
      <Volume1 size={20} color={theme.colors.textSecondary} />
      <Text style={themedStyles.volumeLabel}>Volume</Text>
      <Volume2 size={20} color={theme.colors.textSecondary} />
    </View>
    <View style={themedStyles.volumeControl}>
      <Slider
        style={themedStyles.volumeSlider}
        value={volume}
        onValueChange={setVolume}
        minimumValue={0}
        maximumValue={1}
        minimumTrackTintColor={theme.colors.premium}
        maximumTrackTintColor="rgba(255,255,255,0.1)"
        thumbTintColor={theme.colors.premium}
      />
    </View>
    <Text style={themedStyles.volumePercent}>{Math.round(volume * 100)}%</Text>
  </View>
);

const ControlsSection = ({ isPlaying, volume, setVolume, handleStop, handlePlayPause, theme, themedStyles }: any) => (
  <View style={themedStyles.controls}>
    <TouchableOpacity style={themedStyles.controlButton} onPress={handleStop}>
      <View style={themedStyles.secondaryButtonInner}>
        <CircleStop size={28} color={theme.colors.textSecondary} />
      </View>
      <Text style={themedStyles.controlLabel}>Stop</Text>
    </TouchableOpacity>

    <TouchableOpacity style={themedStyles.mainControlButton} onPress={handlePlayPause}>
      <LinearGradient
        colors={['#D4AF37', '#F9E29C']}
        style={themedStyles.mainControlGradient}
      >
        {isPlaying ? (
          <Pause size={40} color="#000" fill="#000" />
        ) : (
          <Play size={40} color="#000" fill="#000" />
        )}
      </LinearGradient>
    </TouchableOpacity>

    <TouchableOpacity
      style={themedStyles.controlButton}
      onPress={() => setVolume(volume === 0 ? 0.5 : 0)}
    >
      <View style={themedStyles.secondaryButtonInner}>
        {volume === 0 ? (
          <VolumeX size={28} color={theme.colors.textSecondary} />
        ) : (
          <Volume2 size={28} color={theme.colors.textSecondary} />
        )}
      </View>
      <Text style={themedStyles.controlLabel}>{volume === 0 ? 'Unmute' : 'Mute'}</Text>
    </TouchableOpacity>
  </View>
);

const InfoSection = ({ theme, themedStyles }: any) => (
  <View style={themedStyles.infoCard}>
    <View style={themedStyles.infoRow}>
      <Headphones size={18} color={theme.colors.premium} />
      <Text style={themedStyles.infoText}>Optimized for Spatial Audio</Text>
    </View>
  </View>
);

const styles = (theme: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#0F0F1E',
  },
  modalBlur: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 32,
    paddingBottom: 60,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.premium,
    marginTop: 2,
    fontWeight: '600',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
  },
  artworkContainer: {
    alignSelf: 'center',
    width: width * 0.75,
    height: width * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  artworkGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.premium,
    borderRadius: width * 0.375,
    opacity: 0.1,
  },
  artworkBorder: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    padding: 2,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  artworkInner: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: '#0F0F1E',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  trackInfo: {
    alignItems: 'center',
  },
  trackName: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  trackArtist: {
    fontSize: 16,
    color: theme.colors.premium,
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.8,
  },
  statusContainer: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waveBar: {
    width: 4,
    height: 12,
    backgroundColor: theme.colors.premium,
    borderRadius: 2,
  },
  pausedIndicator: {
    opacity: 0.5,
  },
  volumeSection: {
    width: '100%',
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  volumeControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  volumeSlider: {
    flex: 1,
    height: 40,
  },
  volumePercent: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
  },
  controlButton: {
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mainControlButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    elevation: 15,
    shadowColor: theme.colors.premium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  mainControlGradient: {
    flex: 1,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCard: {
    width: '100%',
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});
