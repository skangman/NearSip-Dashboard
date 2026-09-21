// Engagement & Retention page — real data only (no mock numbers).
// Renders an HTML string for #content; lib/dashboard-runtime.ts owns state and fetching.

import type {
  ActivationReport,
  ChatReport,
  CheersReport,
  CountMetric,
  EngagementReport,
  MatchReport,
  NightlyPoint,
  NightlySeries,
  RateMetric,
  RetentionReport,
} from "@/lib/domain/engagement";
import { barChart, type BarPoint } from "../render/bar-chart";
import { barRows, card, hero } from "../render/html";
import { escapeHtml, fmtDateTime, fmtMonth, fmtNight, fmtNightShort, fmtNumber, fmtPercent } from "../render/format";
import { countTile, decimalTile, percentTile, rateTile, sourceTag, statBox } from "../render/metric";

export type EngagementTab = "cheers" | "match" | "chat" | "retention";

export type EngagementPageProps = {
  tab: EngagementTab;
  report: EngagementReport | null;
  failed: boolean;
  periodLabel: string;
};

const TABS: [EngagementTab, string][] = [
  ["cheers", "Cheers"], ["match", "Match"], ["chat", "Chat"], ["retention", "Retention"],
];

function tabBar(active: EngagementTab): string {
  const buttons = TABS
    .map(([id, label]) => `<button data-engage="${id}" class="${active === id ? "active" : ""}">${label}</button>`)
    .join("");
  return `<div class="seg" style="width:max-content;margin-bottom:14px">${buttons}</div>`;
}

function scopeLine(report: EngagementReport, periodLabel: string): string {
  const { from, to } = report.query;
  const range = from || to ? `${from ? fmtNight(from) : "เริ่มต้น"} – ${to ? fmtNight(to) : "ปัจจุบัน"}` : "ทุกช่วงเวลา";
  return `${escapeHtml(periodLabel)} · ${range}`;
}

function dataAsOfNote(report: EngagementReport | null): string {
  const latest = report?.dataAsOf.latest;
  return latest ? `ข้อมูลล่าสุด ${fmtDateTime(latest)}` : "ยังไม่มีข้อมูลในระบบ";
}

function pageHeader(props: EngagementPageProps): string {
  const desc = props.report
    ? `Cheers, Match, Chat และการกลับมาใช้งานซ้ำ · ${scopeLine(props.report, props.periodLabel)}`
    : "Cheers, Match, Chat และการกลับมาใช้งานซ้ำ";
  return hero("Engagement & Retention", desc, dataAsOfNote(props.report)) + tabBar(props.tab);
}

// ---- Shared pieces --------------------------------------------------------------

const countText = (m: CountMetric): string | null => (m.value === null ? null : fmtNumber(m.value));

/** The headcount side of a rate, for tiles that show the count and the percent separately. */
const rateAsCount = (m: RateMetric): CountMetric => ({ status: m.status, value: m.count, note: m.note });

function definitionCard(items: string[]): string {
  return card("นิยามที่ใช้คำนวณ", "เพื่อให้ตีความตัวเลขได้ตรงกัน",
    `<ul class="definition-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`);
}

const PER_LABEL = { night: "แต่ละคืน", week: "แต่ละสัปดาห์", month: "แต่ละเดือน" } as const;
const SUBTITLE = {
  night: "จำนวนต่อคืน (รอบธุรกิจตัด 06:00 น.)",
  week: "จำนวนต่อสัปดาห์ (สัปดาห์เริ่มวันจันทร์ · รวมอัตโนมัติเพราะช่วงเวลายาว)",
  month: "จำนวนต่อเดือน (รวมอัตโนมัติเพราะช่วงเวลายาว)",
} as const;

function barPoint(p: NightlyPoint, g: NightlySeries["granularity"]): BarPoint {
  if (g === "month") return { axisLabel: fmtMonth(p.night), tooltipLabel: fmtMonth(p.night), value: p.value };
  if (g === "week") {
    const range = p.night === p.end ? fmtNight(p.night) : `${fmtNightShort(p.night)} – ${fmtNight(p.end)}`;
    return { axisLabel: fmtNightShort(p.night), tooltipLabel: range, value: p.value };
  }
  return { axisLabel: fmtNightShort(p.night), tooltipLabel: fmtNight(p.night), value: p.value };
}

