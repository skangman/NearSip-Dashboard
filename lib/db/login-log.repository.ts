import type { LoginLogEntry } from "@/lib/domain/user-stats";
import type { Queryable } from "./pool";
import { storeFilter } from "./sql";

/** login_log ดิบ (จำกัด 5000 แถวล่าสุด) — ใช้ทำ Visit Frequency / Repeat / Heatmap */
export async function listLoginLogs(db: Queryable, storeId: string | null): Promise<LoginLogEntry[]> {
  const result = await db.query<{
    user_id: string | null; store_id: string | null; create_date: string; registered: boolean;
  }>(
    `SELECT user_id, store_id, create_date,
            EXISTS (SELECT 1 FROM "user" u WHERE u.id = login_log.user_id) AS registered
     FROM login_log
     WHERE ${storeFilter(1)}
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
