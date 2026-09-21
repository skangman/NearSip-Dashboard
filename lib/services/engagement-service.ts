import { withClient } from "@/lib/db/pool";
import {
  fetchActiveUsersByBucket,
  fetchDataAsOf,
  fetchNightlyActiveUsers,
  fetchRetention,
  type NightlyRow,
  type RetentionRaw,
  type RetentionWindow,
} from "@/lib/db/engagement.repository";
import {
  fetchActivation,
  fetchCheersStats,
  fetchChatStats,
  fetchNightlyCheers,
  fetchNightlyChats,
  type ActivationRaw,
  type CheersRaw,
  type ChatRaw,
} from "@/lib/db/interaction.repository";
import type {
  ActivationReport,
  ChatReport,
  CheersReport,
  CountMetric,
  EngagementReport,
  MatchReport,
  NightlySeries,
  RateMetric,
  RetentionReport,
} from "@/lib/domain/engagement";
import {
  bucketEnd,
  bucketStart,
  chartGranularity,
  isIsoDate,
  nextBucketStart,
  type ChartGranularity,
} from "@/lib/domain/period";
import { BadRequestError } from "@/lib/http/errors";

const NO_LOGIN_DATA_NOTE = "ยังไม่มีข้อมูลการใช้งาน (login) ในระบบ";
const NO_CHEERS_NOTE = "ยังไม่มีข้อมูล Cheers ในระบบ";
const NO_CHAT_NOTE = "ยังไม่มีข้อมูลแชตในระบบ";

function parseNight(name: string, value: string | undefined): string | null {
  if (value === undefined) return null;
  if (!isIsoDate(value)) throw new BadRequestError(`Invalid "${name}": expected YYYY-MM-DD`);
  return value;
}

function countMetric(hasData: boolean, value: number, noDataNote = NO_LOGIN_DATA_NOTE): CountMetric {
  return hasData
    ? { status: "real", value }
    : { status: "no-data", value: null, note: noDataNote };
}

function percentOf(count: number, base: number): number | null {
  return base > 0 ? (count / base) * 100 : null;
}

function rateMetric(hasData: boolean, count: number, base: number, noDataNote = NO_LOGIN_DATA_NOTE): RateMetric {
  if (!hasData) {
    return { status: "no-data", count: null, base: null, percent: null, note: noDataNote };
  }
  return { status: "real", count, base, percent: percentOf(count, base) };
}

type ChartBounds = { from: string; to: string } | null;

/** Range a chart covers: the selected range; an open end falls back to the first/last night with data. */
function seriesBounds(rows: NightlyRow[], range: { from: string | null; to: string | null }): ChartBounds {
  const from = range.from ?? rows[0]?.night ?? null;
  const to = range.to ?? rows.at(-1)?.night ?? from;
  return from && to ? { from, to } : null;
}

function granularityOf(bounds: ChartBounds): ChartGranularity {
  return bounds ? chartGranularity(bounds.from, bounds.to) : "night";
}

/** Adds nightly rows up per bucket — only valid for event counts (never for distinct users). */
function sumByBucket(rows: NightlyRow[], granularity: ChartGranularity): NightlyRow[] {
  if (granularity === "night") return rows;
  const totals = new Map<string, number>();
  for (const r of rows) {
    const key = bucketStart(r.night, granularity);
    totals.set(key, (totals.get(key) ?? 0) + r.value);
  }
  return [...totals.entries()].map(([night, value]) => ({ night, value }));
}

/** One zero-filled point per bucket; `rows` must already be keyed by bucket start. */
function buildSeries(
  hasData: boolean,
  rows: NightlyRow[],
  bounds: ChartBounds,
  granularity: ChartGranularity,
  noDataNote: string,
): NightlySeries {
  if (!hasData) return { status: "no-data", granularity, points: null, note: noDataNote };
  if (!bounds) return { status: "real", granularity, points: [] };

  const byBucket = new Map(rows.map((r) => [r.night, r.value]));
  const points: NightlySeries["points"] = [];
  for (let start = bucketStart(bounds.from, granularity); start <= bounds.to; start = nextBucketStart(start, granularity)) {
    const end = bucketEnd(start, granularity);
    points.push({
      night: start < bounds.from ? bounds.from : start,
      end: end > bounds.to ? bounds.to : end,
      value: byBucket.get(start) ?? 0,
    });
  }
  return { status: "real", granularity, points };
}

/** Series of event counts (Cheers, Matches, chats) from per-night rows. */
function countSeries(
  hasData: boolean,
  rows: NightlyRow[],
  range: { from: string | null; to: string | null },
  noDataNote: string,
): NightlySeries {
  const bounds = seriesBounds(rows, range);
  const granularity = granularityOf(bounds);
  return buildSeries(hasData, sumByBucket(rows, granularity), bounds, granularity, noDataNote);
}

