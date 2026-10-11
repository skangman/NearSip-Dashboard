// Session ของบัญชีร้าน (login ด้วย set_location.username/password) — แยกจาก session บัญชีเดิม (session.ts / mock-accounts)
// cookie "nearsip_partner_session" = base64url(JSON {storeId, fp, exp}) + "." + HMAC-SHA256 ด้วย PARTNER_SESSION_SECRET
// fp = ลายนิ้วมือของ password hash → admin เปลี่ยนรหัสร้าน = session เดิมใช้ไม่ได้ทันที
// ทุก request ตรวจ DB ซ้ำ: ร้านต้อง ACTIVE, ยังมี username และ fp ตรง — ไม่ผ่าน = ถือว่าไม่ได้ login
// ไม่ตั้ง PARTNER_SESSION_SECRET = ปิดการ login ของร้าน (บัญชีเดิมไม่กระทบ)

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { withClient } from "@/lib/db/pool";
import { findPartnerAccount, type PartnerAccount } from "@/lib/db/partner-user.repository";
import { partnerMenus } from "@/lib/domain/menu-access";
import type { Viewer } from "@/lib/domain/viewer";

export const PARTNER_SESSION_COOKIE_NAME = "nearsip_partner_session";

const REMEMBER_SECONDS = 60 * 60 * 24 * 30; // เท่ากับ remember ของบัญชีเดิม
const SESSION_SECONDS = 60 * 60 * 12; // ไม่ติ๊ก remember — อายุ token 12 ชม. (cookie หายเมื่อปิด browser)

function secret(): string | null {
  const value = process.env.PARTNER_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

function fingerprint(passwordHash: string): string {
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

function toViewer(account: PartnerAccount): Viewer {
  return {
    id: `partner:${account.storeId}`,
    username: account.username ?? account.storeId,
    displayName: account.name,
    role: "owner",
    venue: account.name,
    ...(account.province ? { province: account.province } : {}),
    storeId: account.storeId,
    menus: partnerMenus(account.dashboardMenus),
  };
}

/** login ด้วยบัญชีร้าน — สำเร็จ = ตั้ง cookie แล้วคืน Viewer · ไม่สำเร็จ/ปิดอยู่ = null */
export async function partnerLogin(username: string, password: string, remember: boolean): Promise<Viewer | null> {
  const key = secret();
  if (!key) return null;
  const account = await withClient((db) => findPartnerAccount(db, { username: username.trim() }));
  if (!account?.active || !account.username || !account.passwordHash) return null;
  if (!(await bcrypt.compare(password, account.passwordHash))) return null;

  const maxAge = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
  const payload = Buffer.from(
    JSON.stringify({ storeId: account.storeId, fp: fingerprint(account.passwordHash), exp: Math.floor(Date.now() / 1000) + maxAge }),
  ).toString("base64url");
  (await cookies()).set(PARTNER_SESSION_COOKIE_NAME, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge } : {}),
  });
  return toViewer(account);
}

/** Viewer ของร้านจาก cookie (ตรวจลายเซ็น + อายุ + DB) — ไม่มี/ไม่ผ่าน = null */
export async function getPartnerViewer(): Promise<Viewer | null> {
  const key = secret();
  const token = key ? (await cookies()).get(PARTNER_SESSION_COOKIE_NAME)?.value : undefined;
  if (!key || !token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  let data: { storeId?: unknown; fp?: unknown; exp?: unknown };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof data.storeId !== "string" || typeof data.fp !== "string" || typeof data.exp !== "number") return null;
  if (data.exp < Date.now() / 1000) return null;

  const storeId = data.storeId;
  const account = await withClient((db) => findPartnerAccount(db, { storeId }));
  if (!account?.active || !account.username || !account.passwordHash) return null;
  if (fingerprint(account.passwordHash) !== data.fp) return null;
  return toViewer(account);
}

export async function endPartnerSession(): Promise<void> {
  (await cookies()).delete(PARTNER_SESSION_COOKIE_NAME);
}
