// Server-only, READ-ONLY direct connection to the NearSip Postgres database.
//
// Never import this from a Client Component / "use client" file — it reads
// DATABASE_URL, which must stay on the server.
//
// This bypasses the .NET backend on purpose: the backend has no list/aggregate
// endpoints for users (only GET /api/user/{id} for a single, already-known id),
// so there is no way to compute counts like "unique users" or "new users"
// through its API. Every query in this file MUST be a plain SELECT — no
// INSERT/UPDATE/DELETE — this file only ever reads, it never writes to the DB.

import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }
    pool = new Pool({ connectionString, max: 3 });
  }
  return pool;
}

export type UserStats = {
  /** จำนวนผู้ใช้ทั้งหมดในระบบ (all-time COUNT(*) จากตาราง user) */
  uniqueUsers: number;
  /** จำนวนผู้ใช้ที่สมัคร (create_at) ภายใน `days` วันล่าสุด */
  newUsers: number;
  /** uniqueUsers - newUsers (คำนวณ ไม่ใช่ query แยก) */
  existingUsers: number;
  /** จำนวนผู้ใช้ distinct ที่เคยส่ง/รับ cheers อย่างน้อย 1 ครั้ง (all-time) */
  engagedUsers: number;
  /** engagedUsers / uniqueUsers * 100 */
  engagementRate: number;
  /** จำนวน session ที่ยังไม่หมดอายุ (expires > now()) — ใช้เป็นตัวแทน "ผู้ใช้ Active ตอนนี้" */
  activeSessions: number;
  /** จำนวนแถวทั้งหมดในตาราง cheers (all-time) */
  cheersTotal: number;
  /** จำนวนแถวทั้งหมดในตาราง chats (all-time) */
  chatsTotal: number;
  /** จำนวนผู้ใช้แยกตามเพศ (all-time, จาก user.gender) */
  genderBreakdown: { male: number; female: number; lgbtq: number };
  /** จำนวนผู้ใช้แยกตามช่วงอายุ (all-time, จาก user.age) */
  ageBreakdown: { a20: number; a31: number; a41: number; a51: number; a61: number };
  /** timestamp ดิบ (ISO string) สำหรับ bucket เป็น Timeline/Peak Time ใน dashboard-runtime.ts */
  activityTimestamps: ActivityTimestamps;
  /** cheers แยกตาม status จริง (all-time) — ใช้ทำ Engagement & Retention หน้า Cheers tab */
  cheersByStatus: { pending: number; accepted: number; refused: number };
  /** จำนวนผู้ส่ง cheers แบบ distinct (all-time) */
  cheersSenders: number;
  /** จำนวนผู้รับ cheers แบบ distinct (all-time) */
  cheersReceivers: number;
  /** จำนวนแถวทั้งหมดในตาราง messages (all-time) */
  messagesTotal: number;
  /** จำนวนร้านที่ set_location.create_date อยู่ภายใน `days` วันล่าสุด */
  newStores: number;
  /** login_log ดิบทั้งหมด — ใช้คำนวณ Visit Frequency / Repeat / Heatmap ฝั่ง JS (ไม่ bucket ใน SQL) */
  loginLogs: { userId: string | null; storeId: string | null; createAt: string }[];
  /**
   * ช่องทาง Login โดยประมาณจาก user.email — ไม่ใช่ field login-method ตรงๆ (ไม่มีใน DB)
   * แต่เป็น heuristic จริง: LINE OAuth ไม่บังคับให้มี email เสมอ ส่วน credentials login ต้องมี email
   * ดังนั้น email IS NULL ≈ LINE, email IS NOT NULL ≈ Email/Credentials
   */
  loginChannel: { email: number; line: number };
};

export type ActivityTimestamps = {
  /** cheers.create_at ทั้งหมด (ISO string) ใช้ทำ Timeline/Peak Time ของ Real-time page */
  cheersTimes: string[];
  /** chats.create_at ทั้งหมด (ISO string) */
  chatsTimes: string[];
  /** user.create_at ทั้งหมด — ใช้เป็นตัวแทน "ผู้ใช้ NearSip" timeline (ไม่มี timestamp อื่นบอกว่า user online ตอนไหน) */
  usersTimes: string[];
};

