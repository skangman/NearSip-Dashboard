import type { Queryable } from "./pool";
import { storeFilter, toNumber } from "./sql";

export async function countChats(db: Queryable, storeId: string | null): Promise<number> {
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM chats WHERE ${storeFilter(1)}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.total);
}

/** messages ไม่มี store_id ตรงๆ ต้อง join ผ่าน chats */
export async function countMessages(db: Queryable, storeId: string | null): Promise<number> {
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM messages m
     JOIN chats c ON c.id = m.chat_id
     WHERE ${storeFilter(1, "c.store_id")}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.total);
}

/** จำกัด 5000 แถวล่าสุดกันโหลดหนัก */
export async function listChatTimes(db: Queryable, storeId: string | null): Promise<string[]> {
  const result = await db.query<{ create_at: string }>(
    `SELECT create_at FROM chats WHERE ${storeFilter(1)} ORDER BY create_at DESC LIMIT 5000`,
    [storeId],
  );
  return result.rows.map((row) => row.create_at);
}
