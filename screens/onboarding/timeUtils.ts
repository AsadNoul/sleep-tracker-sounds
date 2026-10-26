// Time helpers shared by ScheduleStep (the bedtime/wake stepper) and PlanStep
// (the wind-down / bedtime / wake-up summary row).
//
// Times are stored in `OnboardingData` as 24-hour 'HH:MM' strings — the same
// format as the pre-existing defaults ('22:30' / '07:00') and the same format
// the Supabase `preferred_bed_time` / `preferred_wake_time` columns already
// receive. Nothing about that shape changes here.

/** Parse 'HH:MM' into minutes since midnight. Falls back to 0 on bad input. */
export function parseTime(hhmm: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '');
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return ((hours * 60 + minutes) % 1440 + 1440) % 1440;
}

/** Format minutes-since-midnight back into a 24-hour 'HH:MM' string. */
export function formatTime(totalMinutes: number): string {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Shift an 'HH:MM' time by a signed number of minutes, wrapping at midnight. */
export function shiftTime(hhmm: string, deltaMinutes: number): string {
  return formatTime(parseTime(hhmm) + deltaMinutes);
}

export interface DisplayTime {
  /** e.g. '11:30' */
  time: string;
  /** 'AM' | 'PM' */
  period: string;
}

/** Split an 'HH:MM' 24h string into 12-hour display parts, as the canvas shows. */
export function toDisplayTime(hhmm: string): DisplayTime {
  const total = parseTime(hhmm);
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { time: `${hours12}:${String(minutes).padStart(2, '0')}`, period };
}

/** A single '7:00 PM'-style string, for the Plan screen's stat row. */
export function toDisplayString(hhmm: string): string {
  const { time, period } = toDisplayTime(hhmm);
  return `${time} ${period}`;
}

/**
 * Minutes spent in bed between bedtime and wake time, wrapping over midnight.
 * A bedtime of 22:30 and a wake time of 07:00 gives 510 minutes (8h 30m).
 */
export function timeInBedMinutes(bedTime: string, wakeUpTime: string): number {
  const bed = parseTime(bedTime);
  const wake = parseTime(wakeUpTime);
  const diff = wake - bed;
  return diff > 0 ? diff : diff + 1440;
}

/** 'Nh Mm' for the Time-in-bed summary card. */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/**
 * Hours in bed as a number, for `onboardingData.averageSleepHours`.
 *
 * The new Schedule screen replaces the old 4-10 hour button row: the user now
 * sets bedtime and wake time directly, and the average-hours value is DERIVED
 * from them rather than entered separately. Rounded to one decimal to stay
 * consistent with the old 7.5 default; `handleComplete` still applies
 * Math.round() before writing `average_sleep_hours`.
 */
export function derivedSleepHours(bedTime: string, wakeUpTime: string): number {
  return Math.round((timeInBedMinutes(bedTime, wakeUpTime) / 60) * 10) / 10;
}
