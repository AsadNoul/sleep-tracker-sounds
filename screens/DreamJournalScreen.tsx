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
import {
  ChevronLeft,
  Plus,
  Moon,
  Zap,
  Smile,
  Meh,
  Frown,
  Calendar,
  Save,
  Trash2,
  Sparkles,
  X,
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

  const moodColor = (m: 'happy' | 'neutral' | 'scary') => {
    if (m === 'happy') return theme.colors.success;
    if (m === 'scary') return theme.colors.danger;
    return theme.colors.warning;
  };

  return (
    <View style={styles(theme).container}>
      {/* Header */}
      <View style={[styles(theme).header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles(theme).headerActionFab}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={22} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={styles(theme).headerTitleBlock}>
          <Text style={styles(theme).headerLargeTitle}>Dream journal</Text>
          <Text style={styles(theme).headerSubtitleText}>
            {dreams.length > 0 ? `${dreams.length} ${dreams.length === 1 ? 'entry' : 'entries'} recorded` : 'Your dream library'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles(theme).headerActionFab}
          onPress={() => setIsAdding(!isAdding)}
        >
          {isAdding ? (
            <X size={22} color={theme.colors.textPrimary} strokeWidth={2.2} />
          ) : (
            <Plus size={22} color={theme.colors.accent} strokeWidth={2.2} />
          )}
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
            <View style={styles(theme).addCard}>
              <Text style={styles(theme).cardTitle}>Record new dream</Text>

              <Text style={styles(theme).inputLabel}>Title</Text>
              <TextInput
                style={styles(theme).input}
                placeholder="Dream title"
                placeholderTextColor={theme.colors.textTertiary}
                value={newDream.title}
                onChangeText={(text) => setNewDream({ ...newDream, title: text })}
              />

              <Text style={styles(theme).inputLabel}>What happened?</Text>
              <TextInput
                style={[styles(theme).input, styles(theme).textArea]}
                placeholder="Describe your dream..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={6}
                value={newDream.content}
                onChangeText={(text) => setNewDream({ ...newDream, content: text })}
              />

              <Text style={styles(theme).inputLabel}>How did it feel?</Text>
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
                    {m === 'happy' && <Smile size={22} color={newDream.mood === m ? theme.colors.accent : theme.colors.textTertiary} strokeWidth={2.2} />}
                    {m === 'neutral' && <Meh size={22} color={newDream.mood === m ? theme.colors.accent : theme.colors.textTertiary} strokeWidth={2.2} />}
                    {m === 'scary' && <Frown size={22} color={newDream.mood === m ? theme.colors.accent : theme.colors.textTertiary} strokeWidth={2.2} />}
                    <Text style={[styles(theme).moodText, newDream.mood === m && styles(theme).moodTextActive]}>
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles(theme).lucidToggle}
                onPress={() => setNewDream({ ...newDream, isLucid: !newDream.isLucid })}
                activeOpacity={0.85}
              >
                <View style={styles(theme).lucidIconWrap}>
                  <Zap size={18} color={newDream.isLucid ? theme.colors.accent : theme.colors.textTertiary} strokeWidth={2.2} />
                </View>
                <Text style={[styles(theme).lucidText, newDream.isLucid && { color: theme.colors.textPrimary }]}>
                  Lucid dream
                </Text>
                <View style={[styles(theme).toggle, newDream.isLucid && styles(theme).toggleActive]}>
                  <View style={[styles(theme).toggleKnob, newDream.isLucid && styles(theme).toggleKnobActive]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(theme).saveButton}
                onPress={handleSaveDream}
                activeOpacity={0.9}
              >
                <Save size={18} color={theme.colors.ctaText} strokeWidth={2.2} />
                <Text style={styles(theme).saveText}>Save entry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles(theme).statsContainer}>
                <View style={styles(theme).statBox}>
                  <View style={styles(theme).statIconWrapper}>
                    <Moon size={16} color={theme.colors.accent} strokeWidth={2.2} />
                  </View>
                  <Text style={styles(theme).statValue}>{dreams.length}</Text>
                  <Text style={styles(theme).statLabel}>Dreams</Text>
                </View>
                <View style={styles(theme).statBox}>
                  <View style={styles(theme).statIconWrapper}>
                    <Zap size={16} color={theme.colors.accent} strokeWidth={2.2} />
                  </View>
                  <Text style={styles(theme).statValue}>{dreams.filter(d => d.isLucid).length}</Text>
                  <Text style={styles(theme).statLabel}>Lucid</Text>
                </View>
                <View style={styles(theme).statBox}>
                  <View style={styles(theme).statIconWrapper}>
                    <Sparkles size={16} color={theme.colors.accent} strokeWidth={2.2} />
                  </View>
                  <Text style={styles(theme).statValue}>85%</Text>
                  <Text style={styles(theme).statLabel}>Recall</Text>
                </View>
              </View>

              {dreams.length > 0 && (
                <View style={styles(theme).insightCard}>
                  <View style={styles(theme).insightHeader}>
                    <Sparkles size={16} color={theme.colors.accent} strokeWidth={2.2} />
                    <Text style={styles(theme).insightTitle}>Latest insight</Text>
                  </View>
                  <Text style={styles(theme).insightText}>
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
                </View>
              )}

              {dreams.length === 0 ? (
                <View style={styles(theme).emptyCard}>
                  <Moon size={44} color={theme.colors.textTertiary} style={{ opacity: 0.6 }} />
                  <Text style={styles(theme).emptyTitle}>No dreams yet</Text>
                  <Text style={styles(theme).emptyText}>
                    Tap the + button to record your first dream
                  </Text>
                </View>
              ) : (
                dreams.map((dream) => (
                  <View key={dream.id} style={styles(theme).dreamCard}>
                    <View style={styles(theme).dreamHeader}>
                      <View style={styles(theme).dateContainer}>
                        <Calendar size={13} color={theme.colors.textTertiary} strokeWidth={2.2} />
                        <Text style={styles(theme).dreamDate}>{dream.date}</Text>
                      </View>
                      {dream.isLucid && (
                        <View style={styles(theme).lucidBadge}>
                          <Zap size={11} color={theme.colors.ctaText} strokeWidth={2.4} fill={theme.colors.ctaText} />
                          <Text style={styles(theme).lucidBadgeText}>LUCID</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles(theme).dreamTitle}>{dream.title}</Text>
                    <Text style={styles(theme).dreamContent} numberOfLines={3}>{dream.content}</Text>

                    <View style={styles(theme).dreamFooter}>
                      <View style={styles(theme).moodBadge}>
                        {dream.mood === 'happy' && <Smile size={14} color={moodColor(dream.mood)} strokeWidth={2.2} />}
                        {dream.mood === 'neutral' && <Meh size={14} color={moodColor(dream.mood)} strokeWidth={2.2} />}
                        {dream.mood === 'scary' && <Frown size={14} color={moodColor(dream.mood)} strokeWidth={2.2} />}
                        <Text style={styles(theme).moodBadgeText}>{dream.mood}</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteDream(dream.id)} style={styles(theme).deleteButton}>
                        <Trash2 size={16} color={theme.colors.textTertiary} strokeWidth={2.2} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
          <View style={styles(theme).bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerActionFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerLargeTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 22,
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitleText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    columnGap: 12,
  },
  statBox: {
    flex: 1,
    padding: 16,
    borderRadius: theme.borderRadius.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
  },
  statIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 19,
    color: theme.colors.textPrimary,
  },
  statLabel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 2,
  },
  addCard: {
    borderRadius: theme.borderRadius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    marginBottom: 20,
  },
  cardTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginBottom: 18,
  },
  inputLabel: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  input: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    lineHeight: 21,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    columnGap: 10,
  },
  moodButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
  },
  moodButtonActive: {
    backgroundColor: theme.colors.selectedBackground,
    borderColor: theme.colors.accent,
  },
  moodText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginTop: 6,
  },
  moodTextActive: {
    color: theme.colors.accent,
    fontFamily: theme.typography.fontFamily.bodySemibold,
  },
  lucidToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    padding: 14,
    borderRadius: theme.borderRadius.lg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    columnGap: 12,
  },
  lucidIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lucidText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.disabled,
    padding: 3,
  },
  toggleActive: {
    backgroundColor: theme.colors.accent,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.ctaText,
  },
  toggleKnobActive: {
    transform: [{ translateX: 18 }],
  },
  saveButton: {
    height: 54,
    borderRadius: theme.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.ctaBackground,
    columnGap: 10,
  },
  saveText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.ctaText,
  },
  emptyCard: {
    borderRadius: theme.borderRadius.card,
    padding: 40,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
    rowGap: 8,
  },
  emptyTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 18,
    color: theme.colors.textPrimary,
    marginTop: 8,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  dreamCard: {
    borderRadius: theme.borderRadius.card,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.card,
  },
  dreamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  dreamDate: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  lucidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    columnGap: 4,
  },
  lucidBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 10,
    color: theme.colors.ctaText,
    letterSpacing: 0.3,
  },
  dreamTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 17,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  dreamContent: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  insightCard: {
    padding: 18,
    borderRadius: theme.borderRadius.card,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
    backgroundColor: theme.colors.accentLight,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    marginBottom: 10,
  },
  insightTitle: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  insightText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  keywordCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
  },
  keywordBadge: {
    backgroundColor: theme.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
  },
  keywordText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: theme.colors.accent,
  },
  dreamFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    columnGap: 6,
  },
  moodBadgeText: {
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 12,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSpacing: {
    height: 100,
  },
});
