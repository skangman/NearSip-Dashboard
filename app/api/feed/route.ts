import { authenticatedRoute } from "@/lib/http/api-handler";
import { pageParams } from "@/lib/http/query";
import { listFeed } from "@/lib/services/feed-service";

/** GET /api/feed?page=&limit= → ประกาศ/feed จริงจาก backend */
export const GET = authenticatedRoute(
  ({ searchParams }) => listFeed(pageParams(searchParams)),
  { failureMessage: "Failed to reach backend", logLabel: "feed" },
);
