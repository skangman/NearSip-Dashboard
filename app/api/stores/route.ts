import { authenticatedRoute } from "@/lib/http/api-handler";
import { listStores } from "@/lib/services/store-service";

/** GET /api/stores → รายชื่อร้านจริงจาก backend */
// เดิม: async () => ({ stores: await listStores() }) — บัญชีร้านเห็นเฉพาะร้านตัวเอง
export const GET = authenticatedRoute(
  async ({ viewer }) => {
    const stores = await listStores();
    return { stores: viewer.storeId ? stores.filter((store) => store.storeId === viewer.storeId) : stores };
  },
  { failureMessage: "Failed to reach backend", logLabel: "stores" },
);
