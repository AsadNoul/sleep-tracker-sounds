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
  ActivityIndicator,
} from 'react-native';
import {
  ChevronLeft,
  Lightbulb,
  CheckCircle2,
  Clock,
  ThumbsUp,
  Layout,
  Filter,
  MoreVertical,
  AlertCircle,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Canvas (`Ac-Feature.dc.html` / `D-Ac-Feature.dc.html`, "Request a feature"):
// no-chrome header with a back pill + Fraunces h1 "Suggest an idea", a single
// textarea prompt, a row of category pills, a solid CTA, and a "Popular
// ideas · vote for yours" card listing community requests with a vote count
// button. This screen keeps its real data shape (separate title/description
// fields, per-user "My Requests", and the admin moderation view) which the
// canvas doesn't cover — those sections are designed in the same system
// (Fraunces/DM Sans, card radii, theme tokens) rather than left old-styled.

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
  const s = styles(theme);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<FeatureRequest[]>([]);
  const [allRequests, setAllRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    checkAdmin();
    loadMyRequests();
  }, [user]);

  useEffect(() => {
    if (adminMode) {
      loadAllRequests();
    } else {
      loadMyRequests();
    }
  }, [adminMode, user]);

  const checkAdmin = () => {
    if (user?.email === 'admin@naulx.com' || user?.role === 'admin') {
      setIsAdmin(true);
      setAdminMode(true); // Default to admin mode if user is admin
    } else {
      setIsAdmin(false);
      setAdminMode(false);
    }
  };

  const loadAllRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllRequests(data || []);
    } catch (error) {
      console.error('Error loading all requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

    if (!user || user.id === 'guest') {
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

    const userId = user.id;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await supabase
        .from('feature_requests')
        .insert({
          user_id: userId,
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
      setSubmitError('Failed to submit your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.textTertiary;
      case 'reviewed': return theme.colors.highlight;
      case 'planned': return theme.colors.warning;
      case 'completed': return theme.colors.success;
      default: return theme.colors.textTertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock size={14} color={getStatusColor(status)} />;
      case 'reviewed': return <ThumbsUp size={14} color={getStatusColor(status)} />;
      case 'planned': return <Lightbulb size={14} color={getStatusColor(status)} />;
      case 'completed': return <CheckCircle2 size={14} color={getStatusColor(status)} />;
      default: return <Clock size={14} color={getStatusColor(status)} />;
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

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      Alert.alert('Success', `Status updated to ${newStatus}`);
      loadAllRequests();
      loadMyRequests();
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleStatusUpdatePress = (request: FeatureRequest) => {
    const statuses = ['pending', 'reviewed', 'planned', 'completed'];
    Alert.alert(
      'Update Status',
      'Select new status for this request:',
      statuses.map(st => ({
        text: getStatusLabel(st),
        onPress: () => updateRequestStatus(request.id, st)
      })).concat([{ text: 'Cancel', style: 'cancel' } as any])
    );
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          accessibilityLabel="Back"
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Suggest an idea</Text>
      </View>

      <ScrollView
        style={s.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Admin Toggle */}
        {isAdmin && (
          <TouchableOpacity
            style={s.adminToggle}
            onPress={() => setAdminMode(!adminMode)}
            activeOpacity={0.85}
          >
            <Layout size={18} color={theme.colors.ctaText} />
            <Text style={s.adminToggleText}>
              {adminMode ? 'Switch to User View' : 'Manager View (Admin)'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Request Form - Hide for Admin entirely */}
        {!isAdmin && !adminMode && (
          <View>
            <Text style={s.label}>What would help you sleep better?</Text>
            <TextInput
              style={s.input}
              placeholder="Brief title for your feature"
              placeholderTextColor={theme.colors.textTertiary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            <TextInput
              style={[s.input, s.textArea]}
              placeholder="I'd love it if the app could…"
              placeholderTextColor={theme.colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />

            <TouchableOpacity
              style={[s.submitButton, isSubmitting && s.submitButtonDisabled]}
              onPress={submitFeatureRequest}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={theme.colors.ctaText} />
              ) : (
                <Text style={s.submitButtonText}>Send idea</Text>
              )}
            </TouchableOpacity>

            {submitError && (
              <View style={s.errorBanner}>
                <AlertCircle size={16} color={theme.colors.danger} />
                <Text style={s.errorBannerText}>{submitError}</Text>
              </View>
            )}
          </View>
        )}

        {/* Admin List View */}
        {adminMode && (
          <View>
            <View style={s.adminHeader}>
              <Text style={s.sectionLabel}>All User Requests</Text>
              <TouchableOpacity
                onPress={() => {
                  const filters = ['all', 'pending', 'reviewed', 'planned', 'completed'];
                  Alert.alert(
                    'Filter by Status',
                    'Select status to filter:',
                    filters.map(f => ({
                      text: f.toUpperCase(),
                      onPress: () => setStatusFilter(f as 'all' | 'pending' | 'reviewed' | 'planned' | 'completed')
                    })).concat([{ text: 'Cancel', style: 'cancel' } as any])
                  );
                }}
                style={s.filterBtn}
                activeOpacity={0.8}
              >
                <Filter size={16} color={theme.colors.accent} />
                <Text style={s.filterBtnText}>
                  {statusFilter === 'all' ? 'Filter' : statusFilter}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={s.loadingBlock}>
                <ActivityIndicator size="small" color={theme.colors.accent} />
                <Text style={s.loadingText}>Loading requests…</Text>
              </View>
            ) : (
              <View style={s.listCard}>
                {allRequests
                  .filter(r => statusFilter === 'all' || r.status === statusFilter)
                  .map((request, index, arr) => (
                    <View
                      key={request.id}
                      style={[s.ideaRow, index < arr.length - 1 && s.ideaRowDivider]}
                    >
                      <View style={s.ideaRowText}>
                        <Text style={s.ideaName} numberOfLines={1}>{request.title}</Text>
                        <Text style={s.ideaDescription} numberOfLines={2}>{request.description}</Text>
                        <Text style={s.ideaMeta}>
                          User: {request.user_id.slice(0, 8)}… · {new Date(request.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[s.statusBadge, { borderColor: getStatusColor(request.status) }]}
                        onPress={() => handleStatusUpdatePress(request)}
                        activeOpacity={0.8}
                      >
                        {getStatusIcon(request.status)}
                        <Text style={[s.statusText, { color: getStatusColor(request.status) }]}>
                          {getStatusLabel(request.status)}
                        </Text>
                        <MoreVertical size={13} color={getStatusColor(request.status)} />
                      </TouchableOpacity>
                    </View>
                  ))}

                {allRequests.length === 0 && (
                  <Text style={s.emptyText}>No requests found.</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* My Requests Section - Only for Users */}
        {!isAdmin && !adminMode && myRequests.length > 0 && (
          <View style={s.ideasSection}>
            <Text style={s.sectionLabel}>My Requests</Text>
            <View style={s.listCard}>
              {myRequests.map((request, index, arr) => (
                <View
                  key={request.id}
                  style={[s.ideaRow, index < arr.length - 1 && s.ideaRowDivider]}
                >
                  <View style={s.ideaRowText}>
                    <Text style={s.ideaName} numberOfLines={1}>{request.title}</Text>
                    <Text style={s.ideaDescription} numberOfLines={2}>{request.description}</Text>
                    <Text style={s.ideaMeta}>
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <View style={[s.statusBadge, { borderColor: getStatusColor(request.status) }]}>
                    {getStatusIcon(request.status)}
                    <Text style={[s.statusText, { color: getStatusColor(request.status) }]}>
                      {getStatusLabel(request.status)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {!adminMode && myRequests.length === 0 && !isLoading && user?.id !== 'guest' && (
          <View style={s.emptyState}>
            <Lightbulb size={40} color={theme.colors.textTertiary} />
            <Text style={s.emptyStateTitle}>No requests yet</Text>
            <Text style={s.emptyStateText}>
              Submit your first feature request above!
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: theme.typography.fontFamily.displaySemibold,
    fontSize: 24,
    letterSpacing: -0.2,
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 110,
  },
  submitButton: {
    height: 56,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.ctaBackground,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 16,
    color: theme.colors.ctaText,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
    backgroundColor: theme.colors.cardOverlay,
    borderWidth: 1,
    borderColor: theme.colors.danger,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginTop: 12,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: theme.typography.fontFamily.bodyMedium,
    fontSize: 13,
    color: theme.colors.danger,
  },
  ideasSection: {
    marginTop: 24,
    rowGap: 8,
  },
  sectionLabel: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: theme.colors.textTertiary,
    marginBottom: 8,
  },
  listCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: 16,
  },
  ideaRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
    paddingVertical: 14,
  },
  ideaRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  ideaRowText: {
    flex: 1,
    rowGap: 2,
  },
  ideaName: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  ideaDescription: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  ideaMeta: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    fontSize: 12,
  },
  emptyState: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.card,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
    rowGap: 8,
  },
  emptyStateTitle: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  emptyStateText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  adminToggle: {
    borderRadius: theme.borderRadius.lg,
    paddingVertical: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    backgroundColor: theme.colors.ctaBackground,
  },
  adminToggleText: {
    fontFamily: theme.typography.fontFamily.bodyBold,
    color: theme.colors.ctaText,
    fontSize: 16,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
    backgroundColor: theme.colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.accentBorder,
  },
  filterBtnText: {
    fontFamily: theme.typography.fontFamily.bodySemibold,
    color: theme.colors.accent,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  loadingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: 14,
    color: theme.colors.textTertiary,
  },
  emptyText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 15,
  },
});
