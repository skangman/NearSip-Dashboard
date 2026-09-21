// Shapes of the Engagement & Retention report (GET /api/engagement).
//
// Every number carries its own status so the UI never has to guess:
//   real            – computed from real data; 0 means "checked, nothing happened"
//   no-data         – the source has no data for it yet → show "ยังไม่มีข้อมูล" (never 0)
//   in-development  – not built yet → show "อยู่ระหว่างพัฒนา"

export type MetricStatus = "real" | "no-data" | "in-development";

export type CountMetric = { status: MetricStatus; value: number | null; note?: string };

/** `count` out of `base` people; percent is null when base is 0 or the metric has no data. */
export type RateMetric = {
  status: MetricStatus;
  count: number | null;
  base: number | null;
  percent: number | null;
  note?: string;
};

/**
 * One point per bucket (zero-filled), ready to chart. A bucket is a night, a Monday-start week or a
 * calendar month depending on the range length. `night`..`end` is the part of the bucket that lies
 * inside the selected range (YYYY-MM-DD).
 */
export type NightlyPoint = { night: string; end: string; value: number };

export type NightlySeries = {
  status: MetricStatus;
  granularity: "night" | "week" | "month";
  /** null = no data at all; [] = source has data but nothing in the selected range. */
  points: NightlyPoint[] | null;
  note?: string;
};

export type NightBuckets = { one: number; two: number; three: number; fourPlus: number };

export type RetentionReport = {
  /** Users with at least one night of use in the selected store/range. */
  activeUsers: CountMetric;
  /** Used NearSip on 2+ different nights. Base: activeUsers. */
  returnedUsers: RateMetric;
  /** Used the same store on 2+ different nights. Base: activeUsers. */
  sameStoreReturn: RateMetric;
  /** Used 2+ different stores. */
  otherStoreUsers: CountMetric;
  /** Second night within N days of the first. Base: users whose first night is at least N days old. */
  within7Days: RateMetric;
  within14Days: RateMetric;
  within30Days: RateMetric;
  within60Days: RateMetric;
  within90Days: RateMetric;
  /** Users by number of distinct nights used. */
  nightsDistribution: { status: MetricStatus; buckets: NightBuckets | null; note?: string };
  /** First and last night that actually have data in scope (YYYY-MM-DD). */
  span: { firstNight: string | null; lastNight: string | null };
  /** Distinct users active on each night. */
  nightlyUsers: NightlySeries;
};

/** Cheers are counted on the night they were sent. */
export type CheersReport = {
  sent: CountMetric;
  /** Distinct users who sent at least one Cheers. */
  senders: CountMetric;
  /** Distinct users who received at least one Cheers. */
  receivers: CountMetric;
  accepted: CountMetric;
  refused: CountMetric;
  /** Not answered yet. */
  pending: CountMetric;
  /** accepted ÷ sent. */
  acceptanceRate: RateMetric;
  /** Cheers sent per active user (sent ÷ users active in the same scope). */
  perActiveUser: CountMetric;
  nightlySent: NightlySeries;
};

/** A Match is a Cheers that the other side accepted. */
export type MatchReport = {
  total: CountMetric;
  /** Distinct users on either side of an accepted Cheers. */
  matchedUsers: CountMetric;
  /** accepted ÷ sent — same formula as the Cheers acceptance rate. */
  matchRate: RateMetric;
  /** Matches whose pair went on to send at least one chat message. Base: total matches. */
  ledToChat: RateMetric;
  nightlyMatches: NightlySeries;
};

/** Chat counts only — message content is never read. */
export type ChatReport = {
  /** Chat rooms with at least one message, counted on the night of the first message. */
  started: CountMetric;
  /** Distinct users who sent a message in the range. */
  chattingUsers: CountMetric;
  /** Started chats where both sides sent a message. Base: started. */
  twoWay: RateMetric;
  /** Messages sent in the range. */
  messages: CountMetric;
  /** Same figure as MatchReport.ledToChat, shown on the Chat tab too. */
  matchToChat: RateMetric;
  nightlyChats: NightlySeries;
};

/** Users who checked in, and how far each got — every step is a subset of the one before it. */
export type ActivationReport = {
  steps: {
    /** Check-in (เข้าร้าน): at least one night of use in the selected store/range. */
    checkIn: CountMetric;
    /** Cheers Sent (ส่ง Cheers): of those, sent at least one Cheers in the range. */
    cheersSent: CountMetric;
    /** Matched (ถูกตอบรับ): of those, at least one Cheers they sent was accepted. */
    matched: CountMetric;
    /** Chat Started (เริ่มแชต): of those, that pair has a chat with at least one message. */
    chatStarted: CountMetric;
    /** Two-way Chat (แชตสองทาง): of those, both sides sent a message. */
    twoWayChat: CountMetric;
  };
  /** Checked in but never sent or received a Cheers and sent no message in the range. */
  notYetActive: { total: CountMetric; newUsers: CountMetric; returningUsers: CountMetric };
  /** Users with a Cheers waiting for their answer. */
  unansweredReceivers: CountMetric;
  /** Step with the lowest share of users carrying on from the step before it. */
  biggestDropOff: {
    status: MetricStatus;
    from: keyof ActivationReport["steps"] | null;
    to: keyof ActivationReport["steps"] | null;
    /** Percent that carried on from `from` to `to`. */
    carriedOnPercent: number | null;
    note?: string;
  };
};

export type EngagementReport = {
  query: { from: string | null; to: string | null; storeId: string | null };
  /** Timestamp (ISO) of the newest real event per source, within the selected store. */
  dataAsOf: {
    logins: string | null;
    cheers: string | null;
    chats: string | null;
    messages: string | null;
    latest: string | null;
  };
  retention: RetentionReport;
  cheers: CheersReport;
  match: MatchReport;
  chat: ChatReport;
  activation: ActivationReport;
};
