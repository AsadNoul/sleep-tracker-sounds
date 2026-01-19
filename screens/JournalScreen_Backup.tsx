import { useAppTheme } from '../hooks/useAppTheme';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Moon, 
  Clock, 
  Star, 
  Activity, 
  TrendingUp, 
  BookOpen, 
  Save, 
  Mic, 
  Play,
  Pause,
  Volume2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Sun,
  Eye,
  Cloud,
  TrendingDown,
  LayoutGrid,
  Bell,
  Zap,
  CheckCircle2,
  ArrowRight,
  Quote,
  Smartphone,
  Flame,
  Utensils,
  Pill,
  Leaf,
  Heart,
  Wind,
  Thermometer,
  Droplets,
  Layout,
  RefreshCw,
  Battery
} from 'lucide-react-native';
import { useSleep } from '../contexts/SleepContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import CircularProgress from '../components/CircularProgress';
import FluidBackground from '../components/FluidBackground';
import { formatDuration, format12HourTime } from '../utils/dateFormatting';
import Svg, { Path, Circle, Rect, Line, Text as SvgText, G, Defs, LinearGradient as SvgLinearGradient, Stop, Polyline } from 'react-native-svg';
import { Audio } from 'expo-av';
import SleepAnalysisScreen from './SleepAnalysisScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 80;
const CHART_HEIGHT = 120;

