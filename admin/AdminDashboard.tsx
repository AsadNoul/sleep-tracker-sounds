import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAdmin } from './AdminContext';
import { a11y } from '../utils/accessibility';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  unit?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, color, unit }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.background.secondary }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={28} color={color} />
      </View>
      <Text style={[styles.label, { color: theme.text.secondary }]}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: theme.text.primary }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: theme.text.secondary }]}>{unit}</Text>}
      </View>
    </View>
  );
};

interface HealthIndicatorProps {
  label: string;
  status: 'healthy' | 'degraded' | 'critical';
  value?: number;
  unit?: string;
}

const HealthIndicator: React.FC<HealthIndicatorProps> = ({ label, status, value, unit }) => {
  const { theme } = useTheme();

  const statusColors: Record<string, string> = {
    healthy: '#10B981',
    degraded: '#F59E0B',
    critical: '#EF4444',
  };

  const statusEmojis: Record<string, string> = {
    healthy: '✅',
    degraded: '⚠️',
    critical: '🆘',
  };

  return (
    <View style={[styles.healthItem, { backgroundColor: theme.background.secondary }]}>
      <View style={styles.healthHeader}>
        <Text style={styles.healthEmoji}>{statusEmojis[status]}</Text>
        <Text style={[styles.healthLabel, { color: theme.text.primary }]}>{label}</Text>
      </View>
      {value !== undefined && (
        <Text style={[styles.healthValue, { color: statusColors[status] }]}>
          {value}{unit}
        </Text>
      )}
      <View
        style={[
          styles.statusDot,
          { backgroundColor: statusColors[status] },
        ]}
      />
    </View>
  );
};

export const AdminDashboardContent: React.FC = () => {
  const { theme } = useTheme();
  const { analytics, features, engagement, health } = useAdmin();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background.primary }]}
      {...a11y.scrollView('Admin dashboard')}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text.primary }]}>
          📊 Admin Dashboard
        </Text>
        <Text style={[styles.subtitle, { color: theme.text.secondary }]}>
          Sleep App Analytics & System Health
        </Text>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          Key Metrics
        </Text>
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Total Users"
            value={analytics.totalUsers}
            icon="account-multiple"
            color="#3B82F6"
          />
          <MetricCard
            label="Active Sessions"
            value={analytics.totalSessions}
            icon="calendar-check"
            color="#10B981"
          />
          <MetricCard
            label="Avg Sleep"
            value={analytics.averageSleepDuration}
            icon="moon"
            color="#8B5CF6"
            unit="h"
          />
          <MetricCard
            label="Avg Quality"
            value={Math.round(analytics.averageSleepQuality * 100)}
            icon="star"
            color="#F59E0B"
            unit="%"
          />
        </View>
      </View>

      {/* Feature Adoption */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          Feature Adoption
        </Text>
        <View style={styles.featuresList}>
          <MetricCard
            label="Mood Entries"
            value={features.moodEntriesCount}
            icon="emoticon-happy"
            color="#EC4899"
          />
          <MetricCard
            label="Dream Logs"
            value={features.dreamEntriesCount}
            icon="moon-waning-crescent"
            color="#06B6D4"
          />
          <MetricCard
            label="Lucid Dreams"
            value={features.lucidDreamRate}
            icon="sparkles"
            color="#F59E0B"
            unit="%"
          />
          <MetricCard
            label="Avg Mood"
            value={features.averageMoodScore}
            icon="heart"
            color="#EF4444"
          />
        </View>
      </View>

      {/* Engagement Metrics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          Engagement Targets
        </Text>
        {engagement.map((metric) => (
          <View
            key={metric.metric}
            style={[styles.engagementItem, { backgroundColor: theme.background.secondary }]}
          >
            <View style={styles.engagementHeader}>
              <Text style={[styles.engagementLabel, { color: theme.text.primary }]}>
                {metric.metric}
              </Text>
              <Text
                style={[
                  styles.engagementValue,
                  {
                    color:
                      metric.status === 'excellent'
                        ? '#10B981'
                        : metric.status === 'good'
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              >
                {metric.value} / {metric.target}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: theme.border.default }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, metric.percentage)}%`,
                    backgroundColor:
                      metric.status === 'excellent'
                        ? '#10B981'
                        : metric.status === 'good'
                        ? '#F59E0B'
                        : '#EF4444',
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* System Health */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
          System Health
        </Text>
        <HealthIndicator
          label="Database Status"
          status={health.dbHealth}
        />
        <HealthIndicator
          label="Uptime"
          status="healthy"
          value={health.uptime}
          unit="%"
        />
        <HealthIndicator
          label="API Response Time"
          status={health.apiResponseTime > 200 ? 'degraded' : 'healthy'}
          value={health.apiResponseTime}
          unit="ms"
        />
        <HealthIndicator
          label="Error Rate"
          status={health.errorRate > 0.5 ? 'degraded' : 'healthy'}
          value={health.errorRate}
          unit="%"
        />
        <HealthIndicator
          label="Active Users"
          status="healthy"
          value={health.activeUsers}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.text.secondary }]}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '48%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
  },
  engagementItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  engagementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  engagementLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  engagementValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  healthHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthEmoji: {
    fontSize: 20,
  },
  healthLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
  },
});
