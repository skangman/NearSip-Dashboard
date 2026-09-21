export type ViewerRole = "admin" | "province" | "owner";

export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  role: ViewerRole;
  province?: string;
  venue?: string;
};

export type ManagedUser = Pick<
  Viewer,
  "id" | "username" | "displayName" | "role"
> & {
  scope: string;
  // เพิ่มตามที่ขอ — ให้ admin สูงสุดเห็น password ของ user ในหน้า Users & Menu Access
  // (เฉพาะ mock account ในระบบนี้ ไม่ใช่ credential จริงของใคร)
  password: string;
};

export type PublicMockAccount = {
  username: string;
  password: string;
  displayName: string;
  role: ViewerRole;
  scope: string;
};

export const ROLE_LABELS: Record<ViewerRole, string> = {
  admin: "ผู้ดูแลระบบ",
  province: "หุ้นส่วน",
  owner: "เจ้าของร้าน",
};

export function getViewerScopeLabel(viewer: Viewer) {
  if (viewer.role === "admin") return "ทุกพื้นที่";
  // ไม่ระบุ province (เช่น admin01-03 สำหรับเทส permission) = เห็นทุกจังหวัดทั่วประเทศ ไม่ใช่แค่จังหวัดเดียว
  if (viewer.role === "province" && !viewer.province) return "ทุกจังหวัด · ทุกร้าน";
  if (viewer.role === "province") return `${viewer.province} · ทุกร้าน`;
  return `${viewer.venue} · ${viewer.province}`;
}
