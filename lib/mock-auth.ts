import { cookies } from "next/headers";
import {
  getViewerScopeLabel,
  type ManagedUser,
  type PublicMockAccount,
  type Viewer,
} from "@/lib/auth-types";

export const SESSION_COOKIE_NAME = "nearsip_mock_session";

type MockAccount = {
  password: string;
  sessionId: string;
  viewer: Viewer;
};

const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    password: "admin123",
    sessionId: "nsp_adm_7f5e8c2a91d64b30a4c821f63310e772",
    viewer: {
      id: "viewer-admin",
      username: "admin",
      displayName: "NearSip Admin",
      role: "admin",
    },
  },
  {
    password: "province123",
    sessionId: "nsp_prv_4b88d1a7f3164e80a2b21b95ac796e43",
    viewer: {
      id: "viewer-province-bkk",
      username: "province_bkk",
      displayName: "Bangkok Province Team",
      role: "province",
      province: "กรุงเทพมหานคร",
    },
  },
  {
    password: "owner123",
    sessionId: "nsp_own_96c2452e4f1f45f19dced4167e0c28ca",
    viewer: {
      id: "viewer-owner-siam",
      username: "owner_siam",
      displayName: "Siam Social Demo Owner",
      role: "owner",
      province: "กรุงเทพมหานคร",
      venue: "Siam Social Demo",
    },
  },
];

export function getPublicMockAccounts(): PublicMockAccount[] {
  return MOCK_ACCOUNTS.map(({ password, viewer }) => ({
    username: viewer.username,
    password,
    displayName: viewer.displayName,
    role: viewer.role,
    scope: getViewerScopeLabel(viewer),
  }));
}

export function getManagedMockUsers(): ManagedUser[] {
  return MOCK_ACCOUNTS.map(({ viewer }) => ({
    id: viewer.id,
    username: viewer.username,
    displayName: viewer.displayName,
    role: viewer.role,
    scope: getViewerScopeLabel(viewer),
  }));
}

export function authenticateMockAccount(username: string, password: string) {
  const normalizedUsername = username.trim().toLowerCase();
  const account = MOCK_ACCOUNTS.find(
    (candidate) =>
      candidate.viewer.username === normalizedUsername &&
      candidate.password === password,
  );

  if (!account) return null;

  return {
    sessionId: account.sessionId,
    viewer: account.viewer,
  };
}

export async function getCurrentViewer(): Promise<Viewer | null> {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  return (
    MOCK_ACCOUNTS.find((account) => account.sessionId === sessionId)?.viewer ??
    null
  );
}

export function sessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  };
}
