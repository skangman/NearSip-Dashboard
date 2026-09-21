import type { Queryable } from "./pool";
import { storeFilter, toNumber } from "./sql";

/** distinct user ที่เป็นผู้ส่งหรือผู้รับ cheers อย่างน้อย 1 ครั้ง */
export async function countEngagedUsers(db: Queryable, storeId: string | null): Promise<number> {
  const result = await db.query<{ engaged_users: string }>(
    `SELECT COUNT(*) AS engaged_users FROM (
       SELECT inittiator_user_id AS uid FROM cheers WHERE ${storeFilter(1)}
       UNION
       SELECT responder_user_id FROM cheers WHERE ${storeFilter(1)}
     ) engaged`,
    [storeId],
  );
  return toNumber(result.rows[0]?.engaged_users);
}

export async function countCheers(db: Queryable, storeId: string | null): Promise<number> {
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM cheers WHERE ${storeFilter(1)}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.total);
}

/** cheers แยกตาม status จริง (enum CheersStatus: Pending=0, Accepted=1, Refuse=2) */
export async function countCheersByStatus(
  db: Queryable,
  storeId: string | null,
): Promise<{ pending: number; accepted: number; refused: number }> {
  const result = await db.query<{ status: number; count: string }>(
    `SELECT status, COUNT(*) AS count FROM cheers WHERE ${storeFilter(1)} GROUP BY status`,
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
  const result = await db.query<{ senders: string; receivers: string }>(
    `SELECT COUNT(DISTINCT inittiator_user_id) AS senders, COUNT(DISTINCT responder_user_id) AS receivers
     FROM cheers WHERE ${storeFilter(1)}`,
    [storeId],
  );
  return {
    senders: toNumber(result.rows[0]?.senders),
    receivers: toNumber(result.rows[0]?.receivers),
  };
}

/** จำกัด 5000 แถวล่าสุดกันโหลดหนัก */
export async function listCheerTimes(db: Queryable, storeId: string | null): Promise<string[]> {
  const result = await db.query<{ create_at: string }>(
    `SELECT create_at FROM cheers WHERE ${storeFilter(1)} ORDER BY create_at DESC LIMIT 5000`,
    [storeId],
  );
  return result.rows.map((row) => row.create_at);
}
