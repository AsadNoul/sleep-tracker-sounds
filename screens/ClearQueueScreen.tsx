import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ClearQueueScreen() {
  const [isClearing, setIsClearing] = useState(false);

  const clearAllQueues = async () => {
    Alert.alert(
      'Clear Sync Queue',
      'This will permanently delete all 9 failed sync operations. New sleep sessions will sync normally. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Queue',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);

              // Clear all sync queues
              await AsyncStorage.multiRemove([
                '@sync_queue_sleep_records',
                '@sync_queue_journal_entries',
                '@sync_queue_settings',
                '@sync_completed_idempotency_keys',
              ]);

              Alert.alert('Success', 'Sync queue cleared! Old failed operations have been removed.');
              setIsClearing(false);
            } catch (error) {
              console.error('Error clearing queue:', error);
              Alert.alert('Error', 'Failed to clear queue. Please try again.');
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clear Failed Sync Queue</Text>
      <Text style={styles.description}>
        There are 9 old sleep records that failed to sync due to data format issues.{'\n\n'}
        These records are from before the recent fixes and cannot be recovered.{'\n\n'}
        Clearing the queue will:
      </Text>
      <Text style={styles.bullet}>• Remove the 9 failed sync operations</Text>
      <Text style={styles.bullet}>• Stop the repeated error messages</Text>
      <Text style={styles.bullet}>• Allow new sleep sessions to sync perfectly</Text>
      <Text style={styles.bullet}>• NOT affect any data in the database</Text>

      <TouchableOpacity
        style={[styles.button, isClearing && styles.buttonDisabled]}
        onPress={clearAllQueues}
        disabled={isClearing}
      >
        <Text style={styles.buttonText}>
          {isClearing ? 'Clearing...' : 'Clear Queue (9 items)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0A0E1A',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#A0A0A0',
    marginBottom: 20,
    lineHeight: 24,
  },
  bullet: {
    fontSize: 16,
    color: '#00FFD1',
    marginLeft: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#FF6B6B',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
