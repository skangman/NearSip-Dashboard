import { fetchStoreCheers, type BackendCheersResult, type PageOptions } from "@/lib/clients/backend-client";

/** cheers ที่ pending อยู่ของร้านนั้น (รอ responderUserId ตอบรับ) */
export function listPendingCheers(
  storeId: string,
  responderUserId: string,
  opts: PageOptions = {},
): Promise<BackendCheersResult> {
  return fetchStoreCheers(storeId, responderUserId, opts);
}
