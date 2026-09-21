// Cheers / Match / Chat aggregates for the Engagement page — plain SELECTs, counts only.
// Message content (messages.text) is never selected.
//
// Params for every query: $1 from, $2 to (business nights), $3 storeId, $4 time zone, $5 cut-off hour.

import { BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR } from "@/lib/domain/period";
import { LOGIN_NIGHT_CTES, type NightFilter, type NightlyRow } from "./engagement.repository";
import type { Queryable } from "./pool";
import { storeFilter, toNumber } from "./sql";

const night = (column: string) =>
  `((${column} AT TIME ZONE $4::text) - make_interval(hours => $5::int))::date`;
const inRange = (column: string) =>
  `($1::date IS NULL OR ${column} >= $1::date) AND ($2::date IS NULL OR ${column} <= $2::date)`;
const queryParams = (f: NightFilter) => [f.from, f.to, f.storeId, BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR];

/** Cheers status: 0 = pending, 1 = accepted (= a Match), 2 = refused. */
const CHEERS_CTE = `r AS (
  SELECT id, store_id, inittiator_user_id AS sender, responder_user_id AS receiver, status, create_at,
         ${night("create_at")} AS night
  FROM cheers WHERE ${storeFilter(3)}
), r2 AS (SELECT * FROM r WHERE ${inRange("night")})`;

export type CheersRaw = {
  hasCheers: boolean;
  /** messages has at least one row anywhere — needed to judge "Match → chat". */
  hasMessages: boolean;
  sent: number;
  senders: number;
  receivers: number;
  accepted: number;
  refused: number;
  pending: number;
  matchedUsers: number;
  /** Accepted Cheers whose pair (same store) has a chat with at least one message. */
  ledToChat: number;
};

export async function fetchCheersStats(db: Queryable, f: NightFilter): Promise<CheersRaw> {
  const result = await db.query<Record<string, string | boolean>>(
    `WITH ${CHEERS_CTE}
     SELECT
       EXISTS (SELECT 1 FROM cheers) AS has_cheers,
       EXISTS (SELECT 1 FROM messages) AS has_messages,
       COUNT(*) AS sent,
       COUNT(DISTINCT sender) AS senders,
       COUNT(DISTINCT receiver) AS receivers,
       COUNT(*) FILTER (WHERE status = 1) AS accepted,
       COUNT(*) FILTER (WHERE status = 2) AS refused,
       COUNT(*) FILTER (WHERE status = 0) AS pending,
       (SELECT COUNT(*) FROM (
          SELECT sender AS u FROM r2 WHERE status = 1 AND sender IS NOT NULL
          UNION
          SELECT receiver FROM r2 WHERE status = 1 AND receiver IS NOT NULL
        ) matched) AS matched_users,
       (SELECT COUNT(*) FROM r2 WHERE status = 1 AND EXISTS (
          SELECT 1 FROM chats ch
          WHERE ch.store_id = r2.store_id
            AND ((ch.user1_id = r2.sender AND ch.user2_id = r2.receiver)
              OR (ch.user1_id = r2.receiver AND ch.user2_id = r2.sender))
            AND ch.create_at >= r2.create_at
            AND EXISTS (SELECT 1 FROM messages m WHERE m.chat_id = ch.id)
       )) AS led_to_chat
     FROM r2`,
    queryParams(f),
  );
  const row = result.rows[0] ?? {};
  return {
    hasCheers: row.has_cheers === true,
    hasMessages: row.has_messages === true,
    sent: toNumber(row.sent),
    senders: toNumber(row.senders),
    receivers: toNumber(row.receivers),
    accepted: toNumber(row.accepted),
    refused: toNumber(row.refused),
    pending: toNumber(row.pending),
    matchedUsers: toNumber(row.matched_users),
    ledToChat: toNumber(row.led_to_chat),
  };
}

