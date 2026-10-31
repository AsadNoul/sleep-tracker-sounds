import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Bell, BellOff, Trash2, Moon, AlarmClock, Cloud, Flame, Star, BarChart2 } from 'lucide-react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import notificationHistoryService, { NotificationHistoryEntry } from '../services/notificationHistoryService';

const TYPE_ICON: Record<string, any> = {
  alarm: AlarmClock,
  smart_alarm: AlarmClock,
  morning_summary: Moon,
  sleep_summary: Moon,
  weekly_summary: BarChart2,
  bedtime_reminder: Moon,
  sync: Cloud,
  milestone: Flame,
  test: Bell,
  test_alarm: AlarmClock,
  general: Star,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const [entries, setEntries] = useState<NotificationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const history = await notificationHistoryService.getHistory();
    setEntries(history);
    setLoading(false);
    notificationHistoryService.markAllAsRead().catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleClearAll = async () => {
    await notificationHistoryService.clearHistory();
    setEntries([]);
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[s.backButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
        >
          <ChevronLeft size={20} color={theme.colors.textPrimary} strokeWidth={2.2} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={[s.title, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            Notifications
          </Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            {entries.length > 0 ? `${entries.length} recent` : 'All caught up'}
          </Text>
        </View>
        {entries.length > 0 && (
          <TouchableOpacity
            onPress={handleClearAll}
            style={[s.clearButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}
          >
            <Trash2 size={16} color={theme.colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {!loading && entries.length === 0 ? (
        <View style={s.emptyState}>
          <View style={[s.emptyIcon, { backgroundColor: theme.colors.backgroundTertiary }]}>
            <BellOff size={28} color={theme.colors.textTertiary} />
          </View>
          <Text style={[s.emptyTitle, { color: theme.colors.textPrimary, fontFamily: theme.typography.fontFamily.displaySemibold }]}>
            No notifications yet
          </Text>
          <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>
            Alarms, sleep summaries, and reminders will show up here as they arrive.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const Icon = TYPE_ICON[item.type] || Bell;
            return (
              <View style={[s.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.cardBorder }]}>
                <View style={[s.rowIcon, { backgroundColor: theme.colors.accentLight }]}>
                  <Icon size={18} color={theme.colors.accent} />
                </View>
                <View style={s.rowTextCol}>
                  <Text style={[s.rowTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[s.rowBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                    {item.body}
                  </Text>
                  <Text style={[s.rowTime, { color: theme.colors.textTertiary }]}>{timeAgo(item.createdAt)}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 12,
      padding: 20,
      paddingTop: 10,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerText: { flex: 1 },
    title: { fontSize: 22, letterSpacing: -0.2, marginBottom: 2 },
    subtitle: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
    },
    clearButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      rowGap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      columnGap: 12,
      borderRadius: theme.borderRadius.card,
      borderWidth: 1,
      padding: 16,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
      marginTop: 2,
    },
    rowTextCol: { flex: 1, rowGap: 3 },
    rowTitle: {
      fontFamily: theme.typography.fontFamily.bodyBold,
      fontSize: 15,
    },
    rowBody: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      lineHeight: 18,
    },
    rowTime: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 11,
      marginTop: 2,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      rowGap: 10,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    emptyTitle: { fontSize: 18 },
    emptyText: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
  });
