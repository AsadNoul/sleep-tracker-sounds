import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '../hooks/useAppTheme';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 200;

interface SleepData {
  day: string;
  quality: number;
  duration: number;
}

interface SleepChartProps {
  data: SleepData[];
  title: string;
  type: 'quality' | 'duration';
}

export default function SleepChart({ data, title, type }: SleepChartProps) {
  const { theme, isDark } = useAppTheme();

  // Calculate max value for scaling
  const maxValue = Math.max(...data.map(d => type === 'quality' ? d.quality : d.duration));
  const normalizedMax = type === 'quality' ? 100 : Math.ceil(maxValue / 60) * 60; // Round to nearest hour

  const renderBar = (item: SleepData, index: number) => {
    const value = type === 'quality' ? item.quality : item.duration;
    const barHeight = (value / normalizedMax) * (CHART_HEIGHT - 60);
    const barWidth = (CHART_WIDTH - 40) / data.length - 10;

    // Color based on quality/duration
    let color = theme.colors.accent;
    if (type === 'quality') {
      if (value < 50) color = theme.colors.danger;
      else if (value < 70) color = theme.colors.premium;
    } else {
      const hours = value / 60;
      if (hours < 6) color = theme.colors.danger;
      else if (hours < 7) color = theme.colors.premium;
    }

    return (
      <View key={index} style={styles(theme).barContainer}>
        <View style={styles(theme).barWrapper}>
          <View
            style={[
              styles(theme).bar,
              {
                height: Math.max(barHeight, 10),
                width: barWidth,
                backgroundColor: color,
              },
            ]}
          />
        </View>
        <Text style={styles(theme).label}>{item.day}</Text>
      </View>
    );
  };

  const getAverageValue = () => {
    const sum = data.reduce((acc, item) => {
      return acc + (type === 'quality' ? item.quality : item.duration);
    }, 0);
    const avg = sum / data.length;
    return type === 'quality'
      ? `${Math.round(avg)}%`
      : `${Math.floor(avg / 60)}h ${Math.round(avg % 60)}m`;
  };

  return (
    <BlurView intensity={20} tint="dark" style={styles(theme).container}>
      <View style={styles(theme).header}>
        <Text style={styles(theme).title}>{title}</Text>
        <Text style={styles(theme).average}>Avg: {getAverageValue()}</Text>
      </View>

      <View style={styles(theme).chartContainer}>
        {/* Y-axis labels */}
        <View style={styles(theme).yAxis}>
          <Text style={styles(theme).yAxisLabel}>{type === 'quality' ? '100%' : '12h'}</Text>
          <Text style={styles(theme).yAxisLabel}>{type === 'quality' ? '50%' : '6h'}</Text>
          <Text style={styles(theme).yAxisLabel}>{type === 'quality' ? '0%' : '0h'}</Text>
        </View>

        {/* Bars */}
        <View style={styles(theme).barsContainer}>
          {data.length > 0 ? (
            data.map((item, index) => renderBar(item, index))
          ) : (
            <View style={styles(theme).noDataContainer}>
              <Text style={styles(theme).noDataText}>No data available</Text>
            </View>
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={styles(theme).legend}>
        <View style={styles(theme).legendItem}>
          <View style={[styles(theme).legendColor, { backgroundColor: theme.colors.accent }]} />
          <Text style={styles(theme).legendText}>Good</Text>
        </View>
        <View style={styles(theme).legendItem}>
          <View style={[styles(theme).legendColor, { backgroundColor: theme.colors.premium }]} />
          <Text style={styles(theme).legendText}>Fair</Text>
        </View>
        <View style={styles(theme).legendItem}>
          <View style={[styles(theme).legendColor, { backgroundColor: theme.colors.danger }]} />
          <Text style={styles(theme).legendText}>Poor</Text>
        </View>
      </View>
    </BlurView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: 'rgba(27, 29, 42, 0.6)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  average: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingVertical: 10,
  },
  yAxisLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  barContainer: {
    alignItems: 'center',
  },
  barWrapper: {
    height: CHART_HEIGHT - 60,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    borderRadius: 6,
    minHeight: 10,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
