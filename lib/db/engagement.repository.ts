import { BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR } from "@/lib/domain/period";
import type { Queryable } from "./pool";
import { storeFilter, toNumber } from "./sql";

export type NightFilter = { from: string | null; to: string | null; storeId: string | null };

export const RETENTION_WINDOWS = [7, 14, 30, 60, 90] as const;
export type RetentionWindow = (typeof RETENTION_WINDOWS)[number];

export type RetentionRaw = {
  /** login_log has at least one usable row anywhere in the system. */
  hasLoginData: boolean;
  activeUsers: number;
  returnedUsers: number;
  sameStoreUsers: number;
  multiStoreUsers: number;
  /** Distinct stores with any night of use in the date range (ignores the store filter). */
  storesInRange: number;
  nights: { one: number; two: number; three: number; fourPlus: number };
  firstNight: string | null;
  lastNight: string | null;
  windows: Record<RetentionWindow, { eligible: number; returned: number }>;
};

/**
 * Shared CTEs: one row per (user, store, night) from login_log.
 *   in_range  every store, nights inside [$1, $2]   scope  in_range limited to store $3
 * Params: $1 from, $2 to, $3 storeId, $4 time zone, $5 night cut-off hour.
 */
export const LOGIN_NIGHT_CTES = `base AS (
       SELECT user_id, store_id,
              ((create_date AT TIME ZONE $4::text) - make_interval(hours => $5::int))::date AS night
       FROM login_log
       WHERE user_id IS NOT NULL AND user_id <> ''
     ),
     in_range AS (
       SELECT DISTINCT user_id, store_id, night FROM base
       WHERE ($1::date IS NULL OR night >= $1::date) AND ($2::date IS NULL OR night <= $2::date)
     ),
     scope AS (
       SELECT * FROM in_range WHERE ${storeFilter(3)}
     )`;

/** `night` is the first night of the row's bucket (a night, a Monday-start week or a month). */
export type NightlyRow = { night: string; value: number };

/** Distinct active users per night (only nights that have activity). */
export async function fetchNightlyActiveUsers(db: Queryable, f: NightFilter): Promise<NightlyRow[]> {
  const result = await db.query<{ night: string; users: string }>(
    `WITH ${LOGIN_NIGHT_CTES}
     SELECT night::text AS night, COUNT(DISTINCT user_id) AS users FROM scope GROUP BY night ORDER BY night`,
    [f.from, f.to, f.storeId, BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR],
  );
  return result.rows.map((r) => ({ night: r.night, value: toNumber(r.users) }));
}

/**
 * Distinct active users per week or month — counted per bucket, so someone who came on three nights
 * of the same week is one user (adding up nightly figures would count them three times).
 */
export async function fetchActiveUsersByBucket(
  db: Queryable,
  f: NightFilter,
  bucket: "week" | "month",
): Promise<NightlyRow[]> {
  const result = await db.query<{ bucket: string; users: string }>(
    `WITH ${LOGIN_NIGHT_CTES}
     SELECT date_trunc($6::text, night)::date::text AS bucket, COUNT(DISTINCT user_id) AS users
     FROM scope GROUP BY 1 ORDER BY 1`,
    [f.from, f.to, f.storeId, BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR, bucket],
  );
  return result.rows.map((r) => ({ night: r.bucket, value: toNumber(r.users) }));
}

/**
 * Retention from login_log, computed in SQL (no row cap).
 *
 * A "night" = the Bangkok-local date of the login shifted back by NIGHT_CUTOFF_HOUR, and
 * repeated logins in one night collapse to a single (user, store, night) row. Then:
 *   in_range  every store, nights inside [from, to]
 *   scope     in_range limited to the selected store (or all stores)
 * Per-window figures only count users whose first night is at least N nights before `as_of`
 * (the newest night with data, capped at `to`) — newer users have had no chance to return yet.
 */
