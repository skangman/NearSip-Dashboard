// Executive Overview trend: real login_log rows grouped into business nights, weeks or months.
//
// Uses the same business-night calendar as the Engagement page (a night ends at 06:00 Bangkok time,
// so a 01:00 login belongs to the night before) and fills empty periods with 0 so the bar chart keeps
// a true time axis — a quiet night is an empty slot, never skipped.

import type { LoginLogEntry } from "@/lib/domain/user-stats";
import {
  NIGHTLY_MAX_NIGHTS, bucketEnd, bucketStart, chartGranularity, nextBucketStart, nightOf,
  type ChartGranularity,
} from "@/lib/domain/period";
import { fmtMonth, fmtNight, fmtNightShort } from "@/lib/dashboard/render/format";
import type { BarPoint } from "@/lib/dashboard/render/bar-chart";

/** users = distinct people who logged in during the period; logins = raw login count. */
export type TrendMetric = "users" | "logins";
export type TrendGranularityChoice = "auto" | ChartGranularity;

export const TREND_METRICS: readonly TrendMetric[] = ["users", "logins"];
export const TREND_GRANULARITY_CHOICES: readonly TrendGranularityChoice[] = ["auto", "night", "week", "month"];

/** Most bars one chart draws, so a manual choice on a long history stays readable (latest periods win). */
const MAX_BARS: Record<ChartGranularity, number> = { night: NIGHTLY_MAX_NIGHTS, week: 104, month: 60 };

export type LoginTrend = {
  granularity: ChartGranularity;
  points: BarPoint[];
  /** users: distinct people across all bars shown · logins: sum of the bars. */
  total: number;
  /** Mean of the bars, empty periods included. */
  average: number;
  peak: { label: string; value: number } | null;
  /** True when older periods were left out to keep the chart readable. */
  truncated: boolean;
};

type Bucket = { start: string; logins: number; users: Set<string> };

function tooltipLabel(start: string, g: ChartGranularity): string {
  if (g === "month") return fmtMonth(start);
  if (g === "week") return `${fmtNightShort(start)} – ${fmtNight(bucketEnd(start, g))}`;
  return fmtNight(start);
}

export function buildLoginTrend(
  logs: LoginLogEntry[],
  metric: TrendMetric,
  choice: TrendGranularityChoice,
): LoginTrend | null {
  // userId is kept only for registered users (present in the "user" table) so the distinct-user count matches the
  // "ผู้ใช้ NearSip" KPI; login_log also holds ids that are not users (deleted/test accounts, blanks). The raw login
  // count still includes every login.
  const entries: { night: string; userId: string | null }[] = [];
  for (const log of logs) {
    const at = new Date(log.createAt);
    if (!Number.isNaN(at.getTime())) entries.push({ night: nightOf(at), userId: log.registered ? log.userId : null });
  }
  if (entries.length === 0) return null;

  let first = entries[0].night, last = entries[0].night;
  for (const e of entries) {
    if (e.night < first) first = e.night;
    if (e.night > last) last = e.night;
  }

  // anything that is not a known grouping falls back to the automatic pick instead of breaking the page
  const granularity = choice in MAX_BARS ? (choice as ChartGranularity) : chartGranularity(first, last);

  // one bucket per period from the first night to the last, empty ones included
  const buckets = new Map<string, Bucket>();
  for (let s = bucketStart(first, granularity); s <= last; s = nextBucketStart(s, granularity)) {
    buckets.set(s, { start: s, logins: 0, users: new Set() });
  }
  for (const e of entries) {
    const b = buckets.get(bucketStart(e.night, granularity))!;
    b.logins++;
    if (e.userId) b.users.add(e.userId);
  }

  const all = [...buckets.values()];
  const shown = all.slice(-MAX_BARS[granularity]);
  const truncated = shown.length < all.length;

  const valueOf = (b: Bucket) => (metric === "users" ? b.users.size : b.logins);
  const points: BarPoint[] = shown.map((b) => ({
    axisLabel: granularity === "month" ? fmtMonth(b.start) : fmtNightShort(b.start),
    tooltipLabel: tooltipLabel(b.start, granularity),
    value: valueOf(b),
  }));

  const total = metric === "users"
    ? new Set(shown.flatMap((b) => [...b.users])).size
    : shown.reduce((sum, b) => sum + b.logins, 0);
  const average = points.reduce((sum, p) => sum + p.value, 0) / points.length;

  let peak: LoginTrend["peak"] = null;
  for (const p of points) {
    if (p.value > 0 && (peak === null || p.value > peak.value)) peak = { label: p.tooltipLabel, value: p.value };
  }

  return { granularity, points, total, average, peak, truncated };
}
