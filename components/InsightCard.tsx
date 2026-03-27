import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SleepInsight } from '../utils/aiInsightsGenerator';
import { a11y } from '../utils/accessibility';

interface InsightCardProps {
  insight: SleepInsight;
  onPress?: () => void;
}

const InsightCardComponent: React.FC<InsightCardProps> = ({ insight, onPress }) => {
  const { theme } = useTheme();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'achievement':
        return '#10B981';
      case 'warning':
        return '#EF4444';
      case 'recommendation':
        return '#F59E0B';
      case 'pattern':
        return '#8B5CF6';
      default:
        return theme.text.secondary;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.background.secondary,
          borderColor: getCategoryColor(insight.category) + '40',
        },
      ]}
      {...a11y.button(insight.title)}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getCategoryColor(insight.category) + '20' },
          ]}
        >
          <Text style={styles.icon}>{insight.icon}</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text.primary }]}>
            {insight.title}
          </Text>
          <Text
            style={[styles.category, { color: getCategoryColor(insight.category) }]}
          >
            {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
          </Text>
        </View>

        {insight.impact === 'high' && (
          <MaterialCommunityIcons
            name="alert-circle"
            size={20}
            color={getCategoryColor(insight.category)}
          />
        )}
      </View>

      <Text style={[styles.description, { color: theme.text.secondary }]}>
        {insight.description}
      </Text>

      {insight.actionable && insight.actionText && (
        <View
          style={[
            styles.actionButton,
            { backgroundColor: getCategoryColor(insight.category) + '20' },
          ]}
        >
          <Text
            style={[
              styles.actionText,
              { color: getCategoryColor(insight.category) },
            ]}
          >
            {insight.actionText}
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={16}
            color={getCategoryColor(insight.category)}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

interface InsightSectionProps {
  insights: SleepInsight[];
  onInsightPress?: (insight: SleepInsight) => void;
}

export const InsightSection: React.FC<InsightSectionProps> = ({ insights, onInsightPress }) => {
  const { theme } = useTheme();

  if (!insights || insights.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background.secondary }]}>
        <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
          No insights available yet. Keep tracking your sleep!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
        AI Sleep Insights
      </Text>

      <FlatList
        data={insights}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <InsightCardComponent
            insight={item}
            onPress={() => onInsightPress?.(item)}
          />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  category: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
