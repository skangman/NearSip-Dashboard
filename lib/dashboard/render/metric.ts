// HTML primitives for numbers whose origin must always be visible:
//   real → value + "ข้อมูลจริง" · no-data → "ยังไม่มีข้อมูล" · in-development → "อยู่ระหว่างพัฒนา"
// A missing number is never rendered as 0.

import type { CountMetric, MetricStatus, RateMetric } from "@/lib/domain/engagement";
import { escapeHtml, fmtDecimal, fmtNumber, fmtPercent } from "./format";

const NO_DATA_TEXT = "ยังไม่มีข้อมูล";
const IN_DEVELOPMENT_TEXT = "อยู่ระหว่างพัฒนา";

export function sourceTag(status: MetricStatus): string {
  if (status === "in-development") return `<span class="src-tag dev">${IN_DEVELOPMENT_TEXT}</span>`;
  // ปิดป้าย "ข้อมูลจริง" ไว้ตามที่ขอ — หน้านี้เป็นข้อมูลจริงทั้งหมดแล้ว ป้ายจึงซ้ำซ้อน (เอาคอมเมนต์ออกเพื่อเปิดกลับ)
  // return `<span class="src-tag real">ข้อมูลจริง</span>`;
  return "";
}

function valueHtml(status: MetricStatus, text: string | null, unit = ""): string {
  if (status === "in-development") return `<div class="k-value is-dev">${IN_DEVELOPMENT_TEXT}</div>`;
  if (status === "no-data" || text === null) return `<div class="k-value is-empty">${NO_DATA_TEXT}</div>`;
  return `<div class="k-value">${text}${unit ? `<span class="k-unit">${unit}</span>` : ""}</div>`;
}

/** KPI tile for a single count. */
export function countTile(label: string, m: CountMetric, meta = "", unit = "คน"): string {
  const text = m.value === null ? null : fmtNumber(m.value);
  return `<article class="kpi"><div class="k-label">${label}</div>${valueHtml(m.status, text, unit)}`
    + `<div class="k-meta">${escapeHtml(m.note ?? meta)}</div>${sourceTag(m.status)}</article>`;
}

/** KPI tile for "N people = P%": count as the main value, percent right under it. */
export function rateTile(label: string, m: RateMetric, baseLabel: string, unit = "คน"): string {
  const text = m.count === null ? null : fmtNumber(m.count);
  const percent = m.status === "real" && m.percent !== null
    ? `<div class="k-pct">${fmtPercent(m.percent)}</div>` : "";
  const meta = m.note ?? (m.base === null ? "" : `จาก${baseLabel} ${fmtNumber(m.base)} ${unit}`);
  return `<article class="kpi"><div class="k-label">${label}</div>${valueHtml(m.status, text, unit)}${percent}`
    + `<div class="k-meta">${escapeHtml(meta)}</div>${sourceTag(m.status)}</article>`;
}

/** KPI tile for a metric that is not built yet. */
export function developmentTile(label: string): string {
  return `<article class="kpi"><div class="k-label">${label}</div>${valueHtml("in-development", null)}`
    + `<div class="k-meta"></div>${sourceTag("in-development")}</article>`;
}

/** Compact stat (used in the summary strip). */
export function statBox(label: string, status: MetricStatus, text: string | null, meta: string, unit = ""): string {
  const value = status === "in-development"
    ? `<strong class="is-dev">${IN_DEVELOPMENT_TEXT}</strong>`
    : status === "no-data" || text === null
      ? `<strong class="is-empty">${NO_DATA_TEXT}</strong>`
      : `<strong>${text}${unit ? `<span class="k-unit">${unit}</span>` : ""}</strong>`;
  return `<div class="stat"><b>${label}</b>${value}<p>${escapeHtml(meta)}</p>${sourceTag(status)}</div>`;
}

/** KPI tile whose main value is the percentage itself (e.g. acceptance rate). */
export function percentTile(label: string, m: RateMetric, describe: (count: number, base: number) => string, emptyNote: string): string {
  const usable = m.status === "real" && m.percent !== null && m.count !== null && m.base !== null;
  const status: MetricStatus = usable ? "real" : "no-data";
  const text = usable ? fmtPercent(m.percent as number) : null;
  const meta = usable ? describe(m.count as number, m.base as number) : m.note ?? emptyNote;
  return `<article class="kpi"><div class="k-label">${label}</div>${valueHtml(status, text)}`
    + `<div class="k-meta">${escapeHtml(meta)}</div>${sourceTag(m.status === "no-data" ? "real" : m.status)}</article>`;
}

/** KPI tile for an average (one decimal). */
export function decimalTile(label: string, m: CountMetric, unit: string, meta: string): string {
  const text = m.value === null ? null : fmtDecimal(m.value);
  return `<article class="kpi"><div class="k-label">${label}</div>${valueHtml(m.status, text, unit)}`
    + `<div class="k-meta">${escapeHtml(m.note ?? meta)}</div>${sourceTag(m.status)}</article>`;
}
