import { authenticatedRoute } from "@/lib/http/api-handler";
import { stringParam } from "@/lib/http/query";
import { getActiveNow } from "@/lib/services/user-stats-service";

/**
 * GET /api/active-count?storeId=xxx → เวอร์ชันเบาของ /api/user-stats
 * ใช้กับ poll ความถี่สูงของการ์ด "ผู้ใช้ NearSip ที่ Active ตอนนี้" (ดูเหตุผลใน getActiveNow())
 */
export const GET = authenticatedRoute(
  // เดิม: ({ searchParams }) => getActiveNow(stringParam(searchParams, "storeId")),
  ({ viewer, searchParams }) => getActiveNow(stringParam(searchParams, "storeId"), Boolean(viewer.storeId)),
  { failureMessage: "Failed to reach database", logLabel: "active-count" },
);
