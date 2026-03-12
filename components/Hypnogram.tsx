import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
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

const STAGE_LABELS = {
  'awake': 'Awake',
  'rem': 'REM Sleep',
  'light': 'Light Sleep',
  'deep': 'Deep Sleep',
};

// ─── Time formatter — handles both Unix ms timestamps and minute-offsets ──
function formatStageTime(t: number): string {
  try {
    // If value looks like minutes from midnight (< 3000) format directly
    if (t < 3000) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    }
    // Unix ms timestamp
    return new Date(t).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '--:--';
  }
}

function formatDurationMin(ms: number): string {
  // Durations could be in ms (if timestamps are ms) or in raw units
  const minutes = ms > 100_000 ? Math.round(ms / 60_000) : Math.round(ms);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Tooltip state ────────────────────────────────────────────────────────
interface TooltipState {
  x: number;
  segment: SleepStageSegment;
}

export default function Hypnogram({ stages }: HypnogramProps) {
  const { theme } = useAppTheme();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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

  // Touch handler: converts the X tap position into a time → segment
  const handleChartTouch = (locationX: number) => {
    const ratio = Math.max(0, Math.min(1, locationX / CHART_WIDTH));
    const touchTime = startTime + ratio * totalDuration;

    const tapped = stages.find(
      (s) => touchTime >= s.startTime && touchTime <= s.endTime,
    );
    if (tapped) {
      setTooltip({ x: locationX, segment: tapped });
      // Auto-dismiss after 3 s
      setTimeout(() => setTooltip(null), 3000);
    } else {
      setTooltip(null);
    }
  };

  // Clamp tooltip horizontally so it never goes off-screen
  const tooltipWidth = 150;
  const tooltipLeft = tooltip
    ? Math.min(
        Math.max(0, tooltip.x - tooltipWidth / 2),
        CHART_WIDTH - tooltipWidth,
      )
    : 0;

  return (
    <View style={styles.container}>
      {/* Y-Axis labels */}
      <View style={styles.yAxis}>
        <Text style={styles.yLabel}>Awake</Text>
        <Text style={styles.yLabel}>REM</Text>
        <Text style={styles.yLabel}>Light</Text>
        <Text style={styles.yLabel}>Deep</Text>
      </View>

      {/* Chart area */}
      <View
        style={styles.chartArea}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => handleChartTouch(e.nativeEvent.locationX)}
      >
        {/* Stage bars */}
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
                  borderRadius: 2,
                },
              ]}
            />
          );
        })}

        {/* Vertical connectors (existing logic preserved) */}
        {stages.map((segment, index) => {
          if (index === 0) return null;
          const prevSegment = stages[index - 1];
          const left = ((segment.startTime - startTime) / totalDuration) * CHART_WIDTH;
          const prevLevel = STAGE_LEVELS[prevSegment.stage];
          const currLevel = STAGE_LEVELS[segment.stage];

          const top = Math.min(prevLevel, currLevel) / 3 * (CHART_HEIGHT - 20);
          const connHeight = Math.abs(prevLevel - currLevel) / 3 * (CHART_HEIGHT - 20);

          return (
            <View
              key={`conn-${index}`}
              style={[
                styles.connector,
                {
                  left: left,
                  top: top,
                  height: connHeight,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
              ]}
            />
          );
        })}

        {/* ── Scrubber Tooltip ─────────────────────────────────────────── */}
        {tooltip && (
          <>
            {/* Vertical scrubber line */}
            <View
              style={[
                styles.scrubberLine,
                {
                  left: tooltip.x,
                  backgroundColor: STAGE_COLORS[tooltip.segment.stage],
                },
              ]}
            />

            {/* Tooltip bubble */}
            <View
              style={[
                styles.tooltipBubble,
                {
                  left: tooltipLeft,
                  borderColor: STAGE_COLORS[tooltip.segment.stage] + '88',
                },
              ]}
            >
              <View
                style={[
                  styles.tooltipDot,
                  { backgroundColor: STAGE_COLORS[tooltip.segment.stage] },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.tooltipStage, { color: STAGE_COLORS[tooltip.segment.stage] }]}>
                  {STAGE_LABELS[tooltip.segment.stage]}
                </Text>
                <Text style={styles.tooltipTime}>
                  {formatStageTime(tooltip.segment.startTime)}
                  {' – '}
                  {formatStageTime(tooltip.segment.endTime)}
                </Text>
                <Text style={styles.tooltipDuration}>
                  {formatDurationMin(tooltip.segment.endTime - tooltip.segment.startTime)}
                </Text>
              </View>
              {/* Dismiss tap target */}
              <TouchableOpacity onPress={() => setTooltip(null)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Text style={styles.tooltipClose}>✕</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Tap hint (shows when no tooltip active) */}
        {!tooltip && (
          <Text style={styles.tapHint}>Tap to inspect</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 42, // extra room for tooltip
    marginVertical: 20,
  },
  yAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingBottom: 42,
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
    height: CHART_HEIGHT,
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
  },
  // ── Scrubber ──────────────────────────────────────────────────────────
  scrubberLine: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    height: CHART_HEIGHT - 1,
    opacity: 0.7,
  },
  tooltipBubble: {
    position: 'absolute',
    top: CHART_HEIGHT + 6,
    width: 150,
    flexDirection: 'row',
    alignItems: 'flex-start',
    rowGap: 6, columnGap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  tooltipStage: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 1,
  },
  tooltipTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
  },
  tooltipDuration: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 1,
  },
  tooltipClose: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    paddingLeft: 4,
    marginTop: 1,
  },
  tapHint: {
    position: 'absolute',
    bottom: -20,
    right: 0,
    fontSize: 9,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.5,
  },
});
