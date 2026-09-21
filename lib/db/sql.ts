/** แปลงค่า COUNT(*) ที่ pg คืนเป็น string (หรือ null) ให้เป็น number */
export function toNumber(value: unknown): number {
  return Number(value ?? 0);
}

/**
 * เงื่อนไข "ร้านนี้" — เมื่อ $n เป็น NULL = ไม่กรอง (รวมทุกร้าน)
 * ใช้กับตารางที่มีคอลัมน์ store_id ตรงๆ (cheers/chats/login_log/set_location)
 */
export function storeFilter(param: number, column = "store_id"): string {
  return `($${param}::text IS NULL OR ${column} = $${param})`;
}

/**
 * เงื่อนไขสำหรับตาราง "user" ที่ไม่มี store_id — กรองทางอ้อมผ่าน "user ที่เคย login ที่ร้านนี้"
 * (login_log.store_id) ไม่ใช่ users ที่ "สังกัด" ร้านจริงๆ (concept นี้ไม่มีใน schema)
 */
export function userInStoreFilter(param: number): string {
  return `($${param}::text IS NULL OR id IN (SELECT DISTINCT user_id FROM login_log WHERE store_id = $${param}))`;
}