export default function JournalScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { sleepHistory, getSleepStats, loadSleepHistory } = useSleep();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'entries' | 'stats'>('entries');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [journalEntry, setJournalEntry] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<Array<{id: string, entry_text: string, entry_date: string, created_at: string}>>([]);

  const stats = getSleepStats();

  // Get last 7 days for the horizontal picker
  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  }, []);

  // Get selected day's sleep session
  const selectedDaySession = useMemo(() => {
    return sleepHistory.find(session => {
      const sessionDate = new Date(session.endTime || session.startTime);
      return sessionDate.toDateString() === selectedDate.toDateString();
    });
  }, [selectedDate, sleepHistory]);

  const displayScore = useMemo(() => {
    if (!selectedDaySession) return 0;
    return selectedDaySession.sleepScore || Math.round((selectedDaySession.quality || 0) * 10);
  }, [selectedDaySession]);

  const architectureData = useMemo(() => {
    if (!selectedDaySession || !selectedDaySession.sleepStages || selectedDaySession.sleepStages.length === 0) {
      return [
        { h: 20, c: '#6366F1' }, { h: 35, c: '#8B5CF6' }, { h: 65, c: '#4F46E5' },
        { h: 75, c: '#4F46E5' }, { h: 55, c: '#8B5CF6' }, { h: 30, c: '#6366F1' },
        { h: 45, c: '#8B5CF6' }, { h: 70, c: '#4F46E5' }, { h: 60, c: '#4F46E5' },
        { h: 40, c: '#8B5CF6' }, { h: 15, c: '#EF4444' }, { h: 30, c: '#6366F1' }
      ];
    }

    const slots = 12;
    const startTime = new Date(selectedDaySession.startTime).getTime();
    const endTime = new Date(selectedDaySession.endTime || new Date()).getTime();
    const totalDuration = endTime - startTime;
    const slotDuration = totalDuration / slots;

    return Array.from({ length: slots }).map((_, i) => {
      const slotStart = startTime + i * slotDuration;
      const stage = selectedDaySession.sleepStages?.find(s => 
        new Date(s.startTime).getTime() <= slotStart && new Date(s.endTime).getTime() >= slotStart
      );

      let h = 30;
      let c = '#6366F1';
      if (stage) {
        switch (stage.stage) {
          case 'deep': h = 70; c = '#4F46E5'; break;
          case 'rem': h = 50; c = '#8B5CF6'; break;
          case 'light': h = 30; c = '#6366F1'; break;
          case 'awake': h = 15; c = '#EF4444'; break;
        }
      }
      return { h, c };
    });
  }, [selectedDaySession]);

  useEffect(() => {
    loadSleepHistory();
    loadJournalEntries();
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  const loadJournalEntries = async () => {
    if (user && user.id !== 'guest') {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!error && data) {
          setJournalEntries(data);
        }
      } catch (error) {
        console.error('Error loading journal entries:', error);
      }
    }
  };

  const saveJournal = async () => {
    if (!journalEntry.trim() && !selectedMood) {
      Alert.alert('Empty Entry', 'Please add a mood or note.');
      return;
    }

    setIsSaving(true);
    try {
      if (user && user.id !== 'guest') {
        const { error } = await supabase
          .from('journal_entries')
          .insert([
            {
              user_id: user.id,
              entry_text: journalEntry,
              mood: selectedMood,
              tags: selectedTags,
              entry_date: selectedDate.toISOString().split('T')[0],
            },
          ]);

        if (error) throw error;
        Alert.alert('Success', 'Journal entry saved!');
        setJournalEntry('');
        setSelectedMood(null);
        setSelectedTags([]);
        loadJournalEntries();
      } else {
        Alert.alert('Guest Mode', 'Journaling is available for registered users.');
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      Alert.alert('Error', 'Could not save entry.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Opening your journal..." fullScreen />;
  }

  if (activeTab === 'stats') {
    return (
      <View style={{ flex: 1 }}>
        <SleepAnalysisScreen />
        {/* Tab Switcher Overlay */}
        <View style={[styles(theme).tabSwitcherContainer, { top: insets.top + 70 }]}>
          <View style={styles(theme).tabSwitcher}>
            <TouchableOpacity 
              style={[styles(theme).tabButton, activeTab === 'entries' && styles(theme).activeTabButton]}
              onPress={() => setActiveTab('entries')}
            >
              <Text style={[styles(theme).tabText, activeTab === 'entries' && styles(theme).activeTabText]}>Entries</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles(theme).tabButton, activeTab === 'stats' && styles(theme).activeTabButton]}
              onPress={() => setActiveTab('stats')}
            >
              <Text style={[styles(theme).tabText, activeTab === 'stats' && styles(theme).activeTabText]}>Sleep Stats</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles(theme).container}>
      <StatusBar barStyle="light-content" />
      <FluidBackground />
      
      <header style={styles(theme).header}>
        <View style={{ paddingTop: insets.top + 10 }}>
          <Text style={styles(theme).headerTitle}>Sleep Journal</Text>
          <Text style={styles(theme).headerSubtitle}>Track and analyze your sleep patterns</Text>
        </View>
      </header>

      <ScrollView 
        style={styles(theme).scrollView}
        contentContainerStyle={[styles(theme).scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Switcher */}
        <View style={styles(theme).tabSwitcher}>
          <TouchableOpacity 
            style={[styles(theme).tabButton, activeTab === 'entries' && styles(theme).activeTabButton]}
            onPress={() => setActiveTab('entries')}
          >
            <Text style={[styles(theme).tabText, activeTab === 'entries' && styles(theme).activeTabText]}>Entries</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles(theme).tabButton, activeTab === 'stats' && styles(theme).activeTabButton]}
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles(theme).tabText, activeTab === 'stats' && styles(theme).activeTabText]}>Sleep Stats</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Date Picker */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles(theme).datePickerScroll}
          contentContainerStyle={styles(theme).datePickerContent}
        >
          {last7Days.map((date, i) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <TouchableOpacity 
                key={i}
                onPress={() => setSelectedDate(date)}
                style={[
                  styles(theme).dateCard,
                  isSelected && styles(theme).selectedDateCard
                ]}
              >
                <Text style={[styles(theme).dateDay, isSelected && styles(theme).selectedDateText]}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[styles(theme).dateNumber, isSelected && styles(theme).selectedDateText]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sleep Score Card */}
        <BlurView intensity={20} tint="dark" style={styles(theme).scoreCard}>
          <View style={styles(theme).scoreWheelContainer}>
            <CircularProgress
              size={160}
              strokeWidth={12}
              score={displayScore}
              showText={false}
            />
            <View style={[StyleSheet.absoluteFill, styles(theme).wheelContent]}>
              <Text style={styles(theme).wheelScore}>{displayScore}</Text>
              <Text style={styles(theme).wheelLabel}>
                {displayScore >= 85 ? 'Excellent' : displayScore >= 70 ? 'Good' : 'Fair'}
              </Text>
            </View>
          </View>
          <Text style={styles(theme).scoreDate}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </BlurView>

        {/* Sleep Stages Chart */}
        <BlurView intensity={20} tint="dark" style={styles(theme).chartCard}>
          <View style={styles(theme).sectionHeader}>
            <TrendingUp size={20} color="#8B5CF6" />
            <Text style={styles(theme).sectionTitle}>Sleep Stages</Text>
          </View>
          <View style={styles(theme).barChartContainer}>
            <View style={styles(theme).yAxis}>
              <Text style={styles(theme).yAxisText}>Awake</Text>
              <Text style={styles(theme).yAxisText}>REM</Text>
              <Text style={styles(theme).yAxisText}>Light</Text>
              <Text style={styles(theme).yAxisText}>Deep</Text>
            </View>
            <View style={styles(theme).barsContainer}>
              {architectureData.map((bar, i) => (
                <View key={i} style={[styles(theme).chartBar, { height: bar.h, backgroundColor: bar.c }]} />
              ))}
            </View>
          </View>
          <View style={styles(theme).chartLegend}>
            <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#EF4444' }]} /><Text style={styles(theme).legendText}>Awake</Text></View>
            <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#8B5CF6' }]} /><Text style={styles(theme).legendText}>REM</Text></View>
            <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#6366F1' }]} /><Text style={styles(theme).legendText}>Light</Text></View>
            <View style={styles(theme).legendItem}><View style={[styles(theme).legendDot, { backgroundColor: '#4F46E5' }]} /><Text style={styles(theme).legendText}>Deep</Text></View>
          </View>
        </BlurView>

        {/* Stats Grid */}
        <View style={styles(theme).statsGrid}>
          <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
            <View style={styles(theme).statHeader}>
              <Clock size={16} color="#F59E0B" />
              <Text style={styles(theme).statLabel}>Time to Fall Asleep</Text>
            </View>
            <Text style={styles(theme).statValue}>12m</Text>
          </BlurView>
          <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
            <View style={styles(theme).statHeader}>
              <Moon size={16} color="#8B5CF6" />
              <Text style={styles(theme).statLabel}>Total Sleep</Text>
            </View>
            <Text style={styles(theme).statValue}>
              {selectedDaySession ? formatDuration(selectedDaySession.duration) : '7h 24m'}
            </Text>
          </BlurView>
          <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
            <View style={styles(theme).statHeader}>
              <TrendingUp size={16} color="#10B981" />
              <Text style={styles(theme).statLabel}>Sleep Efficiency</Text>
            </View>
            <Text style={styles(theme).statValue}>94%</Text>
          </BlurView>
          <BlurView intensity={20} tint="dark" style={styles(theme).statCard}>
            <View style={styles(theme).statHeader}>
              <Activity size={16} color="#EC4899" />
              <Text style={styles(theme).statLabel}>Restlessness</Text>
            </View>
            <Text style={styles(theme).statValue}>Low</Text>
          </BlurView>
        </View>

        {/* Disruptions */}
        <BlurView intensity={20} tint="dark" style={styles(theme).disruptionsCard}>
          <View style={styles(theme).sectionHeader}>
            <Bell size={20} color="#F59E0B" />
            <Text style={styles(theme).sectionTitle}>Disruptions</Text>
          </View>
          <View style={styles(theme).disruptionsList}>
            {[
              { icon: Volume2, title: 'Noise detected', time: '02:34 AM', color: '#F59E0B' },
              { icon: Activity, title: 'Restless movement', time: '04:15 AM', color: '#EC4899' },
              { icon: Volume2, title: 'Noise detected', time: '05:47 AM', color: '#F59E0B' },
            ].map((item, i) => (
              <View key={i} style={styles(theme).disruptionItem}>
                <View style={[styles(theme).disruptionIcon, { backgroundColor: item.color + '20' }]}>
                  <item.icon size={18} color={item.color} />
                </View>
                <View>
                  <Text style={styles(theme).disruptionTitle}>{item.title}</Text>
                  <Text style={styles(theme).disruptionTime}>{item.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </BlurView>

        {/* Journal Entry */}
        <BlurView intensity={20} tint="dark" style={styles(theme).journalEntryCard}>
          <View style={styles(theme).sectionHeader}>
            <BookOpen size={20} color="#EC4899" />
            <Text style={styles(theme).sectionTitle}>Journal Entry</Text>
          </View>
          
          <Text style={styles(theme).inputLabel}>How do you feel?</Text>
          <View style={styles(theme).moodGrid}>
            {['😊', '😴', '😌', '😐', '😔'].map((mood) => (
              <TouchableOpacity 
                key={mood}
                onPress={() => setSelectedMood(mood)}
                style={[
                  styles(theme).moodButton,
                  selectedMood === mood && styles(theme).selectedMoodButton
                ]}
              >
                <Text style={styles(theme).moodEmoji}>{mood}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles(theme).journalInput}
            placeholder="Write about your sleep experience, dreams, or how you're feeling..."
            placeholderTextColor="#A0AEC0"
            multiline
            value={journalEntry}
            onChangeText={setJournalEntry}
          />

          <Text style={styles(theme).inputLabel}>Add tags</Text>
          <View style={styles(theme).tagsGrid}>
            {['Good Night', 'Vivid Dreams', 'Deep Rest', 'Stressful', 'Caffeine'].map((tag) => (
              <TouchableOpacity 
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[
                  styles(theme).tagButton,
                  selectedTags.includes(tag) && styles(theme).selectedTagButton
                ]}
              >
                <Text style={[styles(theme).tagText, selectedTags.includes(tag) && styles(theme).selectedTagText]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity 
            style={styles(theme).saveButton}
            onPress={saveJournal}
            disabled={isSaving}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles(theme).buttonGradient}
            />
            <Text style={styles(theme).saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Text>
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  tabSwitcherContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 100,
  },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
  },
  activeTabButton: {
    backgroundColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  datePickerScroll: {
    marginBottom: 24,
    marginHorizontal: -24,
  },
  datePickerContent: {
    paddingHorizontal: 24,
    gap: 12,
  },
  dateCard: {
    width: 60,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDateCard: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  dateDay: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectedDateText: {
    color: '#FFFFFF',
  },
  scoreCard: {
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scoreWheelContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  wheelContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelScore: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  wheelLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 4,
  },
  scoreDate: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  chartCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  barChartContainer: {
    flexDirection: 'row',
    height: 160,
    marginBottom: 16,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginRight: 12,
  },
  yAxisText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingBottom: 10,
  },
  chartBar: {
    flex: 1,
    borderRadius: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disruptionsCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  disruptionsList: {
    gap: 12,
  },
  disruptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
  },
  disruptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disruptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disruptionTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  journalEntryCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 12,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMoodButton: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  moodEmoji: {
    fontSize: 24,
  },
  journalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 14,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedTagButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  tagText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#8B5CF6',
  },
  saveButton: {
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});


    setIsSaving(true);
    try {
      if (user && user.id !== 'guest') {
        const { error } = await supabase.from('journal_entries').insert({
          id: `journal_${Date.now()}_${Math.random()}`,
          user_id: user.id,
          entry_text: trimmedEntry,
          entry_date: new Date().toISOString().split('T')[0],
        });

        if (error) {
          Alert.alert('Error', 'Failed to save journal entry.');
          return;
        }
        Alert.alert('✅ Saved!', 'Your journal entry has been saved!');
        setJournalEntry('');
        await loadJournalEntries();
      } else {
        Alert.alert('✅ Saved!', 'Your journal entry has been saved locally!');
        setJournalEntry('');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render sleep quality bar chart
  const renderSleepChart = () => {
    const maxHours = Math.max(...weeklyData.map(d => d.hours), 10);
    const barWidth = (CHART_WIDTH - 60) / 7;
    
    return (
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT + 40}>
        <Defs>
          <SvgLinearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#D4AF37" stopOpacity="1" />
            <Stop offset="1" stopColor="#F59E0B" stopOpacity="0.6" />
          </SvgLinearGradient>
        </Defs>
        
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <G key={i}>
            <Line
              x1={30}
              y1={CHART_HEIGHT - (i * CHART_HEIGHT / 4)}
              x2={CHART_WIDTH}
              y2={CHART_HEIGHT - (i * CHART_HEIGHT / 4)}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={1}
            />
            <SvgText
              x={5}
              y={CHART_HEIGHT - (i * CHART_HEIGHT / 4) + 4}
              fill="rgba(255, 255, 255, 0.5)"
              fontSize={10}
            >
              {`${Math.round((maxHours * i) / 4)}h`}
            </SvgText>
          </G>
        ))}
        
        {/* Bars */}
        {weeklyData.map((day, index) => {
          const barHeight = day.hours > 0 ? (day.hours / maxHours) * CHART_HEIGHT : 3;
          const x = 35 + index * barWidth + barWidth / 2 - 12;
          
          return (
            <G key={index}>
              <Rect
                x={x}
                y={CHART_HEIGHT - barHeight}
                width={24}
                height={barHeight}
                rx={6}
                fill={day.hours > 0 ? "url(#barGradient)" : "rgba(255, 255, 255, 0.05)"}
                opacity={day.hours > 0 ? 1 : 0.3}
              />
              <SvgText
                x={x + 12}
                y={CHART_HEIGHT + 15}
                fill="rgba(255, 255, 255, 0.6)"
                fontSize={11}
                textAnchor="middle"
              >
                {day.day}
              </SvgText>
              {day.hours > 0 && (
                <SvgText
                  x={x + 12}
                  y={CHART_HEIGHT - barHeight - 5}
                  fill="#FFF"
                  fontSize={9}
                  textAnchor="middle"
                >
                  {day.hours.toFixed(1)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    );
  };

  // Render sleep stages donut chart (chart only)
  const renderSleepStagesChart = () => {
    if (!sleepStages) return null;
    
    const total = sleepStages.deep + sleepStages.light + sleepStages.rem + sleepStages.awake;
    const radius = 70;
    const cx = 80;
    const cy = 80;
    const strokeWidth = 22;
    
    const stages = [
      { name: 'Deep', value: sleepStages.deep, color: '#D4AF37', icon: Moon },
      { name: 'Light', value: sleepStages.light, color: '#94A3B8', icon: Cloud },
      { name: 'REM', value: sleepStages.rem, color: '#8B5CF6', icon: Eye },
      { name: 'Awake', value: sleepStages.awake, color: '#EF4444', icon: Sun },
    ];
    
    let currentAngle = -90;
    
    const getArcPath = (startAngle: number, endAngle: number) => {
      const start = polarToCartesian(cx, cy, radius, endAngle);
      const end = polarToCartesian(cx, cy, radius, startAngle);
      const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 0 ${end.x} ${end.y}`;
    };
    
    const polarToCartesian = (centerX: number, centerY: number, r: number, angle: number) => {
      const angleInRadians = (angle * Math.PI) / 180;
      return {
        x: centerX + r * Math.cos(angleInRadians),
        y: centerY + r * Math.sin(angleInRadians),
      };
    };
    
    return (
      <View style={styles(theme).stagesChartOnlyContainer}>
        <Svg width={160} height={160}>
          {stages.map((stage, index) => {
            const angle = (stage.value / total) * 360;
            const path = getArcPath(currentAngle, currentAngle + angle);
            currentAngle += angle;
            
            return (
              <Path
                key={index}
                d={path}
                stroke={stage.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
              />
            );
          })}
          <Circle
            cx={cx}
            cy={cy}
            r={radius - strokeWidth}
            fill={theme.colors.background}
          />
          <SvgText
            x={cx}
            y={cy - 5}
            fill="#FFF"
            fontSize={20}
            fontWeight="bold"
            textAnchor="middle"
          >
            {formatMinutesToTime(total)}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 14}
            fill="rgba(255, 255, 255, 0.6)"
            fontSize={12}
            textAnchor="middle"
          >
            {'Total Sleep'}
          </SvgText>
        </Svg>
      </View>
    );
  };

  // Get sleep stages data for the legend
  const getSleepStagesData = () => {
    if (!sleepStages) return [];
    return [
      { name: 'Deep Sleep', value: sleepStages.deep, color: '#D4AF37', icon: Moon, description: 'Body recovery & repair' },
      { name: 'Light Sleep', value: sleepStages.light, color: '#94A3B8', icon: Cloud, description: 'Memory consolidation' },
      { name: 'REM Sleep', value: sleepStages.rem, color: '#8B5CF6', icon: Eye, description: 'Dreams & brain activity' },
      { name: 'Awake', value: sleepStages.awake, color: '#EF4444', icon: Sun, description: 'Brief awakenings' },
    ];
  };

  // Render progress bar
  const renderProgressBar = (value: number, max: number, color: string, label: string, icon: any) => {
    const percentage = Math.min((value / max) * 100, 100);
    const Icon = icon;
    
    return (
      <View style={styles(theme).progressItem}>
        <View style={styles(theme).progressHeader}>
          <View style={styles(theme).progressLabelContainer}>
            <Icon size={18} color={color} />
            <Text style={styles(theme).progressLabel}>{label}</Text>
          </View>
          <Text style={[styles(theme).progressValue, { color }]}>{value.toFixed(1)}/{max}</Text>
        </View>
        <View style={styles(theme).progressBarBg}>
          <LinearGradient
            colors={[color, `${color}88`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles(theme).progressBarFill, { width: `${percentage}%` }]}
          />
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles(theme).container, { justifyContent: 'center', alignItems: 'center' }]}>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        style={styles(theme).gradient}
      >
        <ScrollView 
          style={styles(theme).content} 
          contentContainerStyle={{ 
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 100 
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles(theme).header}>
            <View style={styles(theme).headerTop}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles(theme).backButton}
                >
                  <ChevronLeft size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={{ marginLeft: theme.spacing.md }}>
                  <Text style={styles(theme).title}>Architect's Log</Text>
                  <Text style={styles(theme).subtitle}>VIP Sleep Journal</Text>
                </View>
              </View>
              <TouchableOpacity style={styles(theme).todayButton} onPress={() => {
                setSelectedDate(new Date());
                setCurrentMonth(new Date());
              }}>
                <Text style={styles(theme).todayButtonText}>TODAY</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Calendar View */}
          <BlurView intensity={20} tint="dark" style={styles(theme).card}>
            <TouchableOpacity 
              style={styles(theme).calendarToggleHeader}
              onPress={() => setCalendarVisible(!calendarVisible)}
            >
              <View style={styles(theme).calendarToggleLeft}>
                <Calendar size={22} color="#D4AF37" />
                <Text style={styles(theme).cardTitle}>Calendar</Text>
              </View>
              <View style={styles(theme).calendarToggleRight}>
                {calendarVisible ? (
                  <ChevronUp size={22} color={theme.colors.textSecondary} />
                ) : (
                  <ChevronDown size={22} color={theme.colors.textSecondary} />
                )}
              </View>
            </TouchableOpacity>
            
            {calendarVisible && (
              <>
                <View style={styles(theme).calendarHeader}>
                  <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles(theme).navButton}>
                    <ChevronLeft size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles(theme).monthTitle}>
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={() => navigateMonth(1)} style={styles(theme).navButton}>
                    <ChevronRight size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles(theme).weekDaysRow}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                    <Text key={index} style={styles(theme).weekDayLabel}>{day}</Text>
                  ))}
                </View>
                
                <View style={styles(theme).calendarGrid}>
                  {calendarDays.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles(theme).calendarDay,
                        day.date && selectedDate.toDateString() === day.date.toDateString() && styles(theme).selectedDay,
                        day.date && new Date().toDateString() === day.date.toDateString() && styles(theme).todayDay,
                      ]}
                      onPress={() => {
                        if (day.date) {
                          console.log('Selected date:', day.date.toDateString());
                          setSelectedDate(new Date(day.date));
                        }
                      }}
                      disabled={!day.date}
                      activeOpacity={0.7}
                    >
                      {day.date && (
                        <>
                          <Text style={[
                            styles(theme).calendarDayText,
                            selectedDate.toDateString() === day.date.toDateString() && styles(theme).selectedDayText,
                          ]}>
                            {day.date.getDate()}
                          </Text>
                          {day.hasData && (
                            <View style={[
                              styles(theme).sleepIndicator,
                              { backgroundColor: getQualityColor(day.quality) }
                            ]} />
                          )}
                        </>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </BlurView>

          {/* Sleep Quality Overview */}
          <BlurView intensity={20} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).sectionHeader}>
              <Activity size={22} color="#D4AF37" />
              <Text style={styles(theme).cardTitle}>Sleep Quality</Text>
            </View>
            
            {renderProgressBar(stats.averageQuality, 10, theme.colors.accent, 'Quality Score', Star)}
            {renderProgressBar(stats.averageDuration / 60, 8, theme.colors.highlight, 'Avg Sleep Duration (hrs)', Clock)}
            
            <View style={styles(theme).statsRow}>
              <View style={styles(theme).statBox}>
                <Text style={[styles(theme).statValue, { color: theme.colors.accent }]}>{stats.totalSessions}</Text>
                <Text style={styles(theme).statLabel}>Sessions</Text>
              </View>
              <View style={styles(theme).statDivider} />
              <View style={styles(theme).statBox}>
                <Text style={[styles(theme).statValue, { color: theme.colors.highlight }]}>
                  {stats.averageQuality > 0 ? getQualityLabel(stats.averageQuality) : 'N/A'}
                </Text>
                <Text style={styles(theme).statLabel}>Avg Quality</Text>
              </View>
              <View style={styles(theme).statDivider} />
              <View style={styles(theme).statBox}>
                <Text style={[styles(theme).statValue, { color: theme.colors.premium }]}>
                  {stats.lastNightWakeUps}
                </Text>
                <Text style={styles(theme).statLabel}>Wake Ups</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles(theme).analysisButton}
              onPress={() => navigation.navigate('SleepAnalysis')}
            >
              <LinearGradient
                colors={[theme.colors.accent, theme.colors.highlight]}
                style={styles(theme).analysisButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <TrendingUp size={18} color="#000" />
                <Text style={styles(theme).analysisButtonText}>View Detailed Analysis</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>

          {/* Weekly Sleep Chart */}
          <BlurView intensity={20} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).sectionHeader}>
              <TrendingUp size={22} color="#F59E0B" />
              <Text style={styles(theme).cardTitle}>Weekly Overview</Text>
            </View>
            <View style={styles(theme).chartContainer}>
              {renderSleepChart()}
            </View>
          </BlurView>

          {/* Sleep Stages Chart */}
          {selectedDaySession && (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <View style={styles(theme).sectionHeader}>
                <Activity size={22} color="#D4AF37" />
                <Text style={styles(theme).cardTitle}>Sleep Stages</Text>
                <Text style={styles(theme).dateLabel}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
              {renderSleepStagesChart()}
            </BlurView>
          )}

          {/* Sleep Stages Breakdown */}
          {selectedDaySession && sleepStages && (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <View style={styles(theme).sectionHeader}>
                <Activity size={22} color="#F59E0B" />
                <Text style={styles(theme).cardTitle}>Stages Breakdown</Text>
              </View>
              <View style={styles(theme).stagesBreakdownGrid}>
                {getSleepStagesData().map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <View key={index} style={styles(theme).stageBreakdownCard}>
                      <View style={[styles(theme).stageIconBg, { backgroundColor: `${stage.color}20` }]}>
                        <Icon size={22} color={stage.color} />
                      </View>
                      <View style={styles(theme).stageBreakdownInfo}>
                        <Text style={styles(theme).stageBreakdownName}>{stage.name}</Text>
                        <Text style={[styles(theme).stageBreakdownValue, { color: stage.color }]}>
                          {formatMinutesToTime(stage.value)}
                        </Text>
                        <Text style={styles(theme).stageBreakdownDesc}>{stage.description}</Text>
                      </View>
                      <View style={styles(theme).stagePercentage}>
                        <Text style={[styles(theme).stagePercentageText, { color: stage.color }]}>
                          {Math.round((stage.value / (sleepStages.deep + sleepStages.light + sleepStages.rem + sleepStages.awake)) * 100)}%
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </BlurView>
          )}

          {/* Detailed Metrics */}
          <BlurView intensity={20} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).sectionHeader}>
              <Activity size={22} color="#D4AF37" />
              <Text style={styles(theme).cardTitle}>Sleep Metrics</Text>
            </View>
            
            <View style={styles(theme).metricsGrid}>
              <View style={styles(theme).metricCard}>
                <View style={[styles(theme).metricIconBg, { backgroundColor: `${theme.colors.accent}20` }]}>
                  <Moon size={20} color={theme.colors.accent} />
                </View>
                <Text style={styles(theme).metricValue}>
                  {selectedDaySession ? format12HourTime(new Date(selectedDaySession.startTime)) : '--:--'}
                </Text>
                <Text style={styles(theme).metricLabel}>In Bed</Text>
              </View>
              
              <View style={styles(theme).metricCard}>
                <View style={[styles(theme).metricIconBg, { backgroundColor: `${theme.colors.highlight}20` }]}>
                  <Moon size={20} color={theme.colors.highlight} />
                </View>
                <Text style={styles(theme).metricValue}>
                  {selectedDaySession ? formatMinutesToTime(selectedDaySession.duration) : '--'}
                </Text>
                <Text style={styles(theme).metricLabel}>Asleep</Text>
              </View>
              
              <View style={styles(theme).metricCard}>
                <View style={[styles(theme).metricIconBg, { backgroundColor: `${theme.colors.danger}20` }]}>
                  <Volume2 size={20} color={theme.colors.danger} />
                </View>
                <Text style={styles(theme).metricValue}>
                  {selectedDaySession ? `${selectedDaySession.wakeUps}` : '0'}
                </Text>
                <Text style={styles(theme).metricLabel}>Wake Ups</Text>
              </View>
              
              <View style={styles(theme).metricCard}>
                <View style={[styles(theme).metricIconBg, { backgroundColor: `${theme.colors.premium}20` }]}>
                  <TrendingDown size={20} color={theme.colors.premium} />
                </View>
                <Text style={styles(theme).metricValue}>
                  {stats.averageDuration >= 420 ? '0h' : formatMinutesToTime(420 - stats.averageDuration)}
                </Text>
                <Text style={styles(theme).metricLabel}>Sleep Debt</Text>
              </View>
            </View>
          </BlurView>

          {/* Analysis Cards */}
          <View style={styles(theme).analysisSection}>
            {/* Snoring Analysis */}
            <TouchableOpacity 
              style={styles(theme).analysisCard}
              onPress={() => setExpandedSection(expandedSection === 'snoring' ? null : 'snoring')}
            >
              <BlurView intensity={20} tint="dark" style={styles(theme).analysisCardInner}>
                <View style={styles(theme).analysisHeader}>
                  <View style={[styles(theme).analysisIconBg, { backgroundColor: `${theme.colors.highlight}20` }]}>
                    <Mic size={20} color={theme.colors.highlight} />
                  </View>
                  <View style={styles(theme).analysisTextContainer}>
                    <Text style={styles(theme).analysisTitle}>Snoring Analysis</Text>
                    <Text style={styles(theme).analysisSubtitle}>Audio detection</Text>
                  </View>
                  <ChevronUp size={20} color={theme.colors.textSecondary} />
                </View>
                {expandedSection === 'snoring' && (
                  <View style={styles(theme).analysisContent}>
                    <Text style={styles(theme).analysisText}>
                      {selectedDaySession?.snoringDetected 
                        ? `Snoring detected for ${selectedDaySession.snoringDuration || '12'} minutes. Consider side-sleeping to reduce airway obstruction.`
                        : 'No snoring detected in your recent sessions. Keep up the good sleep hygiene!'}
                    </Text>
                  </View>
                )}
              </BlurView>
            </TouchableOpacity>

            {/* Sleep Apnea */}
            <TouchableOpacity 
              style={styles(theme).analysisCard}
              onPress={() => setExpandedSection(expandedSection === 'apnea' ? null : 'apnea')}
            >
              <BlurView intensity={20} tint="dark" style={styles(theme).analysisCardInner}>
                <View style={styles(theme).analysisHeader}>
                  <View style={[styles(theme).analysisIconBg, { backgroundColor: `${theme.colors.danger}20` }]}>
                    <Activity size={20} color={theme.colors.danger} />
                  </View>
                  <View style={styles(theme).analysisTextContainer}>
                    <Text style={styles(theme).analysisTitle}>Sleep Apnea</Text>
                    <Text style={styles(theme).analysisSubtitle}>Breathing patterns</Text>
                  </View>
                  <ChevronUp size={20} color={theme.colors.textSecondary} />
                </View>
                {expandedSection === 'apnea' && (
                  <View style={styles(theme).analysisContent}>
                    <Text style={styles(theme).analysisText}>
                      {selectedDaySession?.apneaRisk === 'high'
                        ? 'High risk of breathing interruptions detected. We recommend consulting a sleep specialist for a formal evaluation.'
                        : selectedDaySession?.apneaRisk === 'moderate'
                        ? 'Some irregular breathing patterns detected. Monitor your sleep quality and consider a professional check-up.'
                        : 'Normal breathing patterns detected. No signs of sleep apnea in tracked sessions.'}
                    </Text>
                  </View>
                )}
              </BlurView>
            </TouchableOpacity>

            {/* Audio Clips */}
            <TouchableOpacity 
              style={styles(theme).analysisCard}
              onPress={() => setExpandedSection(expandedSection === 'clips' ? null : 'clips')}
            >
              <BlurView intensity={20} tint="dark" style={styles(theme).analysisCardInner}>
                <View style={styles(theme).analysisHeader}>
                  <View style={[styles(theme).analysisIconBg, { backgroundColor: `${theme.colors.accent}20` }]}>
                    <Volume2 size={20} color={theme.colors.accent} />
                  </View>
                  <View style={styles(theme).analysisTextContainer}>
                    <Text style={styles(theme).analysisTitle}>Audio Clips</Text>
                    <Text style={styles(theme).analysisSubtitle}>Sleep recordings</Text>
                  </View>
                  <ChevronUp size={20} color={theme.colors.textSecondary} />
                </View>
                {expandedSection === 'clips' && (
                  <View style={styles(theme).analysisContent}>
                    {isLoadingRecordings ? (
                      <LoadingSpinner size="small" />
                    ) : sessionRecordings.length > 0 ? (
                      <View style={styles(theme).recordingsList}>
                        {sessionRecordings.map((recording, index) => (
                          <View key={recording.id || index} style={styles(theme).recordingItem}>
                            <View style={styles(theme).recordingIconContainer}>
                              <Activity 
                                size={16} 
                                color={theme.colors.accent} 
                              />
                            </View>
                            <View style={styles(theme).recordingInfo}>
                              <Text style={styles(theme).recordingType}>
                                {recording.event_type.charAt(0).toUpperCase() + recording.event_type.slice(1)}
                              </Text>
                              <Text style={styles(theme).recordingTime}>
                                {new Date(recording.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </Text>
                            </View>
                            <View style={styles(theme).recordingMeta}>
                              <Text style={styles(theme).recordingDuration}>{recording.duration_seconds}s</Text>
                              <TouchableOpacity 
                                style={[
                                  styles(theme).playButtonSmall,
                                  playingId === recording.id && styles(theme).playButtonActive
                                ]}
                                onPress={() => playingId === recording.id ? stopSound() : playSound(recording.audio_url, recording.id)}
                              >
                                {playingId === recording.id ? (
                                  <Pause size={14} color="#FFF" fill="#FFF" />
                                ) : (
                                  <Play size={14} color="#FFF" fill="#FFF" />
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles(theme).analysisText}>
                        No audio events detected for this session. Enable audio recording to capture sleep sounds.
                      </Text>
                    )}
                  </View>
                )}
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Notes Section */}
          <BlurView intensity={20} tint="dark" style={styles(theme).card}>
            <View style={styles(theme).sectionHeader}>
              <BookOpen size={22} color="#D4AF37" />
              <Text style={styles(theme).cardTitle}>Sleep Notes</Text>
            </View>
            
            {selectedDaySession?.notes ? (
              <View style={styles(theme).noteDisplay}>
                <Text style={styles(theme).noteText}>{selectedDaySession.notes}</Text>
              </View>
            ) : (
              <Text style={styles(theme).noNoteText}>No notes for this day</Text>
            )}
          </BlurView>

          {/* Journal Entry */}
          <BlurView intensity={30} tint="dark" style={styles(theme).journalCard}>
            <View style={styles(theme).sectionHeader}>
              <Save size={22} color="#D4AF37" />
              <Text style={styles(theme).cardTitle}>Daily Reflection</Text>
            </View>
            
            <View style={styles(theme).notebookContainer}>
              <TextInput
                style={styles(theme).journalInput}
                placeholder="How did you sleep? Any dreams or thoughts..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                multiline
                numberOfLines={6}
                value={journalEntry}
                onChangeText={setJournalEntry}
              />
              <View style={styles(theme).notebookLines}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={styles(theme).notebookLine} />
                ))}
              </View>
            </View>
            
            <TouchableOpacity
              style={styles(theme).saveButton}
              onPress={saveJournal}
              disabled={isSaving}
            >
              <LinearGradient
                colors={['#D4AF37', '#F59E0B']}
                style={styles(theme).saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSaving ? <Clock size={18} color="#000" /> : <Save size={18} color="#000" />}
                <Text style={styles(theme).saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Entry'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>

          {/* Saved Journal Entries */}
          {journalEntries.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <View style={styles(theme).sectionHeader}>
                <BookOpen size={22} color={theme.colors.accent} />
                <Text style={styles(theme).cardTitle}>Journal Entries</Text>
              </View>
              
              {journalEntries.map((entry, index) => (
                <View key={entry.id} style={styles(theme).savedJournalEntry}>
                  <View style={styles(theme).savedJournalHeader}>
                    <Calendar size={14} color={theme.colors.textSecondary} />
                    <Text style={styles(theme).savedJournalDate}>
                      {new Date(entry.entry_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles(theme).savedJournalText}>{entry.entry_text}</Text>
                </View>
              ))}
            </BlurView>
          )}

          {/* Recent Sessions */}
          {sleepHistory.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <View style={styles(theme).sectionHeader}>
                <Activity size={22} color="#D4AF37" />
                <Text style={styles(theme).cardTitle}>Recent Sessions</Text>
              </View>
              
              {sleepHistory.slice(0, 5).map((session, index) => (
                <TouchableOpacity 
                  key={session.id} 
                  style={styles(theme).sessionItem}
                  onPress={() => {
                    const sessionDate = new Date(session.endTime!);
                    setSelectedDate(sessionDate);
                    setCurrentMonth(sessionDate);
                  }}
                >
                  <View style={[styles(theme).sessionIndicator, { backgroundColor: getQualityColor(session.quality) }]} />
                  <View style={styles(theme).sessionInfo}>
                    <Text style={styles(theme).sessionDate}>
                      {new Date(session.endTime!).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles(theme).sessionTime}>
                      {format12HourTime(new Date(session.startTime))} - {format12HourTime(new Date(session.endTime!))}
                    </Text>
                  </View>
                  <View style={styles(theme).sessionStats}>
                    <Text style={styles(theme).sessionDuration}>{formatDuration(session.duration)}</Text>
                    <Text style={[styles(theme).sessionQuality, { color: getQualityColor(session.quality) }]}>
                      {getQualityLabel(session.quality)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </BlurView>
          )}

          {/* Empty State */}
          {sleepHistory.length === 0 && (
            <BlurView intensity={40} tint="dark" style={styles(theme).premiumEmptyCard}>
              <LinearGradient
                colors={['rgba(212, 175, 55, 0.15)', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles(theme).emptyIconBg, { backgroundColor: 'rgba(212, 175, 55, 0.1)', borderColor: '#D4AF37', borderWidth: 1 }]}>
                <Star size={48} color="#D4AF37" />
              </View>
              <Text style={styles(theme).emptyTitle}>Begin Your Journey</Text>
              <Text style={styles(theme).emptyText}>
                Your architectural sleep insights will appear here. Record your first session to unlock the VIP experience.
              </Text>
              <TouchableOpacity 
                style={styles(theme).startFirstSessionButton}
                onPress={() => navigation.navigate('Home')}
              >
                <LinearGradient
                  colors={['#D4AF37', '#F59E0B']}
                  style={styles(theme).startFirstSessionGradient}
                >
                  <Text style={styles(theme).startFirstSessionText}>Start First Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}

          <View style={styles(theme).bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  todayButtonText: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    color: '#D4AF37',
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  // Calendar Styles
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 4,
    gap: 4, // Match calendar grid gap
  },
  weekDayLabel: {
    width: '13%', // Match calendar day width
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4, // Add gap between days
    paddingHorizontal: 4,
  },
  calendarDay: {
    width: '13%', // Reduced from 14.28% to account for gap
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50, // Fully circular
    marginVertical: 2, // Small vertical spacing
  },
  selectedDay: {
    backgroundColor: '#D4AF37',
    borderRadius: 50, // Ensure circular shape
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderRadius: 50, // Ensure circular border
  },
  calendarDayText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#000',
    fontWeight: '900',
  },
  sleepIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    position: 'absolute',
    bottom: 4,
  },
  
  // Progress Bar Styles
  progressItem: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  
  // Chart Styles
  chartContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  
  // Sleep Stages Styles
  stagesChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stagesLegend: {
    flex: 1,
    marginLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendLabel: {
    fontSize: 13,
    color: theme.colors.textPrimary,
  },
  legendValue: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  
  // Metrics Grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  metricIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  
  // Analysis Section
  analysisSection: {
    gap: 10,
    marginBottom: 16,
  },
  analysisCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  analysisCardInner: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analysisIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  analysisTextContainer: {
    flex: 1,
  },
  analysisTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  analysisSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  analysisContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  analysisText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  
  // Notes
  noteDisplay: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  noteText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 22,
  },
  noNoteText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  
  // Journal Input
  journalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 16,
    color: theme.colors.textPrimary,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButton: {
    alignSelf: 'flex-end',
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  
  // Session Items
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sessionIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 14,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '500',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  sessionStats: {
    alignItems: 'flex-end',
  },
  sessionDuration: {
    fontSize: 15,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionQuality: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Empty State
  emptyCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 20,
    padding: 40,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Calendar Toggle Styles
  calendarToggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calendarToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedDateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  
  // Sleep Stages Chart Only Container
  stagesChartOnlyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  
  // Sleep Stages Breakdown Styles
  stagesBreakdownGrid: {
    gap: 12,
  },
  stageBreakdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
  },
  stageIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  stageBreakdownInfo: {
    flex: 1,
  },
  stageBreakdownName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  stageBreakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  stageBreakdownDesc: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  stagePercentage: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  stagePercentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Saved Journal Entries Styles
  savedJournalEntry: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
  },
  savedJournalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  savedJournalDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  savedJournalText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  
  // Recordings List Styles
  recordingsList: {
    gap: 12,
  },
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  recordingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 209, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
  },
  recordingType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  recordingTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  recordingMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recordingDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  playButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  playButtonActive: {
    backgroundColor: theme.colors.error,
  },
  analysisButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  analysisButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  analysisButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  volumeIndicator: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  volumeLevel: {
    height: '100%',
    backgroundColor: theme.colors.accent,
  },
  journalCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 175, 55, 0.3)',
    overflow: 'hidden',
  },
  notebookContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.1)',
    minHeight: 150,
  },
  notebookLines: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: -1,
  },
  notebookLine: {
    height: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.05)',
    marginTop: 24,
  },
  premiumEmptyCard: {
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(212, 175, 55, 0.4)',
    overflow: 'hidden',
    backgroundColor: 'rgba(11, 11, 21, 0.8)',
  },
  startFirstSessionButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    elevation: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  startFirstSessionGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  startFirstSessionText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bottomSpacing: {
    height: 40,
  },
});