export async function fetchRetention(db: Queryable, f: NightFilter): Promise<RetentionRaw> {
  const windowColumns = RETENTION_WINDOWS.map(
    (n) => `
      (SELECT COUNT(*) FROM per_user, as_of WHERE first_night + ${n} <= as_of_night) AS eligible_${n},
      (SELECT COUNT(*) FROM per_user, as_of
         WHERE first_night + ${n} <= as_of_night AND second_night IS NOT NULL
           AND second_night - first_night <= ${n}) AS returned_${n}`,
  ).join(",");

  const result = await db.query<Record<string, string | boolean | null>>(
    `WITH ${LOGIN_NIGHT_CTES},
     per_user AS (
       SELECT user_id,
              COUNT(DISTINCT night)::int AS nights,
              MIN(night) AS first_night,
              (ARRAY_AGG(DISTINCT night ORDER BY night))[2] AS second_night
       FROM scope GROUP BY user_id
     ),
     same_store AS (
       SELECT DISTINCT user_id FROM (
         SELECT user_id FROM scope GROUP BY user_id, store_id HAVING COUNT(DISTINCT night) >= 2
       ) s
     ),
     multi_store AS (
       SELECT r.user_id FROM in_range r JOIN per_user u ON u.user_id = r.user_id
       GROUP BY r.user_id HAVING COUNT(DISTINCT r.store_id) >= 2
     ),
     as_of AS (
       SELECT LEAST(COALESCE($2::date, MAX(night)), MAX(night)) AS as_of_night FROM base
     )
     SELECT
       EXISTS (SELECT 1 FROM login_log) AS has_login_data,
       (SELECT COUNT(*) FROM per_user) AS active_users,
       (SELECT COUNT(*) FROM per_user WHERE nights >= 2) AS returned_users,
       (SELECT COUNT(*) FROM same_store) AS same_store_users,
       (SELECT COUNT(*) FROM multi_store) AS multi_store_users,
       (SELECT COUNT(DISTINCT store_id) FROM in_range) AS stores_in_range,
       (SELECT COUNT(*) FROM per_user WHERE nights = 1) AS n1,
       (SELECT COUNT(*) FROM per_user WHERE nights = 2) AS n2,
       (SELECT COUNT(*) FROM per_user WHERE nights = 3) AS n3,
       (SELECT COUNT(*) FROM per_user WHERE nights >= 4) AS n4,
       (SELECT MIN(night)::text FROM scope) AS first_night,
       (SELECT MAX(night)::text FROM scope) AS last_night,
       ${windowColumns}`,
    [f.from, f.to, f.storeId, BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR],
  );

  const row = result.rows[0] ?? {};
  const windows = {} as RetentionRaw["windows"];
  for (const n of RETENTION_WINDOWS) {
    windows[n] = { eligible: toNumber(row[`eligible_${n}`]), returned: toNumber(row[`returned_${n}`]) };
  }

  return {
    hasLoginData: row.has_login_data === true,
    activeUsers: toNumber(row.active_users),
    returnedUsers: toNumber(row.returned_users),
    sameStoreUsers: toNumber(row.same_store_users),
    multiStoreUsers: toNumber(row.multi_store_users),
    storesInRange: toNumber(row.stores_in_range),
    nights: { one: toNumber(row.n1), two: toNumber(row.n2), three: toNumber(row.n3), fourPlus: toNumber(row.n4) },
    firstNight: (row.first_night as string | null) ?? null,
    lastNight: (row.last_night as string | null) ?? null,
    windows,
  };
}

export type DataAsOfRaw = {
  logins: string | null;
  cheers: string | null;
  chats: string | null;
  messages: string | null;
};

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

/** Newest real event per source within the selected store (not clipped to the date range). */
export async function fetchDataAsOf(db: Queryable, storeId: string | null): Promise<DataAsOfRaw> {
  const logins = await db.query<{ t: unknown }>(
    `SELECT MAX(create_date) AS t FROM login_log WHERE ${storeFilter(1)}`, [storeId]);
  const cheers = await db.query<{ t: unknown }>(
    `SELECT MAX(create_at) AS t FROM cheers WHERE ${storeFilter(1)}`, [storeId]);
  const chats = await db.query<{ t: unknown }>(
    `SELECT MAX(create_at) AS t FROM chats WHERE ${storeFilter(1)}`, [storeId]);
  const messages = await db.query<{ t: unknown }>(
    `SELECT MAX(m.sent_at) AS t FROM messages m JOIN chats c ON c.id = m.chat_id
     WHERE ${storeFilter(1, "c.store_id")}`, [storeId]);
  return {
    logins: toIso(logins.rows[0]?.t),
    cheers: toIso(cheers.rows[0]?.t),
    chats: toIso(chats.rows[0]?.t),
    messages: toIso(messages.rows[0]?.t),
  };
}
