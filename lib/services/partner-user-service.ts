import bcrypt from "bcryptjs";
// เดิม: import { updateStoreLocation, type BackendUpdateLocationPayload } from "@/lib/clients/backend-client";
import { createStoreLocation, updateStoreLocation, type BackendUpdateLocationPayload } from "@/lib/clients/backend-client";
import { withClient } from "@/lib/db/pool";
import {
  isPartnerUsernameTaken,
  listPartnerUsers,
  updatePartnerMenus,
  updatePartnerUser,
  type PartnerUser,
} from "@/lib/db/partner-user.repository";
import { PARTNER_ALLOWED_MENUS } from "@/lib/domain/menu-access";
import { THAI_PROVINCES } from "@/lib/domain/thai-provinces";
import type { Viewer } from "@/lib/domain/viewer";
import { BadRequestError, ForbiddenError } from "@/lib/http/errors";

const MAX_TEXT_LENGTH = 255; // set_location.province/username เป็น varchar(255)
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72; // bcrypt ใช้แค่ 72 byte แรก
const BCRYPT_ROUNDS = 10; // เท่ากับ nearsip/frontend

// เดิม: getPartnerUsers(): Promise<{ partners }> — เพิ่ม appUrl สำหรับ QR Code ของแต่ละร้าน ({appUrl}/{storeId}/home)
// เดิม: getPartnerUsers() ไม่รับ viewer — บัญชีร้านห้ามเห็นรายการบัญชีทุกร้าน (403)
export async function getPartnerUsers(viewer: Viewer): Promise<{ partners: PartnerUser[]; appUrl: string | null }> {
  if (viewer.storeId) throw new ForbiddenError("Partner accounts cannot list partner stores");
  // NEARSIP_APP_URL = domain สาธารณะของแอป NearSip (ไม่ตั้ง = ใช้ NEARSIP_FRONTEND_URL ตัวเดียวกับ presence-client)
  const appUrl = (process.env.NEARSIP_APP_URL || process.env.NEARSIP_FRONTEND_URL || "").replace(/\/+$/, "") || null;
  return { partners: await withClient(listPartnerUsers), appUrl };
}

function optionalText(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new BadRequestError(`"${key}" must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > MAX_TEXT_LENGTH) throw new BadRequestError(`"${key}" is too long`);
  return trimmed || null;
}

function requiredNumber(body: Record<string, unknown>, key: string, min: number, max: number): number {
  const value = typeof body[key] === "string" && body[key] !== "" ? Number(body[key]) : body[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new BadRequestError(`"${key}" ต้องเป็นตัวเลขระหว่าง ${min} ถึง ${max}`);
  }
  return value;
}

function parseLocationFields(storeId: string, body: Record<string, unknown>): BackendUpdateLocationPayload {
  const name = optionalText(body, "name");
  const locationName = optionalText(body, "locationName");
  // backend ข้ามช่องว่าง (ไม่แก้) — บังคับกรอกเพื่อไม่ให้ผู้ใช้เข้าใจผิดว่าลบชื่อได้
  if (!name) throw new BadRequestError("กรุณากรอกชื่อ");
  if (!locationName) throw new BadRequestError("กรุณากรอก Location Name");
  const radius = requiredNumber(body, "radius", 1, 10_000_000);
  if (!Number.isInteger(radius)) throw new BadRequestError('"radius" ต้องเป็นจำนวนเต็ม');
  if (body.status !== "ACTIVE" && body.status !== "INACTIVE") throw new BadRequestError('"status" ไม่ถูกต้อง');
  return {
    storeId,
    name,
    location_name: locationName,
    latitud: requiredNumber(body, "latitud", -90, 90),
    longitude: requiredNumber(body, "longitude", -180, 180),
    radius,
    // backend enum สะกด "INAVTIVE" (ดู BackendLocationStatus)
    status: body.status === "ACTIVE" ? "ACTIVE" : "INAVTIVE",
  };
}

/** ตรวจ + เตรียมข้อมูลบัญชีร้าน (จังหวัด / username / password→bcrypt) — ใช้ทั้งตอนเพิ่มและแก้ไข · password ว่าง = null */
async function parseAccountFields(body: Record<string, unknown>) {
  const province = optionalText(body, "province");
  // จังหวัดต้องเป็นชื่อใน THAI_PROVINCES (ช่องค้นหาใน modal) — ว่าง = ไม่ระบุ
  if (province && !(THAI_PROVINCES as readonly string[]).includes(province)) {
    throw new BadRequestError("กรุณาเลือกจังหวัดจากรายการ");
  }
  const username = optionalText(body, "username")?.toLowerCase() ?? null;
  if (username && !/^[a-z0-9._-]+$/.test(username)) {
    throw new BadRequestError("Username ใช้ได้เฉพาะ a-z 0-9 . _ -");
  }

  let password: string | null = null;
  if (body.password !== undefined && body.password !== null && body.password !== "") {
    if (typeof body.password !== "string") throw new BadRequestError('"password" must be a string');
    password = body.password;
    if (password.length < MIN_PASSWORD_LENGTH) throw new BadRequestError(`Password ต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
    if (Buffer.byteLength(password) > MAX_PASSWORD_LENGTH) throw new BadRequestError("Password ยาวเกินไป");
  }
  if (password && !username) throw new BadRequestError("ต้องกำหนด Username ก่อนตั้ง Password");

  const passwordHash = password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null;
  return { province, username, passwordHash };
}

