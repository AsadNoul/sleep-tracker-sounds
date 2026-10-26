import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import OnboardingHeader from './OnboardingHeader';
import { stepShared, PrimaryCta } from './stepShared';
import {
  toDisplayTime,
  timeInBedMinutes,
  formatDuration,
  parseTime,
  shiftTime,
} from './timeUtils';

// Step 5 of 9 — "When do you usually sleep?"
//
// Canvas (`App-Schedule.dc.html`): two side-by-side cards, each with an icon
// label, a large Fraunces time readout, and a −/+ stepper pair; below them a
// "Time in bed" summary card with a span bar over a 9PM-9AM axis.
//
// This screen REPLACES the old step-4 "average sleep hours" button row (4-10h).
// `bedTime` and `wakeUpTime` already existed in `OnboardingData` but were never
// shown to the user — the new design exposes them, and `averageSleepHours` is
// derived from the two rather than entered separately. See `timeUtils.ts`.

const STEP_MINUTES = 15;

// The summary bar's axis runs 9 PM -> 9 AM (12 hours = 720 minutes), matching
// the canvas's four tick labels.
const AXIS_START_MINUTES = 21 * 60; // 9 PM
const AXIS_TOTAL_MINUTES = 12 * 60;

interface ScheduleStepProps {
  theme: any;
  bedTime: string;
  wakeUpTime: string;
  /** Container stores the new 'HH:MM' value and re-derives averageSleepHours. */
  onChangeBedTime: (hhmm: string) => void;
  onChangeWakeUpTime: (hhmm: string) => void;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function ScheduleStep({
  theme,
  bedTime,
  wakeUpTime,
  onChangeBedTime,
  onChangeWakeUpTime,
  onNext,
  onBack,
  onSkip,
}: ScheduleStepProps) {
  const sh = stepShared(theme);
  const s = styles(theme);

  const bed = toDisplayTime(bedTime);
  const wake = toDisplayTime(wakeUpTime);
  const inBed = timeInBedMinutes(bedTime, wakeUpTime);

  // Position the span bar on the 9PM-9AM axis, clamped to the track.
  const bedOffset = (((parseTime(bedTime) - AXIS_START_MINUTES) % 1440) + 1440) % 1440;
  const spanLeft = Math.max(0, Math.min(100, (bedOffset / AXIS_TOTAL_MINUTES) * 100));
  const spanWidth = Math.max(
    2,
    Math.min(100 - spanLeft, (inBed / AXIS_TOTAL_MINUTES) * 100)
  );

  const renderStepper = (
    label: string,
    icon: React.ReactNode,
    display: { time: string; period: string },
    onEarlier: () => void,
    onLater: () => void,
    earlierLabel: string,
    laterLabel: string
  ) => (
    <View style={s.timeCard}>
      <View style={s.timeCardLabelRow}>
        {icon}
        <Text style={s.timeCardLabel}>{label}</Text>
      </View>

      <View style={s.timeReadout}>
        <Text style={s.timeValue}>{display.time}</Text>
        <Text style={s.timePeriod}>{display.period}</Text>
      </View>

      <View style={s.stepperRow}>
        <TouchableOpacity
          style={s.stepperButton}
          onPress={onEarlier}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={earlierLabel}
        >
          <Text style={s.stepperGlyph}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.stepperButton}
          onPress={onLater}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={laterLabel}
        >
          <Text style={s.stepperGlyph}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={sh.screen}>
      <OnboardingHeader theme={theme} stepNumber={5} onBack={onBack} onSkip={onSkip} />

      <View style={sh.titleBlock}>
        <Text style={sh.stepLabel}>Step 5 of 9</Text>
        <Text style={sh.heading}>When do you usually sleep?</Text>
        <Text style={sh.subtitle}>We'll remind you to wind down before bedtime.</Text>
      </View>

      <View style={s.cardRow}>
        {renderStepper(
          'Bedtime',
          <Moon size={16} color={theme.colors.accent} strokeWidth={2.2} />,
          bed,
          () => onChangeBedTime(shiftTime(bedTime, -STEP_MINUTES)),
          () => onChangeBedTime(shiftTime(bedTime, STEP_MINUTES)),
          'Earlier bedtime',
          'Later bedtime'
        )}
        {renderStepper(
          'Wake up',
          <Sun size={16} color={theme.colors.accent} strokeWidth={2.2} />,
          wake,
          () => onChangeWakeUpTime(shiftTime(wakeUpTime, -STEP_MINUTES)),
          () => onChangeWakeUpTime(shiftTime(wakeUpTime, STEP_MINUTES)),
          'Earlier wake time',
          'Later wake time'
        )}
      </View>

      <View style={s.summaryCard}>
        <View style={s.summaryHeader}>
          <Text style={s.summaryLabel}>Time in bed</Text>
          <Text style={s.summaryValue}>{formatDuration(inBed)}</Text>
        </View>

        <View style={s.axisTrack}>
          <View
            style={[s.axisSpan, { left: `${spanLeft}%`, width: `${spanWidth}%` }]}
          />
        </View>

        <View style={s.axisTicks}>
          <Text style={s.axisTick}>9 PM</Text>
          <Text style={s.axisTick}>1 AM</Text>
          <Text style={s.axisTick}>5 AM</Text>
          <Text style={s.axisTick}>9 AM</Text>
        </View>

        <Text style={s.summaryHint}>Most adults need 7–9 hours.</Text>
      </View>

      <PrimaryCta theme={theme} label="Continue" onPress={onNext} />
    </View>
  );
}

const styles = (theme: any) =>
  StyleSheet.create({
    cardRow: {
      flexDirection: 'row',
      paddingTop: 4,
      columnGap: 12,
    },
    timeCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: 24,
      padding: 16,
      rowGap: 14,
    },
    timeCardLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    timeCardLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    timeReadout: {
      flexDirection: 'row',
      alignItems: 'baseline',
      columnGap: 4,
    },
    timeValue: {
      fontFamily: theme.typography.fontFamily.display,
      fontSize: 40,
      lineHeight: 44,
      letterSpacing: -1.2,
      color: theme.colors.textPrimary,
    },
    timePeriod: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    stepperRow: {
      flexDirection: 'row',
      columnGap: 8,
    },
    stepperButton: {
      flex: 1,
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperGlyph: {
      fontFamily: theme.typography.fontFamily.bodyMedium,
      fontSize: 22,
      lineHeight: 26,
      color: theme.colors.textPrimary,
    },
    summaryCard: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: 24,
      padding: 18,
      rowGap: 12,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    summaryLabel: {
      fontFamily: theme.typography.fontFamily.bodySemibold,
      fontSize: 15,
      color: theme.colors.textPrimary,
    },
    summaryValue: {
      fontFamily: theme.typography.fontFamily.displaySemibold,
      fontSize: 24,
      color: theme.colors.textPrimary,
    },
    axisTrack: {
      position: 'relative',
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.backgroundTertiary,
      overflow: 'hidden',
    },
    axisSpan: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderRadius: 5,
      backgroundColor: theme.colors.accent,
    },
    axisTicks: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    axisTick: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 13,
      color: theme.colors.textTertiary,
    },
    summaryHint: {
      fontFamily: theme.typography.fontFamily.body,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
  });
