export type ViewerRole = "admin" | "province" | "owner";

export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  role: ViewerRole;
  province?: string;
  venue?: string;
  // มีเฉพาะบัญชีร้าน (login ด้วย set_location.username/password) — server บังคับข้อมูลทุก API เป็นร้านนี้ (ดู api-handler)
  storeId?: string;
  /** เมนูที่ร้านเห็นได้ (set_location.dashboard_menus ผ่าน partnerMenus()) — บัญชีเดิมไม่มี ใช้ localStorage เหมือนเดิม */
  menus?: string[];
};

export type ManagedUser = Pick<
  Viewer,
  "id" | "username" | "displayName" | "role"
> & {
  scope: string;
  // เพิ่มตามที่ขอ — ให้ admin สูงสุดเห็น password ของ user ในหน้า Users & Menu Access
  // (เฉพาะ mock account ในระบบนี้ ไม่ใช่ credential จริงของใคร)
  password: string;
  // บัญชีร้านในหน้า Users & Menu Access — สิทธิ์เมนูเก็บใน DB (dashboard_menus) แทน localStorage
  storeId?: string;
  menus?: string[];
  /** รหัสร้านเป็น bcrypt ดูย้อนหลังไม่ได้ — แสดงแค่ตั้งแล้ว/ยัง */
  hasPassword?: boolean;
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
