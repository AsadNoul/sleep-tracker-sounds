import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { ScoreBreakdown } from '../utils/scoreBreakdown';
import { a11y } from '../utils/accessibility';

interface ScoreBreakdownCardProps {
  breakdown: ScoreBreakdown;
  onPress?: () => void;
}

export const ScoreBreakdownCard: React.FC<ScoreBreakdownCardProps> = ({ breakdown, onPress }) => {
  const { theme } = useTheme();

  const components = [
    { key: 'duration', label: 'Duration', icon: 'clock' },
    { key: 'quality', label: 'Quality', icon: 'star' },
    { key: 'deepSleep', label: 'Deep Sleep', icon: 'moon' },
    { key: 'continuity', label: 'Continuity', icon: 'waves' },
    { key: 'recovery', label: 'Recovery', icon: 'heart' },
  ];

  const getScoreColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return '#10B981';
      case 'good':
        return '#F59E0B';
      case 'fair':
        return '#F97316';
      case 'poor':
        return '#EF4444';
      default:
        return theme.text.secondary;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { backgroundColor: theme.background.secondary }]}
      {...a11y.button('Score breakdown details')}
    >
      {/* Total Score */}
      <View style={styles.headerSection}>
        <Text style={[styles.totalScore, { color: theme.text.primary }]}>
          {breakdown.totalScore}
        </Text>
        <Text style={[styles.totalLabel, { color: theme.text.secondary }]}>Total Score</Text>
      </View>

      {/* Component Scores */}
      <View style={styles.componentsGrid}>
        {components.map(component => {
          const data = breakdown[component.key as keyof Omit<ScoreBreakdown, 'totalScore'>];
          const color = getScoreColor(data.status);

          return (
            <View key={component.key} style={styles.componentItem}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: color + '20' }, // 20% opacity
                ]}
              >
                <MaterialCommunityIcons name={component.icon as any} size={20} color={color} />
              </View>

              <Text style={[styles.componentLabel, { color: theme.text.primary }]}>
                {component.label}
              </Text>

              <View style={styles.scoreBar}>
                <View
                  style={[
                    styles.scoreBarFill,
                    {
                      width: `${data.score}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>

              <Text style={[styles.componentScore, { color }]}>{Math.round(data.score)}%</Text>
            </View>
          );
        })}
      </View>

      {/* Tap to View Details */}
      <View style={styles.footer}>
        <Text style={[styles.tapHint, { color: theme.text.secondary }]}>
          Tap to see detailed analysis
        </Text>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={theme.text.secondary}
        />
      </View>
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  totalScore: {
    fontSize: 44,
    fontWeight: '700',
  },
  totalLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  componentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  componentItem: {
    width: '48%',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  componentLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  scoreBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  componentScore: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tapHint: {
    fontSize: 12,
    marginRight: 4,
  },
});