/** Per night: Cheers sent and Cheers accepted (Matches). Only nights that have activity. */
export async function fetchNightlyCheers(
  db: Queryable,
  f: NightFilter,
): Promise<{ sent: NightlyRow[]; matches: NightlyRow[] }> {
  const result = await db.query<{ night: string; sent: string; accepted: string }>(
    `WITH ${CHEERS_CTE}
     SELECT night::text AS night, COUNT(*) AS sent, COUNT(*) FILTER (WHERE status = 1) AS accepted
     FROM r2 GROUP BY night ORDER BY night`,
    queryParams(f),
  );
  return {
    sent: result.rows.map((r) => ({ night: r.night, value: toNumber(r.sent) })),
    matches: result.rows.map((r) => ({ night: r.night, value: toNumber(r.accepted) })),
  };
}

/**
 * Chats are counted on the night of their first message ("chat started" = first message sent).
 * A chat is two-way when at least two different users sent messages in it.
 */
const CHAT_CTES = `msgs AS (
  SELECT m.chat_id, m.sender_id, m.sent_at
  FROM messages m JOIN chats ch ON ch.id = m.chat_id
  WHERE ${storeFilter(3, "ch.store_id")}
), started AS (
  SELECT chat_id, MIN(sent_at) AS first_at, COUNT(DISTINCT sender_id) AS senders FROM msgs GROUP BY chat_id
), s2 AS (
  SELECT chat_id, senders, ${night("first_at")} AS night FROM started
)`;

export type ChatRaw = {
  hasMessages: boolean;
  started: number;
  twoWay: number;
  messages: number;
  chattingUsers: number;
};

export async function fetchChatStats(db: Queryable, f: NightFilter): Promise<ChatRaw> {
  const result = await db.query<Record<string, string | boolean>>(
    `WITH ${CHAT_CTES}
     SELECT
       EXISTS (SELECT 1 FROM messages) AS has_messages,
       (SELECT COUNT(*) FROM s2 WHERE ${inRange("night")}) AS chats_started,
       (SELECT COUNT(*) FROM s2 WHERE ${inRange("night")} AND senders >= 2) AS two_way,
       (SELECT COUNT(*) FROM msgs WHERE ${inRange(night("sent_at"))}) AS messages,
       (SELECT COUNT(DISTINCT sender_id) FROM msgs WHERE ${inRange(night("sent_at"))}) AS chatting_users`,
    queryParams(f),
  );
  const row = result.rows[0] ?? {};
  return {
    hasMessages: row.has_messages === true,
    started: toNumber(row.chats_started),
    twoWay: toNumber(row.two_way),
    messages: toNumber(row.messages),
    chattingUsers: toNumber(row.chatting_users),
  };
}

export async function fetchNightlyChats(db: Queryable, f: NightFilter): Promise<NightlyRow[]> {
  const result = await db.query<{ night: string; chats: string }>(
    `WITH ${CHAT_CTES}
     SELECT night::text AS night, COUNT(*) AS chats FROM s2 WHERE ${inRange("night")} GROUP BY night ORDER BY night`,
    queryParams(f),
  );
  return result.rows.map((r) => ({ night: r.night, value: toNumber(r.chats) }));
}

export type ActivationRaw = {
  hasLoginData: boolean;
  hasCheers: boolean;
  hasMessages: boolean;
  checkIn: number;
  cheersSent: number;
  matched: number;
  chatStarted: number;
  twoWayChat: number;
  notYetActive: number;
  /** Of notYetActive: first-ever night of use falls inside the selected range. */
  notYetActiveNew: number;
  unansweredReceivers: number;
};

/**
 * Activation funnel for users who checked in (login nights in scope). Each step keeps only the users
 * of the step before it. Reuses the login / Cheers / chat CTEs above, so nights and store filters
 * mean exactly what they mean everywhere else on the page.
 *
 * Chain per user: sent a Cheers → one of their sent Cheers accepted → that pair (same store, chat
 * created after the Cheers) has a chat with a message → that chat has messages from both sides.
 */
