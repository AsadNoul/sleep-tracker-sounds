import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { useMood } from '../contexts/MoodContext';
import { getMoodEmoji, getMoodColor } from '../utils/moodTracking';
import { MoodEntry } from '../utils/moodTracking';
import { a11y } from '../utils/accessibility';

const MOODS: Array<'excellent' | 'good' | 'neutral' | 'poor' | 'terrible'> = [
  'excellent',
  'good',
  'neutral',
  'poor',
  'terrible',
];

interface MoodSelectorProps {
  onMoodSelected?: (mood: string) => void;
  beforeSleep?: boolean;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ onMoodSelected, beforeSleep = true }) => {
  const { theme } = useTheme();
  const { addMood } = useMood();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    setNotesModalVisible(true);
  };

  const handleSaveMood = async () => {
    if (!selectedMood) return;

    try {
      setIsLoading(true);
      const moodEntry: MoodEntry = {
        id: `mood-${Date.now()}`,
        sessionId: `session-${Date.now()}`, // Link to current session
        timestamp: new Date(),
        mood: selectedMood as any,
        beforeSleep,
        notes: notes || undefined,
      };

      await addMood(moodEntry);
      Alert.alert('Success', 'Mood logged successfully!');
      setNotesModalVisible(false);
      setNotes('');
      setSelectedMood(null);
      onMoodSelected?.(selectedMood);
    } catch (error) {
      Alert.alert('Error', 'Failed to save mood. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Mood Selector */}
      <View style={styles.selectorContainer}>
        <Text
          style={[styles.title, { color: theme.text.primary }]}
          {...a11y.text('How are you feeling?')}
        >
          {beforeSleep ? 'Pre-Sleep Mood' : 'Post-Sleep Mood'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          {beforeSleep ? 'How do you feel before sleep?' : 'How did you feel after waking?'}
        </Text>

        <View style={styles.moodGrid}>
          {MOODS.map(mood => (
            <TouchableOpacity
              key={mood}
              style={[
                styles.moodButton,
                {
                  backgroundColor:
                    selectedMood === mood ? getMoodColor(mood) : theme.background.secondary,
                  borderColor: selectedMood === mood ? getMoodColor(mood) : theme.border.default,
                },
              ]}
              onPress={() => handleMoodSelect(mood)}
              {...a11y.button(`${mood} mood`)}
            >
              <Text style={styles.moodEmoji}>{getMoodEmoji(mood)}</Text>
              <Text
                style={[
                  styles.moodLabel,
                  {
                    color: selectedMood === mood ? '#FFF' : theme.text.primary,
                  },
                ]}
              >
                {mood.charAt(0).toUpperCase() + mood.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.background.primary }]}>
            <Text style={[styles.modalTitle, { color: theme.text.primary }]}>
              Add Notes (Optional)
            </Text>

            <TextInput
              style={[
                styles.notesInput,
                {
                  backgroundColor: theme.background.secondary,
                  color: theme.text.primary,
                  borderColor: theme.border.default,
                },
              ]}
              placeholder="What's on your mind?"
              placeholderTextColor={theme.text.secondary}
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              editable={!isLoading}
            />

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.background.secondary }]}
                onPress={() => {
                  setNotesModalVisible(false);
                  setNotes('');
                  setSelectedMood(null);
                }}
                disabled={isLoading}
                {...a11y.button('Cancel')}
              >
                <Text style={[styles.buttonText, { color: theme.text.primary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: getMoodColor(selectedMood || 'neutral') },
                ]}
                onPress={handleSaveMood}
                disabled={isLoading}
                {...a11y.button('Save mood')}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Saving...' : 'Save Mood'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  selectorContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  moodButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: '50%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    fontFamily: 'System',
    fontSize: 14,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
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
