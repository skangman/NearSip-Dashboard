import { fetchStoreLocations, type BackendStoreLocation } from "@/lib/clients/backend-client";
import { withClient } from "@/lib/db/pool";
import { listStoreProvinces } from "@/lib/db/store.repository";

// เดิม:
// /** รายชื่อร้านทั้งหมดจาก backend จริง (ผู้เรียกกรอง status เองตามต้องการ) */
// export function listStores(): Promise<BackendStoreLocation[]> {
//   return fetchStoreLocations();
// }

/**
 * รายชื่อร้านทั้งหมดจาก backend จริง (ผู้เรียกกรอง status เองตามต้องการ)
 * + province จาก set_location (backend ไม่มีฟิลด์นี้) — ใช้แสดงจังหวัดของร้านที่เลือกในบรรทัด scope
 * อ่านจังหวัดไม่สำเร็จ → province = null (รายชื่อร้านยังได้ตามเดิม)
 */
export async function listStores(): Promise<(BackendStoreLocation & { province: string | null })[]> {
  const stores = await fetchStoreLocations();
  let provinces = new Map<string, string | null>();
  try {
    provinces = await withClient(listStoreProvinces);
  } catch (err) {
    console.warn("store provinces fetch failed, continuing without province", err);
  }
  return stores.map((store) => ({ ...store, province: provinces.get(store.storeId) ?? null }));
}
