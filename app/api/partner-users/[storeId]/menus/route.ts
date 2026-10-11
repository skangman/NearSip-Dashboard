import { authenticatedRoute } from "@/lib/http/api-handler";
import { BadRequestError } from "@/lib/http/errors";
import { savePartnerMenus } from "@/lib/services/partner-user-service";

type Params = { storeId: string };

/** PUT /api/partner-users/[storeId]/menus body { menus: string[] } → เมนูที่ร้านเห็นได้ (admin เท่านั้น) */
export const PUT = authenticatedRoute<Params>(
  async ({ viewer, params, request }) => {
    const payload: unknown = await request.json().catch(() => {
      throw new BadRequestError("Invalid JSON body");
    });
    return savePartnerMenus(viewer, params.storeId, payload);
  },
  { failureMessage: "Failed to reach database", logLabel: "partner-menus" },
);
