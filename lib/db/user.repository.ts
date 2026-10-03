import { BUSINESS_TIME_ZONE, NIGHT_CUTOFF_HOUR } from "@/lib/domain/period";
import type { ActiveUser } from "@/lib/domain/user-stats";
import type { Queryable } from "./pool";
// เดิม: import { toNumber, userInStoreFilter } from "./sql";
import { completeUserFilter, toNumber, userInStoreFilter } from "./sql";

// ทุก query ในไฟล์นี้นับเฉพาะ user ที่ข้อมูลครบ (รูป + อายุ + เพศ) — ดู completeUserFilter ใน ./sql
const completeUser = completeUserFilter(`"user".id`);

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
  // เดิม: WHERE ${userInStoreFilter(3)} — เพิ่ม AND ${completeUser}
  const result = await db.query<Record<string, string | null>>(
    `SELECT
       COUNT(*) AS unique_users,
       COUNT(*) FILTER (WHERE $1::date IS NOT NULL AND ${signupNight} >= $1::date
                          AND ($2::date IS NULL OR ${signupNight} <= $2::date)) AS new_users,
       COUNT(*) FILTER (WHERE $1::date IS NOT NULL AND ${signupNight} < $1::date) AS existing_users,
       COUNT(*) FILTER (WHERE ${signupNight} >= $6::date) AS new_tonight,
       COUNT(*) FILTER (WHERE ${signupNight} < $6::date) AS existing_tonight
     FROM "user"
     WHERE ${userInStoreFilter(3)} AND ${completeUser}`,
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
  // เดิม: `SELECT COUNT(*) AS unique_users FROM "user" WHERE ${userInStoreFilter(1)}`
  const result = await db.query<{ unique_users: string }>(
    `SELECT COUNT(*) AS unique_users FROM "user" WHERE ${userInStoreFilter(1)} AND ${completeUser}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.unique_users);
}

/**
 * session ที่ยังไม่หมดอายุ — ตาราง session ไม่มี store_id เลย
 * กรองตามร้านไม่ได้จริง เป็นยอดรวมทั้งระบบเสมอ
 */
export async function countActiveSessions(db: Queryable): Promise<number> {
  // เดิม: `SELECT COUNT(*) AS active_sessions FROM session WHERE expires > now()`
  const result = await db.query<{ active_sessions: string }>(
    `SELECT COUNT(*) AS active_sessions FROM session
     WHERE expires > now() AND ${completeUserFilter("session.user_id")}`,
  );
  return toNumber(result.rows[0]?.active_sessions);
}

/**
 * รายชื่อผู้ใช้ที่มี session ยังไม่หมดอายุ (เงื่อนไขเดียวกับ countActiveSessions)
 * ใช้ subquery แทน JOIN กัน `id` ใน userInStoreFilter ชนกับ session.id
 */
// เดิม: export async function listActiveSessionUsers(db: Queryable, storeId: string | null): Promise<ActiveUser[]> {
// เพิ่ม search (ชื่อ/email, ไม่สนตัวพิมพ์เล็กใหญ่) — null/ว่าง = ไม่กรอง
export async function listActiveSessionUsers(
  db: Queryable,
  storeId: string | null,
  search: string | null = null,
  // true = เฉพาะผู้ใช้ที่ session ยังไม่หมดอายุ (ปุ่ม "ออนไลน์ตอนนี้"), false = login ล่าสุด 10 คน (preview เดิม)
  onlineOnly = false,
): Promise<ActiveUser[]> {
  // ชั่วคราว — preview การ์ด: ตอนนี้ยังไม่มี session ไหนที่ยังไม่หมดอายุ เลยดึง "ผู้ใช้ที่ login ล่าสุด 5 คน" มาแสดงแทน
  // จะกลับไปใช้ของจริง: เอาคอมเมนต์ query เดิมด้านล่างออก แล้วลบ query preview
  // const result = await db.query<ActiveUser>(
  //   `SELECT id, name, image, age, gender::text AS gender FROM "user"
  //    WHERE id IN (SELECT user_id FROM session WHERE expires > now())
  //      AND ${userInStoreFilter(1)}
  //    ORDER BY name LIMIT 200`,
  //   [storeId],
  // );
  // เดิม (preview 5 คน ไม่มี search/ร้าน):
  // const result = await db.query<ActiveUser>(
  //   `SELECT id, name, image, age, gender::text AS gender FROM "user"
  //    WHERE ${userInStoreFilter(1)}
  //    ORDER BY (SELECT MAX(create_date) FROM login_log l WHERE l.user_id = "user".id) DESC NULLS LAST
  //    LIMIT 5`,
  //   [storeId],
  // );
  // เดิม: WHERE ไม่มี EXISTS login_log — ผู้ใช้ที่ไม่เคย login ที่ร้านไหนขึ้นการ์ด "ยังไม่เคยเข้าร้าน" ตัดออกตามที่ขอ
  // escape % _ \ ที่ผู้ใช้พิมพ์ ให้ ILIKE ค้นเป็นตัวอักษรตรงๆ
  const pattern = search?.trim() ? `%${search.trim().replace(/[\\%_]/g, "\\$&")}%` : null;
  // เดิม: last_store_id กับ ORDER BY ดู login ของทุกร้าน — เลือกร้านแล้วยังเรียงตาม login ล่าสุดที่ร้านอื่น และ 📍 ขึ้นชื่อร้านอื่นได้
  //   (SELECT l.store_id FROM login_log l WHERE l.user_id = "user".id
  //    ORDER BY l.create_date DESC LIMIT 1) AS last_store_id
  //   ...
  //   ORDER BY (SELECT MAX(create_date) FROM login_log l WHERE l.user_id = "user".id) DESC NULLS LAST
  // ตอนนี้: เลือกร้าน ($1 ไม่ null) = ดูเฉพาะ login_log ของร้านนั้น, "ทั้งหมด" ($1 null) = ทุกร้านเหมือนเดิม
  // เดิม: WHERE ${userInStoreFilter(1)} AND ... — เพิ่ม AND ${completeUser} (ไม่แสดง user ที่ข้อมูลไม่ครบ)
  // เดิม: ... AND EXISTS (...login_log...) ... LIMIT 10`, [storeId, pattern] — เพิ่ม $3 onlineOnly (เงื่อนไขเดียวกับ
  // countActiveSessions) + $4 LIMIT (online 200 ตาม query เดิมที่คอมเมนต์ไว้ด้านบน, recent 10)
  const result = await db.query<ActiveUser & { last_store_id: string | null }>(
    `SELECT id, name, image, age, gender::text AS gender,
            (SELECT l.store_id FROM login_log l WHERE l.user_id = "user".id
               AND ($1::text IS NULL OR l.store_id = $1)
             ORDER BY l.create_date DESC LIMIT 1) AS last_store_id
     FROM "user"
     WHERE ${userInStoreFilter(1)}
       AND ${completeUser}
       AND ($2::text IS NULL OR name ILIKE $2 OR email ILIKE $2)
       AND EXISTS (SELECT 1 FROM login_log l WHERE l.user_id = "user".id)
       AND ($3::boolean IS NOT TRUE OR "user".id IN (SELECT user_id FROM session WHERE expires > now()))
     ORDER BY (SELECT MAX(create_date) FROM login_log l WHERE l.user_id = "user".id
                 AND ($1::text IS NULL OR l.store_id = $1)) DESC NULLS LAST
     LIMIT $4`,
    [storeId, pattern, onlineOnly, onlineOnly ? 200 : 10],
  );
  return result.rows.map(({ last_store_id, ...row }) => ({ ...row, lastStoreId: last_store_id }));
}

/** เพศ — จาก user.gender (enum MALE/FEMALE/LGBTQ) */
export async function countByGender(
  db: Queryable,
  storeId: string | null,
): Promise<{ male: number; female: number; lgbtq: number }> {
  // เดิม: WHERE gender IS NOT NULL AND ${userInStoreFilter(1)} — เพิ่ม AND ${completeUser}
  const result = await db.query<{ gender: string; count: string }>(
    `SELECT gender::text, COUNT(*) AS count FROM "user"
     WHERE gender IS NOT NULL AND ${userInStoreFilter(1)} AND ${completeUser}
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
  // เดิม: WHERE ${userInStoreFilter(1)} — เพิ่ม AND ${completeUser}
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
     WHERE ${userInStoreFilter(1)} AND ${completeUser}`,
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
  // เดิม: WHERE ${userInStoreFilter(1)} — เพิ่ม AND ${completeUser}
  const result = await db.query<{ email_count: string; line_count: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE email IS NOT NULL) AS email_count,
       COUNT(*) FILTER (WHERE email IS NULL) AS line_count
     FROM "user"
     WHERE ${userInStoreFilter(1)} AND ${completeUser}`,
    [storeId],
  );
  return {
    email: toNumber(result.rows[0]?.email_count),
    line: toNumber(result.rows[0]?.line_count),
  };
}

/** จำกัด 5000 แถวล่าสุดกันโหลดหนัก — ไม่ bucket ใน SQL (การแบ่งช่วงเวลาทำฝั่ง dashboard) */
export async function listUserCreatedTimes(db: Queryable, storeId: string | null): Promise<string[]> {
  // เดิม: WHERE ${userInStoreFilter(1)} — เพิ่ม AND ${completeUser}
  const result = await db.query<{ create_at: string }>(
    `SELECT create_at FROM "user"
     WHERE ${userInStoreFilter(1)} AND ${completeUser}
     ORDER BY create_at DESC LIMIT 5000`,
    [storeId],
  );
  return result.rows.map((row) => row.create_at);
}
