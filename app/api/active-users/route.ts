import { authenticatedRoute } from "@/lib/http/api-handler";
import { stringParam } from "@/lib/http/query";
import { getActiveUsers } from "@/lib/services/user-stats-service";

/**
 * GET /api/active-users?storeId=xxx&q=คำค้น&view=online|recent → รายชื่อผู้ใช้ (q = ค้นชื่อ/email)
 * view=online = session ยังไม่หมดอายุ, อื่นๆ = login ล่าสุด 10 คน
 * ใช้กับการ์ดหน้า "ผู้ใช้ตอนนี้" ในโหมด Real-time
 */
export const GET = authenticatedRoute(
  // เดิม: ({ searchParams }) => getActiveUsers(stringParam(searchParams, "storeId")),
  // เดิม: ({ searchParams }) => getActiveUsers(stringParam(searchParams, "storeId"), stringParam(searchParams, "q")),
  ({ searchParams }) =>
    getActiveUsers(
      stringParam(searchParams, "storeId"),
      stringParam(searchParams, "q"),
      stringParam(searchParams, "view") === "online",
    ),
  { failureMessage: "Failed to reach database", logLabel: "active-users" },
);
