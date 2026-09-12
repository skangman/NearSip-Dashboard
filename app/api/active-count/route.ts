import { getCurrentViewer } from "@/lib/mock-auth";
import { getActiveNowStats } from "@/lib/db-client";

/**
 * GET /api/active-count?storeId=xxx → เวอร์ชันเบาของ /api/user-stats (ดู app/api/user-stats/route.ts)
 * ใช้เฉพาะกับ poll ความถี่สูงทุก 5 วิของการ์ด "ผู้ใช้ NearSip ที่ Active ตอนนี้" ใน Real-time page
 * (ดู loadActiveNow() ใน lib/dashboard-runtime.ts) ไม่ได้แทนที่ /api/user-stats — endpoint เดิมยังใช้
 * ตอน mount/เปลี่ยน filter เหมือนเดิมทุกอย่าง แค่แยกออกมาเพื่อไม่ให้ poll ถี่ ๆ ต้องแบก query หนัก
 * ของ getUserStats() ทั้งฟังก์ชัน (ดู comment บน getActiveNowStats() ใน lib/db-client.ts)
 */
export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get("storeId") || undefined;

  try {
    const stats = await getActiveNowStats(storeId);
    // เดิม: return Response.json(stats) ตรง ๆ — ใช้ stats.activeSessions จาก DB session table
    // แต่ session table ว่างตลอด (0 แถวทั้งระบบ) เพราะแอป nearsip/frontend ตั้ง
    // NextAuth session.strategy: "jwt" (ดู app/lib/auth/authOptions.ts ของ repo นั้น) เลยไม่มีการ
    // เขียนลง DB เลยไม่ว่าจะมีคน login กี่คน — ไม่ใช่บั๊กที่ poll interval แก้ได้
    //
    // แทนที่ activeSessions ด้วยค่าจาก presence tracker แบบ in-memory ของแอปนั้น (ไม่แตะ DB/schema
    // เลย ดู PRESENCE_INTERNAL_KEY/NEARSIP_FRONTEND_URL ใน .env.local) ส่วน uniqueUsers ยังใช้จาก
    // getActiveNowStats() เดิมเหมือนเดิม ไม่ต้อง query ซ้ำ
    let activeSessions = stats.activeSessions; // fallback เดิมถ้า fetch ด้านล่างล้มเหลว
    try {
      const frontendUrl = process.env.NEARSIP_FRONTEND_URL;
      const presenceKey = process.env.PRESENCE_INTERNAL_KEY;
      if (frontendUrl && presenceKey) {
        const presenceRes = await fetch(`${frontendUrl}/api/presence/count`, {
          headers: { "x-api-key": presenceKey },
          cache: "no-store",
        });
        if (presenceRes.ok) {
          const presenceJson = await presenceRes.json();
          if (typeof presenceJson.activeCount === "number") {
            activeSessions = presenceJson.activeCount;
          }
        }
      }
    } catch (presenceErr) {
      console.warn("presence count fetch failed, falling back to DB session count", presenceErr);
    }

    return Response.json({ activeSessions, uniqueUsers: stats.uniqueUsers });
  } catch (err) {
    console.error("active-count DB query failed", err);
    return Response.json({ message: "Failed to reach database" }, { status: 502 });
  }
}