/**
 * Bar chart card per night — or per week / month when the range is long (the server picks the
 * grouping). `distinct` = the figure counts different people, so each bar is re-counted per period.
 */
function nightlyChartCard(prefix: string, seriesName: string, unit: string, s: NightlySeries, distinct = false): string {
  const title = `${prefix}ใน${PER_LABEL[s.granularity]}`;
  const subtitle = SUBTITLE[s.granularity] + (distinct && s.granularity !== "night" ? " · ผู้ใช้นับไม่ซ้ำภายในช่วงนั้น" : "");
  if (s.status === "no-data" || s.points === null) {
    return card(title, subtitle,
      `<div class="empty-state"><h3>ยังไม่มีข้อมูล</h3><p>${escapeHtml(s.note ?? "")}</p></div>`, sourceTag("real"));
  }
  if (s.points.length === 0) {
    return card(title, subtitle,
      `<div class="empty-state"><h3>ไม่มีเหตุการณ์ในช่วงที่เลือก</h3><p>ตรวจสอบแล้วไม่มีรายการในร้านและช่วงเวลานี้</p></div>`, sourceTag("real"));
  }
  return card(title, subtitle,
    barChart(seriesName, unit, s.points.map((p) => barPoint(p, s.granularity)), title), sourceTag("real"));
}

// ---- Summary (6 numbers) ---------------------------------------------------------

function summary(report: EngagementReport): string {
  const r = report.retention, c = report.cheers, chat = report.chat;
  const returnedPct = r.returnedUsers.percent;
  const sameStorePct = r.sameStoreReturn.percent;
  const stats = [
    statBox("ผู้ใช้งานทั้งหมดในช่วงเวลาที่เลือก", r.activeUsers.status, countText(r.activeUsers),
      r.activeUsers.note ?? "ผู้ใช้ที่เข้าใช้งานอย่างน้อย 1 คืน", "คน"),
    statBox("ผู้ใช้ที่ส่ง Cheers", c.senders.status, countText(c.senders), c.senders.note ?? "เคยส่ง Cheers อย่างน้อย 1 ครั้ง", "คน"),
    statBox("Cheers ที่ได้รับการตอบรับ (Match)", c.accepted.status, countText(c.accepted), c.accepted.note ?? "1 Cheers ที่ตอบรับ = 1 Match", "ครั้ง"),
    statBox("จำนวนแชตสองทาง", chat.twoWay.status, chat.twoWay.count === null ? null : fmtNumber(chat.twoWay.count),
      chat.twoWay.note ?? "ทั้งสองฝ่ายส่งข้อความตอบกัน", "ห้อง"),
    statBox("ผู้ใช้ที่กลับมาใช้งานซ้ำ", r.returnedUsers.status,
      r.returnedUsers.count === null ? null : fmtNumber(r.returnedUsers.count),
      r.returnedUsers.note ?? (returnedPct === null ? "" : `${fmtPercent(returnedPct)} ของผู้ใช้ทั้งหมด`), "คน"),
    statBox("% ผู้ใช้ที่กลับมาร้านเดิม", r.sameStoreReturn.status,
      sameStorePct === null ? null : fmtPercent(sameStorePct),
      r.sameStoreReturn.note
        ?? (r.sameStoreReturn.base === 0 ? "ไม่มีผู้ใช้งานในร้านและช่วงเวลานี้ จึงคำนวณ % ไม่ได้"
          : r.sameStoreReturn.count === null ? "" : `${fmtNumber(r.sameStoreReturn.count)} คน`)),
  ];
  return card("Engagement Summary", "6 ตัวเลขหลัก · ตัวเลขทุกตัวเปลี่ยนตามร้านและช่วงเวลาที่เลือก",
    `<div class="summary-strip">${stats.join("")}</div>`);
}

// ---- Cheers tab ------------------------------------------------------------------

