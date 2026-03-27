import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useRoutine } from '../contexts/RoutineContext';
import { RoutineActivity } from '../utils/bedtimeRoutine';
import { a11y } from '../utils/accessibility';

interface RoutineActivityCardProps {
  activity: RoutineActivity;
  isActive?: boolean;
  isCompleted?: boolean;
  onPress?: () => void;
}

const RoutineActivityCard: React.FC<RoutineActivityCardProps> = ({
  activity,
  isActive,
  isCompleted,
  onPress,
}) => {
  const { theme } = useTheme();

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      meditation: '#8B5CF6',
      breathing: '#06B6D4',
      music: '#EC4899',
      reading: '#F59E0B',
      stretching: '#10B981',
      journaling: '#F97316',
    };
    return colors[category] || theme.text.secondary;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isActive
            ? getCategoryColor(activity.category) + '20'
            : theme.background.secondary,
          borderColor: isActive ? getCategoryColor(activity.category) : theme.border.default,
          opacity: isCompleted ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      {...a11y.button(activity.name)}
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.icon}>{activity.icon}</Text>
          <View>
            <Text style={[styles.activityName, { color: theme.text.primary }]}>
              {activity.name}
            </Text>
            <Text style={[styles.activityDesc, { color: theme.text.secondary }]}>
              {activity.duration} minutes
            </Text>
          </View>
        </View>

        <View style={styles.statusIndicators}>
          {isCompleted && (
            <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
          )}
          {isActive && !isCompleted && (
            <View style={[styles.playButton, { backgroundColor: getCategoryColor(activity.category) }]}>
              <MaterialCommunityIcons name="play" size={16} color="#FFF" />
            </View>
          )}
        </View>
      </View>

      {isActive && (
        <Text style={[styles.description, { color: theme.text.secondary }]}>
          {activity.description}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface RoutineActivityListProps {
  activities: RoutineActivity[];
  currentActivityIndex: number;
  completedActivities?: number[];
  onActivityPress?: (index: number) => void;
}

export const RoutineActivityList: React.FC<RoutineActivityListProps> = ({
  activities,
  currentActivityIndex,
  completedActivities = [],
  onActivityPress,
}) => {
  return (
    <FlatList
      data={activities}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      renderItem={({ item, index }) => (
        <RoutineActivityCard
          activity={item}
          isActive={index === currentActivityIndex}
          isCompleted={completedActivities.includes(index)}
          onPress={() => onActivityPress?.(index)}
        />
      )}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
};

interface RoutineProgressBarProps {
  current: number;
  total: number;
}

export const RoutineProgressBar: React.FC<RoutineProgressBarProps> = ({ current, total }) => {
  const { theme } = useTheme();
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { backgroundColor: theme.background.secondary }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progress}%`,
              backgroundColor: '#8B5CF6',
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: theme.text.secondary }]}>
        {current} of {total} activities
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 28,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  statusIndicators: {
    alignItems: 'center',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 10,
  },
  progressContainer: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
