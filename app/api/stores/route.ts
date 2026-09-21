import { authenticatedRoute } from "@/lib/http/api-handler";
import { listStores } from "@/lib/services/store-service";

/** GET /api/stores → รายชื่อร้านจริงจาก backend */
export const GET = authenticatedRoute(
  async () => ({ stores: await listStores() }),
  { failureMessage: "Failed to reach backend", logLabel: "stores" },
);
