import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  Plus,
  Moon,
  Cloud,
  Zap,
  Smile,
  Meh,
  Frown,
  Calendar,
  Save,
  Trash2,
  Sparkles
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';

interface Dream {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: 'happy' | 'neutral' | 'scary';
  isLucid: boolean;
  keywords?: string[];
  insight?: string;
}

export default function DreamJournalScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [isAdding, setIsAdding] = useState(false);
  const [dreams, setDreams] = useState<Dream[]>([]);

  useEffect(() => {
    loadDreams();
  }, []);

  const loadDreams = async () => {
    try {
      const storedDreams = await AsyncStorage.getItem('dream_journal');
      if (storedDreams) {
        setDreams(JSON.parse(storedDreams));
      } else {
        // Initial defaults if none exist
        const defaults: Dream[] = [
          {
            id: '1',
            date: 'Dec 20, 2025',
            title: 'Flying over the ocean',
            content: 'I was soaring above deep blue waves. The sun was warm on my back.',
            mood: 'happy',
            isLucid: true,
          }
        ];
        setDreams(defaults);
        await AsyncStorage.setItem('dream_journal', JSON.stringify(defaults));
      }
    } catch (error) {
      console.error('Failed to load dreams', error);
    }
  };

  const saveDreams = async (updatedDreams: Dream[]) => {
    try {
      await AsyncStorage.setItem('dream_journal', JSON.stringify(updatedDreams));
    } catch (error) {
      console.error('Failed to save dreams', error);
    }
  };

  const [newDream, setNewDream] = useState<Partial<Dream>>({
    title: '',
    content: '',
    mood: 'neutral',
    isLucid: false,
  });

  const analyzeDream = (content: string) => {
    const commonWords = ['flying', 'falling', 'chase', 'water', 'teeth', 'test', 'exam', 'lost', 'forest', 'beach', 'mountain', 'dark', 'light'];
    const lowerContent = content.toLowerCase();
    const foundKeywords = commonWords.filter(word => lowerContent.includes(word));

    // Simple interpretations
    const interpretations: { [key: string]: string } = {
      flying: "Control and freedom. You're feeling confident and liberated.",
      falling: "Anxiety or lack of control in some area of your life.",
      chase: "You might be avoiding a confrontation or problem.",
      water: "Represents your emotional state. Calm water means peace; turbulent means stress.",
      teeth: "Communication issues or concerns about your appearance or power.",
      exam: "Self-evaluation or feeling unprepared for a challenge.",
      lost: "You're feeling uncertain about your current path or decisions.",
    };

    const insight = foundKeywords.length > 0
      ? interpretations[foundKeywords[0]]
      : "Your dream reflects your subconscious processing of recent events.";

    return { keywords: foundKeywords, insight };
  };

  const handleSaveDream = () => {
    if (!newDream.title || !newDream.content) {
      Alert.alert('Error', 'Please fill in both title and description');
      return;
    }

    const analysis = analyzeDream(newDream.content!);

    const dream: Dream & { keywords?: string[], insight?: string } = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: newDream.title!,
      content: newDream.content!,
      mood: newDream.mood as any,
      isLucid: newDream.isLucid!,
      keywords: analysis.keywords,
      insight: analysis.insight
    };

    const updatedDreams = [dream, ...dreams];
    setDreams(updatedDreams);
    saveDreams(updatedDreams);
    setIsAdding(false);
    setNewDream({ title: '', content: '', mood: 'neutral', isLucid: false });
  };

  const deleteDream = (id: string) => {
    Alert.alert('Delete Dream', 'Are you sure you want to remove this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          const updated = dreams.filter(d => d.id !== id);
          setDreams(updated);
          saveDreams(updated);
        }
      }
    ]);
  };

  return (
    <View style={styles(theme).container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        style={styles(theme).gradient}
      >
        {/* Header */}
        <View style={[styles(theme).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles(theme).backButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme).headerTitle}>Dream Journal</Text>
          <TouchableOpacity
            style={styles(theme).addButton}
            onPress={() => setIsAdding(!isAdding)}
          >
            {isAdding ? <Trash2 size={24} color={theme.colors.danger} /> : <Plus size={24} color={theme.colors.accent} />}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles(theme).content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles(theme).scrollContent}
          >
            {isAdding ? (
              <BlurView intensity={30} tint="dark" style={styles(theme).addCard}>
                <Text style={styles(theme).cardTitle}>Record New Dream</Text>

                <TextInput
                  style={styles(theme).input}
                  placeholder="Dream Title"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={newDream.title}
                  onChangeText={(text) => setNewDream({ ...newDream, title: text })}
                />

                <TextInput
                  style={[styles(theme).input, styles(theme).textArea]}
                  placeholder="What happened in your dream?"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  numberOfLines={6}
                  value={newDream.content}
                  onChangeText={(text) => setNewDream({ ...newDream, content: text })}
                />

                <Text style={styles(theme).label}>How did it feel?</Text>
                <View style={styles(theme).moodContainer}>
                  {(['happy', 'neutral', 'scary'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles(theme).moodButton,
                        newDream.mood === m && styles(theme).moodButtonActive
                      ]}
                      onPress={() => setNewDream({ ...newDream, mood: m })}
                    >
                      {m === 'happy' && <Smile size={24} color={newDream.mood === m ? theme.colors.background : '#4ECDC4'} />}
                      {m === 'neutral' && <Meh size={24} color={newDream.mood === m ? theme.colors.background : '#FFE66D'} />}
                      {m === 'scary' && <Frown size={24} color={newDream.mood === m ? theme.colors.background : '#FF6B6B'} />}
                      <Text style={[styles(theme).moodText, newDream.mood === m && { color: theme.colors.background }]}>
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles(theme).lucidToggle}
                  onPress={() => setNewDream({ ...newDream, isLucid: !newDream.isLucid })}
                >
                  <Zap size={20} color={newDream.isLucid ? theme.colors.accent : 'rgba(255,255,255,0.4)'} />
                  <Text style={[styles(theme).lucidText, newDream.isLucid && { color: theme.colors.accent }]}>
                    Lucid Dream
                  </Text>
                  <View style={[styles(theme).toggle, newDream.isLucid && styles(theme).toggleActive]}>
                    <View style={[styles(theme).toggleKnob, newDream.isLucid && styles(theme).toggleKnobActive]} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles(theme).saveButton}
                  onPress={handleSaveDream}
                >
                  <LinearGradient
                    colors={[theme.colors.accent, theme.colors.highlight]}
                    style={styles(theme).saveGradient}
                  >
                    <Save size={20} color={theme.colors.background} />
                    <Text style={styles(theme).saveText}>Save Entry</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </BlurView>
            ) : (
              <>
                <View style={styles(theme).statsContainer}>
                  <BlurView intensity={20} tint="dark" style={styles(theme).statBox}>
                    <Moon size={20} color={theme.colors.accent} />
                    <Text style={styles(theme).statValue}>{dreams.length}</Text>
                    <Text style={styles(theme).statLabel}>Dreams</Text>
                  </BlurView>
                  <BlurView intensity={20} tint="dark" style={styles(theme).statBox}>
                    <Zap size={20} color={theme.colors.highlight} />
                    <Text style={styles(theme).statValue}>{dreams.filter(d => d.isLucid).length}</Text>
                    <Text style={styles(theme).statLabel}>Lucid</Text>
                  </BlurView>
                  <BlurView intensity={20} tint="dark" style={styles(theme).statBox}>
                    <Sparkles size={20} color={theme.colors.premium} />
                    <Text style={styles(theme).statValue}>85%</Text>
                    <Text style={styles(theme).statLabel}>Recall</Text>
                  </BlurView>
                </View>

                {dreams.length > 0 && (
                  <BlurView intensity={20} tint="dark" style={styles(theme).insightCard}>
                    <View style={styles(theme).insightHeader}>
                      <Sparkles size={18} color={theme.colors.accent} />
                      <Text style={[styles(theme).insightTitle, { color: theme.colors.textPrimary }]}>Latest Insights</Text>
                    </View>
                    <Text style={[styles(theme).insightText, { color: theme.colors.textSecondary }]}>
                      {dreams[0]?.insight || "Recording more dreams will help unlock deeper analysis."}
                    </Text>
                    {dreams[0]?.keywords && dreams[0].keywords.length > 0 && (
                      <View style={styles(theme).keywordCloud}>
                        {dreams[0].keywords.map(kw => (
                          <View key={kw} style={styles(theme).keywordBadge}>
                            <Text style={styles(theme).keywordText}>#{kw}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </BlurView>
                )}

                {dreams.map((dream) =>
                  Platform.OS === 'ios' ? (
                    <BlurView key={dream.id} intensity={20} tint="dark" style={styles(theme).dreamCard}>
                      <View style={styles(theme).dreamHeader}>
                        <View style={styles(theme).dateContainer}>
                          <Calendar size={14} color={theme.colors.textSecondary} />
                          <Text style={styles(theme).dreamDate}>{dream.date}</Text>
                        </View>
                        {dream.isLucid && (
                          <View style={styles(theme).lucidBadge}>
                            <Zap size={12} color={theme.colors.background} fill={theme.colors.background} />
                            <Text style={styles(theme).lucidBadgeText}>LUCID</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles(theme).dreamTitle}>{dream.title}</Text>
                      <Text style={styles(theme).dreamContent} numberOfLines={3}>{dream.content}</Text>

                      <View style={styles(theme).dreamFooter}>
                        <View style={styles(theme).moodBadge}>
                          {dream.mood === 'happy' && <Smile size={16} color="#4ECDC4" />}
                          {dream.mood === 'neutral' && <Meh size={16} color="#FFE66D" />}
                          {dream.mood === 'scary' && <Frown size={16} color="#FF6B6B" />}
                          <Text style={styles(theme).moodBadgeText}>{dream.mood}</Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteDream(dream.id)}>
                          <Trash2 size={18} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                      </View>
                    </BlurView>
                  ) : (
                    <View key={dream.id} style={styles(theme).dreamCard}>
                      <View style={styles(theme).dreamHeader}>
                        <View style={styles(theme).dateContainer}>
                          <Calendar size={14} color={theme.colors.textSecondary} />
                          <Text style={styles(theme).dreamDate}>{dream.date}</Text>
                        </View>
                        {dream.isLucid && (
                          <View style={styles(theme).lucidBadge}>
                            <Zap size={12} color={theme.colors.background} fill={theme.colors.background} />
                            <Text style={styles(theme).lucidBadgeText}>LUCID</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles(theme).dreamTitle}>{dream.title}</Text>
                      <Text style={styles(theme).dreamContent} numberOfLines={3}>{dream.content}</Text>

                      <View style={styles(theme).dreamFooter}>
                        <View style={styles(theme).moodBadge}>
                          {dream.mood === 'happy' && <Smile size={16} color="#4ECDC4" />}
                          {dream.mood === 'neutral' && <Meh size={16} color="#FFE66D" />}
                          {dream.mood === 'scary' && <Frown size={16} color="#FF6B6B" />}
                          <Text style={styles(theme).moodBadgeText}>{dream.mood}</Text>
                        </View>
                        <TouchableOpacity onPress={() => deleteDream(dream.id)}>
                          <Trash2 size={18} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )
                )}
              </>
            )}
            <View style={styles(theme).bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View >
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: theme.colors.textPrimary,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  moodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  moodButtonActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  moodText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  lucidToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  lucidText: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: theme.colors.accent,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.background,
  },
  dreamCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  dreamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dreamDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  lucidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  lucidBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.background,
  },
  dreamContent: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  insightCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.accent + '30',
    overflow: 'hidden',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  keywordCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordBadge: {
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  keywordText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  dreamTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  dreamFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  bottomSpacing: {
    height: 100,
  },
});