/**
 * เพิ่มร้านใหม่จาก modal "เพิ่มสถานที่" — admin เท่านั้น
 * สร้างร้านผ่าน backend (เขียน Redis ด้วย) แล้วค่อยบันทึกบัญชีร้านลง storeId ที่ได้ · ตรวจ username ซ้ำก่อนสร้าง
 */
export async function createPartnerUser(viewer: Viewer, payload: unknown): Promise<{ ok: true; storeId: string }> {
  if (viewer.role !== "admin") throw new ForbiddenError("Only admin can add partner stores");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new BadRequestError("Invalid body");
  const body = payload as Record<string, unknown>;

  const { province, username, passwordHash } = await parseAccountFields(body);
  const { storeId: _unused, ...location } = parseLocationFields("", body);

  return withClient(async (db) => {
    if (username && (await isPartnerUsernameTaken(db, username, ""))) {
      throw new BadRequestError("Username นี้ถูกใช้กับร้านอื่นแล้ว");
    }
    const storeId = await createStoreLocation(location);
    if (province || username || passwordHash) {
      await updatePartnerUser(db, storeId, { province, username, passwordHash });
    }
    return { ok: true as const, storeId };
  });
}

// เดิม: บันทึกจังหวัด / username / password เท่านั้น — เพิ่มข้อมูลสถานที่ (ชื่อ, Location Name, พิกัด, รัศมี, สถานะ)
/** บันทึกข้อมูลร้านทั้งหมดจาก modal — admin เท่านั้น · password ว่าง = ไม่เปลี่ยน */
export async function savePartnerUser(viewer: Viewer, storeId: string, payload: unknown): Promise<{ ok: true }> {
  if (viewer.role !== "admin") throw new ForbiddenError("Only admin can edit partner accounts");
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new BadRequestError("Invalid body");
  const body = payload as Record<string, unknown>;

  // เดิม: ตรวจ province/username/password แบบ inline ตรงนี้ — ย้ายไป parseAccountFields() ให้ createPartnerUser ใช้ร่วม (ไม่ซ้ำ)
  const { province, username, passwordHash } = await parseAccountFields(body);

  // ข้อมูลสถานที่ (แก้ได้ทุกช่องใน modal) — ส่งต่อให้ backend ตัวเดียวกับหน้า Location ของ nearsip-internal
  const location = parseLocationFields(storeId, body);

  return withClient(async (db) => {
    if (username && (await isPartnerUsernameTaken(db, username, storeId))) {
      throw new BadRequestError("Username นี้ถูกใช้กับร้านอื่นแล้ว");
    }
    // backend ก่อน (ตรวจว่ามีร้านนี้จริง) แล้วค่อยบันทึกบัญชี — ถ้า backend ล้มเหลว บัญชีจะไม่ถูกแก้
    await updateStoreLocation(location);
    // เดิม: เขียนแค่ province/username/password
    const updated = await updatePartnerUser(db, storeId, { province, username, passwordHash });
    if (!updated) throw new BadRequestError("ไม่พบร้านนี้");
    return { ok: true as const };
  });
}

/** บันทึกเมนูที่ร้านเห็นได้ (หน้า Users & Menu Access) — admin เท่านั้น · กรองเหลือเฉพาะ PARTNER_ALLOWED_MENUS */
export async function savePartnerMenus(viewer: Viewer, storeId: string, payload: unknown): Promise<{ menus: string[] }> {
  if (viewer.role !== "admin") throw new ForbiddenError("Only admin can edit partner menus");
  const menus = payload && typeof payload === "object" && "menus" in payload ? payload.menus : undefined;
  if (!Array.isArray(menus) || !menus.every((id) => typeof id === "string")) {
    throw new BadRequestError('"menus" must be an array of menu ids');
  }
  const allowed = PARTNER_ALLOWED_MENUS.filter((id) => menus.includes(id));
  const updated = await withClient((db) => updatePartnerMenus(db, storeId, allowed));
  if (!updated) throw new BadRequestError("ไม่พบร้านนี้");
  return { menus: allowed };
}
