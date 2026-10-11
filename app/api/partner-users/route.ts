import { authenticatedRoute } from "@/lib/http/api-handler";
import { BadRequestError } from "@/lib/http/errors";
// เดิม: import { getPartnerUsers } from "@/lib/services/partner-user-service";
import { createPartnerUser, getPartnerUsers } from "@/lib/services/partner-user-service";

/** GET /api/partner-users → บัญชีร้านพาร์ทเนอร์ (set_location) — ไม่มี password ในผลลัพธ์ */
export const GET = authenticatedRoute(
  // เดิม: () => getPartnerUsers()
  ({ viewer }) => getPartnerUsers(viewer),
  { failureMessage: "Failed to reach database", logLabel: "partner-users" },
);

/** POST /api/partner-users body { name, locationName, latitud, longitude, radius, status, province?, username?, password? } → สร้างร้านใหม่ (admin เท่านั้น) */
export const POST = authenticatedRoute(
  async ({ viewer, request }) => {
    const payload: unknown = await request.json().catch(() => {
      throw new BadRequestError("Invalid JSON body");
    });
    return createPartnerUser(viewer, payload);
  },
  { failureMessage: "Failed to reach backend", logLabel: "partner-users" },
);
