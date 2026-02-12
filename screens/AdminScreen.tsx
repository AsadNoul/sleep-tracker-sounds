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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  ChevronLeft,
  Users,
  TrendingUp,
  Database,
  Trash2,
  Search,
  Eye,
  Ban,
  Check,
  Bell,
  Send,
  BarChart3,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
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
}

interface Stats {
  total_users: number;
  premium_users: number;
  total_sessions: number;
  total_events: number;
  active_today: number;
  new_users_today: number;
}

export default function AdminScreen() {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
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
        .select('id, email, full_name, subscription_status, subscription_start_date, subscription_end_date, created_at, country, signup_method')
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
      ]);

      setStats({
        total_users: totalUsers || 0,
        premium_users: premiumUsers || 0,
        total_sessions: totalSessions || 0,
        total_events: totalEvents || 0,
        active_today: activeToday || 0,
        new_users_today: newUsersToday || 0,
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
        
        // Group into time periods
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
      const { data: sessions, error } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

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
              
              // Get all users with push tokens
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

              // Send notifications in batches
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
              // Delete all user data
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

  if (loading) {
    return (
      <View style={s.container}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.backgroundSecondary]}
          style={s.gradient}
        >
          <View style={[s.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
              <ChevronLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.headerTitle}>Admin Dashboard</Text>
            <View style={s.backButton} />
          </View>
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text style={s.loadingText}>Loading admin data...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.backgroundSecondary]}
        style={s.gradient}
      >
        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
            <ChevronLeft size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Admin Dashboard</Text>
          <View style={s.backButton} />
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          numColumns={2}
          style={s.content}
          contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 100 }]}
          columnWrapperStyle={s.userGridRow}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.accent} />
          }
          ListHeaderComponent={
            <>
              {/* Stats Cards */}
              <View style={s.statsRow}>
                <BlurView intensity={20} tint="dark" style={s.statCard}>
                  <Users size={24} color={theme.colors.accent} />
                  <Text style={s.statValue}>{stats.total_users}</Text>
                  <Text style={s.statLabel}>Total Users</Text>
                </BlurView>

                <BlurView intensity={20} tint="dark" style={s.statCard}>
                  <TrendingUp size={24} color={theme.colors.premium} />
                  <Text style={s.statValue}>{stats.premium_users}</Text>
                  <Text style={s.statLabel}>Premium</Text>
                </BlurView>

                <BlurView intensity={20} tint="dark" style={s.statCard}>
                  <Database size={24} color={theme.colors.highlight} />
                  <Text style={s.statValue}>{stats.total_sessions}</Text>
                  <Text style={s.statLabel}>Sessions</Text>
                </BlurView>
              </View>

              <View style={s.statsRow}>
                <BlurView intensity={20} tint="dark" style={s.statCard}>
                  <BarChart3 size={24} color="#10B981" />
                  <Text style={s.statValue}>{stats.active_today}</Text>
                  <Text style={s.statLabel}>Active Today</Text>
                </BlurView>

                <BlurView intensity={20} tint="dark" style={s.statCard}>
                  <Users size={24} color="#F59E0B" />
                  <Text style={s.statValue}>{stats.new_users_today}</Text>
                  <Text style={s.statLabel}>New Today</Text>
                </BlurView>

                <BlurView intensity={20} tint="dark" style={s.statCard}>
                  <TrendingUp size={24} color="#8B5CF6" />
                  <Text style={s.statValue}>
                    {stats.total_users > 0
                      ? ((stats.premium_users / stats.total_users) * 100).toFixed(1)
                      : '0'}%
                  </Text>
                  <Text style={s.statLabel}>Conversion</Text>
                </BlurView>
              </View>

              {/* Top Countries */}
              {countries.length > 0 && (
                <>
                  <Text style={s.sectionTitle}>Top Countries ({countries.length})</Text>
                  <BlurView intensity={20} tint="dark" style={s.countriesCard}>
                    {countries.slice(0, 8).map((country) => {
                      const count = users.filter(u => u.country === country).length;
                      const percentage = ((count / users.length) * 100).toFixed(1);
                      return (
                        <TouchableOpacity
                          key={country}
                          onPress={() => setCountryFilter(country)}
                          style={s.countryRow}
                        >
                          <Text style={s.countryFlag}>
                            {String.fromCodePoint(...[...country.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))}
                          </Text>
                          <Text style={s.countryName}>{getCountryName(country)}</Text>
                          <View style={{ flex: 1 }} />
                          <Text style={s.countryCount}>{count}</Text>
                          <Text style={s.countryPercent}>({percentage}%)</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </BlurView>
                </>
              )}

              {/* Tab Navigation */}
              <View style={s.tabContainer}>
                <TouchableOpacity
                  onPress={() => setActiveTab('users')}
                  style={[s.tab, activeTab === 'users' && s.tabActive]}
                >
                  <Users size={18} color={activeTab === 'users' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[s.tabText, activeTab === 'users' && s.tabTextActive]}>Users</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('analytics')}
                  style={[s.tab, activeTab === 'analytics' && s.tabActive]}
                >
                  <BarChart3 size={18} color={activeTab === 'analytics' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[s.tabText, activeTab === 'analytics' && s.tabTextActive]}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab('heatmap')}
                  style={[s.tab, activeTab === 'heatmap' && s.tabActive]}
                >
                  <TrendingUp size={18} color={activeTab === 'heatmap' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[s.tabText, activeTab === 'heatmap' && s.tabTextActive]}>Heatmap</Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'users' && (
                <>
                  {/* Filter Toggle Button */}
                  <TouchableOpacity
                    onPress={() => setShowFilters(!showFilters)}
                    style={s.filterToggle}
                  >
                    <Search size={18} color="#FFFFFF" />
                    <Text style={s.filterToggleText}>
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Text>
                  </TouchableOpacity>

                  {/* Collapsible Filters */}
                  {showFilters && (
                    <BlurView intensity={20} tint="dark" style={s.filtersCard}>
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
                                  {String.fromCodePoint(...[...c.toUpperCase()].map(ch => 0x1F1E6 - 65 + ch.charCodeAt(0)))} {c}
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

                      <View style={s.filterRow}>
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
                    </BlurView>
                  )}

                  <Text style={s.sectionTitle}>Users ({filteredUsers.length})</Text>
                </>
              )}

              {activeTab === 'analytics' && (
                <>
                  <Text style={s.sectionTitle}>Analytics Dashboard</Text>
                  <BlurView intensity={20} tint="dark" style={s.analyticsCard}>
                    <Text style={s.analyticsTitle}>📈 User Growth (Last 7 Days)</Text>
                    <Text style={s.analyticsText}>New signups: {stats.new_users_today} today</Text>
                    <Text style={s.analyticsText}>Total users: {stats.total_users}</Text>
                    <Text style={s.analyticsText}>Premium conversion: {stats.total_users > 0 ? ((stats.premium_users / stats.total_users) * 100).toFixed(1) : '0'}%</Text>
                  </BlurView>

                  <BlurView intensity={20} tint="dark" style={s.analyticsCard}>
                    <Text style={s.analyticsTitle}>💰 Revenue Insights</Text>
                    <Text style={s.analyticsText}>Premium users: {stats.premium_users}</Text>
                    <Text style={s.analyticsText}>Total sessions: {stats.total_sessions}</Text>
                    <Text style={s.analyticsText}>Avg sessions/user: {stats.total_users > 0 ? (stats.total_sessions / stats.total_users).toFixed(1) : '0'}</Text>
                  </BlurView>

                  <BlurView intensity={20} tint="dark" style={s.analyticsCard}>
                    <Text style={s.analyticsTitle}>🎯 Engagement Metrics</Text>
                    <Text style={s.analyticsText}>Active today: {stats.active_today}</Text>
                    <Text style={s.analyticsText}>Activity rate: {stats.total_users > 0 ? ((stats.active_today / stats.total_users) * 100).toFixed(1) : '0'}%</Text>
                  </BlurView>
                </>
              )}

              {activeTab === 'heatmap' && (
                <>
                  <Text style={s.sectionTitle}>Usage Heatmap</Text>
                  
                  {heatmapData.hourly.length > 0 ? (
                    <>
                      <BlurView intensity={20} tint="dark" style={s.heatmapCard}>
                        <Text style={s.heatmapTitle}>🕐 Peak Usage Times</Text>
                        {heatmapData.hourly.map((item) => {
                          const color = item.percentage > 60 ? '#8B5CF6' : item.percentage > 40 ? '#10B981' : item.percentage > 20 ? '#F59E0B' : '#3B82F6';
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
                      </BlurView>

                      <BlurView intensity={20} tint="dark" style={s.heatmapCard}>
                        <Text style={s.heatmapTitle}>📅 Weekly Activity</Text>
                        {heatmapData.daily.map((item) => {
                          const color = item.percentage > 20 ? '#10B981' : item.percentage > 12 ? '#F59E0B' : '#EF4444';
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
                      </BlurView>

                      {heatmapData.topSounds.length > 0 && (
                        <BlurView intensity={20} tint="dark" style={s.heatmapCard}>
                          <Text style={s.heatmapTitle}>🎵 Most Popular Sounds</Text>
                          {heatmapData.topSounds.map((sound, index) => (
                            <View key={sound.name} style={s.heatmapRow}>
                              <Text style={s.heatmapLabel}>{index + 1}. {sound.name}</Text>
                              <View style={{ flex: 1 }} />
                              <Text style={s.heatmapValue}>{sound.count} uses</Text>
                            </View>
                          ))}
                        </BlurView>
                      )}
                    </>
                  ) : (
                    <BlurView intensity={20} tint="dark" style={s.heatmapCard}>
                      <Text style={s.analyticsText}>📊 No usage data available yet. Data will appear as users track sleep sessions.</Text>
                    </BlurView>
                  )}
                </>
              )}

              {/* Send Notification Section */}
              <Text style={s.sectionTitle}>Send Push Notification</Text>
              <BlurView intensity={20} tint="dark" style={s.notificationCard}>
                <Bell size={24} color={theme.colors.accent} style={{ marginBottom: 12 }} />
                <TextInput
                  style={s.notificationInput}
                  placeholder="Notification Title"
                  placeholderTextColor="#A0AEC0"
                  value={notificationTitle}
                  onChangeText={setNotificationTitle}
                />
                <TextInput
                  style={[s.notificationInput, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Notification Message"
                  placeholderTextColor="#A0AEC0"
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
                >
                  {sendingNotification ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Send size={20} color="#FFF" />
                      <Text style={s.sendButtonText}>Send to All Users</Text>
                    </>
                  )}
                </TouchableOpacity>
              </BlurView>

              {/* Search Bar */}
              <BlurView intensity={20} tint="dark" style={s.searchContainer}>
                <Search size={20} color="#A0AEC0" />
                <TextInput
                  style={s.searchInput}
                  placeholder="Search users by email or name..."
                  placeholderTextColor="#A0AEC0"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </BlurView>
            </>
          }
          renderItem={({ item: user }) => {
            const premium = isPremiumStatus(user.subscription_status);
            const expired = isExpiredPremium(user);
            const signupIcon = user.signup_method === 'google' ? '🔵' : user.signup_method === 'apple' ? '' : '📧';
            return (
              <BlurView intensity={20} tint="dark" style={s.userCard}>
                <View style={s.userInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {user.country && (
                      <Text style={{ fontSize: 16 }}>
                        {String.fromCodePoint(...[...user.country.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))}
                      </Text>
                    )}
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
                  </View>
                </View>

                <View style={s.userActions}>
                  <TouchableOpacity style={s.actionButton} onPress={() => viewUserDetails(user.id)}>
                    <Eye size={18} color={theme.colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionButton, s.deleteButton]}
                    onPress={() => deleteUser(user.id, user.email)}
                  >
                    <Trash2 size={18} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </BlurView>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyText}>No users found</Text>
            </View>
          }
        />
      </LinearGradient>
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
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
      paddingBottom: 15,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
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
      color: theme.colors.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    statCard: {
      flex: 1,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      marginTop: 8,
    },
    statLabel: {
      fontSize: 12,
      color: '#A0AEC0',
      marginTop: 4,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      fontSize: 16,
      color: '#FFFFFF',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 12,
    },
    userCard: {
      flex: 1,
      padding: 14,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
    },
    userGridRow: {
      gap: 12,
    },
    userInfo: {
      flex: 1,
    },
    userEmail: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    userName: {
      fontSize: 14,
      color: '#A0AEC0',
      marginBottom: 6,
    },
    userMetaColumn: {
      marginTop: 10,
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: '#A0AEC0',
    },
    userActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    actionButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    deleteButton: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    emptyState: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: '#A0AEC0',
    },
    notificationCard: {
      padding: 20,
      borderRadius: 16,
      marginBottom: 20,
      overflow: 'hidden',
    },
    filtersCard: {
      padding: 14,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      overflow: 'hidden',
    },
    filterRow: {
      marginBottom: 10,
    },
    filterLabel: {
      color: '#A0AEC0',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
    },
    pillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.12)',
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
    },
    pillActive: {
      borderColor: theme.colors.accent,
      backgroundColor: 'rgba(139, 92, 246, 0.22)',
    },
    pillText: {
      color: '#A0AEC0',
      fontSize: 12,
      fontWeight: '600',
    },
    pillTextActive: {
      color: '#FFFFFF',
    },
    badgeRow: {
      flexDirection: 'row',
      marginTop: 6,
    },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgePremium: {
      backgroundColor: 'rgba(245, 158, 11, 0.14)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
    },
    badgeFree: {
      backgroundColor: 'rgba(160, 174, 192, 0.08)',
      borderColor: 'rgba(160, 174, 192, 0.2)',
    },
    badgeExpired: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: 'rgba(239, 68, 68, 0.32)',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    notificationInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 12,
      padding: 12,
      color: '#FFFFFF',
      fontSize: 14,
      marginBottom: 12,
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.accent,
      padding: 14,
      borderRadius: 12,
      marginTop: 8,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    sendButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    countriesCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    countryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    countryFlag: {
      fontSize: 24,
    },
    countryName: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    countryCount: {
      color: theme.colors.accent,
      fontSize: 16,
      fontWeight: '700',
    },
    countryPercent: {
      color: '#94A3B8',
      fontSize: 13,
      fontWeight: '500',
      minWidth: 50,
      textAlign: 'right',
    },
    tabContainer: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
      marginTop: 10,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 12,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    tabActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    tabText: {
      color: '#94A3B8',
      fontSize: 13,
      fontWeight: '600',
    },
    tabTextActive: {
      color: '#FFFFFF',
    },
    filterToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.colors.accent,
      padding: 14,
      borderRadius: 12,
      marginBottom: 16,
    },
    filterToggleText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
    analyticsCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    analyticsTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12,
    },
    analyticsText: {
      color: '#CBD5E1',
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8,
    },
    heatmapCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    heatmapTitle: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
    },
    heatmapRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 12,
    },
    heatmapLabel: {
      color: '#CBD5E1',
      fontSize: 13,
      fontWeight: '600',
      width: 100,
    },
    heatmapBar: {
      flex: 1,
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    heatmapFill: {
      height: '100%',
      borderRadius: 4,
    },
    heatmapValue: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '700',
      width: 45,
      textAlign: 'right',
    },
  });
