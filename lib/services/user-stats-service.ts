import { fetchActiveNowStats, fetchUserStats } from "@/lib/db/user-stats.repository";
import { fetchPresenceActiveCount } from "@/lib/clients/presence-client";
import type { ActiveNowStats, UserStats } from "@/lib/domain/user-stats";
import { isIsoDate, nightOf } from "@/lib/domain/period";
import { BadRequestError } from "@/lib/http/errors";

const DEFAULT_DAYS = 30;

/**
 * สถิติผู้ใช้จริงจาก DB ตรง (read-only) — backend ไม่มี endpoint list/aggregate user เลย
 * storeId: ไม่ส่ง = รวมทุกร้าน, ส่ง = กรองเฉพาะร้านนั้น (ดู lib/db/user-stats.repository.ts)
 */
function parseNight(name: string, value: string | undefined): string | null {
  if (value === undefined) return null;
  if (!isIsoDate(value)) throw new BadRequestError(`Invalid "${name}": expected YYYY-MM-DD`);
  return value;
}

/**
 * days: ใช้กับ newStores เท่านั้น · from/to: ช่วงคืนธุรกิจ (ตัด 06:00 น. เวลาไทย) สำหรับแยก ผู้ใช้ใหม่/เดิม
 * — ไม่ส่ง from = ไม่แยก (newUsers/existingUsers เป็น null)
 */
export function getUserStats(opts: { days?: number; storeId?: string; from?: string; to?: string } = {}): Promise<UserStats> {
  const from = parseNight("from", opts.from);
  const to = parseNight("to", opts.to);
  if (from && to && from > to) throw new BadRequestError('"from" must not be after "to"');
  return fetchUserStats(opts.days ?? DEFAULT_DAYS, opts.storeId ?? null, { from, to }, nightOf(new Date()));
}

/**
 * ตัวเลข "ผู้ใช้ NearSip ที่ Active ตอนนี้" — query เบากว่า getUserStats() มาก ใช้กับ poll ถี่
 *
 * activeSessions ใช้ค่าจาก presence tracker แบบ in-memory ของแอป nearsip/frontend แทนตาราง session
 * ใน DB เพราะแอปนั้นใช้ NextAuth session.strategy: "jwt" ทำให้ตาราง session ว่างตลอด (ไม่ใช่บั๊กที่
 * poll interval แก้ได้) ถ้าเรียก presence ไม่สำเร็จจะ fallback ไปใช้ค่าจาก DB
 */
export async function getActiveNow(storeId?: string): Promise<ActiveNowStats> {
  const stats = await fetchActiveNowStats(storeId ?? null);

  let activeSessions = stats.activeSessions;
  try {
    const presenceCount = await fetchPresenceActiveCount();
    if (presenceCount !== null) activeSessions = presenceCount;
  } catch (err) {
    console.warn("presence count fetch failed, falling back to DB session count", err);
  }

  return { activeSessions, uniqueUsers: stats.uniqueUsers };
}
