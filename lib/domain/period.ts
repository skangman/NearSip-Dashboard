// Business-night calendar used by the Engagement & Retention page.
//
// A "night" is keyed by the calendar date (Asia/Bangkok) of the day it started, with the day
// boundary at NIGHT_CUTOFF_HOUR: activity at 02:00 on the 12th belongs to the night of the 11th.
// Any number of logins inside one night count as a single night of use.

export const BUSINESS_TIME_ZONE = "Asia/Bangkok";
/** Local hour at which one business night ends and the next begins. */
export const NIGHT_CUTOFF_HOUR = 6;

export type PeriodId =
  | "tonight" | "today" | "7d" | "30d" | "month" | "quarter" | "year" | "custom" | "alltime";

/** Inclusive range of night keys (YYYY-MM-DD). null = open-ended on that side. */
export type NightRange = { from: string | null; to: string | null };

const MS_PER_HOUR = 3_600_000;
const BANGKOK_UTC_OFFSET_HOURS = 7;

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** The night key an instant belongs to. */
export function nightOf(instant: Date): string {
  const shifted = new Date(instant.getTime() + (BANGKOK_UTC_OFFSET_HOURS - NIGHT_CUTOFF_HOUR) * MS_PER_HOUR);
  return shifted.toISOString().slice(0, 10);
}

export function addDays(night: string, days: number): string {
  const d = new Date(`${night}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Turns a period dropdown value into a night range.
 * `custom` uses the two date inputs (blank = open-ended; reversed dates are swapped).
 */
export function resolveNightRange(
  period: PeriodId | string,
  now: Date,
  custom: { from?: string; to?: string } = {},
): NightRange {
  const tonight = nightOf(now);
  switch (period) {
    case "tonight":
    case "today":
      return { from: tonight, to: tonight };
    case "7d":
      return { from: addDays(tonight, -6), to: tonight };
    case "30d":
      return { from: addDays(tonight, -29), to: tonight };
    case "month":
      return { from: `${tonight.slice(0, 7)}-01`, to: tonight };
    case "quarter": {
      const month = Number(tonight.slice(5, 7));
      const quarterStartMonth = String(Math.floor((month - 1) / 3) * 3 + 1).padStart(2, "0");
      return { from: `${tonight.slice(0, 4)}-${quarterStartMonth}-01`, to: tonight };
    }
    case "year":
      return { from: `${tonight.slice(0, 4)}-01-01`, to: tonight };
    case "custom": {
      const from = custom.from && isIsoDate(custom.from) ? custom.from : null;
      const to = custom.to && isIsoDate(custom.to) ? custom.to : null;
      return from && to && from > to ? { from: to, to: from } : { from, to };
    }
    default:
      return { from: null, to: null };
  }
}

// ---- Chart granularity ------------------------------------------------------------
// Long ranges are grouped so a chart never draws more than ~26 bars per year of data.

export type ChartGranularity = "night" | "week" | "month";

/** Up to this many nights = one bar per night; up to WEEKLY_MAX_NIGHTS = per week; beyond = per month. */
export const NIGHTLY_MAX_NIGHTS = 60;
export const WEEKLY_MAX_NIGHTS = 180;

export function nightsBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
}

export function chartGranularity(from: string, to: string): ChartGranularity {
  const nights = nightsBetween(from, to);
  return nights <= NIGHTLY_MAX_NIGHTS ? "night" : nights <= WEEKLY_MAX_NIGHTS ? "week" : "month";
}

/** First night of the bucket a night belongs to (weeks start on Monday, months on the 1st). */
export function bucketStart(night: string, granularity: ChartGranularity): string {
  if (granularity === "night") return night;
  if (granularity === "month") return `${night.slice(0, 7)}-01`;
  const weekday = new Date(`${night}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(night, -((weekday + 6) % 7));
}

/** Last night of the bucket that starts at `start`. */
export function bucketEnd(start: string, granularity: ChartGranularity): string {
  if (granularity === "night") return start;
  if (granularity === "week") return addDays(start, 6);
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

/** Start of the bucket that follows the one starting at `start`. */
export function nextBucketStart(start: string, granularity: ChartGranularity): string {
  return addDays(bucketEnd(start, granularity), 1);
}
