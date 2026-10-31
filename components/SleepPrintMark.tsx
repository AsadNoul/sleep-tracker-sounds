import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

// The brand mark: a radial burst of 72 bars, each colored by which sleep
// stage occupies that point in the night (awake/light/deep/REM), arranged
// like a watch face. Ported from the design canvas's `print()` algorithm —
// same segment boundaries, same per-bar length jitter — so the mark is
// pixel-faithful to the design, not just visually similar.
//
// `segments` marks the % of the night (0-100) where each stage starts; the
// last segment runs to 100. Values below come from the canvas's fixed demo
// data and are intentionally NOT wired to a real session's actual stages —
// this is a brand mark, not a hypnogram (the real per-session hypnogram is
// a separate component/screen).
const STAGE_SEGMENTS: Array<[number, 'light' | 'deep' | 'rem' | 'awake']> = [
  [8, 'light'], [20, 'deep'], [28, 'light'], [34, 'rem'],
  [44, 'light'], [52, 'deep'], [58, 'light'], [60, 'awake'],
  [70, 'rem'], [80, 'light'], [84, 'deep'], [94, 'rem'],
  [98, 'light'], [100, 'awake'],
];

const STAGE_BASE_LENGTH: Record<'light' | 'deep' | 'rem' | 'awake', number> = {
  deep: 66,
  light: 48,
  rem: 36,
  awake: 22,
};

const BAR_COUNT = 72;

interface SleepPrintMarkProps {
  size: number;
  colors: { deep: string; light: string; rem: string; awake: string };
}

export default function SleepPrintMark({ size, colors }: SleepPrintMarkProps) {
  const bars = useMemo(() => {
    const scale = size / 220;
    const barWidth = Math.max(2, 4 * scale);
    const out: Array<{ key: number; style: any }> = [];

    for (let i = 0; i < BAR_COUNT; i++) {
      const t = (i / BAR_COUNT) * 100;
      let stage: 'light' | 'deep' | 'rem' | 'awake' = 'awake';
      for (const [boundary, s] of STAGE_SEGMENTS) {
        if (t < boundary) {
          stage = s;
          break;
        }
      }
      const length = (STAGE_BASE_LENGTH[stage] + 5 * Math.sin(i * 1.7)) * scale;
      const rotation = 180 + i * 5;
      const translateDistance = 30 * scale;

      out.push({
        key: i,
        style: {
          position: 'absolute' as const,
          left: size / 2 - barWidth / 2,
          top: size / 2,
          width: barWidth,
          height: length,
          borderRadius: barWidth / 2,
          backgroundColor: colors[stage],
          // Matches the canvas's `transform-origin: 50% 0` + rotate +
          // translateY — pivot from the bar's top-center, same as CSS.
          transformOrigin: ['50%', 0, 0],
          transform: [
            { rotate: `${rotation}deg` },
            { translateY: translateDistance },
          ],
        },
      });
    }
    return out;
  }, [size, colors]);

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="image"
      accessibilityLabel="Sleep Print: a visual summary of tonight's sleep stages"
    >
      {bars.map((bar) => (
        <View key={bar.key} style={bar.style} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