function cheersBody(c: CheersReport): string {
  const tiles = [
    countTile("Cheers ที่ส่งทั้งหมด", c.sent, "", "ครั้ง"),
    countTile("ผู้ใช้ที่เคยส่ง Cheers อย่างน้อย 1 ครั้ง", c.senders, "", "คน"),
    countTile("ผู้ใช้ที่เคยได้รับ Cheers อย่างน้อย 1 ครั้ง", c.receivers, "", "คน"),
    countTile("Cheers ที่ได้รับการตอบรับ", c.accepted, "อีกฝ่ายกดตอบรับ", "ครั้ง"),
    countTile("Cheers ที่ถูกปฏิเสธ", c.refused, "", "ครั้ง"),
    countTile("Cheers ที่ยังไม่ได้รับคำตอบ", c.pending, "รอการตอบรับ", "ครั้ง"),
    percentTile("อัตราการตอบรับ Cheers", c.acceptanceRate,
      (n, base) => `ตอบรับ ${fmtNumber(n)} จาก ${fmtNumber(base)} Cheers`, "ยังไม่มี Cheers ในช่วงนี้ จึงคำนวณ % ไม่ได้"),
    decimalTile("จำนวน Cheers เฉลี่ยต่อผู้ใช้งาน", c.perActiveUser, "ครั้ง/คน", "Cheers ที่ส่ง ÷ ผู้ใช้งานในช่วงเวลาเดียวกัน"),
  ];
  return `<div class="grid kpis">${tiles.join("")}</div>`
    + `<div class="grid two-even">${outcomeCard(c)}${definitionCard([
      "นับตามคืนที่ <b>ส่ง</b> Cheers (รอบธุรกิจตัด 06:00 น. เวลาไทย)",
      "<b>ตอบรับ</b> = อีกฝ่ายกดตอบรับ · <b>ปฏิเสธ</b> = อีกฝ่ายปฏิเสธ · <b>ยังไม่ได้รับคำตอบ</b> = ยังไม่มีการตอบ",
      "<b>อัตราการตอบรับ</b> = Cheers ที่ได้รับการตอบรับ ÷ Cheers ที่ส่งทั้งหมด",
      "<b>เฉลี่ยต่อผู้ใช้งาน</b> = Cheers ที่ส่งทั้งหมด ÷ ผู้ใช้ที่เข้าใช้งานในร้านและช่วงเวลาเดียวกัน",
      "แหล่งข้อมูล: ตาราง Cheers ของระบบ",
    ])}</div>`
    + nightlyChartCard("จำนวน Cheers", "Cheers ที่ส่ง", "ครั้ง", c.nightlySent);
}

function outcomeCard(c: CheersReport): string {
  if (c.sent.status !== "real" || c.sent.value === null) {
    return card("ผลลัพธ์ของ Cheers", "ตอบรับ / ปฏิเสธ / รอคำตอบ",
      `<div class="empty-state"><h3>ยังไม่มีข้อมูล</h3><p>${escapeHtml(c.sent.note ?? "")}</p></div>`, sourceTag("real"));
  }
  const total = c.sent.value;
  const row = (label: string, m: CountMetric): [string, number, string] => {
    const n = m.value ?? 0;
    return [label, n, `${fmtNumber(n)} · ${total > 0 ? fmtPercent((n / total) * 100) : "—"}`];
  };
  return card("ผลลัพธ์ของ Cheers", "ตอบรับ / ปฏิเสธ / รอคำตอบ (% ของ Cheers ที่ส่ง)",
    barRows([row("ตอบรับ", c.accepted), row("ปฏิเสธ", c.refused), row("รอคำตอบ", c.pending)]), sourceTag("real"));
}

// ---- Match tab -------------------------------------------------------------------

