import { authenticatedRoute } from "@/lib/http/api-handler";
import { numberParam, stringParam } from "@/lib/http/query";
import { getUserStats } from "@/lib/services/user-stats-service";

/**
 * GET /api/user-stats?days=30&storeId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD → สถิติผู้ใช้จริงจาก DB ตรง (read-only)
 * storeId: ไม่ส่ง = รวมทุกร้าน, ส่ง = กรองเฉพาะร้านนั้น
 * from/to: คืนธุรกิจ (ตัด 06:00 น. เวลาไทย) ที่ใช้แยกผู้ใช้ใหม่/เดิม — ไม่ส่ง from = ไม่แยก (null)
 */
export const GET = authenticatedRoute(
  ({ searchParams }) =>
    getUserStats({
      days: numberParam(searchParams, "days"),
      storeId: stringParam(searchParams, "storeId"),
      from: stringParam(searchParams, "from"),
      to: stringParam(searchParams, "to"),
    }),
  { failureMessage: "Failed to reach database", logLabel: "user-stats" },
);
