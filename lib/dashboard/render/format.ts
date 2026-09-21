import { BUSINESS_TIME_ZONE } from "@/lib/domain/period";

const numberFormat = new Intl.NumberFormat("th-TH");

export function fmtNumber(n: number): string {
  return numberFormat.format(Math.round(n));
}

export function fmtPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

const dateFormat = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  timeZone: BUSINESS_TIME_ZONE, day: "numeric", month: "short", year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  timeZone: BUSINESS_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false,
});

/** A night key (YYYY-MM-DD) as "12 ก.ย. 2026". */
export function fmtNight(night: string): string {
  return dateFormat.format(new Date(`${night}T12:00:00+07:00`));
}

/** A real event timestamp (ISO) as "12 ก.ย. 2026 10:04 ICT" in Thai time. */
export function fmtDateTime(iso: string): string {
  const at = new Date(iso);
  return `${dateFormat.format(at)} ${timeFormat.format(at)} ICT`;
}

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c] as string);
}

const shortDateFormat = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  timeZone: BUSINESS_TIME_ZONE, day: "numeric", month: "short",
});

/** A night key as "12 ก.ย." (chart axis). */
export function fmtNightShort(night: string): string {
  return shortDateFormat.format(new Date(`${night}T12:00:00+07:00`));
}

const monthFormat = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
  timeZone: BUSINESS_TIME_ZONE, month: "short", year: "numeric",
});

/** A night key as "ก.ย. 2026" (monthly chart axis). */
export function fmtMonth(night: string): string {
  return monthFormat.format(new Date(`${night}T12:00:00+07:00`));
}

export function fmtDecimal(n: number): string {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}