function matchBody(m: MatchReport): string {
  const tiles = [
    countTile("Match ทั้งหมด", m.total, "Cheers ที่อีกฝ่ายตอบรับ", "ครั้ง"),
    countTile("ผู้ใช้ที่ Match สำเร็จอย่างน้อย 1 ครั้ง", m.matchedUsers, "นับทั้งผู้ส่งและผู้ตอบรับ", "คน"),
    percentTile("อัตราการ Match สำเร็จ", m.matchRate,
      (n, base) => `ตอบรับ ${fmtNumber(n)} จาก ${fmtNumber(base)} Cheers`, "ยังไม่มี Cheers ในช่วงนี้ จึงคำนวณ % ไม่ได้"),
    countTile("Match ที่นำไปสู่การเริ่มแชต", rateAsCount(m.ledToChat), "คู่ที่ส่งข้อความหากันแล้ว", "ครั้ง"),
    percentTile("% ของ Match ที่นำไปสู่การเริ่มแชต", m.ledToChat,
      (n, base) => `${fmtNumber(n)} จาก ${fmtNumber(base)} Match`, "ยังไม่มี Match ในช่วงนี้ จึงคำนวณ % ไม่ได้"),
  ];
  return `<div class="grid kpis">${tiles.join("")}</div>`
    + nightlyChartCard("จำนวน Match", "Match", "ครั้ง", m.nightlyMatches)
    + `<div style="margin-top:14px">${definitionCard([
      "<b>Match เกิดขึ้นเมื่อผู้ใช้ส่ง Cheers และอีกฝ่ายกดตอบรับ</b> — Cheers ที่ได้รับการตอบรับนับเป็น Match ทันที",
      "นับตามคืนที่ส่ง Cheers (รอบธุรกิจตัด 06:00 น. เวลาไทย)",
      "<b>อัตราการ Match สำเร็จ</b> = Cheers ที่ได้รับการตอบรับ ÷ Cheers ที่ส่งทั้งหมด",
      "<b>Match ที่นำไปสู่การเริ่มแชต</b> = คู่ผู้ใช้เดียวกันในร้านเดียวกันมีห้องแชตที่เกิดหลังส่ง Cheers และมีข้อความอย่างน้อย 1 ข้อความ",
      "ยังไม่นับ “Match มากกว่าหนึ่งครั้ง” เพราะนิยามยังไม่ชัดเจน",
    ])}</div>`;
}

// ---- Chat tab --------------------------------------------------------------------

function chatBody(c: ChatReport): string {
  const tiles = [
    countTile("จำนวนแชตที่เริ่มต้น", c.started, "ห้องที่มีข้อความแรกแล้ว", "ห้อง"),
    countTile("ผู้ใช้ที่เคยแชตอย่างน้อย 1 ครั้ง", c.chattingUsers, "ผู้ที่ส่งข้อความในช่วงนี้", "คน"),
    rateTile("จำนวนแชตสองทาง", c.twoWay, "แชตที่เริ่มต้น", "ห้อง"),
    countTile("จำนวนข้อความทั้งหมด", c.messages, "นับจำนวนเท่านั้น ไม่แสดงเนื้อหา", "ข้อความ"),
    percentTile("Match ที่นำไปสู่การแชต", c.matchToChat,
      (n, base) => `${fmtNumber(n)} จาก ${fmtNumber(base)} Match`, "ยังไม่มี Match ในช่วงนี้ จึงคำนวณ % ไม่ได้"),
  ];
  return `<div class="grid kpis">${tiles.join("")}</div>`
    + nightlyChartCard("จำนวนแชตที่เริ่มต้น", "แชตที่เริ่มต้น", "ห้อง", c.nightlyChats)
    + `<div style="margin-top:14px">${definitionCard([
      "<b>เริ่มแชต</b> = มีการส่งข้อความแรกเกิดขึ้นแล้ว (นับตามคืนที่ส่งข้อความแรก)",
      "<b>แชตสองทาง</b> = ทั้งสองฝ่ายส่งข้อความตอบกัน ไม่ใช่มีฝ่ายเดียวที่ส่ง",
      "<b>ผู้ใช้ที่เคยแชต</b> และ <b>จำนวนข้อความ</b> นับจากข้อความที่ส่งในช่วงเวลาที่เลือก",
      "<b>Match ที่นำไปสู่การแชต</b> = Match ที่คู่นั้นส่งข้อความหากันอย่างน้อย 1 ข้อความ ÷ Match ทั้งหมด",
      "แสดงเฉพาะจำนวน ไม่มีการอ่านหรือแสดงเนื้อหาข้อความของผู้ใช้",
    ])}</div>`;
}

