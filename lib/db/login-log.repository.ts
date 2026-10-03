import type { LoginLogEntry } from "@/lib/domain/user-stats";
import type { Queryable } from "./pool";
// เดิม: import { storeFilter } from "./sql";
import { completeUserFilter, storeFilter } from "./sql";

/** login_log ดิบ (จำกัด 5000 แถวล่าสุด) — ใช้ทำ Visit Frequency / Repeat / Heatmap */
export async function listLoginLogs(db: Queryable, storeId: string | null): Promise<LoginLogEntry[]> {
  // เดิม: WHERE ${storeFilter(1)} — เพิ่ม AND completeUserFilter: ตัด log ของ user ที่ข้อมูลไม่ครบ
  // หมายเหตุ: log ที่ user_id ไม่มีใน "user" (registered = false) ก็ถูกตัดไปด้วย
  const result = await db.query<{
    user_id: string | null; store_id: string | null; create_date: string; registered: boolean;
  }>(
    `SELECT user_id, store_id, create_date,
            EXISTS (SELECT 1 FROM "user" u WHERE u.id = login_log.user_id) AS registered
     FROM login_log
     WHERE ${storeFilter(1)} AND ${completeUserFilter("login_log.user_id")}
     ORDER BY create_date DESC LIMIT 5000`,
    [storeId],
  );
  return result.rows.map((row) => ({
    userId: row.user_id,
    storeId: row.store_id,
    createAt: row.create_date,
    registered: row.registered,
  }));
}
