import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import partnerService, { PartnerConnection, PartnerNight, PartnerProfile } from '../services/partnerService';
import pushNotificationService from '../services/pushNotificationService';
import EmptyState from '../components/EmptyState';
import {
  ChevronLeft,
  BarChart3,
  Calendar,
  Lightbulb,
  TrendingUp,
  Moon,
  Dumbbell,
  Bed,
  Smartphone,
  Thermometer,
  VolumeX,
  Users,
  Bell,
  Share2,
} from 'lucide-react-native';

// ============================================================================
// Partner Mode (redesign/ui-ux-v3) — REAL connection/sync, not a visual mock
// ============================================================================
// Replaces the previous version's two manually-typed local profiles with a
// real two-account feature: invite-code pairing (partnerService), the
// partner's ACTUAL sleep_records pulled via a cross-partner RLS policy
// (not numbers you type in), and a real push notification for "Nudge"
// (pushNotificationService, via Expo's push HTTP API — distinct from
// notificationService's LOCAL-only scheduleNotificationAsync, which cannot
// reach another device).
//
// Requires supabase_tables.sql's partner_connections table + the
// cross-partner sleep_records SELECT policy to be run in the user's own
// Supabase project first.
// ============================================================================

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function hoursFromSeconds(seconds: number | null): number {
  return seconds ? seconds / 3600 : 0;
}

