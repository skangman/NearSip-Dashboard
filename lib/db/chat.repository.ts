import type { Queryable } from "./pool";
// เดิม: import { storeFilter, toNumber } from "./sql";
import { completeUserFilter, storeFilter, toNumber } from "./sql";

// นับเฉพาะ chat ที่ทั้ง user1 และ user2 ข้อมูลครบ (รูป + อายุ + เพศ) — ฝ่ายใดไม่ครบตัดทั้ง chat
const completePair = (alias: string) =>
  `${completeUserFilter(`${alias}.user1_id`)} AND ${completeUserFilter(`${alias}.user2_id`)}`;

export async function countChats(db: Queryable, storeId: string | null): Promise<number> {
  // เดิม: `SELECT COUNT(*) AS total FROM chats WHERE ${storeFilter(1)}`
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM chats WHERE ${storeFilter(1)} AND ${completePair("chats")}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.total);
}

/** messages ไม่มี store_id ตรงๆ ต้อง join ผ่าน chats */
export async function countMessages(db: Queryable, storeId: string | null): Promise<number> {
  // เดิม: WHERE ${storeFilter(1, "c.store_id")} — เพิ่ม AND ${completePair("c")}
  const result = await db.query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM messages m
     JOIN chats c ON c.id = m.chat_id
     WHERE ${storeFilter(1, "c.store_id")} AND ${completePair("c")}`,
    [storeId],
  );
  return toNumber(result.rows[0]?.total);
}

/** จำกัด 5000 แถวล่าสุดกันโหลดหนัก */
export async function listChatTimes(db: Queryable, storeId: string | null): Promise<string[]> {
  // เดิม: `SELECT create_at FROM chats WHERE ${storeFilter(1)} ORDER BY create_at DESC LIMIT 5000`
  const result = await db.query<{ create_at: string }>(
    `SELECT create_at FROM chats WHERE ${storeFilter(1)} AND ${completePair("chats")} ORDER BY create_at DESC LIMIT 5000`,
    [storeId],
  );
  return result.rows.map((row) => row.create_at);
}
