import { authenticatedRoute } from "@/lib/http/api-handler";
import { pageParams } from "@/lib/http/query";
import { listFeed } from "@/lib/services/feed-service";

/** GET /api/feed?page=&limit= → ประกาศ/feed จริงจาก backend */
export const GET = authenticatedRoute(
  // เดิม: ({ searchParams }) => listFeed(pageParams(searchParams)) — บัญชีร้านเห็นเฉพาะ feed ของร้านตัวเอง
  ({ viewer, searchParams }) =>
    listFeed({ ...pageParams(searchParams), ...(viewer.storeId ? { storeId: viewer.storeId } : {}) }),
  { failureMessage: "Failed to reach backend", logLabel: "feed" },
);