/** อ่านอย่างเดียว — SELECT COUNT(*) จากตาราง "user"/"cheers" เท่านั้น ไม่มีการเขียนข้อมูลใดๆ */
export async function getUserStats(days: number): Promise<UserStats> {
  const client = await getPool().connect();
  try {
    const userResult = await client.query<{ unique_users: string; new_users: string }>(
      `SELECT
         COUNT(*) AS unique_users,
         COUNT(*) FILTER (WHERE create_at >= now() - ($1 || ' days')::interval) AS new_users
       FROM "user"`,
      [days],
    );
    const userRow = userResult.rows[0];
    const uniqueUsers = Number(userRow?.unique_users ?? 0);
    const newUsers = Number(userRow?.new_users ?? 0);

    // engaged users = distinct user ที่เป็นผู้ส่งหรือผู้รับ cheers อย่างน้อย 1 ครั้ง
    const engagementResult = await client.query<{ engaged_users: string }>(
      `SELECT COUNT(*) AS engaged_users FROM (
         SELECT inittiator_user_id AS uid FROM cheers
         UNION
         SELECT responder_user_id FROM cheers
       ) engaged`,
    );
    const engagedUsers = Number(engagementResult.rows[0]?.engaged_users ?? 0);

    // ใช้สำหรับ Real-time page — session ที่ยังไม่หมดอายุ = ตัวแทน "active ตอนนี้"
    const sessionResult = await client.query<{ active_sessions: string }>(
      `SELECT COUNT(*) AS active_sessions FROM session WHERE expires > now()`,
    );
    const activeSessions = Number(sessionResult.rows[0]?.active_sessions ?? 0);

    const cheersTotalResult = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM cheers`,
    );
    const cheersTotal = Number(cheersTotalResult.rows[0]?.total ?? 0);

    const chatsTotalResult = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM chats`,
    );
    const chatsTotal = Number(chatsTotalResult.rows[0]?.total ?? 0);

    // เพศ — all-time จาก user.gender (enum MALE/FEMALE/LGBTQ)
    const genderResult = await client.query<{ gender: string; count: string }>(
      `SELECT gender::text, COUNT(*) AS count FROM "user" WHERE gender IS NOT NULL GROUP BY gender`,
    );
    const genderBreakdown = { male: 0, female: 0, lgbtq: 0 };
    for (const row of genderResult.rows) {
      const count = Number(row.count ?? 0);
      if (row.gender === "MALE") genderBreakdown.male = count;
      else if (row.gender === "FEMALE") genderBreakdown.female = count;
      else if (row.gender === "LGBTQ") genderBreakdown.lgbtq = count;
    }

    // ช่วงอายุ — all-time จาก user.age
    const ageResult = await client.query<{
      a20: string; a31: string; a41: string; a51: string; a61: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE age BETWEEN 20 AND 30) AS a20,
         COUNT(*) FILTER (WHERE age BETWEEN 31 AND 40) AS a31,
         COUNT(*) FILTER (WHERE age BETWEEN 41 AND 50) AS a41,
         COUNT(*) FILTER (WHERE age BETWEEN 51 AND 60) AS a51,
         COUNT(*) FILTER (WHERE age BETWEEN 61 AND 70) AS a61
       FROM "user"`,
    );
    const ageRow = ageResult.rows[0];
    const ageBreakdown = {
      a20: Number(ageRow?.a20 ?? 0),
      a31: Number(ageRow?.a31 ?? 0),
      a41: Number(ageRow?.a41 ?? 0),
      a51: Number(ageRow?.a51 ?? 0),
      a61: Number(ageRow?.a61 ?? 0),
    };

    // timestamp ดิบสำหรับ Timeline/Peak Time — ไม่ bucket ใน SQL เพื่อไม่ให้ logic การแบ่งช่วงเวลา
    // ซ้ำซ้อนกับที่ dashboard-runtime.ts มีอยู่แล้ว (labels/granularity คำนวณฝั่ง JS)
    // จำกัด 5000 แถวล่าสุดต่อ table กันโหลดหนักถ้าข้อมูลเยอะขึ้นในอนาคต
    // รันทีละ query บน client เดียวกัน (ไม่ใช้ Promise.all) — pg client รันได้ทีละ query เท่านั้น
    const cheersTimesResult = await client.query<{ create_at: string }>(
      `SELECT create_at FROM cheers ORDER BY create_at DESC LIMIT 5000`,
    );
    const chatsTimesResult = await client.query<{ create_at: string }>(
      `SELECT create_at FROM chats ORDER BY create_at DESC LIMIT 5000`,
    );
    const usersTimesResult = await client.query<{ create_at: string }>(
      `SELECT create_at FROM "user" ORDER BY create_at DESC LIMIT 5000`,
    );
    const activityTimestamps: ActivityTimestamps = {
      cheersTimes: cheersTimesResult.rows.map((r) => r.create_at),
      chatsTimes: chatsTimesResult.rows.map((r) => r.create_at),
      usersTimes: usersTimesResult.rows.map((r) => r.create_at),
    };

    // cheers แยกตาม status จริง (enum CheersStatus: Pending=0, Accepted=1, Refuse=2)
    const cheersStatusResult = await client.query<{ status: number; count: string }>(
      `SELECT status, COUNT(*) AS count FROM cheers GROUP BY status`,
    );
    const cheersByStatus = { pending: 0, accepted: 0, refused: 0 };
    for (const row of cheersStatusResult.rows) {
      const count = Number(row.count ?? 0);
      if (row.status === 0) cheersByStatus.pending = count;
      else if (row.status === 1) cheersByStatus.accepted = count;
      else if (row.status === 2) cheersByStatus.refused = count;
    }

    const cheersPeopleResult = await client.query<{ senders: string; receivers: string }>(
      `SELECT COUNT(DISTINCT inittiator_user_id) AS senders, COUNT(DISTINCT responder_user_id) AS receivers FROM cheers`,
    );
    const cheersSenders = Number(cheersPeopleResult.rows[0]?.senders ?? 0);
    const cheersReceivers = Number(cheersPeopleResult.rows[0]?.receivers ?? 0);

    const messagesTotalResult = await client.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM messages`,
    );
    const messagesTotal = Number(messagesTotalResult.rows[0]?.total ?? 0);

    const newStoresResult = await client.query<{ new_stores: string }>(
      `SELECT COUNT(*) AS new_stores FROM set_location WHERE create_date >= now() - ($1 || ' days')::interval`,
      [days],
    );
    const newStores = Number(newStoresResult.rows[0]?.new_stores ?? 0);

    // login_log ดิบ — ใช้ทำ Visit Frequency / Repeat / Time & Night heatmap ฝั่ง JS
    const loginLogResult = await client.query<{
      user_id: string | null; store_id: string | null; create_date: string;
    }>(
      `SELECT user_id, store_id, create_date FROM login_log ORDER BY create_date DESC LIMIT 5000`,
    );
    const loginLogs = loginLogResult.rows.map((r) => ({
      userId: r.user_id,
      storeId: r.store_id,
      createAt: r.create_date,
    }));

    // ช่องทาง Login โดยประมาณจาก email — ดู comment บน type ActivityTimestamps ด้านบน
    const loginChannelResult = await client.query<{ email_count: string; line_count: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE email IS NOT NULL) AS email_count,
         COUNT(*) FILTER (WHERE email IS NULL) AS line_count
       FROM "user"`,
    );
    const loginChannel = {
      email: Number(loginChannelResult.rows[0]?.email_count ?? 0),
      line: Number(loginChannelResult.rows[0]?.line_count ?? 0),
    };

    return {
      uniqueUsers,
      newUsers,
      existingUsers: Math.max(0, uniqueUsers - newUsers),
      engagedUsers,
      engagementRate: uniqueUsers > 0 ? (engagedUsers / uniqueUsers) * 100 : 0,
      activeSessions,
      cheersTotal,
      chatsTotal,
      genderBreakdown,
      ageBreakdown,
      activityTimestamps,
      cheersByStatus,
      cheersSenders,
      cheersReceivers,
      messagesTotal,
      newStores,
      loginLogs,
      loginChannel,
    };
  } finally {
    client.release();
  }
}