/** "Came back within N days" — only users who started at least N days ago can be counted. */
function windowMetric(raw: RetentionRaw, days: RetentionWindow): RateMetric {
  if (!raw.hasLoginData) return rateMetric(false, 0, 0);
  const { eligible, returned } = raw.windows[days];
  if (eligible === 0) {
    return {
      status: "no-data", count: null, base: 0, percent: null,
      note: `ยังไม่มีผู้ใช้ที่เริ่มใช้มาครบ ${days} วัน`,
    };
  }
  return { status: "real", count: returned, base: eligible, percent: percentOf(returned, eligible) };
}

function buildRetention(raw: RetentionRaw, nightlyUsers: NightlySeries): RetentionReport {
  const has = raw.hasLoginData;

  const otherStoreUsers: CountMetric = !has
    ? countMetric(false, 0)
    : raw.storesInRange < 2
      ? { status: "no-data", value: null, note: "ยังมีข้อมูลการใช้งานเพียง 1 ร้าน จึงเทียบข้ามร้านไม่ได้" }
      : { status: "real", value: raw.multiStoreUsers };

  return {
    activeUsers: countMetric(has, raw.activeUsers),
    returnedUsers: rateMetric(has, raw.returnedUsers, raw.activeUsers),
    sameStoreReturn: rateMetric(has, raw.sameStoreUsers, raw.activeUsers),
    otherStoreUsers,
    within7Days: windowMetric(raw, 7),
    within14Days: windowMetric(raw, 14),
    within30Days: windowMetric(raw, 30),
    within60Days: windowMetric(raw, 60),
    within90Days: windowMetric(raw, 90),
    nightsDistribution: has
      ? { status: "real", buckets: raw.nights }
      : { status: "no-data", buckets: null, note: NO_LOGIN_DATA_NOTE },
    span: { firstNight: raw.firstNight, lastNight: raw.lastNight },
    nightlyUsers,
  };
}

function buildCheers(
  c: CheersRaw,
  activeUsers: { hasLoginData: boolean; value: number },
  nightlySent: NightlySeries,
): CheersReport {
  const has = c.hasCheers;
  const note = NO_CHEERS_NOTE;
  const perUser: CountMetric = !has || !activeUsers.hasLoginData
    ? { status: "no-data", value: null, note: !has ? note : NO_LOGIN_DATA_NOTE }
    : activeUsers.value === 0
      ? { status: "no-data", value: null, note: "ไม่มีผู้ใช้งานในร้านและช่วงเวลานี้ จึงคำนวณค่าเฉลี่ยไม่ได้" }
      : { status: "real", value: c.sent / activeUsers.value };

  return {
    sent: countMetric(has, c.sent, note),
    senders: countMetric(has, c.senders, note),
    receivers: countMetric(has, c.receivers, note),
    accepted: countMetric(has, c.accepted, note),
    refused: countMetric(has, c.refused, note),
    pending: countMetric(has, c.pending, note),
    acceptanceRate: rateMetric(has, c.accepted, c.sent, note),
    perActiveUser: perUser,
    nightlySent,
  };
}

/** Match = a Cheers the other side accepted. "Led to chat" also needs message data to judge. */
function buildMatch(c: CheersRaw, nightlyMatches: NightlySeries): MatchReport {
  const has = c.hasCheers;
  return {
    total: countMetric(has, c.accepted, NO_CHEERS_NOTE),
    matchedUsers: countMetric(has, c.matchedUsers, NO_CHEERS_NOTE),
    matchRate: rateMetric(has, c.accepted, c.sent, NO_CHEERS_NOTE),
    ledToChat: ledToChat(c),
    nightlyMatches,
  };
}

function ledToChat(c: CheersRaw): RateMetric {
  if (!c.hasCheers) return rateMetric(false, 0, 0, NO_CHEERS_NOTE);
  if (!c.hasMessages) return rateMetric(false, 0, 0, NO_CHAT_NOTE);
  return rateMetric(true, c.ledToChat, c.accepted);
}

function buildChat(chat: ChatRaw, cheers: CheersRaw, nightlyChats: NightlySeries): ChatReport {
  const has = chat.hasMessages;
  return {
    started: countMetric(has, chat.started, NO_CHAT_NOTE),
    chattingUsers: countMetric(has, chat.chattingUsers, NO_CHAT_NOTE),
    twoWay: rateMetric(has, chat.twoWay, chat.started, NO_CHAT_NOTE),
    messages: countMetric(has, chat.messages, NO_CHAT_NOTE),
    matchToChat: ledToChat(cheers),
    nightlyChats,
  };
}

