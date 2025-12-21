import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { SleepStageSegment } from '../services/sleepTrackingService';
import { useAppTheme } from '../hooks/useAppTheme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 60;
const CHART_HEIGHT = 150;

interface HypnogramProps {
  stages: SleepStageSegment[];
}

const STAGE_LEVELS = {
  'awake': 0,
  'rem': 1,
  'light': 2,
  'deep': 3
};

const STAGE_COLORS = {
  'awake': '#EF4444',
  'rem': '#EC4899',
  'light': '#8B5CF6',
  'deep': '#6366F1'
};

export default function Hypnogram({ stages }: HypnogramProps) {
  const { theme } = useAppTheme();

  if (!stages || stages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={{ color: theme.colors.textSecondary }}>No stage data available</Text>
      </View>
    );
  }

  const startTime = stages[0].startTime;
  const endTime = stages[stages.length - 1].endTime;
  const totalDuration = endTime - startTime;

  return (
    <View style={styles.container}>
      <View style={styles.yAxis}>
        <Text style={styles.yLabel}>Awake</Text>
        <Text style={styles.yLabel}>REM</Text>
        <Text style={styles.yLabel}>Light</Text>
        <Text style={styles.yLabel}>Deep</Text>
      </View>
      
      <View style={styles.chartArea}>
        {stages.map((segment, index) => {
          const segmentWidth = ((segment.endTime - segment.startTime) / totalDuration) * CHART_WIDTH;
          const segmentLeft = ((segment.startTime - startTime) / totalDuration) * CHART_WIDTH;
          const level = STAGE_LEVELS[segment.stage];
          const top = (level / 3) * (CHART_HEIGHT - 20);

          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  width: segmentWidth,
                  left: segmentLeft,
                  top: top,
                  backgroundColor: STAGE_COLORS[segment.stage],
                  height: 4,
                  borderRadius: 2
                }
              ]}
            />
          );
        })}
        
        {/* Vertical connectors */}
        {stages.map((segment, index) => {
          if (index === 0) return null;
          const prevSegment = stages[index - 1];
          const left = ((segment.startTime - startTime) / totalDuration) * CHART_WIDTH;
          const prevLevel = STAGE_LEVELS[prevSegment.stage];
          const currLevel = STAGE_LEVELS[segment.stage];
          
          const top = Math.min(prevLevel, currLevel) / 3 * (CHART_HEIGHT - 20);
          const height = Math.abs(prevLevel - currLevel) / 3 * (CHART_HEIGHT - 20);

          return (
            <View
              key={`conn-${index}`}
              style={[
                styles.connector,
                {
                  left: left,
                  top: top,
                  height: height,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
    marginVertical: 20,
  },
  yAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  yLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'right',
    paddingRight: 8,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segment: {
    position: 'absolute',
  },
  connector: {
    position: 'absolute',
    width: 1,
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
