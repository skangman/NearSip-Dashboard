import {
  getViewerScopeLabel,
  type ManagedUser,
  type PublicMockAccount,
  type Viewer,
} from "@/lib/domain/viewer";
import { MOCK_ACCOUNTS } from "./mock-accounts";
import { startSession } from "./session";

const MAX_USERNAME_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 128;

export function listPublicAccounts(): PublicMockAccount[] {
  return MOCK_ACCOUNTS.map(({ password, viewer }) => ({
    username: viewer.username,
    password,
    displayName: viewer.displayName,
    role: viewer.role,
    scope: getViewerScopeLabel(viewer),
  }));
}

export function listManagedUsers(): ManagedUser[] {
  return MOCK_ACCOUNTS.map(({ password, viewer }) => ({
    id: viewer.id,
    username: viewer.username,
    displayName: viewer.displayName,
    role: viewer.role,
    scope: getViewerScopeLabel(viewer),
    // ส่ง password ออกไปให้ admin สูงสุดเห็นในหน้า Users & Menu Access
    password,
  }));
}

/** รายการผู้ใช้ที่ viewer จัดการสิทธิ์เมนูได้ — เฉพาะ admin */
export function listManagedUsersFor(viewer: Viewer): ManagedUser[] {
  return viewer.role === "admin" ? listManagedUsers() : [];
}

function findAccount(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  return MOCK_ACCOUNTS.find(
    (candidate) =>
      candidate.viewer.username === normalizedUsername &&
      candidate.password === password,
  );
}

type LoginCredentials = { username: string; password: string; remember: boolean };

function parseLoginCredentials(payload: unknown): LoginCredentials | null {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("username" in payload) ||
    !("password" in payload) ||
    typeof payload.username !== "string" ||
    typeof payload.password !== "string" ||
    ("remember" in payload && typeof payload.remember !== "boolean") ||
    payload.username.length > MAX_USERNAME_LENGTH ||
    payload.password.length > MAX_PASSWORD_LENGTH
  ) {
    return null;
  }

  return {
    username: payload.username,
    password: payload.password,
    remember: "remember" in payload && payload.remember === true,
  };
}

export type LoginResult =
  | { ok: true; viewer: Viewer }
  | { ok: false; status: 400 | 401; message: string };

/** ตรวจ payload + credential แล้วเริ่ม session (ตั้ง cookie) เมื่อสำเร็จ */
export async function login(payload: unknown): Promise<LoginResult> {
  const credentials = parseLoginCredentials(payload);
  if (!credentials) {
    return { ok: false, status: 400, message: "กรุณากรอก Username และ Password" };
  }

  const account = findAccount(credentials.username, credentials.password);
  if (!account) {
    return { ok: false, status: 401, message: "Username หรือ Password ไม่ถูกต้อง" };
  }

  await startSession(account.sessionId, credentials.remember);
  return { ok: true, viewer: account.viewer };
}
