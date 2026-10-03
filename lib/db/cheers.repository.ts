import type { Queryable } from "./pool";
// เดิม: import { storeFilter, toNumber } from "./sql";
import { completeUserFilter, storeFilter, toNumber } from "./sql";

// นับเฉพาะ cheers ที่ทั้งผู้ส่งและผู้รับข้อมูลครบ (รูป + อายุ + เพศ) — ฝ่ายใดไม่ครบตัดทั้งแถว
const completePair = `${completeUserFilter("inittiator_user_id")} AND ${completeUserFilter("responder_user_id")}`;

/** distinct user ที่เป็นผู้ส่งหรือผู้รับ cheers อย่างน้อย 1 ครั้ง */
export async function countEngagedUsers(db: Queryable, storeId: string | null): Promise<number> {
  // เดิม: WHERE ${storeFilter(1)} ทั้งสอง subquery — เพิ่ม AND ${completePair}
  const result = await db.query<{ engaged_users: string }>(
    `SELECT COUNT(*) AS engaged_users FROM (
       SELECT inittiator_user_id AS uid FROM cheers WHERE ${storeFilter(1)} AND ${completePair}
       UNION
       SELECT responder_user_id FROM cheers WHERE ${storeFilter(1)} AND ${completePair}
     ) engaged`,
    [storeId],
  );
  return toNumber(result.rows[0]?.engaged_users);
}

export async function countCheers(db: Queryable, storeId: string | null): Promise<number> {
  // เดิม: `SELECT COUNT(*) AS total FROM cheers WHERE ${storeFilter(1)}`
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM cheers WHERE ${storeFilter(1)} AND ${completePair}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.total);
}

/** cheers แยกตาม status จริง (enum CheersStatus: Pending=0, Accepted=1, Refuse=2) */
export async function countCheersByStatus(
  db: Queryable,
  storeId: string | null,
): Promise<{ pending: number; accepted: number; refused: number }> {
  // เดิม: `SELECT status, COUNT(*) AS count FROM cheers WHERE ${storeFilter(1)} GROUP BY status`
  const result = await db.query<{ status: number; count: string }>(
    `SELECT status, COUNT(*) AS count FROM cheers WHERE ${storeFilter(1)} AND ${completePair} GROUP BY status`,
    [storeId],
  );
  const byStatus = { pending: 0, accepted: 0, refused: 0 };
  for (const row of result.rows) {
    const count = toNumber(row.count);
    if (row.status === 0) byStatus.pending = count;
    else if (row.status === 1) byStatus.accepted = count;
    else if (row.status === 2) byStatus.refused = count;
  }
  return byStatus;
}

export async function countCheersParticipants(
  db: Queryable,
  storeId: string | null,
): Promise<{ senders: number; receivers: number }> {
  // เดิม: FROM cheers WHERE ${storeFilter(1)} — เพิ่ม AND ${completePair}
  const result = await db.query<{ senders: string; receivers: string }>(
    `SELECT COUNT(DISTINCT inittiator_user_id) AS senders, COUNT(DISTINCT responder_user_id) AS receivers
     FROM cheers WHERE ${storeFilter(1)} AND ${completePair}`,
    [storeId],
  );
  return {
    senders: toNumber(result.rows[0]?.senders),
    receivers: toNumber(result.rows[0]?.receivers),
  };
}

/** จำกัด 5000 แถวล่าสุดกันโหลดหนัก */
export async function listCheerTimes(db: Queryable, storeId: string | null): Promise<string[]> {
  // เดิม: `SELECT create_at FROM cheers WHERE ${storeFilter(1)} ORDER BY create_at DESC LIMIT 5000`
  const result = await db.query<{ create_at: string }>(
    `SELECT create_at FROM cheers WHERE ${storeFilter(1)} AND ${completePair} ORDER BY create_at DESC LIMIT 5000`,
    [storeId],
  );
  return result.rows.map((row) => row.create_at);
}
