import type { Queryable } from "./pool";
import { storeFilter, toNumber } from "./sql";

/**
 * ร้านที่ set_location.create_date อยู่ภายใน `days` วันล่าสุด
 * ถ้ากรองตามร้าน = เช็คแค่ร้านนั้นร้านเดียวว่าสร้างในช่วงนั้นหรือไม่ (0 หรือ 1)
 */
export async function countNewStores(
  db: Queryable,
  days: number,
  storeId: string | null,
): Promise<number> {
  const result = await db.query<{ new_stores: string }>(
    `SELECT COUNT(*) AS new_stores FROM set_location
     WHERE create_date >= now() - ($1 || ' days')::interval
       AND ${storeFilter(2)}`,
    [days, storeId],
  );
  return toNumber(result.rows[0]?.new_stores);
}
