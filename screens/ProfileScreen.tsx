import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const theme = {
  background: '#0F111A',
  card: '#1B1D2A',
  accent: '#00FFD1',
  highlight: '#33C6FF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, profile: userProfile, reloadProfile } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load profile data from auth context
  useEffect(() => {
    if (user) {
      setEditName(user.full_name || '');
    }
  }, [user]);

  const startEditProfile = () => {
    setEditName(user?.full_name || '');
    setEditMode(true);
  };

  const cancelEditProfile = () => {
    setEditName(user?.full_name || '');
    setEditMode(false);
  };

  const saveProfileData = async () => {
    // Trim inputs
    const trimmedName = editName.trim();

    // Validation
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be signed in to update your profile');
      return;
    }

    setIsSaving(true);

    try {
      // Update in Supabase
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: trimmedName })
        .eq('id', user.id);

      if (error) throw error;

      // Reload profile to show updated data immediately
      await reloadProfile();

      setEditMode(false);
      Alert.alert('Success', 'Your profile has been updated.');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[theme.background, '#0A0C14']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.content}>
        <BlurView intensity={20} tint="dark" style={styles.profileCard}>
          <Text style={styles.cardTitle}>Profile Details</Text>
          {editMode ? (
            <>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                accessibilityLabel="Name input field"
                accessibilityHint="Enter your full name"
              />
              <View style={styles.profileButtonRow}>
                <TouchableOpacity
                  style={[styles.profileButton, isSaving && styles.disabledButton]}
                  onPress={saveProfileData}
                  disabled={isSaving}
                >
                  <Text style={styles.profileButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={cancelEditProfile}
                  disabled={isSaving}
                >
                  <Text style={styles.profileButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.profileInfoRow}>
                <Ionicons name="person" size={28} color={theme.accent} style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.profileLabel}>Name</Text>
                  <Text style={styles.profileValue}>{user?.full_name || 'Not set'}</Text>
                </View>
              </View>
              <View style={styles.profileInfoRow}>
                <Ionicons name="mail" size={24} color={theme.highlight} style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.profileLabel}>Email</Text>
                  <Text style={styles.profileValue}>{user?.email || 'Not set'}</Text>
                </View>
              </View>
              <View style={styles.profileInfoRow}>
                <Ionicons name="shield-checkmark" size={24} color="#FFD700" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.profileLabel}>Subscription</Text>
                  <Text style={styles.profileValue}>
                    {user?.subscription_status === 'premium_monthly' ? 'Premium Monthly' :
                     user?.subscription_status === 'premium_yearly' ? 'Premium Yearly' : 'Free'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={startEditProfile}>
                <Text style={styles.profileButtonText}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
        </BlurView>

        {!user && (
          <BlurView intensity={20} tint="dark" style={styles.infoCard}>
            <Text style={styles.cardTitle}>Sign In Required</Text>
            <Text style={styles.profileLabel}>Please sign in to view and edit your profile.</Text>
          </BlurView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  profileValue: {
    fontSize: 18,
    color: theme.textPrimary,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
    color: theme.textPrimary,
    backgroundColor: '#23243a',
  },
  profileButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  profileButton: {
    backgroundColor: theme.accent,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginLeft: 10,
    marginTop: 8,
  },
  profileButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: 'rgba(27, 29, 42, 0.7)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 