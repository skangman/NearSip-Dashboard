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

/**
 * user ที่ข้อมูลครบ (มีรูป + อายุ + เพศ) — คนที่ไม่ครบไม่นับในทุกสถิติ
 * `column` = คอลัมน์ที่เก็บ user id ของแถวนั้น (เช่น `"user".id`, `login_log.user_id`, `inittiator_user_id`)
 * user_id ที่ไม่มีแถวใน "user" เลยก็ไม่ผ่านเงื่อนไขนี้เช่นกัน
 * ต้องเคย login ที่ร้านใดร้านหนึ่งด้วย (มีแถวใน login_log) — คนที่สมัครแต่ยังไม่เคยเข้าร้านไม่อยู่ในยอดรายร้านไหนเลย
 * ถ้านับไว้ ยอดรวม (เช่น ผู้ใช้ใหม่ 7) จะไม่ตรงกับผลรวมรายร้าน (6)
 */
export function completeUserFilter(column: string): string {
  // เดิม: ไม่มีบรรทัด EXISTS login_log
  return `EXISTS (SELECT 1 FROM "user" cu WHERE cu.id = ${column}
            AND cu.image IS NOT NULL AND cu.image <> ''
            AND cu.age IS NOT NULL AND cu.gender IS NOT NULL
            AND EXISTS (SELECT 1 FROM login_log ll WHERE ll.user_id = cu.id))`;
}