// ---- Retention tab ---------------------------------------------------------------

function headline(report: EngagementReport): string {
  const r = report.retention;
  const { firstNight, lastNight } = r.span;
  let text: string;
  if (r.activeUsers.status === "no-data") {
    text = "ยังไม่มีข้อมูลการใช้งาน (login) ในระบบ";
  } else if (!r.activeUsers.value || !firstNight || !lastNight) {
    text = "ไม่มีผู้ใช้งานในร้านและช่วงเวลาที่เลือก";
  } else {
    const same = r.sameStoreReturn;
    text = `ตั้งแต่วันที่ ${fmtNight(firstNight)} ถึง ${fmtNight(lastNight)} มีผู้ใช้กลับมาร้านเดิม `
      + `<b>${fmtNumber(same.count ?? 0)} คน</b> คิดเป็น <b>${same.percent === null ? "—" : fmtPercent(same.percent)}</b> `
      + `ของผู้ใช้ทั้งหมด ${fmtNumber(r.activeUsers.value)} คน`;
  }
  return `<section class="card callout"><p>${text}</p>${sourceTag(r.activeUsers.status === "no-data" ? "real" : r.activeUsers.status)}</section>`;
}

function nightsDistribution(r: RetentionReport): string {
  const d = r.nightsDistribution;
  let body: string;
  if (d.status === "no-data" || !d.buckets) {
    body = `<div class="empty-state"><h3>ยังไม่มีข้อมูล</h3><p>${escapeHtml(d.note ?? "")}</p></div>`;
  } else {
    const total = d.buckets.one + d.buckets.two + d.buckets.three + d.buckets.fourPlus;
    const row = (label: string, n: number): [string, number, string] =>
      [label, n, `${fmtNumber(n)} คน${total > 0 ? ` · ${fmtPercent((n / total) * 100)}` : ""}`];
    body = barRows([
      row("ใช้งาน 1 คืน", d.buckets.one), row("ใช้งาน 2 คืน", d.buckets.two),
      row("ใช้งาน 3 คืน", d.buckets.three), row("ใช้งาน 4 คืนขึ้นไป", d.buckets.fourPlus),
    ]);
  }
  return card("จำนวนผู้ใช้ตามจำนวนคืนที่ใช้งาน", "นับเป็น “คืนที่ใช้งาน” ไม่ใช่จำนวนครั้งที่ Login", body, sourceTag("real"));
}

function retentionDefinitions(): string {
  return definitionCard([
    "<b>คืน</b> = รอบธุรกิจที่ตัดวันเวลา 06:00 น. (เวลาไทย) เช่น เข้าใช้ตี 2 ของวันที่ 12 นับเป็นคืนของวันที่ 11",
    "เปิด–ปิด NearSip กี่ครั้งในคืนเดียวก็นับเป็น <b>1 คืน</b>",
    "<b>กลับมาใช้ซ้ำ</b> = ผู้ใช้คนเดิมใช้งาน 2 คืนขึ้นไปในช่วงที่เลือก",
    "<b>กลับมาร้านเดิม</b> = ใช้งานร้านเดียวกัน 2 คืนขึ้นไป · <b>ร้านอื่น</b> = เคยใช้งาน 2 ร้านขึ้นไป",
    "<b>ภายใน N วัน</b> = คืนที่สองอยู่ภายใน N วันหลังคืนแรก และคิด % จากผู้ใช้ที่เริ่มใช้มาครบ N วันแล้วเท่านั้น (ผู้ใช้ใหม่ยังไม่มีโอกาสกลับมา)",
    "แหล่งข้อมูล: ประวัติการเข้าใช้งานที่ร้าน (login_log) · หน้านี้ใช้ตัวกรอง “ร้าน” และ “ช่วงเวลา” เท่านั้น",
  ]);
}

