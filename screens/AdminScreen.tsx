import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ChevronLeft,
  Users,
  TrendingUp,
  Database,
  Trash2,
  Search,
  Eye,
  Bell,
  Send,
  BarChart3,
  X,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import { useSafeBottomMargin } from '../hooks/useSafeBottomMargin';
import { supabase } from '../lib/supabase';

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
  subscription_status: 'free' | 'premium_monthly' | 'premium_yearly' | string;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  created_at: string;
  total_sleep_sessions: number;
  last_active: string | null;
  country?: string | null;
  signup_method?: 'email' | 'google' | 'apple' | null;
  expo_push_token?: string | null;
}

interface Stats {
  total_users: number;
  premium_users: number;
  total_sessions: number;
  total_events: number;
  active_today: number;
  new_users_today: number;
  push_enabled_users: number;
}

export default function AdminScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomMargin = useSafeBottomMargin();
  const navigation = useNavigation();
  const s = useMemo(() => styles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [timeField, setTimeField] = useState<'last_active' | 'created_at'>('last_active');
  const [timeRange, setTimeRange] = useState<'all' | '24h' | '7d' | '30d' | 'never'>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'premium' | 'free' | 'expired'>('all');
  const [sortBy, setSortBy] = useState<'recent_active' | 'newest'>('recent_active');
  const [countryFilter, setCountryFilter] = useState<string>('all');
  const [countries, setCountries] = useState<string[]>([]);
  const [signupMethodFilter, setSignupMethodFilter] = useState<'all' | 'email' | 'google' | 'apple'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'heatmap'>('users');

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total_users: 0,
    premium_users: 0,
    total_sessions: 0,
    total_events: 0,
    active_today: 0,
    new_users_today: 0,
    push_enabled_users: 0,
  });
  const [heatmapData, setHeatmapData] = useState<{
    hourly: { hour: string; percentage: number }[];
    daily: { day: string; percentage: number }[];
    topSounds: { name: string; count: number }[];
  }>({ hourly: [], daily: [], topSounds: [] });

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users, timeField, timeRange, subscriptionFilter, sortBy, countryFilter, signupMethodFilter]);

  const isPremiumStatus = useCallback((status: string) => {
    return status === 'premium_monthly' || status === 'premium_yearly';
  }, []);

  const isExpiredPremium = useCallback((user: UserData) => {
    if (!isPremiumStatus(user.subscription_status)) return false;
    if (!user.subscription_end_date) return false;
    const endTime = new Date(user.subscription_end_date).getTime();
    if (!Number.isFinite(endTime)) return false;
    return endTime < Date.now();
  }, [isPremiumStatus]);

  const formatRelativeTime = useCallback((iso: string | null) => {
    if (!iso) return 'Never';
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return 'Unknown';
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  }, []);

  const getSubscriptionLabel = useCallback((user: UserData) => {
    if (user.subscription_status === 'free') return 'Free';
    if (isExpiredPremium(user)) return 'Expired';
    if (user.subscription_status === 'premium_monthly') return 'Premium (Monthly)';
    if (user.subscription_status === 'premium_yearly') return 'Premium (Yearly)';
    return user.subscription_status;
  }, [isExpiredPremium]);

  const getCountryName = (countryCode: string | null | undefined): string => {
    if (!countryCode || countryCode.length !== 2) return 'Unknown';
    const names: Record<string, string> = {
      US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
      IN: 'India', DE: 'Germany', FR: 'France', JP: 'Japan', CN: 'China',
      BR: 'Brazil', MX: 'Mexico', ES: 'Spain', IT: 'Italy', NL: 'Netherlands',
      SE: 'Sweden', NO: 'Norway', DK: 'Denmark', FI: 'Finland', PL: 'Poland',
      RU: 'Russia', TR: 'Turkey', SA: 'Saudi Arabia', AE: 'UAE', SG: 'Singapore',
      MY: 'Malaysia', TH: 'Thailand', VN: 'Vietnam', PH: 'Philippines', ID: 'Indonesia',
      KR: 'South Korea', TW: 'Taiwan', HK: 'Hong Kong', NZ: 'New Zealand',
    };
    return names[countryCode.toUpperCase()] || countryCode.toUpperCase();
  };

  const flagEmoji = (countryCode: string) =>
    String.fromCodePoint(...[...countryCode.toUpperCase()].map((c) => 0x1F1E6 - 65 + c.charCodeAt(0)));

  const filterUsers = () => {
    const query = searchQuery.trim().toLowerCase();

    const now = Date.now();
    const rangeMs =
      timeRange === '24h' ? 24 * 60 * 60 * 1000 :
      timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 :
      timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000 :
      null;

    const filtered = users
      .filter((user) => {
        if (query) {
          const matchesSearch =
            user.email?.toLowerCase().includes(query) ||
            user.full_name?.toLowerCase().includes(query) ||
            user.id.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }

        if (subscriptionFilter !== 'all') {
          const premium = isPremiumStatus(user.subscription_status);
          const expired = isExpiredPremium(user);
          if (subscriptionFilter === 'premium' && (!premium || expired)) return false;
          if (subscriptionFilter === 'free' && user.subscription_status !== 'free') return false;
          if (subscriptionFilter === 'expired' && !expired) return false;
        }

        if (countryFilter !== 'all' && user.country !== countryFilter) {
          return false;
        }

        if (signupMethodFilter !== 'all' && user.signup_method !== signupMethodFilter) {
          return false;
        }

        if (timeRange !== 'all') {
          const dateIso = timeField === 'created_at' ? user.created_at : user.last_active;
          if (timeRange === 'never') {
            if (timeField === 'created_at') return false;
            return !dateIso;
          }
          if (!dateIso || !rangeMs) return false;
          const t = new Date(dateIso).getTime();
          if (!Number.isFinite(t)) return false;
          return now - t <= rangeMs;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        const aT = a.last_active ? new Date(a.last_active).getTime() : 0;
        const bT = b.last_active ? new Date(b.last_active).getTime() : 0;
        return bT - aT;
      });

    setFilteredUsers(filtered);
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);

      // Load users with sleep session counts
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, subscription_status, subscription_start_date, subscription_end_date, created_at, country, signup_method, expo_push_token')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      // Get sleep session counts for each user
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: lastRows, count } = await supabase
            .from('sleep_records')
            .select('created_at', { count: 'exact' })
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...user,
            total_sleep_sessions: count || 0,
            last_active: lastRows?.[0]?.created_at || null,
          };
        })
      );

      setUsers(usersWithStats);

      // Extract unique countries for filter
      const uniqueCountries = [...new Set(
        usersWithStats
          .map(u => u.country)
          .filter(c => c && c.length === 2)
      )].sort();
      setCountries(uniqueCountries as string[]);

      // Load statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        { count: totalUsers },
        { count: premiumUsers },
        { count: totalSessions },
        { count: totalEvents },
        { count: activeToday },
        { count: newUsersToday },
        { count: pushEnabledUsers },
      ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .in('subscription_status', ['premium_monthly', 'premium_yearly']),
        supabase.from('sleep_records').select('*', { count: 'exact', head: true }),
        supabase.from('analytics_events').select('*', { count: 'exact', head: true }),
        supabase
          .from('analytics_events')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        supabase
          .from('user_profiles')
          .select('*', { count: 'exact', head: true })
          .not('expo_push_token', 'is', null),
      ]);

      setStats({
        total_users: totalUsers || 0,
        premium_users: premiumUsers || 0,
        total_sessions: totalSessions || 0,
        total_events: totalEvents || 0,
        active_today: activeToday || 0,
        new_users_today: newUsersToday || 0,
        push_enabled_users: pushEnabledUsers || 0,
      });

      // Load heatmap data - hourly usage
      const { data: sleepRecords } = await supabase
        .from('sleep_records')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      // Calculate hourly distribution
      const hourCounts: { [key: string]: number } = {};
      const dayCounts: { [key: string]: number } = {};
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      sleepRecords?.forEach(record => {
        const date = new Date(record.created_at);
        const hour = date.getHours();
        const day = date.getDay();

        let period = '';
        if (hour >= 0 && hour < 6) period = 'Night (0-6)';
        else if (hour >= 6 && hour < 12) period = 'Morning (6-12)';
        else if (hour >= 12 && hour < 18) period = 'Afternoon (12-18)';
        else period = 'Evening (18-24)';

        hourCounts[period] = (hourCounts[period] || 0) + 1;
        dayCounts[dayNames[day]] = (dayCounts[dayNames[day]] || 0) + 1;
      });

      const totalRecords = sleepRecords?.length || 1;
      const hourlyData = Object.entries(hourCounts).map(([hour, count]) => ({
        hour,
        percentage: Math.round((count / totalRecords) * 100),
      }));

      const dailyData = dayNames.map(day => ({
        day,
        percentage: Math.round(((dayCounts[day] || 0) / totalRecords) * 100),
      }));

      // Load top sounds
      const { data: soundsData } = await supabase
        .from('sleep_records')
        .select('sound_played')
        .not('sound_played', 'is', null)
        .limit(500);

      const soundCounts: { [key: string]: number } = {};
      soundsData?.forEach(record => {
        if (record.sound_played) {
          soundCounts[record.sound_played] = (soundCounts[record.sound_played] || 0) + 1;
        }
      });

      const topSounds = Object.entries(soundCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

      setHeatmapData({ hourly: hourlyData, daily: dailyData, topSounds });
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const viewUserDetails = async (userId: string) => {
    try {
      const userInfo = users.find((u) => u.id === userId);

      Alert.alert(
        `User: ${userInfo?.email}`,
        `Total Sessions: ${userInfo?.total_sleep_sessions}\n` +
          `Subscription: ${userInfo?.subscription_status}\n` +
          `Last Active: ${
            userInfo?.last_active
              ? new Date(userInfo.last_active).toLocaleDateString()
              : 'Never'
          }`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const sendNotificationToAll = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      Alert.alert('Error', 'Please enter both title and message');
      return;
    }

    Alert.alert(
      'Send Notification',
      `Send to all ${users.length} users?\n\n"${notificationTitle}"\n${notificationMessage}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setSendingNotification(true);

              const { data: usersWithTokens } = await supabase
                .from('user_profiles')
                .select('expo_push_token')
                .not('expo_push_token', 'is', null);

              if (!usersWithTokens || usersWithTokens.length === 0) {
                Alert.alert('No Users', 'No users have push notifications enabled');
                return;
              }

              const tokens = usersWithTokens
                .map(u => u.expo_push_token)
                .filter(t => t && t.startsWith('ExponentPushToken'));

              const messages = tokens.map(token => ({
                to: token,
                sound: 'default',
                title: notificationTitle,
                body: notificationMessage,
                data: { source: 'admin' },
              }));

              const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
              });

              if (response.ok) {
                Alert.alert('Success', `Notification sent to ${tokens.length} users`);
                setNotificationTitle('');
                setNotificationMessage('');
              } else {
                throw new Error('Failed to send notifications');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setSendingNotification(false);
            }
          },
        },
      ]
    );
  };

  const deleteUser = async (userId: string, email: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to permanently delete ${email} and all their data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all([
                supabase.from('sleep_records').delete().eq('user_id', userId),
                supabase.from('sleep_insights').delete().eq('user_id', userId),
                supabase.from('analytics_events').delete().eq('user_id', userId),
                supabase.from('journal_entries').delete().eq('user_id', userId),
                supabase.from('user_settings').delete().eq('user_id', userId),
                supabase.from('user_profiles').delete().eq('id', userId),
              ]);

              Alert.alert('Success', 'User deleted successfully');
              loadAdminData();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const heatmapBarColor = (percentage: number, thresholds: [number, string][]) => {
    for (const [min, color] of thresholds) {
      if (percentage > min) return color;
    }
    return theme.colors.textTertiary;
  };

  if (loading) {
    return (
      <View style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
            <ChevronLeft size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Admin Dashboard</Text>
          <View style={s.backButton} />
        </View>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={s.loadingText}>Loading admin data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: theme.colors.background }]}>
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
          <ChevronLeft size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Admin Dashboard</Text>
        <View style={s.backButton} />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        numColumns={2}
        style={s.content}
        contentContainerStyle={[s.listContent, { paddingBottom: bottomMargin + 40 }]}
        columnWrapperStyle={s.userGridRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
        }
        ListHeaderComponent={
          <>
            {/* Stats Cards */}
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Users size={22} color={theme.colors.accent} />
                <Text style={s.statValue}>{stats.total_users}</Text>
                <Text style={s.statLabel}>Total Users</Text>
              </View>
              <View style={s.statCard}>
                <TrendingUp size={22} color={theme.colors.premium} />
                <Text style={s.statValue}>{stats.premium_users}</Text>
                <Text style={s.statLabel}>Premium</Text>
              </View>
              <View style={s.statCard}>
                <Database size={22} color={theme.colors.highlight} />
                <Text style={s.statValue}>{stats.total_sessions}</Text>
                <Text style={s.statLabel}>Sessions</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <BarChart3 size={22} color={theme.colors.success} />
                <Text style={s.statValue}>{stats.active_today}</Text>
                <Text style={s.statLabel}>Active Today</Text>
              </View>
              <View style={s.statCard}>
                <Users size={22} color={theme.colors.warning} />
                <Text style={s.statValue}>{stats.new_users_today}</Text>
                <Text style={s.statLabel}>New Today</Text>
              </View>
              <View style={s.statCard}>
                <Bell size={22} color={theme.colors.success} />
                <Text style={s.statValue}>{stats.push_enabled_users}</Text>
                <Text style={s.statLabel}>Push Enabled</Text>
              </View>
            </View>

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <TrendingUp size={22} color={theme.colors.accent} />
                <Text style={s.statValue}>
                  {stats.total_users > 0
                    ? ((stats.premium_users / stats.total_users) * 100).toFixed(1)
                    : '0'}%
                </Text>
                <Text style={s.statLabel}>Conversion</Text>
              </View>
              <View style={s.statCard}>
                <Bell size={22} color={theme.colors.accent} />
                <Text style={s.statValue}>
                  {stats.total_users > 0
                    ? ((stats.push_enabled_users / stats.total_users) * 100).toFixed(1)
                    : '0'}%
                </Text>
                <Text style={s.statLabel}>Push Rate</Text>
              </View>
              <View style={s.statCard}>
                <TrendingUp size={22} color={theme.colors.highlight} />
                <Text style={s.statValue}>
                  {stats.premium_users > 0 && stats.push_enabled_users > 0
                    ? ((stats.premium_users / stats.push_enabled_users)).toFixed(1)
                    : '0'}x
                </Text>
                <Text style={s.statLabel}>Premium Reach</Text>
              </View>
            </View>

            {/* Top Countries */}
            {countries.length > 0 && (
              <>
                <Text style={s.sectionTitle}>Top Countries ({countries.length})</Text>
                <View style={s.groupCard}>
                  {countries.slice(0, 8).map((country, index) => {
                    const count = users.filter(u => u.country === country).length;
                    const percentage = ((count / users.length) * 100).toFixed(1);
                    return (
                      <TouchableOpacity
                        key={country}
                        onPress={() => setCountryFilter(country)}
                        style={[s.countryRow, index < countries.slice(0, 8).length - 1 && s.rowDivider]}
                      >
                        <Text style={s.countryFlag}>{flagEmoji(country)}</Text>
                        <Text style={s.countryName}>{getCountryName(country)}</Text>
                        <View style={{ flex: 1 }} />
                        <Text style={s.countryCount}>{count}</Text>
                        <Text style={s.countryPercent}>({percentage}%)</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Tab Navigation */}
            <View style={s.tabContainer}>
              <TouchableOpacity
                onPress={() => setActiveTab('users')}
                style={[s.tab, activeTab === 'users' && s.tabActive]}
              >
                <Users size={16} color={activeTab === 'users' ? theme.colors.background : theme.colors.textSecondary} />
                <Text style={[s.tabText, activeTab === 'users' && s.tabTextActive]}>Users</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('analytics')}
                style={[s.tab, activeTab === 'analytics' && s.tabActive]}
              >
                <BarChart3 size={16} color={activeTab === 'analytics' ? theme.colors.background : theme.colors.textSecondary} />
                <Text style={[s.tabText, activeTab === 'analytics' && s.tabTextActive]}>Analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveTab('heatmap')}
                style={[s.tab, activeTab === 'heatmap' && s.tabActive]}
              >
                <TrendingUp size={16} color={activeTab === 'heatmap' ? theme.colors.background : theme.colors.textSecondary} />
                <Text style={[s.tabText, activeTab === 'heatmap' && s.tabTextActive]}>Heatmap</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'users' && (
              <>
                {/* Filter Toggle Button */}
                <TouchableOpacity
                  onPress={() => setShowFilters(!showFilters)}
                  style={s.filterToggle}
                  activeOpacity={0.85}
                >
                  <Search size={16} color={theme.colors.background} />
                  <Text style={s.filterToggleText}>
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Text>
                </TouchableOpacity>

                {/* Collapsible Filters */}
                {showFilters && (
                  <View style={s.filtersCard}>
                    <View style={s.filterRow}>
                      <Text style={s.filterLabel}>Signup Method</Text>
                      <View style={s.pillsRow}>
                        {(['all', 'email', 'google', 'apple'] as const).map((m) => (
                          <TouchableOpacity
                            key={m}
                            onPress={() => setSignupMethodFilter(m)}
                            style={[s.pill, signupMethodFilter === m && s.pillActive]}
                          >
                            <Text style={[s.pillText, signupMethodFilter === m && s.pillTextActive]}>
                              {m === 'all' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {countries.length > 0 && (
                      <View style={s.filterRow}>
                        <Text style={s.filterLabel}>Country</Text>
                        <View style={s.pillsRow}>
                          <TouchableOpacity
                            onPress={() => setCountryFilter('all')}
                            style={[s.pill, countryFilter === 'all' && s.pillActive]}
                          >
                            <Text style={[s.pillText, countryFilter === 'all' && s.pillTextActive]}>All</Text>
                          </TouchableOpacity>
                          {countries.slice(0, 6).map((c) => (
                            <TouchableOpacity
                              key={c}
                              onPress={() => setCountryFilter(c)}
                              style={[s.pill, countryFilter === c && s.pillActive]}
                            >
                              <Text style={[s.pillText, countryFilter === c && s.pillTextActive]}>
                                {flagEmoji(c)} {c}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={s.filterRow}>
                      <Text style={s.filterLabel}>Subscription</Text>
                      <View style={s.pillsRow}>
                        {(['all', 'premium', 'free', 'expired'] as const).map((f) => (
                          <TouchableOpacity
                            key={f}
                            onPress={() => setSubscriptionFilter(f)}
                            style={[s.pill, subscriptionFilter === f && s.pillActive]}
                          >
                            <Text style={[s.pillText, subscriptionFilter === f && s.pillTextActive]}>
                              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View style={[s.filterRow, { marginBottom: 0 }]}>
                      <Text style={s.filterLabel}>Time Range</Text>
                      <View style={s.pillsRow}>
                        {(['all', '24h', '7d', '30d'] as const).map((r) => (
                          <TouchableOpacity
                            key={r}
                            onPress={() => setTimeRange(r)}
                            style={[s.pill, timeRange === r && s.pillActive]}
                          >
                            <Text style={[s.pillText, timeRange === r && s.pillTextActive]}>
                              {r === 'all' ? 'All' : r}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* Search Bar */}
                <View style={s.searchContainer}>
                  <Search size={18} color={theme.colors.textTertiary} />
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search users by email or name..."
                    placeholderTextColor={theme.colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <X size={18} color={theme.colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={s.sectionTitle}>Users ({filteredUsers.length})</Text>
              </>
            )}

            {activeTab === 'analytics' && (
              <>
                <Text style={s.sectionTitle}>Analytics Dashboard</Text>
                <View style={s.infoCard}>
                  <Text style={s.infoCardTitle}>User Growth</Text>
                  <Text style={s.infoCardText}>New signups: {stats.new_users_today} today</Text>
                  <Text style={s.infoCardText}>Total users: {stats.total_users}</Text>
                  <Text style={s.infoCardText}>
                    Premium conversion: {stats.total_users > 0 ? ((stats.premium_users / stats.total_users) * 100).toFixed(1) : '0'}%
                  </Text>
                </View>

                <View style={s.infoCard}>
                  <Text style={s.infoCardTitle}>Revenue Insights</Text>
                  <Text style={s.infoCardText}>Premium users: {stats.premium_users}</Text>
                  <Text style={s.infoCardText}>Total sessions: {stats.total_sessions}</Text>
                  <Text style={s.infoCardText}>
                    Avg sessions/user: {stats.total_users > 0 ? (stats.total_sessions / stats.total_users).toFixed(1) : '0'}
                  </Text>
                </View>

                <View style={s.infoCard}>
                  <Text style={s.infoCardTitle}>Engagement Metrics</Text>
                  <Text style={s.infoCardText}>Active today: {stats.active_today}</Text>
                  <Text style={s.infoCardText}>
                    Activity rate: {stats.total_users > 0 ? ((stats.active_today / stats.total_users) * 100).toFixed(1) : '0'}%
                  </Text>
                </View>
              </>
            )}

            {activeTab === 'heatmap' && (
              <>
                <Text style={s.sectionTitle}>Usage Heatmap</Text>

                {heatmapData.hourly.length > 0 ? (
                  <>
                    <View style={s.infoCard}>
                      <Text style={s.infoCardTitle}>Peak Usage Times</Text>
                      {heatmapData.hourly.map((item) => {
                        const color = heatmapBarColor(item.percentage, [
                          [60, theme.colors.accent],
                          [40, theme.colors.success],
                          [20, theme.colors.warning],
                        ]);
                        return (
                          <View key={item.hour} style={s.heatmapRow}>
                            <Text style={s.heatmapLabel}>{item.hour}</Text>
                            <View style={s.heatmapBar}>
                              <View style={[s.heatmapFill, { width: `${item.percentage}%`, backgroundColor: color }]} />
                            </View>
                            <Text style={s.heatmapValue}>{item.percentage}%</Text>
                          </View>
                        );
                      })}
                    </View>

                    <View style={s.infoCard}>
                      <Text style={s.infoCardTitle}>Weekly Activity</Text>
                      {heatmapData.daily.map((item) => {
                        const color = heatmapBarColor(item.percentage, [
                          [20, theme.colors.success],
                          [12, theme.colors.warning],
                        ]);
                        return (
                          <View key={item.day} style={s.heatmapRow}>
                            <Text style={s.heatmapLabel}>{item.day}</Text>
                            <View style={s.heatmapBar}>
                              <View style={[s.heatmapFill, { width: `${item.percentage}%`, backgroundColor: color }]} />
                            </View>
                            <Text style={s.heatmapValue}>{item.percentage}%</Text>
                          </View>
                        );
                      })}
                    </View>

                    {heatmapData.topSounds.length > 0 && (
                      <View style={s.infoCard}>
                        <Text style={s.infoCardTitle}>Most Popular Sounds</Text>
                        {heatmapData.topSounds.map((sound, index) => (
                          <View key={sound.name} style={s.heatmapRow}>
                            <Text style={s.heatmapLabel}>{index + 1}. {sound.name}</Text>
                            <View style={{ flex: 1 }} />
                            <Text style={s.heatmapValue}>{sound.count} uses</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                ) : (
                  <View style={s.infoCard}>
                    <Text style={s.infoCardText}>No usage data available yet. Data will appear as users track sleep sessions.</Text>
                  </View>
                )}
              </>
            )}

            {/* Send Notification Section */}
            <Text style={s.sectionTitle}>Send Push Notification</Text>
            <View style={s.notificationCard}>
              <Bell size={22} color={theme.colors.accent} style={{ marginBottom: 12 }} />
              <TextInput
                style={s.notificationInput}
                placeholder="Notification Title"
                placeholderTextColor={theme.colors.textTertiary}
                value={notificationTitle}
                onChangeText={setNotificationTitle}
              />
              <TextInput
                style={[s.notificationInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Notification Message"
                placeholderTextColor={theme.colors.textTertiary}
                value={notificationMessage}
                onChangeText={setNotificationMessage}
                multiline
              />
              <TouchableOpacity
                style={[
                  s.sendButton,
                  (!notificationTitle || !notificationMessage || sendingNotification) &&
                    s.sendButtonDisabled,
                ]}
                onPress={sendNotificationToAll}
                disabled={!notificationTitle || !notificationMessage || sendingNotification}
                activeOpacity={0.85}
              >
                {sendingNotification ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <>
                    <Send size={18} color={theme.colors.background} />
                    <Text style={s.sendButtonText}>Send to All Users</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        }
        renderItem={({ item: user }) => {
          const premium = isPremiumStatus(user.subscription_status);
          const expired = isExpiredPremium(user);
          const signupIcon = user.signup_method === 'google' ? '🔵' : user.signup_method === 'apple' ? '' : '📧';
          return (
            <View style={s.userCard}>
              <View style={s.userInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 6, rowGap: 6 }}>
                  {user.country && <Text style={{ fontSize: 16 }}>{flagEmoji(user.country)}</Text>}
                  {signupIcon && <Text style={{ fontSize: 14 }}>{signupIcon}</Text>}
                  <Text style={s.userEmail} numberOfLines={1}>
                    {user.email || 'No email'}
                  </Text>
                </View>
                {user.full_name && (
                  <Text style={s.userName} numberOfLines={1}>
                    {user.full_name}
                  </Text>
                )}

                <View style={s.badgeRow}>
                  <View
                    style={[
                      s.badge,
                      premium ? s.badgePremium : s.badgeFree,
                      expired && s.badgeExpired,
                    ]}
                  >
                    <Text style={s.badgeText}>{getSubscriptionLabel(user)}</Text>
                  </View>
                </View>

                <View style={s.userMetaColumn}>
                  <Text style={s.metaText}>{user.total_sleep_sessions} sessions</Text>
                  <Text style={s.metaText}>Active: {formatRelativeTime(user.last_active)}</Text>
                  <Text style={s.metaText}>
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </Text>
                  {user.signup_method && (
                    <Text style={s.metaText}>
                      Via: {user.signup_method.charAt(0).toUpperCase() + user.signup_method.slice(1)}
                    </Text>
                  )}
                  {user.subscription_end_date && (
                    <Text style={s.metaText}>
                      Sub Ends: {new Date(user.subscription_end_date).toLocaleDateString()}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', rowGap: 6, columnGap: 6, marginTop: 4 }}>
                    <Bell size={12} color={user.expo_push_token ? theme.colors.success : theme.colors.danger} />
                    <Text style={[s.metaText, { color: user.expo_push_token ? theme.colors.success : theme.colors.danger }]}>
                      Notifications: {user.expo_push_token ? 'Enabled' : 'Disabled'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={s.userActions}>
                <TouchableOpacity style={s.actionButton} onPress={() => viewUserDetails(user.id)}>
                  <Eye size={16} color={theme.colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionButton, s.deleteButton]}
                  onPress={() => deleteUser(user.id, user.email)}
                >
                  <Trash2 size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={s.emptyText}>No users found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 15,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 20,
      color: theme.colors.textPrimary,
    },
    content: {
      flex: 1,
    },
    listContent: {
      paddingHorizontal: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.textSecondary,
    },

    statsRow: {
      flexDirection: 'row',
      rowGap: 12,
      columnGap: 12,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      padding: 14,
      borderRadius: theme.borderRadius.card,
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    statValue: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 20,
      color: theme.colors.textPrimary,
      marginTop: 8,
    },
    statLabel: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginTop: 4,
      textAlign: 'center',
    },

    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 10,
      height: 52,
      paddingHorizontal: 14,
      borderRadius: theme.borderRadius.card,
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    searchInput: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },

    sectionTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 13,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: theme.colors.textTertiary,
      marginTop: 12,
      marginBottom: 10,
    },

    groupCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.borderRadius.card,
      paddingHorizontal: 16,
      marginBottom: 8,
    },
    rowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
    },

    userCard: {
      flex: 1,
      padding: 14,
      borderRadius: theme.borderRadius.card,
      marginBottom: 12,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    userGridRow: {
      rowGap: 12,
      columnGap: 12,
    },
    userInfo: {
      flex: 1,
    },
    userEmail: {
      flexShrink: 1,
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 14,
      color: theme.colors.textPrimary,
    },
    userName: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },
    userMetaColumn: {
      marginTop: 10,
      rowGap: 4,
    },
    metaText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 12,
      color: theme.colors.textTertiary,
    },
    userActions: {
      flexDirection: 'row',
      columnGap: 8,
      marginTop: 12,
    },
    actionButton: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accentLight,
    },
    deleteButton: {
      backgroundColor: theme.colors.danger + '1F',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 15,
      color: theme.colors.textTertiary,
    },

    notificationCard: {
      padding: 18,
      borderRadius: theme.borderRadius.card,
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    filtersCard: {
      padding: 16,
      borderRadius: theme.borderRadius.card,
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    filterRow: {
      marginBottom: 14,
    },
    filterLabel: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textTertiary,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 8,
    },
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: 8,
      columnGap: 8,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.backgroundTertiary,
    },
    pillActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.selectedBackground,
    },
    pillText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.textSecondary,
      fontSize: 12,
    },
    pillTextActive: {
      color: theme.colors.textPrimary,
    },

    badgeRow: {
      flexDirection: 'row',
      marginTop: 8,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgePremium: {
      backgroundColor: theme.colors.premiumBadgeBackground,
      borderColor: theme.colors.premiumBadgeBorder,
    },
    badgeFree: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderColor: theme.colors.cardBorder,
    },
    badgeExpired: {
      backgroundColor: theme.colors.danger + '1F',
      borderColor: theme.colors.danger,
    },
    badgeText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textPrimary,
      fontSize: 11,
    },

    notificationInput: {
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      padding: 12,
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.textPrimary,
      fontSize: 14,
      marginBottom: 12,
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: 8,
      backgroundColor: theme.colors.accent,
      padding: 14,
      borderRadius: 14,
      marginTop: 8,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.background,
      fontSize: 15,
    },

    countryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      columnGap: 12,
    },
    countryFlag: {
      fontSize: 22,
    },
    countryName: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.textPrimary,
      fontSize: 14,
    },
    countryCount: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.accent,
      fontSize: 15,
    },
    countryPercent: {
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.textTertiary,
      fontSize: 12,
      minWidth: 50,
      textAlign: 'right',
    },

    tabContainer: {
      flexDirection: 'row',
      columnGap: 8,
      marginBottom: 16,
      marginTop: 4,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    tabActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    tabText: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.textSecondary,
      fontSize: 13,
    },
    tabTextActive: {
      color: theme.colors.background,
    },

    filterToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: 8,
      backgroundColor: theme.colors.accent,
      paddingVertical: 14,
      borderRadius: 14,
      marginBottom: 16,
    },
    filterToggleText: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.background,
      fontSize: 14,
    },

    infoCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.card,
      padding: 18,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    infoCardTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textPrimary,
      fontSize: 15,
      marginBottom: 12,
    },
    infoCardText: {
      fontFamily: theme.typography.fontFamily.body,
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginBottom: 6,
    },

    heatmapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      columnGap: 12,
    },
    heatmapLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      color: theme.colors.textSecondary,
      fontSize: 12,
      width: 100,
    },
    heatmapBar: {
      flex: 1,
      height: 8,
      backgroundColor: theme.colors.backgroundTertiary,
      borderRadius: 4,
      overflow: 'hidden',
    },
    heatmapFill: {
      height: '100%',
      borderRadius: 4,
    },
    heatmapValue: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      color: theme.colors.textPrimary,
      fontSize: 12,
      width: 50,
      textAlign: 'right',
    },
  });
