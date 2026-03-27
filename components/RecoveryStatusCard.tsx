import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { RecoveryStatus } from '../utils/recoveryStatus';
import { a11y } from '../utils/accessibility';

interface RecoveryStatusCardProps {
  status: RecoveryStatus;
  onPress?: () => void;
}

export const RecoveryStatusCard: React.FC<RecoveryStatusCardProps> = ({ status, onPress }) => {
  const { theme } = useTheme();

  const getIntensityLabel = (level: string): string => {
    switch (level) {
      case 'excellent':
        return 'Fully Recovered';
      case 'good':
        return 'Well Rested';
      case 'moderate':
        return 'Recovering';
      case 'low':
        return 'Tired';
      case 'critical':
        return 'Exhausted';
      default:
        return 'Unknown';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: status.color + '15', borderColor: status.color }]}
      {...a11y.button(`Recovery status: ${status.level}`)}
    >
      {/* Header with Icon and Status */}
      <View style={styles.header}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: status.color },
          ]}
        >
          <Text style={styles.statusIcon}>{status.icon}</Text>
        </View>

        <View style={styles.statusInfo}>
          <Text style={[styles.statusLabel, { color: theme.text.primary }]}>
            {getIntensityLabel(status.level)}
          </Text>
          <Text style={[styles.statusSubtitle, { color: theme.text.secondary }]}>
            Recovery Level
          </Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: status.color }]}>
            {status.score}
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.text.secondary }]}>/ 100</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: theme.background.secondary }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${status.score}%`,
              backgroundColor: status.color,
            },
          ]}
        />
      </View>

      {/* Readiness Factor */}
      <View style={styles.readinessContainer}>
        <Text style={[styles.readinessLabel, { color: theme.text.secondary }]}>
          Workout Readiness
        </Text>
        <View style={styles.readinessBars}>
          {[0, 1, 2, 3, 4].map((index) => (
            <View
              key={index}
              style={[
                styles.readinessBar,
                {
                  backgroundColor:
                    index < Math.round(status.readinessFactor * 5)
                      ? status.color
                      : theme.border.default,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Recommendations */}
      {status.recommendations.length > 0 && (
        <View style={styles.recommendationsContainer}>
          <Text
            style={[styles.recommendationsTitle, { color: theme.text.primary }]}
            numberOfLines={1}
          >
            {status.recommendations[0]}
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
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 28,
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  readinessContainer: {
    marginBottom: 16,
  },
  readinessLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  readinessBars: {
    flexDirection: 'row',
    gap: 6,
  },
  readinessBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  recommendationsContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});