/** Users at each funnel step; steps whose source has no data are "no-data", never 0. */
function buildActivation(a: ActivationRaw): ActivationReport {
  const noCheers = !a.hasLoginData || !a.hasCheers;
  const cheersNote = !a.hasLoginData ? NO_LOGIN_DATA_NOTE : NO_CHEERS_NOTE;
  const noChat = noCheers || !a.hasMessages;
  const chatNote = noCheers ? cheersNote : NO_CHAT_NOTE;

  const steps: ActivationReport["steps"] = {
    checkIn: countMetric(a.hasLoginData, a.checkIn),
    cheersSent: countMetric(!noCheers, a.cheersSent, cheersNote),
    matched: countMetric(!noCheers, a.matched, cheersNote),
    chatStarted: countMetric(!noChat, a.chatStarted, chatNote),
    twoWayChat: countMetric(!noChat, a.twoWayChat, chatNote),
  };

  return {
    steps,
    notYetActive: {
      total: countMetric(!noCheers, a.notYetActive, cheersNote),
      newUsers: countMetric(!noCheers, a.notYetActiveNew, cheersNote),
      returningUsers: countMetric(!noCheers, a.notYetActive - a.notYetActiveNew, cheersNote),
    },
    unansweredReceivers: countMetric(a.hasCheers, a.unansweredReceivers, NO_CHEERS_NOTE),
    biggestDropOff: biggestDropOff(steps),
  };
}

const FUNNEL_ORDER = ["checkIn", "cheersSent", "matched", "chatStarted", "twoWayChat"] as const;

/** Lowest share carrying on between two neighbouring steps that both have real data. */
function biggestDropOff(steps: ActivationReport["steps"]): ActivationReport["biggestDropOff"] {
  let worst: { from: (typeof FUNNEL_ORDER)[number]; to: (typeof FUNNEL_ORDER)[number]; percent: number } | null = null;
  for (let i = 1; i < FUNNEL_ORDER.length; i++) {
    const prev = steps[FUNNEL_ORDER[i - 1]];
    const cur = steps[FUNNEL_ORDER[i]];
    if (prev.status !== "real" || cur.status !== "real" || !prev.value || cur.value === null) continue;
    const percent = (cur.value / prev.value) * 100;
    if (worst === null || percent < worst.percent) worst = { from: FUNNEL_ORDER[i - 1], to: FUNNEL_ORDER[i], percent };
  }
  return worst
    ? { status: "real", from: worst.from, to: worst.to, carriedOnPercent: worst.percent }
    : { status: "no-data", from: null, to: null, carriedOnPercent: null, note: "ยังไม่มีขั้นที่มีข้อมูลพอจะเปรียบเทียบ" };
}

function newest(values: (string | null)[]): string | null {
  const present = values.filter((v): v is string => v !== null);
  return present.length ? present.reduce((a, b) => (Date.parse(a) >= Date.parse(b) ? a : b)) : null;
}

/**
 * Engagement & Retention numbers for a store (or all stores) and a range of nights.
 * Every figure is computed in SQL from real tables; a source with no data at all reports "no-data".
 */
export async function getEngagementReport(opts: {
  from?: string;
  to?: string;
  storeId?: string;
}): Promise<EngagementReport> {
  const from = parseNight("from", opts.from);
  const to = parseNight("to", opts.to);
  if (from && to && from > to) throw new BadRequestError('"from" must not be after "to"');
  const storeId = opts.storeId ?? null;
  const filter = { from, to, storeId };
  const range = { from, to };

  // one connection, one query at a time (pg clients cannot run queries in parallel)
  return withClient(async (db) => {
    const retentionRaw = await fetchRetention(db, filter);
    const loginNights = await fetchNightlyActiveUsers(db, filter);
    // distinct users cannot be summed across nights, so long ranges are re-counted per week/month in SQL
    const loginBounds = seriesBounds(loginNights, range);
    const loginGranularity = granularityOf(loginBounds);
    const loginRows = loginGranularity === "night"
      ? loginNights
      : await fetchActiveUsersByBucket(db, filter, loginGranularity);
    const cheersRaw = await fetchCheersStats(db, filter);
    const cheersNights = await fetchNightlyCheers(db, filter);
    const chatRaw = await fetchChatStats(db, filter);
    const chatNights = await fetchNightlyChats(db, filter);
    const activationRaw = await fetchActivation(db, filter);
    const asOf = await fetchDataAsOf(db, storeId);

    const activeUsers = { hasLoginData: retentionRaw.hasLoginData, value: retentionRaw.activeUsers };

    return {
      query: { from, to, storeId },
      dataAsOf: { ...asOf, latest: newest([asOf.logins, asOf.cheers, asOf.chats, asOf.messages]) },
      retention: buildRetention(
        retentionRaw,
        buildSeries(retentionRaw.hasLoginData, loginRows, loginBounds, loginGranularity, NO_LOGIN_DATA_NOTE),
      ),
      cheers: buildCheers(cheersRaw, activeUsers, countSeries(cheersRaw.hasCheers, cheersNights.sent, range, NO_CHEERS_NOTE)),
      match: buildMatch(cheersRaw, countSeries(cheersRaw.hasCheers, cheersNights.matches, range, NO_CHEERS_NOTE)),
      chat: buildChat(chatRaw, cheersRaw, countSeries(chatRaw.hasMessages, chatNights, range, NO_CHAT_NOTE)),
      activation: buildActivation(activationRaw),
    };
  });
}
