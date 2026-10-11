import type { Queryable } from "./pool";

export type PartnerUser = {
  storeId: string;
  name: string | null;
  // ข้อมูลสถานที่ — คอลัมน์เดียวกับหน้า Location ของ nearsip-internal
  locationName: string | null;
  latitud: number;
  longitude: number;
  radius: number;
  /** set_location.status: 1 = ACTIVE, อื่นๆ = INACTIVE (backend enum LocationStatus) */
  status: "ACTIVE" | "INACTIVE";
  province: string | null;
  username: string | null;
  /** ตั้ง password แล้วหรือยัง — ไม่ส่ง password (hash) ออกนอก server */
  hasPassword: boolean;
  /** set_location.dashboard_menus (null = ยังไม่เคยตั้ง ใช้ค่าเริ่มต้น) */
  dashboardMenus: string[] | null;
};

/** บัญชีร้านพาร์ทเนอร์ (set_location.username/password) ทุกร้าน — เมนู "User Partners" */
export async function listPartnerUsers(db: Queryable): Promise<PartnerUser[]> {
  // เดิม: SELECT store_id, COALESCE(NULLIF(name, ''), location_name) AS name, province, username, has_password
  //   — เพิ่ม location_name/latitud/longitude/radius/status ให้แสดงแบบหน้า Location, name ไม่ fallback แล้ว
  const result = await db.query<{
    store_id: string; name: string | null; location_name: string | null;
    latitud: number; longitude: number; radius: number; status: number;
    province: string | null; username: string | null; has_password: boolean; dashboard_menus: string[] | null;
  }>(
    // เพิ่ม dashboard_menus (สิทธิ์เมนูของร้าน)
    `SELECT store_id, name, location_name, latitud, longitude, radius, status, province, username,
            (password IS NOT NULL AND password <> '') AS has_password, dashboard_menus
     FROM set_location
     ORDER BY create_date`,
  );
  return result.rows.map((row) => ({
    storeId: row.store_id,
    name: row.name,
    locationName: row.location_name,
    latitud: row.latitud,
    longitude: row.longitude,
    radius: row.radius,
    status: row.status === 1 ? "ACTIVE" : "INACTIVE",
    province: row.province,
    username: row.username,
    hasPassword: row.has_password,
    dashboardMenus: row.dashboard_menus,
  }));
}

/** บัญชีร้านสำหรับ login / ตรวจ session ร้าน — มี password (hash) จึงห้ามส่งออกนอก server */
export type PartnerAccount = {
  storeId: string;
  name: string;
  province: string | null;
  username: string | null;
  passwordHash: string | null;
  active: boolean;
  dashboardMenus: string[] | null;
};

/** หาบัญชีร้านจาก username (ไม่สนตัวพิมพ์เล็กใหญ่) หรือ storeId — ไม่พบ = null */
export async function findPartnerAccount(
  db: Queryable,
  by: { username: string } | { storeId: string },
): Promise<PartnerAccount | null> {
  const [where, value] = "username" in by ? ["lower(username) = lower($1)", by.username] : ["store_id = $1", by.storeId];
  const result = await db.query<{
    store_id: string; name: string | null; province: string | null; username: string | null;
    password: string | null; status: number; dashboard_menus: string[] | null;
  }>(
    `SELECT store_id, COALESCE(NULLIF(name, ''), location_name, store_id) AS name, province, username, password, status, dashboard_menus
     FROM set_location WHERE ${where} LIMIT 1`,
    [value],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    storeId: row.store_id,
    name: row.name ?? row.store_id,
    province: row.province,
    username: row.username,
    passwordHash: row.password || null,
    active: row.status === 1,
    dashboardMenus: row.dashboard_menus,
  };
}

/** ข้อยกเว้น READ-ONLY (ดู ./pool) — บันทึกเมนูที่ร้านเห็นได้ (หน้า Users & Menu Access) · คืน false เมื่อไม่พบร้าน */
export async function updatePartnerMenus(db: Queryable, storeId: string, menus: string[]): Promise<boolean> {
  const result = await db.query(
    `UPDATE set_location SET dashboard_menus = $2, update_date = now() WHERE store_id = $1`,
    [storeId, menus],
  );
  return (result.rowCount ?? 0) > 0;
}

/** username ซ้ำกับร้านอื่นไหม (ไม่สนตัวพิมพ์เล็กใหญ่) */
export async function isPartnerUsernameTaken(db: Queryable, username: string, storeId: string): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM set_location WHERE lower(username) = lower($1) AND store_id <> $2 LIMIT 1`,
    [username, storeId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * ข้อยกเว้นของกฎ READ-ONLY (ดู ./pool) — เขียนได้เฉพาะ province/username/password ของ set_location
 * passwordHash = null → ไม่เปลี่ยน password เดิม · คืน false เมื่อไม่พบร้าน
 */
export async function updatePartnerUser(
  db: Queryable,
  storeId: string,
  fields: { province: string | null; username: string | null; passwordHash: string | null },
): Promise<boolean> {
  const result = await db.query(
    `UPDATE set_location
     SET province = $2, username = $3, password = COALESCE($4, password), update_date = now()
     WHERE store_id = $1`,
    [storeId, fields.province, fields.username, fields.passwordHash],
  );
  return (result.rowCount ?? 0) > 0;
}