function longWindows(r: RetentionReport): string {
  const row = (label: string, m: RateMetric): string => {
    const value = m.status === "real" && m.count !== null
      ? `${fmtNumber(m.count)} คน${m.percent === null ? "" : ` · ${fmtPercent(m.percent)}`}`
      : "ยังไม่มีข้อมูล";
    const hint = m.status === "real" ? `จากผู้ที่ครบช่วงแล้ว ${fmtNumber(m.base ?? 0)} คน` : escapeHtml(m.note ?? "");
    return `<div class="stat"><b>${label}</b><strong>${value}</strong><p>${hint}</p></div>`;
  };
  return `<details class="mobile-more" style="margin-top:14px"><summary>Repeat ช่วงยาว 30 / 60 / 90 วัน (ข้อมูลยังสะสมไม่ครบช่วง)</summary>`
    + `<div class="summary-strip">${row("ภายใน 30 วัน", r.within30Days)}${row("ภายใน 60 วัน", r.within60Days)}${row("ภายใน 90 วัน", r.within90Days)}</div></details>`;
}

// ---- Activation funnel (Retention tab) -----------------------------------------------

const STEP_LABELS: Record<keyof ActivationReport["steps"], string> = {
  checkIn: "Check-in (เข้าร้าน)",
  cheersSent: "Cheers Sent (ส่ง Cheers)",
  matched: "Matched (ถูกตอบรับ)",
  chatStarted: "Chat Started (เริ่มแชต)",
  twoWayChat: "Two-way Chat (แชตสองทาง)",
};
const STEP_ORDER = ["checkIn", "cheersSent", "matched", "chatStarted", "twoWayChat"] as const;

function funnelCard(a: ActivationReport): string {
  const title = "Activation Funnel (หลังเข้าใช้งาน ผู้ใช้ทำอะไรต่อ)";
  const subtitle = "Journey after Check-in (ขั้นตอนการใช้งานหลังเข้าร้าน)";
  const first = a.steps.checkIn;
  if (first.status !== "real" || first.value === null) {
    return card(title, subtitle,
      `<div class="empty-state"><h3>ยังไม่มีข้อมูล</h3><p>${escapeHtml(first.note ?? "")}</p></div>`);
  }
  const base = first.value;
  const rows = STEP_ORDER.map((key, i): [string, number, string] => {
    const m = a.steps[key];
    if (m.status !== "real" || m.value === null) return [STEP_LABELS[key], 0, "ยังไม่มีข้อมูล"];
    const prev = i > 0 ? a.steps[STEP_ORDER[i - 1]] : null;
    const carried = prev && prev.status === "real" && prev.value
      ? `<br><small style="color:var(--color-muted)">จากขั้นก่อนหน้า ${fmtPercent((m.value / prev.value) * 100)}</small>` : "";
    const share = base > 0 ? ` · ${fmtPercent((m.value / base) * 100)}` : "";
    return [`${STEP_LABELS[key]}${carried}`, m.value, `${fmtNumber(m.value)} คน${share}`];
  });
  const d = a.biggestDropOff;
  const dropOff = d.status === "real" && d.from && d.to && d.carriedOnPercent !== null
    ? `<b>Biggest Drop-off (ขั้นที่ผู้ใช้หยุดมากที่สุด):</b> ${STEP_LABELS[d.from]} → ${STEP_LABELS[d.to]} · ไปต่อเพียง ${fmtPercent(d.carriedOnPercent)}`
    : `<b>Biggest Drop-off (ขั้นที่ผู้ใช้หยุดมากที่สุด):</b> ยังไม่มีข้อมูล`;
  const note = "นับเฉพาะผู้ใช้ที่เข้าร้านในช่วงที่เลือก · % ในวงเล็บคือสัดส่วนของผู้ที่เข้าร้านทั้งหมด";
  return card(title, subtitle,
    `${barRows(rows)}<p class="k-meta" style="margin:12px 0 0">${dropOff}</p><p class="k-meta" style="margin:6px 0 0">${note}</p>`);
}

