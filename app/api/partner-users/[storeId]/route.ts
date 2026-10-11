import { authenticatedRoute } from "@/lib/http/api-handler";
import { BadRequestError } from "@/lib/http/errors";
import { savePartnerUser } from "@/lib/services/partner-user-service";

type Params = { storeId: string };

/** PUT /api/partner-users/[storeId] body { province?, username?, password? } → admin เท่านั้น */
export const PUT = authenticatedRoute<Params>(
  async ({ viewer, params, request }) => {
    const payload: unknown = await request.json().catch(() => {
      throw new BadRequestError("Invalid JSON body");
    });
    return savePartnerUser(viewer, params.storeId, payload);
  },
  { failureMessage: "Failed to reach database", logLabel: "partner-users" },
);