export default function PartnerModeScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const s = useMemo(() => styles(theme), [theme]);

  const [isLoading, setIsLoading] = useState(true);
  const [connection, setConnection] = useState<PartnerConnection | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);
  const [myNights, setMyNights] = useState<PartnerNight[]>([]);
  const [partnerNights, setPartnerNights] = useState<PartnerNight[]>([]);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'history' | 'insights'>('overview');

  const loadConnection = useCallback(async () => {
    if (!user || user.id === 'guest') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const conn = await partnerService.getMyConnection(user.id);
    setConnection(conn);

    if (conn?.status === 'connected' && conn.partner_id) {
      const [profile, pNights, mNights] = await Promise.all([
        partnerService.getPartnerProfile(conn.partner_id),
        partnerService.getPartnerNights(conn.partner_id),
        partnerService.getMyNights(user.id),
      ]);
      setPartnerProfile(profile);
      setPartnerNights(pNights);
      setMyNights(mNights);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  const handleCreateInvite = async () => {
    if (!user) return;
    setIsCreatingInvite(true);
    const invite = await partnerService.createInvite(user.id);
    setIsCreatingInvite(false);
    if (!invite) {
      Alert.alert('Error', 'Could not create an invite code. Please try again.');
      return;
    }
    setConnection(invite);
  };

  const handleShareInvite = () => {
    if (!connection?.invite_code) return;
    Share.share({
      message: `Connect with me on Sleep Architect so we can compare our sleep! Open the app, go to Partner Mode, and enter this code: ${connection.invite_code}`,
    }).catch(() => {});
  };

  const handleRedeem = async () => {
    if (!user || !redeemCode.trim()) return;
    setIsRedeeming(true);
    const result = await partnerService.redeemInvite(user.id, redeemCode.trim());
    setIsRedeeming(false);
    if (!result.success) {
      Alert.alert('Could not connect', result.error || 'Please check the code and try again.');
      return;
    }
    setRedeemCode('');
    await loadConnection();
  };

  const handleDisconnect = () => {
    if (!user) return;
    Alert.alert('Disconnect?', 'This will remove your partner connection. You can reconnect later with a new code.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          await partnerService.disconnect(user.id);
          setConnection(null);
          setPartnerProfile(null);
          setPartnerNights([]);
          setMyNights([]);
        },
      },
    ]);
  };

  const handleNudge = async () => {
    if (!connection?.partner_id) return;
    setIsNudging(true);
    const myName = (await partnerService.getPartnerProfile(user?.id || '')).full_name ?? 'Your partner';
    const result = await pushNotificationService.sendPushToUser(
      connection.partner_id,
      'A little nudge 💤',
      `${myName} thinks it might be time for bed.`,
      { type: 'partner_nudge' }
    );
    setIsNudging(false);
    if (!result.success) {
      Alert.alert('Could not send nudge', result.error || "Your partner may not have notifications enabled.");
    } else {
      Alert.alert('Nudge sent', `We let ${partnerProfile?.full_name || 'your partner'} know.`);
    }
  };

  const partnerName = partnerProfile?.full_name || 'Your partner';

  const myAvgHours = average(myNights.map((n) => hoursFromSeconds(n.duration)));
  const partnerAvgHours = average(partnerNights.map((n) => hoursFromSeconds(n.duration)));
  const myAvgScore = average(myNights.map((n) => n.sleep_score || 0));
  const partnerAvgScore = average(partnerNights.map((n) => n.sleep_score || 0));
  const myLast = myNights[0];
  const partnerLast = partnerNights[0];

  const getWinner = () => {
    if (myAvgScore > partnerAvgScore) return 'You';
    if (partnerAvgScore > myAvgScore) return partnerName;
    return 'Tie';
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, s.centered]} edges={['top']}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  // Not connected yet — invite/redeem flow.
  if (!connection || connection.status !== 'connected') {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} activeOpacity={0.8}>
            <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Partner mode</Text>
            <Text style={s.subtitle}>Connect to compare sleep together</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.connectCard}>
            <View style={s.connectIconCircle}>
              <Users size={28} color={theme.colors.accent} strokeWidth={2} />
            </View>
            <Text style={s.connectTitle}>Not connected yet</Text>
            <Text style={s.connectBody}>
              Share an invite code with your partner, or enter theirs, to see both your nights side by side.
            </Text>

            {connection?.status === 'pending' ? (
              <View style={s.codeDisplay}>
                <Text style={s.codeLabel}>Your invite code</Text>
                <Text style={s.codeValue}>{connection.invite_code}</Text>
                <TouchableOpacity style={s.shareButton} onPress={handleShareInvite} activeOpacity={0.85}>
                  <Share2 size={16} color={theme.colors.ctaText} strokeWidth={2.2} />
                  <Text style={s.shareButtonText}>Share code</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={s.primaryButton}
                onPress={handleCreateInvite}
                disabled={isCreatingInvite}
                activeOpacity={0.85}
              >
                {isCreatingInvite ? (
                  <ActivityIndicator color={theme.colors.ctaText} />
                ) : (
                  <Text style={s.primaryButtonText}>Create an invite code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={s.orDivider}>
            <View style={s.orLine} />
            <Text style={s.orText}>or</Text>
            <View style={s.orLine} />
          </View>

          <View style={s.redeemCard}>
            <Text style={s.redeemLabel}>Have a code from your partner?</Text>
            <TextInput
              style={s.redeemInput}
              value={redeemCode}
              onChangeText={setRedeemCode}
              placeholder="Enter code"
              placeholderTextColor={theme.colors.textTertiary}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[s.primaryButton, !redeemCode.trim() && s.primaryButtonDisabled]}
              onPress={handleRedeem}
              disabled={!redeemCode.trim() || isRedeeming}
              activeOpacity={0.85}
            >
              {isRedeeming ? (
                <ActivityIndicator color={theme.colors.ctaText} />
              ) : (
                <Text style={s.primaryButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Connected — real comparison views.
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton} activeOpacity={0.8}>
          <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Partner mode</Text>
          <Text style={s.subtitle}>Connected with {partnerName}</Text>
        </View>
        <TouchableOpacity onPress={handleNudge} style={s.nudgeButton} disabled={isNudging} activeOpacity={0.85}>
          {isNudging ? (
            <ActivityIndicator size="small" color={theme.colors.accent} />
          ) : (
            <Bell size={18} color={theme.colors.accent} strokeWidth={2.2} />
          )}
        </TouchableOpacity>
      </View>

      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, selectedView === 'overview' && s.tabActive]}
          onPress={() => setSelectedView('overview')}
          activeOpacity={0.85}
        >
          <BarChart3 size={16} color={selectedView === 'overview' ? theme.colors.textPrimary : theme.colors.textSecondary} strokeWidth={2.2} />
          <Text style={[s.tabText, selectedView === 'overview' && s.tabTextActive]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, selectedView === 'history' && s.tabActive]}
          onPress={() => setSelectedView('history')}
          activeOpacity={0.85}
        >
          <Calendar size={16} color={selectedView === 'history' ? theme.colors.textPrimary : theme.colors.textSecondary} strokeWidth={2.2} />
          <Text style={[s.tabText, selectedView === 'history' && s.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, selectedView === 'insights' && s.tabActive]}
          onPress={() => setSelectedView('insights')}
          activeOpacity={0.85}
        >
          <Lightbulb size={16} color={selectedView === 'insights' ? theme.colors.textPrimary : theme.colors.textSecondary} strokeWidth={2.2} />
          <Text style={[s.tabText, selectedView === 'insights' && s.tabTextActive]}>Insights</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {selectedView === 'overview' && (
          myNights.length === 0 && partnerNights.length === 0 ? (
            <EmptyState
              title="No nights tracked yet"
              description="Once you and your partner track a few nights of sleep, you'll see them compared here."
            />
          ) : (
            <>
              <View style={s.card}>
                <Text style={s.cardTitle}>Last night</Text>
                <View style={s.comparisonGridRow}>
                  <Text style={s.comparisonGridLabel}> </Text>
                  <Text style={s.comparisonGridHeader}>You</Text>
                  <Text style={s.comparisonGridHeader}>{partnerName}</Text>
                </View>
                <View style={s.comparisonGridRow}>
                  <Text style={s.comparisonGridRowLabel}>Hours</Text>
                  <Text style={s.comparisonGridValue}>{myLast ? hoursFromSeconds(myLast.duration).toFixed(1) : '—'}h</Text>
                  <Text style={s.comparisonGridValue}>{partnerLast ? hoursFromSeconds(partnerLast.duration).toFixed(1) : '—'}h</Text>
                </View>
                <View style={[s.comparisonGridRow, { borderBottomWidth: 0 }]}>
                  <Text style={s.comparisonGridRowLabel}>Score</Text>
                  <Text style={s.comparisonGridValue}>{myLast?.sleep_score ?? '—'}</Text>
                  <Text style={s.comparisonGridValue}>{partnerLast?.sleep_score ?? '—'}</Text>
                </View>
                <View style={s.winnerBadge}>
                  <Text style={s.winnerText}>Better score last 7 nights: {getWinner()}</Text>
                </View>
              </View>

              <View style={s.statsRow}>
                <View style={s.statCard}>
                  <Text style={s.statCardLabel}>Your avg</Text>
                  <Text style={s.statCardValue}>{myAvgHours.toFixed(1)}h</Text>
                  <Text style={s.statCardSub}>{Math.round(myAvgScore)} score</Text>
                </View>
                <View style={s.statCard}>
                  <Text style={s.statCardLabel}>{partnerName}'s avg</Text>
                  <Text style={s.statCardValue}>{partnerAvgHours.toFixed(1)}h</Text>
                  <Text style={s.statCardSub}>{Math.round(partnerAvgScore)} score</Text>
                </View>
              </View>
            </>
          )
        )}

        {selectedView === 'history' && (
          <View>
            <Text style={s.sectionLabel}>Recent nights</Text>
            {myNights.length === 0 && partnerNights.length === 0 ? (
              <EmptyState title="No history yet" description="Nights will appear here once you both start tracking." />
            ) : (
              <View style={s.card}>
                {Array.from({ length: Math.max(myNights.length, partnerNights.length) }).map((_, index) => {
                  const mine = myNights[index];
                  const theirs = partnerNights[index];
                  const dateLabel = mine?.start_time || theirs?.start_time;
                  return (
                    <View
                      key={index}
                      style={[s.historyRow, index === Math.max(myNights.length, partnerNights.length) - 1 && { borderBottomWidth: 0 }]}
                    >
                      <Text style={s.historyDate}>
                        {dateLabel ? new Date(dateLabel).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                      </Text>
                      <View style={s.historyValuesRow}>
                        <View style={s.historyPartnerCol}>
                          <Text style={s.historyName}>You</Text>
                          <Text style={s.historyHours}>{mine ? hoursFromSeconds(mine.duration).toFixed(1) : '—'}h</Text>
                          <Text style={s.historyQuality}>{mine?.sleep_score ?? '—'} score</Text>
                        </View>
                        <View style={s.historyDivider} />
                        <View style={s.historyPartnerCol}>
                          <Text style={s.historyName}>{partnerName}</Text>
                          <Text style={s.historyHours}>{theirs ? hoursFromSeconds(theirs.duration).toFixed(1) : '—'}h</Text>
                          <Text style={s.historyQuality}>{theirs?.sleep_score ?? '—'} score</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {selectedView === 'insights' && (
          <View>
            {myNights.length >= 3 && partnerNights.length >= 3 ? (
              <>
                <View style={s.insightCard}>
                  <View style={s.insightIconCircle}>
                    <TrendingUp size={18} color={theme.colors.success} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>Sleep trends</Text>
                    <Text style={s.insightText}>You average {myAvgHours.toFixed(1)} hours per night</Text>
                    <Text style={s.insightText}>{partnerName} averages {partnerAvgHours.toFixed(1)} hours per night</Text>
                    <Text style={[s.insightText, { marginBottom: 0 }]}>
                      Difference: {Math.abs(myAvgHours - partnerAvgHours).toFixed(1)} hours
                    </Text>
                  </View>
                </View>

                <View style={s.insightCard}>
                  <View style={s.insightIconCircle}>
                    <Moon size={18} color={theme.colors.accent} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.insightTitle}>Sleep quality</Text>
                    <Text style={s.insightText}>
                      You: {Math.round(myAvgScore)} ({myAvgScore >= 80 ? 'Excellent' : myAvgScore >= 70 ? 'Good' : 'Needs improvement'})
                    </Text>
                    <Text style={[s.insightText, { marginBottom: 0 }]}>
                      {partnerName}: {Math.round(partnerAvgScore)} ({partnerAvgScore >= 80 ? 'Excellent' : partnerAvgScore >= 70 ? 'Good' : 'Needs improvement'})
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <EmptyState
                title="Not enough data yet"
                description="Track at least 3 nights each to unlock sleep insights for you both."
              />
            )}

            <View style={s.card}>
              <Text style={s.cardTitle}>Couple's sleep tips</Text>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <Bed size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Go to bed at the same time to sync sleep schedules</Text>
              </View>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <Smartphone size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Create a phone-free bedroom policy 30 minutes before sleep</Text>
              </View>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <Thermometer size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Find a comfortable room temperature (16-19°C)</Text>
              </View>
              <View style={s.tipRow}>
                <View style={s.tipIconCircle}>
                  <VolumeX size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Use white noise or earplugs if your partner snores</Text>
              </View>
              <View style={[s.tipRow, { marginBottom: 0 }]}>
                <View style={s.tipIconCircle}>
                  <Dumbbell size={16} color={theme.colors.accent} strokeWidth={2.2} />
                </View>
                <Text style={s.tipText}>Exercise together but not within 3 hours of bedtime</Text>
              </View>
            </View>

            <TouchableOpacity style={s.disconnectButton} onPress={handleDisconnect} activeOpacity={0.7}>
              <Text style={s.disconnectText}>Disconnect from {partnerName}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      paddingHorizontal: 20,
      marginBottom: 14,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nudgeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 24,
      letterSpacing: -0.3,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    connectCard: {
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 24,
      rowGap: 12,
    },
    connectIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    connectTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 20,
      color: theme.colors.textPrimary,
    },
    connectBody: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    codeDisplay: {
      width: '100%',
      alignItems: 'center',
      rowGap: 10,
      marginTop: 8,
    },
    codeLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    codeValue: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 36,
      letterSpacing: 4,
      color: theme.colors.accent,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
      height: 48,
      paddingHorizontal: 20,
      borderRadius: 16,
      backgroundColor: theme.colors.ctaBackground,
    },
    shareButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.ctaText,
    },
    primaryButton: {
      width: '100%',
      height: 52,
      borderRadius: 16,
      backgroundColor: theme.colors.ctaBackground,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.ctaText,
    },
    orDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
      marginVertical: 18,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.cardBorder,
    },
    orText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    redeemCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 20,
      rowGap: 12,
    },
    redeemLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    redeemInput: {
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.backgroundSecondary,
      paddingHorizontal: 16,
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 20,
      letterSpacing: 2,
      textAlign: 'center',
      color: theme.colors.textPrimary,
    },
    tabBar: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 16,
      padding: 4,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      columnGap: 4,
    },
    tab: {
      flex: 1,
      height: 42,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      columnGap: 6,
    },
    tabActive: {
      backgroundColor: theme.colors.disabled,
    },
    tabText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textPrimary,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 18,
      marginBottom: 16,
    },
    cardTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 18,
      color: theme.colors.textPrimary,
      marginBottom: 14,
    },
    comparisonGridRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 44,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    comparisonGridLabel: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    comparisonGridHeader: {
      width: 72,
      textAlign: 'right',
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    comparisonGridRowLabel: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    comparisonGridValue: {
      width: 72,
      textAlign: 'right',
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    winnerBadge: {
      marginTop: 14,
      padding: 12,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
    },
    winnerText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.accent,
    },
    statsRow: {
      flexDirection: 'row',
      columnGap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 16,
      rowGap: 4,
    },
    statCardLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    statCardValue: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 28,
      color: theme.colors.textPrimary,
    },
    statCardSub: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    sectionLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
      marginBottom: 10,
    },
    historyRow: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },
    historyDate: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
      color: theme.colors.textPrimary,
      marginBottom: 10,
    },
    historyValuesRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    historyPartnerCol: {
      flex: 1,
      alignItems: 'center',
    },
    historyName: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginBottom: 4,
    },
    historyHours: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 22,
      color: theme.colors.accent,
      marginBottom: 2,
    },
    historyQuality: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    historyDivider: {
      width: 1,
      height: 40,
      backgroundColor: theme.colors.cardBorder,
      marginHorizontal: 16,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      padding: 16,
      marginBottom: 14,
    },
    insightIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    insightTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 16,
      color: theme.colors.textPrimary,
      marginBottom: 6,
    },
    insightText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 21,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      marginBottom: 14,
    },
    tipIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipText: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    disconnectButton: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    disconnectText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.danger,
    },
  });
