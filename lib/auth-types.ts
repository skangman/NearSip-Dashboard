export type ViewerRole = "admin" | "province" | "owner";

export type Viewer = {
  id: string;
  username: string;
  displayName: string;
  role: ViewerRole;
  province?: string;
  venue?: string;
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
  province: "ผู้ดูแลจังหวัด",
  owner: "เจ้าของร้าน",
};

export function getViewerScopeLabel(viewer: Viewer) {
  if (viewer.role === "admin") return "ทุกพื้นที่";
  if (viewer.role === "province") return `${viewer.province} · ทุกร้าน`;
  return `${viewer.venue} · ${viewer.province}`;
}
