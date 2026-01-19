import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  Send,
  Lightbulb,
  CheckCircle2,
  Clock,
  ThumbsUp
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'reviewed' | 'planned' | 'completed';
  created_at: string;
  votes: number;
  user_id: string;
}

export default function FeatureRequestScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    if (!user || user.id === 'guest') {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRequests(data || []);
    } catch (error) {
      console.error('Error loading feature requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeatureRequest = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Information', 'Please provide both title and description for your feature request.');
      return;
    }

    if (user?.id === 'guest') {
      Alert.alert(
        'Sign In Required',
        'Please create an account to submit feature requests.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => navigation.navigate('Signup' as never) }
        ]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          status: 'pending',
          votes: 0,
        });

      if (error) throw error;

      Alert.alert(
        'Thank You! 🎉',
        'Your feature request has been submitted. We\'ll review it and get back to you!',
        [{ text: 'OK' }]
      );

      setTitle('');
      setDescription('');
      loadMyRequests();
    } catch (error) {
      console.error('Error submitting feature request:', error);
      Alert.alert('Error', 'Failed to submit feature request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#94A3B8';
      case 'reviewed': return '#3B82F6';
      case 'planned': return '#F59E0B';
      case 'completed': return '#10B981';
      default: return '#94A3B8';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={16} color={getStatusColor(status)} />;
      case 'reviewed': return <ThumbsUp size={16} color={getStatusColor(status)} />;
      case 'planned': return <Lightbulb size={16} color={getStatusColor(status)} />;
      case 'completed': return <CheckCircle2 size={16} color={getStatusColor(status)} />;
      default: return <Clock size={16} color={getStatusColor(status)} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Under Review';
      case 'reviewed': return 'Reviewed';
      case 'planned': return 'Planned';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles(theme).container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[theme.colors.background, theme.colors.card]}
        style={styles(theme).gradient}
      >
        {/* Header */}
        <View style={[styles(theme).header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles(theme).backButton}
          >
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles(theme).headerTitle}>Request a Feature</Text>
        </View>

        <ScrollView
          style={styles(theme).content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {/* Info Banner */}
          <BlurView intensity={20} tint="dark" style={styles(theme).infoBanner}>
            <Lightbulb size={24} color={theme.colors.accent} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles(theme).infoTitle}>Have an idea?</Text>
              <Text style={styles(theme).infoText}>
                Share your suggestions to help us improve the app!
              </Text>
            </View>
          </BlurView>

          {/* Request Form */}
          <BlurView intensity={20} tint="dark" style={styles(theme).card}>
            <Text style={styles(theme).cardTitle}>New Feature Request</Text>

            <Text style={styles(theme).label}>Title</Text>
            <TextInput
              style={styles(theme).input}
              placeholder="Brief title for your feature"
              placeholderTextColor={theme.colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <Text style={styles(theme).label}>Description</Text>
            <TextInput
              style={[styles(theme).input, styles(theme).textArea]}
              placeholder="Describe the feature you'd like to see..."
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles(theme).submitButton, isSubmitting && styles(theme).submitButtonDisabled]}
              onPress={submitFeatureRequest}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={isSubmitting ? ['#94A3B8', '#64748B'] : [theme.colors.accent, theme.colors.highlight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles(theme).submitButtonGradient}
              />
              <Send size={20} color={theme.colors.textPrimary} />
              <Text style={styles(theme).submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </BlurView>

          {/* My Requests */}
          {myRequests.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles(theme).card}>
              <Text style={styles(theme).cardTitle}>My Requests</Text>

              {myRequests.map((request) => (
                <View key={request.id} style={styles(theme).requestItem}>
                  <View style={styles(theme).requestHeader}>
                    <Text style={styles(theme).requestTitle} numberOfLines={1}>
                      {request.title}
                    </Text>
                    <View style={[styles(theme).statusBadge, { borderColor: getStatusColor(request.status) }]}>
                      {getStatusIcon(request.status)}
                      <Text style={[styles(theme).statusText, { color: getStatusColor(request.status) }]}>
                        {getStatusLabel(request.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles(theme).requestDescription} numberOfLines={2}>
                    {request.description}
                  </Text>
                  <Text style={styles(theme).requestDate}>
                    {new Date(request.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              ))}
            </BlurView>
          )}

          {/* Empty State */}
          {myRequests.length === 0 && !isLoading && user?.id !== 'guest' && (
            <BlurView intensity={20} tint="dark" style={styles(theme).emptyState}>
              <Lightbulb size={48} color={theme.colors.textSecondary} />
              <Text style={styles(theme).emptyStateTitle}>No requests yet</Text>
              <Text style={styles(theme).emptyStateText}>
                Submit your first feature request above!
              </Text>
            </BlurView>
          )}
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 8,
  },
  requestItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  requestDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  requestDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
  emptyState: {
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    overflow: 'hidden',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
