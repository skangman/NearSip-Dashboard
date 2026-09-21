import { fetchFeed, type BackendFeedResult, type PageOptions } from "@/lib/clients/backend-client";

/** ประกาศ/feed จริงจาก backend (ไม่ระบุ storeId = feed ทุกร้าน) */
export function listFeed(opts: PageOptions & { storeId?: string } = {}): Promise<BackendFeedResult> {
  const { storeId, ...page } = opts;
  return fetchFeed(storeId, page);
}
