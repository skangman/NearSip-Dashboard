import { authenticatedRoute } from "@/lib/http/api-handler";
import { pageParams } from "@/lib/http/query";
import { listPendingCheers } from "@/lib/services/cheers-service";

type Params = { storeId: string; responderUserId: string };

/**
 * GET /api/cheers/[storeId]/[responderUserId]?page=&limit=
 * → cheers ที่ pending อยู่ของร้านนั้น (จาก backend)
 */
export const GET = authenticatedRoute<Params>(
  ({ params, searchParams }) =>
    listPendingCheers(params.storeId, params.responderUserId, pageParams(searchParams)),
  { failureMessage: "Failed to reach backend", logLabel: "cheers" },
);
