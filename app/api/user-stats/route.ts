import { getCurrentViewer } from "@/lib/mock-auth";
import { getUserStats } from "@/lib/db-client";

/**
 * GET /api/user-stats?days=30&storeId=xxx → COUNT(*) จริงจากตาราง user (DB ตรง, read-only)
 * มีเพราะ backend ไม่มี endpoint list/aggregate user เลย (ดู lib/db-client.ts)
 * storeId: ไม่ส่ง = รวมทุกร้าน, ส่ง = กรองเฉพาะร้านนั้น (ดู getUserStats() ว่าอะไรกรองได้/ไม่ได้)
 */
export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days")) || 30;
  const storeId = searchParams.get("storeId") || undefined;

  try {
    const stats = await getUserStats(days, storeId);
    return Response.json(stats);
  } catch (err) {
    console.error("user-stats DB query failed", err);
    return Response.json({ message: "Failed to reach database" }, { status: 502 });
  }
}