function notYetActiveCard(report: EngagementReport): string {
  const a = report.activation, checkIn = a.steps.checkIn.value;
  const total = a.notYetActive.total;
  const share = total.value !== null && checkIn ? `${fmtPercent((total.value / checkIn) * 100)} ของผู้ที่เข้าร้าน` : "";
  const pending = report.cheers.pending;
  const stats = [
    statBox("Total (รวม)", total.status, countText(total), total.note ?? share, "คน"),
    statBox("New Users (ผู้ใช้ใหม่)", a.notYetActive.newUsers.status, countText(a.notYetActive.newUsers),
      a.notYetActive.newUsers.note ?? (report.query.from === null ? "ช่วง “ทั้งหมด” นับทุกคนเป็นผู้ใช้ใหม่" : "คืนแรกที่เคยใช้อยู่ในช่วงที่เลือก"), "คน"),
    statBox("Returning Users (ผู้ใช้เดิม)", a.notYetActive.returningUsers.status, countText(a.notYetActive.returningUsers),
      a.notYetActive.returningUsers.note ?? "เคยใช้มาก่อนช่วงที่เลือก", "คน"),
    statBox("Unanswered Cheers Received (ได้รับ Cheers แต่ยังไม่ตอบ)", a.unansweredReceivers.status, countText(a.unansweredReceivers),
      a.unansweredReceivers.note ?? (pending.value === null ? "" : `${fmtNumber(pending.value)} Cheers ที่ค้างรอคำตอบ`), "คน"),
  ];
  return card("Not Yet Active (เข้ามาแล้วยังไม่ทำอะไร)",
    "ไม่ส่ง Cheers ไม่ได้รับ Cheers และไม่ส่งข้อความ · อนุมานจากข้อมูลที่มี (ยังไม่เห็นการดู/เปิดหน้าในแอป)",
    `<div class="summary-strip" style="grid-template-columns:1fr">${stats.join("")}</div>`);
}

function retentionBody(report: EngagementReport): string {
  const r = report.retention;
  const tiles = [
    rateTile("ผู้ใช้ที่กลับมาใช้ NearSip ในคนละคืน", r.returnedUsers, "ผู้ใช้ทั้งหมด"),
    rateTile("ผู้ใช้ที่กลับมาร้านเดิมในคนละคืน", r.sameStoreReturn, "ผู้ใช้ทั้งหมด"),
    rateTile("กลับมาใช้ภายใน 7 วัน", r.within7Days, "ผู้ใช้ที่เริ่มใช้ครบ 7 วัน"),
    rateTile("กลับมาใช้ภายใน 14 วัน", r.within14Days, "ผู้ใช้ที่เริ่มใช้ครบ 14 วัน"),
    countTile("ผู้ใช้ที่กลับไปใช้ NearSip ที่ร้านอื่น", r.otherStoreUsers, "เคยใช้งานตั้งแต่ 2 ร้านขึ้นไป"),
  ];
  return headline(report)
    + `<div class="grid two-even" style="margin-top:14px">${funnelCard(report.activation)}${notYetActiveCard(report)}</div>`
    + `<div class="grid kpis">${tiles.join("")}</div>`
    + `<div class="grid two-even">${nightsDistribution(r)}${retentionDefinitions()}</div>`
    + nightlyChartCard("ผู้ใช้ที่เข้าใช้งาน", "ผู้ใช้ที่เข้าใช้งาน", "คน", r.nightlyUsers, true)
    + longWindows(r);
}

// ---- Page ------------------------------------------------------------------------

export function renderEngagementPage(props: EngagementPageProps): string {
  const header = pageHeader(props);
  if (props.failed) {
    return `${header}<div class="error-state"><h3>โหลดข้อมูลจริงไม่สำเร็จ</h3><p>ไม่สามารถเชื่อมต่อฐานข้อมูลได้ จึงไม่แสดงตัวเลขใด ๆ ลองเปลี่ยนตัวกรองหรือรีเฟรชหน้า</p></div>`;
  }
  const report = props.report;
  if (!report) {
    return `${header}<section class="card"><div class="skeleton wide"></div><div class="skeleton mid"></div><div class="skeleton short"></div></section>`;
  }
  const body = props.tab === "retention" ? retentionBody(report)
    : props.tab === "cheers" ? cheersBody(report.cheers)
    : props.tab === "match" ? matchBody(report.match)
    : chatBody(report.chat);
  return `${header}${summary(report)}<div style="margin-top:14px">${body}</div>`;
}
