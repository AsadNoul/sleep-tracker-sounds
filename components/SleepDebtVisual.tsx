import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { SleepDebtMetrics, getDebtVisualization } from '../utils/sleepDebt';
import { a11y } from '../utils/accessibility';

interface SleepDebtVisualProps {
  metrics: SleepDebtMetrics;
  onPress?: () => void;
}

export const SleepDebtVisual: React.FC<SleepDebtVisualProps> = ({ metrics, onPress }) => {
  const { theme } = useTheme();
  const viz = getDebtVisualization(metrics);

  const getDebtColor = (level: string) => {
    switch (level) {
      case 'none':
        return '#10B981';
      case 'low':
        return '#F59E0B';
      case 'moderate':
        return '#F97316';
      case 'high':
        return '#EF4444';
      case 'critical':
        return '#DC2626';
      default:
        return theme.text.secondary;
    }
  };

  const getDebtEmoji = (level: string) => {
    switch (level) {
      case 'none':
        return '✅';
      case 'low':
        return '⚠️';
      case 'moderate':
        return '😴';
      case 'high':
        return '💤';
      case 'critical':
        return '🆘';
      default:
        return '😴';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: theme.background.secondary }]}
      {...a11y.button(`Sleep debt: ${metrics.totalDebt} hours`)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.text.primary }]}>Sleep Debt</Text>
          <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
            {metrics.totalDebt}h owed
          </Text>
        </View>
        <Text style={styles.emoji}>{getDebtEmoji(metrics.debtLevel)}</Text>
      </View>

      {/* Debt Status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getDebtColor(metrics.debtLevel) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getDebtColor(metrics.debtLevel) },
            ]}
          >
            {metrics.debtLevel.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.text.primary }]}>
            Sleep Target Progress
          </Text>
          <Text style={[styles.progressPercent, { color: theme.text.secondary }]}>
            {viz.filled}%
          </Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: theme.background.primary }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${viz.filled}%`,
                backgroundColor: getDebtColor(metrics.debtLevel),
              },
            ]}
          />
        </View>

        <Text style={[styles.progressDetail, { color: theme.text.secondary }]}>
          {metrics.achievedHours}h / {metrics.targetHours}h
        </Text>
      </View>

      {/* Debt Details */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={theme.text.secondary}
          />
          <Text
            style={[styles.detailLabel, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            Daily Deficit
          </Text>
          <Text style={[styles.detailValue, { color: theme.text.primary }]}>
            {metrics.dailyDeficit}h
          </Text>
        </View>

        <View style={styles.detailItem}>
          <MaterialCommunityIcons
            name="calendar-outline"
            size={16}
            color={theme.text.secondary}
          />
          <Text
            style={[styles.detailLabel, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            Days to Clear
          </Text>
          <Text style={[styles.detailValue, { color: theme.text.primary }]}>
            {metrics.daysToPayOff}
          </Text>
        </View>
      </View>

      {/* Recovery Timeline */}
      {metrics.debtLevel !== 'none' && (
        <View style={styles.recoveryTip}>
          <MaterialCommunityIcons
            name="lightbulb-outline"
            size={16}
            color={getDebtColor(metrics.debtLevel)}
          />
          <Text
            style={[styles.recoveryText, { color: theme.text.secondary }]}
            numberOfLines={2}
          >
            Add {Math.ceil(metrics.dailyDeficit * 60)} min sleep per night to clear debt
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  emoji: {
    fontSize: 32,
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressDetail: {
    fontSize: 11,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  recoveryTip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  recoveryText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
