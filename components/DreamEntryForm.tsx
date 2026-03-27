import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  CheckBox,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useDream } from '../contexts/DreamContext';
import { DreamEntry, suggestDreamThemes, suggestDreamColors, getDreamMoodEmoji } from '../utils/dreamJournal';
import { a11y } from '../utils/accessibility';

interface DreamEntryFormProps {
  onDreamAdded?: (dream: DreamEntry) => void;
  onClose?: () => void;
}

export const DreamEntryForm: React.FC<DreamEntryFormProps> = ({ onDreamAdded, onClose }) => {
  const { theme } = useTheme();
  const { addDream } = useDream();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mood, setMood] = useState<'happy' | 'sad' | 'scary' | 'peaceful' | 'confusing' | 'vivid'>('peaceful');
  const [lucid, setLucid] = useState(false);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showColorSelector, setShowColorSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const moods: Array<'happy' | 'sad' | 'scary' | 'peaceful' | 'confusing' | 'vivid'> = [
    'happy',
    'sad',
    'scary',
    'peaceful',
    'confusing',
    'vivid',
  ];

  const handleAddDream = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please fill in title and description');
      return;
    }

    try {
      setIsLoading(true);
      const dreamEntry: DreamEntry = {
        id: `dream-${Date.now()}`,
        date: new Date(),
        title,
        description,
        mood,
        lucid,
        colors: selectedColors,
        themes: selectedThemes.length > 0 ? selectedThemes : ['general'],
        createdAt: new Date(),
      };

      await addDream(dreamEntry);
      Alert.alert('Success', 'Dream entry saved!');
      setTitle('');
      setDescription('');
      setMood('peaceful');
      setLucid(false);
      setSelectedThemes([]);
      setSelectedColors([]);
      onDreamAdded?.(dreamEntry);
      onClose?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to save dream');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev =>
      prev.includes(theme) ? prev.filter(t => t !== theme) : [...prev, theme]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background.primary }]}>
      {/* Title */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Dream Title</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.background.secondary,
              color: theme.text.primary,
              borderColor: theme.border.default,
            },
          ]}
          placeholder="Give your dream a title..."
          placeholderTextColor={theme.text.secondary}
          value={title}
          onChangeText={setTitle}
          editable={!isLoading}
        />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text.primary }]}>
          Dream Description
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.descriptionInput,
            {
              backgroundColor: theme.background.secondary,
              color: theme.text.primary,
              borderColor: theme.border.default,
            },
          ]}
          placeholder="Describe what you saw, felt, and experienced..."
          placeholderTextColor={theme.text.secondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          editable={!isLoading}
        />
      </View>

      {/* Mood Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: theme.text.primary }]}>Dream Mood</Text>
        <View style={styles.moodGrid}>
          {moods.map(m => (
            <TouchableOpacity
              key={m}
              style={[
                styles.moodButton,
                {
                  backgroundColor: mood === m ? '#8B5CF6' : theme.background.secondary,
                  borderColor: mood === m ? '#8B5CF6' : theme.border.default,
                },
              ]}
              onPress={() => setMood(m)}
              {...a11y.button(`${m} mood`)}
            >
              <Text style={styles.moodEmoji}>{getDreamMoodEmoji(m)}</Text>
              <Text
                style={[
                  styles.moodLabel,
                  { color: mood === m ? '#FFF' : theme.text.primary },
                ]}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Lucid Dream Checkbox */}
      <View style={styles.section}>
        <View style={styles.checkboxRow}>
          <CheckBox value={lucid} onValueChange={setLucid} />
          <Text style={[styles.checkboxLabel, { color: theme.text.primary }]}>
            This was a lucid dream
          </Text>
        </View>
      </View>

      {/* Themes */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.selectorHeader}
          onPress={() => setShowThemeSelector(!showThemeSelector)}
          {...a11y.button('Select dream themes')}
        >
          <Text style={[styles.label, { color: theme.text.primary }]}>
            Dream Themes ({selectedThemes.length})
          </Text>
          <MaterialCommunityIcons
            name={showThemeSelector ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.text.secondary}
          />
        </TouchableOpacity>

        {showThemeSelector && (
          <View style={styles.selectorGrid}>
            {suggestDreamThemes().map(theme_name => (
              <TouchableOpacity
                key={theme_name}
                style={[
                  styles.themeTag,
                  {
                    backgroundColor: selectedThemes.includes(theme_name)
                      ? '#8B5CF6'
                      : theme.background.secondary,
                    borderColor: selectedThemes.includes(theme_name)
                      ? '#8B5CF6'
                      : theme.border.default,
                  },
                ]}
                onPress={() => toggleTheme(theme_name)}
              >
                <Text
                  style={[
                    styles.themeTagText,
                    {
                      color: selectedThemes.includes(theme_name)
                        ? '#FFF'
                        : theme.text.primary,
                    },
                  ]}
                >
                  {theme_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Colors */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.selectorHeader}
          onPress={() => setShowColorSelector(!showColorSelector)}
          {...a11y.button('Select dream colors')}
        >
          <Text style={[styles.label, { color: theme.text.primary }]}>
            Dream Colors ({selectedColors.length})
          </Text>
          <MaterialCommunityIcons
            name={showColorSelector ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.text.secondary}
          />
        </TouchableOpacity>

        {showColorSelector && (
          <View style={styles.colorGrid}>
            {suggestDreamColors().map(color => (
              <TouchableOpacity
                key={color}
                style={styles.colorItem}
                onPress={() => toggleColor(color)}
              >
                <View
                  style={[
                    styles.colorCircle,
                    {
                      backgroundColor: getColorValue(color),
                      borderWidth: selectedColors.includes(color) ? 3 : 0,
                      borderColor: '#8B5CF6',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.colorLabel,
                    {
                      color: theme.text.primary,
                      fontWeight: selectedColors.includes(color) ? '600' : '400',
                    },
                  ]}
                >
                  {color}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
          onPress={onClose}
          disabled={isLoading}
          {...a11y.button('Cancel')}
        >
          <Text style={[styles.buttonText, { color: theme.text.primary }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: '#8B5CF6' }]}
          onPress={handleAddDream}
          disabled={isLoading}
          {...a11y.button('Save dream')}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save Dream'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

function getColorValue(color: string): string {
  const colorMap: Record<string, string> = {
    blue: '#3B82F6',
    green: '#10B981',
    purple: '#8B5CF6',
    red: '#EF4444',
    yellow: '#F59E0B',
    orange: '#F97316',
    pink: '#EC4899',
    brown: '#92400E',
    black: '#000000',
    white: '#FFFFFF',
    gray: '#6B7280',
    golden: '#D97706',
  };
  return colorMap[color] || '#999999';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  moodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxLabel: {
    fontSize: 14,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  themeTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
  },
  themeTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  colorItem: {
    width: '30%',
    alignItems: 'center',
    gap: 6,
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  colorLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});
