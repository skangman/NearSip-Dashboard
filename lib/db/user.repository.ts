import { BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR } from "@/lib/domain/period";
import type { Queryable } from "./pool";
import { toNumber, userInStoreFilter } from "./sql";

export type UserCounts = {
  uniqueUsers: number;
  /** null when the range has no `from` (open-ended start) */
  newUsers: number | null;
  existingUsers: number | null;
  newUsersTonight: number;
  existingUsersTonight: number;
};

// The business night a signup belongs to — same rule as the Engagement queries: Bangkok time, day cut at 06:00.
const signupNight = `((create_at AT TIME ZONE $4::text) - make_interval(hours => $5::int))::date`;

/**
 * Total users plus the new / existing split. A user is "new" when the signup night (user.create_at) falls
 * inside [from, to] (business nights, either end open) and "existing" when it is before `from`.
 * `tonight` is the current business night, always reported so the Real-time view does not depend on the period.
 */
export async function countUsers(
  db: Queryable,
  range: { from: string | null; to: string | null },
  tonight: string,
  storeId: string | null,
): Promise<UserCounts> {
  const result = await db.query<Record<string, string | null>>(
    `SELECT
       COUNT(*) AS unique_users,
       COUNT(*) FILTER (WHERE $1::date IS NOT NULL AND ${signupNight} >= $1::date
                          AND ($2::date IS NULL OR ${signupNight} <= $2::date)) AS new_users,
       COUNT(*) FILTER (WHERE $1::date IS NOT NULL AND ${signupNight} < $1::date) AS existing_users,
       COUNT(*) FILTER (WHERE ${signupNight} >= $6::date) AS new_tonight,
       COUNT(*) FILTER (WHERE ${signupNight} < $6::date) AS existing_tonight
     FROM "user"
     WHERE ${userInStoreFilter(3)}`,
    [range.from, range.to, storeId, BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR, tonight],
  );
  const row = result.rows[0];
  return {
    uniqueUsers: toNumber(row?.unique_users),
    newUsers: range.from === null ? null : toNumber(row?.new_users),
    existingUsers: range.from === null ? null : toNumber(row?.existing_users),
    newUsersTonight: toNumber(row?.new_tonight),
    existingUsersTonight: toNumber(row?.existing_tonight),
  };
}

/** เฉพาะ unique_users (ไม่ต้องใช้ days) — สำหรับ poll เบาของ Active-now */
export async function countUniqueUsers(db: Queryable, storeId: string | null): Promise<number> {
  const result = await db.query<{ unique_users: string }>(
    `SELECT COUNT(*) AS unique_users FROM "user" WHERE ${userInStoreFilter(1)}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.unique_users);
}

/**
 * session ที่ยังไม่หมดอายุ — ตาราง session ไม่มี store_id เลย
 * กรองตามร้านไม่ได้จริง เป็นยอดรวมทั้งระบบเสมอ
 */
export async function countActiveSessions(db: Queryable): Promise<number> {
  const result = await db.query<{ active_sessions: string }>(
    `SELECT COUNT(*) AS active_sessions FROM session WHERE expires > now()`,
  );
  return toNumber(result.rows[0]?.active_sessions);
}

/** เพศ — จาก user.gender (enum MALE/FEMALE/LGBTQ) */
export async function countByGender(
  db: Queryable,
  storeId: string | null,
): Promise<{ male: number; female: number; lgbtq: number }> {
  const result = await db.query<{ gender: string; count: string }>(
    `SELECT gender::text, COUNT(*) AS count FROM "user"
     WHERE gender IS NOT NULL AND ${userInStoreFilter(1)}
     GROUP BY gender`,
    [storeId],
  );
  const breakdown = { male: 0, female: 0, lgbtq: 0 };
  for (const row of result.rows) {
    const count = toNumber(row.count);
    if (row.gender === "MALE") breakdown.male = count;
    else if (row.gender === "FEMALE") breakdown.female = count;
    else if (row.gender === "LGBTQ") breakdown.lgbtq = count;
  }
  return breakdown;
}

export async function countByAgeBand(
  db: Queryable,
  storeId: string | null,
): Promise<{ a20: number; a31: number; a41: number; a51: number; a61: number }> {
  const result = await db.query<{
    a20: string; a31: string; a41: string; a51: string; a61: string;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE age BETWEEN 20 AND 30) AS a20,
       COUNT(*) FILTER (WHERE age BETWEEN 31 AND 40) AS a31,
       COUNT(*) FILTER (WHERE age BETWEEN 41 AND 50) AS a41,
       COUNT(*) FILTER (WHERE age BETWEEN 51 AND 60) AS a51,
       COUNT(*) FILTER (WHERE age BETWEEN 61 AND 70) AS a61
     FROM "user"
     WHERE ${userInStoreFilter(1)}`,
    [storeId],
  );
  const row = result.rows[0];
  return {
    a20: toNumber(row?.a20),
    a31: toNumber(row?.a31),
    a41: toNumber(row?.a41),
    a51: toNumber(row?.a51),
    a61: toNumber(row?.a61),
  };
}

/**
 * ช่องทาง Login โดยประมาณจาก email (ไม่มี field login-method ตรงๆ ใน DB)
 * email IS NULL ≈ LINE, email IS NOT NULL ≈ Email/Credentials
 */
export async function countByLoginChannel(
  db: Queryable,
  storeId: string | null,
): Promise<{ email: number; line: number }> {
  const result = await db.query<{ email_count: string; line_count: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE email IS NOT NULL) AS email_count,
       COUNT(*) FILTER (WHERE email IS NULL) AS line_count
     FROM "user"
     WHERE ${userInStoreFilter(1)}`,
    [storeId],
  );
  return {
    email: toNumber(result.rows[0]?.email_count),
    line: toNumber(result.rows[0]?.line_count),
  };
}

/** จำกัด 5000 แถวล่าสุดกันโหลดหนัก — ไม่ bucket ใน SQL (การแบ่งช่วงเวลาทำฝั่ง dashboard) */
export async function listUserCreatedTimes(db: Queryable, storeId: string | null): Promise<string[]> {
  const result = await db.query<{ create_at: string }>(
    `SELECT create_at FROM "user"
     WHERE ${userInStoreFilter(1)}
     ORDER BY create_at DESC LIMIT 5000`,
    [storeId],
  );
  return result.rows.map((row) => row.create_at);
}
