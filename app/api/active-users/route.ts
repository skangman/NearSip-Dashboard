import { authenticatedRoute } from "@/lib/http/api-handler";
import { stringParam } from "@/lib/http/query";
import { getActiveUsers } from "@/lib/services/user-stats-service";

/**
 * GET /api/active-users?storeId=xxx&q=คำค้น → รายชื่อผู้ใช้ที่มี session ยังไม่หมดอายุ (q = ค้นชื่อ/email)
 * ใช้กับการ์ดหน้า "ผู้ใช้ตอนนี้" ในโหมด Real-time
 */
export const GET = authenticatedRoute(
  // เดิม: ({ searchParams }) => getActiveUsers(stringParam(searchParams, "storeId")),
  ({ searchParams }) => getActiveUsers(stringParam(searchParams, "storeId"), stringParam(searchParams, "q")),
  { failureMessage: "Failed to reach database", logLabel: "active-users" },
);
