import type { Viewer } from "@/lib/auth-types";

export const DASHBOARD_MENUS = [
  { id: "executive", label: "Executive Overview", mode: "overall" },
  { id: "partners", label: "Partners & Geography", mode: "overall" },
  { id: "users", label: "Users & Demographics", mode: "overall" },
  {
    id: "engagement",
    label: "Engagement & Retention",
    mode: "overall",
  },
  { id: "time", label: "Time & Night Pattern", mode: "overall" },
  { id: "nsc", label: "NSC & Revenue", mode: "overall" },
  { id: "merchant", label: "Merchant Success", mode: "overall" },
  { id: "realtime", label: "Real-time", mode: "realtime" },
] as const;

export type DashboardMenuId = (typeof DASHBOARD_MENUS)[number]["id"];
export type PermissionUser = Pick<Viewer, "id" | "role">;
export type UserMenuPermissions = Record<string, DashboardMenuId[]>;

export const OVERALL_DASHBOARD_MENUS = DASHBOARD_MENUS.filter(
  (menu) => menu.mode === "overall",
);

const STORAGE_KEY = "nearsip_user_menu_permissions_v2";
const LEGACY_STORAGE_KEY = "nearsip_role_menu_permissions_v1";
const MENU_IDS = new Set<DashboardMenuId>(
  DASHBOARD_MENUS.map((menu) => menu.id),
);

export function getDefaultUserMenuPermissions(
  users: PermissionUser[],
): UserMenuPermissions {
  const allMenus = DASHBOARD_MENUS.map((menu) => menu.id);

  return Object.fromEntries(
    users
      .filter((user) => user.role !== "admin")
      .map((user) => [user.id, [...allMenus]]),
  );
}

function parseMenus(
  value: unknown,
  fallback: DashboardMenuId[],
): DashboardMenuId[] {
  if (!Array.isArray(value)) return fallback;

  return Array.from(
    new Set(
      value.filter(
        (menuId): menuId is DashboardMenuId =>
          typeof menuId === "string" && MENU_IDS.has(menuId as DashboardMenuId),
      ),
    ),
  );
}

function parseStoredRecord(stored: string | null): Record<string, unknown> {
  if (!stored) return {};

  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  return parsed as Record<string, unknown>;
}

export function loadUserMenuPermissions(
  users: PermissionUser[],
): UserMenuPermissions {
  const defaults = getDefaultUserMenuPermissions(users);
  if (typeof window === "undefined") return defaults;

  try {
    const storedByUser = parseStoredRecord(
      window.localStorage.getItem(STORAGE_KEY),
    );
    const storedByRole = parseStoredRecord(
      window.localStorage.getItem(LEGACY_STORAGE_KEY),
    );

    return Object.fromEntries(
      users
        .filter((user) => user.role !== "admin")
        .map((user) => {
          const storedMenus = Object.hasOwn(storedByUser, user.id)
            ? storedByUser[user.id]
            : storedByRole[user.role];

          return [
            user.id,
            parseMenus(storedMenus, defaults[user.id]),
          ];
        }),
    );
  } catch {
    return defaults;
  }
}

export function saveUserMenuPermissions(
  permissions: UserMenuPermissions,
): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
    return true;
  } catch {
    return false;
  }
}
