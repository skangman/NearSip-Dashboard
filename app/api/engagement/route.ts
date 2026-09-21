import { authenticatedRoute } from "@/lib/http/api-handler";
import { stringParam } from "@/lib/http/query";
import { getEngagementReport } from "@/lib/services/engagement-service";

/**
 * GET /api/engagement?from=YYYY-MM-DD&to=YYYY-MM-DD&storeId=xxx
 * → Engagement & Retention numbers (real data only). from/to are inclusive business nights
 * (Asia/Bangkok, day boundary 06:00); omit for open-ended. storeId omitted = all stores.
 */
export const GET = authenticatedRoute(
  ({ searchParams }) =>
    getEngagementReport({
      from: stringParam(searchParams, "from"),
      to: stringParam(searchParams, "to"),
      storeId: stringParam(searchParams, "storeId"),
    }),
  { failureMessage: "Failed to reach database", logLabel: "engagement" },
);
