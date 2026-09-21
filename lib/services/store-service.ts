import { fetchStoreLocations, type BackendStoreLocation } from "@/lib/clients/backend-client";

/** รายชื่อร้านทั้งหมดจาก backend จริง (ผู้เรียกกรอง status เองตามต้องการ) */
export function listStores(): Promise<BackendStoreLocation[]> {
  return fetchStoreLocations();
}