export async function fetchActivation(db: Queryable, f: NightFilter): Promise<ActivationRaw> {
  const pairChat = `ch.store_id = r2.store_id
            AND ((ch.user1_id = r2.sender AND ch.user2_id = r2.receiver)
              OR (ch.user1_id = r2.receiver AND ch.user2_id = r2.sender))
            AND ch.create_at >= r2.create_at`;
  const result = await db.query<Record<string, string | boolean>>(
    `WITH ${LOGIN_NIGHT_CTES},
     ${CHEERS_CTE},
     ${CHAT_CTES},
     u AS (SELECT DISTINCT user_id FROM scope),
     first_ever AS (SELECT user_id, MIN(night) AS night FROM base GROUP BY user_id),
     sent AS (SELECT DISTINCT sender AS user_id FROM r2 WHERE sender IS NOT NULL),
     received AS (SELECT DISTINCT receiver AS user_id FROM r2 WHERE receiver IS NOT NULL),
     chatters AS (
       SELECT DISTINCT sender_id AS user_id FROM msgs
       WHERE sender_id IS NOT NULL AND ${inRange(night("sent_at"))}
     ),
     accepted AS (
       SELECT r2.sender AS user_id,
              EXISTS (SELECT 1 FROM chats ch WHERE ${pairChat}
                        AND EXISTS (SELECT 1 FROM messages m WHERE m.chat_id = ch.id)) AS led,
              EXISTS (SELECT 1 FROM chats ch WHERE ${pairChat}
                        AND (SELECT COUNT(DISTINCT m.sender_id) FROM messages m WHERE m.chat_id = ch.id) >= 2) AS two_way
       FROM r2 WHERE r2.status = 1 AND r2.sender IS NOT NULL
     ),
     accepted_user AS (SELECT user_id, BOOL_OR(led) AS led, BOOL_OR(two_way) AS two_way FROM accepted GROUP BY user_id),
     idle AS (
       SELECT u.user_id FROM u
       WHERE NOT EXISTS (SELECT 1 FROM sent s WHERE s.user_id = u.user_id)
         AND NOT EXISTS (SELECT 1 FROM received r WHERE r.user_id = u.user_id)
         AND NOT EXISTS (SELECT 1 FROM chatters c WHERE c.user_id = u.user_id)
     )
     SELECT
       EXISTS (SELECT 1 FROM login_log) AS has_login_data,
       EXISTS (SELECT 1 FROM cheers) AS has_cheers,
       EXISTS (SELECT 1 FROM messages) AS has_messages,
       (SELECT COUNT(*) FROM u) AS check_in,
       (SELECT COUNT(*) FROM u JOIN sent s ON s.user_id = u.user_id) AS cheers_sent,
       (SELECT COUNT(*) FROM u JOIN accepted_user a ON a.user_id = u.user_id) AS matched,
       (SELECT COUNT(*) FROM u JOIN accepted_user a ON a.user_id = u.user_id WHERE a.led) AS chat_started,
       (SELECT COUNT(*) FROM u JOIN accepted_user a ON a.user_id = u.user_id WHERE a.two_way) AS two_way_chat,
       (SELECT COUNT(*) FROM idle) AS not_yet_active,
       (SELECT COUNT(*) FROM idle i JOIN first_ever fe ON fe.user_id = i.user_id
         WHERE $1::date IS NULL OR fe.night >= $1::date) AS not_yet_active_new,
       (SELECT COUNT(DISTINCT receiver) FROM r2 WHERE status = 0 AND receiver IS NOT NULL) AS unanswered_receivers`,
    queryParams(f),
  );
  const row = result.rows[0] ?? {};
  return {
    hasLoginData: row.has_login_data === true,
    hasCheers: row.has_cheers === true,
    hasMessages: row.has_messages === true,
    checkIn: toNumber(row.check_in),
    cheersSent: toNumber(row.cheers_sent),
    matched: toNumber(row.matched),
    chatStarted: toNumber(row.chat_started),
    twoWayChat: toNumber(row.two_way_chat),
    notYetActive: toNumber(row.not_yet_active),
    notYetActiveNew: toNumber(row.not_yet_active_new),
    unansweredReceivers: toNumber(row.unanswered_receivers),
  };
}
