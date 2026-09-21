// Bar chart as inline SVG for per-night / per-week / per-month counts. Bars (not a line) so a period
// with no events is an empty slot instead of a line dragged along zero. Every column has a full-height
// hit area, and the runtime's tap-a-point handler (.chart-bar) writes "series · period: value" into
// .chart-value on hover, tap or keyboard focus.

import { escapeHtml, fmtNumber } from "./format";

export type BarPoint = {
  /** Short text under the bar (may be thinned out when there are many bars). */
  axisLabel: string;
  /** Full period text shown when the bar is hovered/tapped. */
  tooltipLabel: string;
  value: number;
};

const BAR_COLOR = "var(--chart-1)";

/** Y-axis maximum that gives whole-number gridlines for count data (4 intervals). */
function niceMax(max: number): number {
  return Math.max(4, Math.ceil(max / 4) * 4);
}

export function barChart(seriesName: string, unit: string, points: BarPoint[], title: string): string {
  const w = 780, h = 250, ml = 52, mr = 18, mt = 18, mb = 38;
  const plotW = w - ml - mr, plotH = h - mt - mb;
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const colW = plotW / Math.max(1, points.length);
  const barW = Math.min(40, Math.max(1, colW * 0.66));
  const baseline = h - mb;

  let grid = "", yTicks = "";
  for (let i = 0; i < 5; i++) {
    const gy = mt + (plotH / 4) * i;
    grid += `<line x1="${ml}" y1="${gy}" x2="${w - mr}" y2="${gy}"/>`;
    yTicks += `<text x="${ml - 8}" y="${gy + 4}" text-anchor="end" font-size="10">${fmtNumber(max * (1 - i / 4))}</text>`;
  }

  // as many x labels as fit (~45px each); the last one always shows, so skip a regular one that would touch it
  const last = points.length - 1;
  const labelStep = Math.max(1, Math.ceil(points.length / Math.floor(plotW / 45)));
  const showLabel = (i: number) => i === last || (i % labelStep === 0 && last - i >= labelStep);

  const columns = points.map((p, i) => {
    const colX = ml + i * colW;
    const barH = p.value > 0 ? Math.max(2, (p.value / max) * plotH) : 0;
    const bar = barH > 0
      ? `<rect x="${colX + (colW - barW) / 2}" y="${baseline - barH}" width="${barW}" height="${barH}" rx="2" style="fill:${BAR_COLOR}"/>`
      : "";
    const label = showLabel(i)
      ? `<text x="${colX + colW / 2}" y="${h - 12}" text-anchor="middle" font-size="10">${escapeHtml(p.axisLabel)}</text>` : "";
    const hit = `<rect class="chart-bar" x="${colX}" y="${mt}" width="${colW}" height="${plotH}" fill="transparent" tabindex="0" `
      + `data-series="${escapeHtml(`${seriesName} (${unit})`)}" data-label="${escapeHtml(p.tooltipLabel)}" data-value="${p.value}">`
      + `<title>${escapeHtml(p.tooltipLabel)} · ${fmtNumber(p.value)} ${escapeHtml(unit)}</title></rect>`;
    return `${bar}${label}${hit}`;
  }).join("");

  return `<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)} · หน่วย ${escapeHtml(unit)}</title>${grid}${yTicks}${columns}</svg>`
    + `<div class="legend"><span><i style="background:${BAR_COLOR}"></i>${escapeHtml(seriesName)}</span></div>`
    + `<div class="chart-value" style="display:block">ชี้หรือแตะแท่งเพื่อดูค่า</div></div>`;
}
