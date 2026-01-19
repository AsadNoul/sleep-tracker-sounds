import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Activity,
  Circle,
  Volume2,
  Clock,
  Info,
  Play,
  Mic,
  Square,
  Save,
  Trash2,
  Share2,
  Heart
} from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';
import { useSleep } from '../contexts/SleepContext';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import sleepTrackingService from '../services/sleepTrackingService';

const { width } = Dimensions.get('window');

interface RecordingEvent {
  id: string;
  session_id: string;
  user_id?: string;
  timestamp: string;
  event_type: 'snoring' | 'sleep_talk' | 'noise' | 'voice_note' | 'dreaming';
  duration_seconds: number;
  loudness_db: number;
  audio_file_url?: string;
}

export default function RoomEnvironmentScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [recordings, setRecordings] = useState<RecordingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState<string>('all');

  // Live Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [meterLevel, setMeterLevel] = useState(0);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [voiceIdentity, setVoiceIdentity] = useState<string>('Silent');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioBuffer = useRef<number[]>([]);

  const analyzeAudioPattern = (currentLevel: number) => {
    audioBuffer.current.push(currentLevel);
    if (audioBuffer.current.length > 30) audioBuffer.current.shift();
    if (audioBuffer.current.length < 10) return 'Analyzing...';

    const avg = audioBuffer.current.reduce((a, b) => a + b, 0) / audioBuffer.current.length;
    const max = Math.max(...audioBuffer.current);
    const variance = max - Math.min(...audioBuffer.current);

    if (avg > 0.4 && variance > 0.3) return 'Rhythmic Snoring';
    if (variance > 0.5 && avg > 0.3) return 'Speech / Sleep Talk';
    if (avg > 0.15 && variance < 0.2) return 'Steady Noise';
    return avg < 0.1 ? 'Silence' : 'Normal';
  };

  useEffect(() => {
    fetchRecordings();
    return () => {
      if (sound) sound.unloadAsync();
      if (recording) recording.stopAndUnloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [user]);

  const fetchRecordings = async () => {
    if (!user || user.id === 'guest') {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('sleep_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert('Mic required');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => {
          if (status.metering !== undefined) {
            const normalized = Math.max(0, (status.metering + 160) / 160);
            setMeterLevel(normalized);
            setVoiceIdentity(analyzeAudioPattern(normalized));
          }
        },
        100
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (e) {
      console.error(e);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await recording.stopAndUnloadAsync();
    setLastRecordingUri(recording.getURI());
    setRecording(null);
    setMeterLevel(0);
    setVoiceIdentity('Ready');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  };

  const saveLiveRecording = async () => {
    if (!lastRecordingUri || !user || user.id === 'guest') return Alert.alert('Log in required');
    setIsSaving(true);
    try {
      const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
      await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
      const fileName = `voice_${Date.now()}.m4a`;
      const localUri = `${recordingsDir}${fileName}`;
      await FileSystem.moveAsync({ from: lastRecordingUri, to: localUri });

      const { error } = await supabase.from('sleep_recordings').insert({
        user_id: user.id, event_type: 'voice_note', timestamp: new Date().toISOString(),
        duration_seconds: Math.round(recordingDuration), loudness_db: 80, audio_file_url: localUri, session_id: 'local'
      });
      if (error) throw error;
      setLastRecordingUri(null);
      fetchRecordings();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecording = (id: string, fileUrl?: string) => {
    Alert.alert('Delete?', 'Delete this recording forever?', [
      { text: 'Cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('sleep_recordings').delete().eq('id', id);
          if (!error) {
            if (fileUrl?.startsWith('file://')) await FileSystem.deleteAsync(fileUrl).catch(() => { });
            setRecordings(prev => prev.filter(r => r.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    ]);
  };

  const shareRecording = async (url?: string) => {
    if (url && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(url);
  };

  const playRecording = async (rec: RecordingEvent) => {
    if (sound) await sound.unloadAsync();
    if (!rec.audio_file_url) return;
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: rec.audio_file_url },
      { shouldPlay: true },
      (status: any) => {
        if (status.isLoaded) {
          setPlaybackPosition(p => ({ ...p, [rec.id]: status.positionMillis / status.durationMillis }));
          if (status.didJustFinish) setPlayingRecording(null);
        }
      }
    );
    setSound(newSound);
    setPlayingRecording(rec.id);
  };

  const stats = {
    total: recordings.length,
    vol: recordings.length ? (recordings.reduce((s, r) => s + r.loudness_db, 0) / recordings.length).toFixed(0) : 0,
    time: recordings.reduce((s, r) => s + r.duration_seconds, 0)
  };

  const filtered = selectedType === 'all' ? recordings : recordings.filter(r => r.event_type === selectedType);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F111A', '#1B1D2A']} style={styles.gradient}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}><ChevronLeft size={24} color="#FFF" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Environment</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ padding: 20 }}>
          <BlurView intensity={30} tint="dark" style={styles.liveCard}>
            <View style={styles.liveHeader}>
              <View style={[styles.dot, isRecording && styles.dotActive]} />
              <Text style={styles.cardTitle}>Live Monitor</Text>
              {isRecording && <Text style={styles.timer}>{recordingDuration}s</Text>}
            </View>
            <View style={styles.viz}>
              <Text style={[styles.identity, { color: isRecording ? '#00FFD1' : '#A0AEC0' }]}>{voiceIdentity}</Text>
            </View>
            <View style={styles.controls}>
              {!isRecording ? (
                <TouchableOpacity onPress={startRecording} style={styles.recBtn}>
                  <Mic size={20} color="#FFF" /><Text style={styles.btnText}>Start</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
                  <Square size={20} color="#FF6B6B" fill="#FF6B6B" /><Text style={styles.btnText}>Stop</Text>
                </TouchableOpacity>
              )}
              {lastRecordingUri && !isRecording && (
                <View style={styles.postRec}>
                  <TouchableOpacity onPress={saveLiveRecording} style={styles.saveBtn}><Save size={18} color="#00FFD1" /><Text style={styles.btnText}>Save</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setLastRecordingUri(null)}><Trash2 size={18} color="#FF6B6B" /></TouchableOpacity>
                </View>
              )}
            </View>
          </BlurView>

          <View style={styles.statsRow}>
            <View style={styles.stat}><Activity size={20} color="#00FFD1" /><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLab}>Events</Text></View>
            <View style={styles.stat}><Volume2 size={20} color="#FFD700" /><Text style={styles.statVal}>{stats.vol}%</Text><Text style={styles.statLab}>Avg Vol</Text></View>
            <View style={styles.stat}><Clock size={20} color="#33C6FF" /><Text style={styles.statVal}>{stats.time}s</Text><Text style={styles.statLab}>Duration</Text></View>
          </View>

          <View style={styles.filters}>
            {['all', 'snoring', 'sleep_talk', 'voice_note'].map(t => (
              <TouchableOpacity key={t} onPress={() => setSelectedType(t)} style={[styles.filter, selectedType === t && styles.filterActive]}>
                <Text style={[styles.filterText, selectedType === t && styles.filterTextActive]}>{t === 'voice_note' ? 'Voices' : t.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {filtered.length > 0 ? filtered.map(r => (
            <BlurView key={r.id} intensity={20} tint="dark" style={styles.recItem}>
              <View style={styles.recInfo}>
                <Text style={styles.recType}>{r.event_type.toUpperCase()}</Text>
                <Text style={styles.recTime}>{new Date(r.timestamp).toLocaleTimeString()}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => playingRecording === r.id ? setSound(null) : playRecording(r)} style={styles.playBtn}>
                  {playingRecording === r.id ? <Square size={16} color="#000" fill="#000" /> : <Play size={16} color="#000" fill="#000" />}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => shareRecording(r.audio_file_url)}><Share2 size={20} color="rgba(255,255,255,0.6)" /></TouchableOpacity>
                <TouchableOpacity onPress={() => deleteRecording(r.id, r.audio_file_url)}><Trash2 size={20} color="#FF6B6B" /></TouchableOpacity>
              </View>
            </BlurView>
          )) : (
            <View style={styles.empty}><Info size={32} color="rgba(255,255,255,0.2)" /><Text style={styles.emptyText}>No recordings yet</Text></View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  content: { flex: 1 },
  liveCard: { padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(0,255,209,0.3)' },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: '#FF6B6B' },
  cardTitle: { color: '#FFF', fontWeight: '700', flex: 1 },
  timer: { color: '#FF6B6B', fontWeight: '800' },
  viz: { height: 60, justifyContent: 'center', alignItems: 'center' },
  identity: { fontSize: 18, fontWeight: '800' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  recBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6B6B', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  postRec: { flexDirection: 'row', alignItems: 'center', gap: 15, flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,255,209,0.1)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20 },
  btnText: { color: '#FFF', fontWeight: '700' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 20, marginHorizontal: 4 },
  statVal: { color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 5 },
  statLab: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  filters: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filter: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)' },
  filterActive: { backgroundColor: '#33C6FF' },
  filterText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFF' },
  recItem: { flexDirection: 'row', padding: 15, borderRadius: 20, marginBottom: 10, alignItems: 'center' },
  recInfo: { flex: 1 },
  recType: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  recTime: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  playBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#00FFD1', justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { color: 'rgba(255,255,255,0.2)', marginTop: 10 }
});
