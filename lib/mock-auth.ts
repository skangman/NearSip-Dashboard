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
  // {
  //   password: "province123",
  //   sessionId: "nsp_prv_4b88d1a7f3164e80a2b21b95ac796e43",
  //   viewer: {
  //     id: "viewer-province-bkk",
  //     username: "province_bkk",
  //     displayName: "Bangkok Province Team",
  //     role: "province",
  //     province: "กรุงเทพมหานคร",
  //   },
  // },
  // เดิม: เปิดไว้เทส permission โดยผูกกับ "เจ้าของร้าน Siam Social Demo" (mock) — คอมเมนต์ไว้ก่อนตามที่ขอ
  // เพราะไม่ผูกกับ user/credential จริงของเจ้าของร้าน (ระบบ login จริงอยู่คนละ auth กับ dashboard นี้
  // ดูรายละเอียดในแชท) แทนที่ด้วย admin01-03 ด้านล่างนี้แทน
  // {
  //   password: "owner123",
  //   sessionId: "nsp_own_96c2452e4f1f45f19dced4167e0c28ca",
  //   viewer: {
  //     id: "viewer-owner-siam",
  //     username: "owner_siam",
  //     displayName: "Siam Social Demo Owner",
  //     role: "owner",
  //     province: "กรุงเทพมหานคร",
  //     venue: "Siam Social Demo",
  //   },
  // },
  // เพิ่มเพื่อเทส permission ตามที่ขอ — username admin01-03 แต่ role ตั้งเป็น "province" ไม่ใช่ "admin"
  // เพราะ canAccessMenu() ที่ dashboard-runtime.ts ให้ role "admin" เห็นทุกเมนูเสมอข้ามการเช็คสิทธิ์
  // (ดูรายละเอียดในแชท) role "province" ถึงจะถูก admin ใหญ่สุดจำกัดเมนูได้จริงในหน้า Users & Menu Access
  // ส่วน default จะเห็นทุกเมนูเหมือน admin จนกว่า admin ใหญ่สุดจะเข้าไปปลดออกทีละเมนู
  // ไม่ระบุ province ให้ตามที่ขอ — role "province" ที่ไม่มี province จะได้ scope "ทุกจังหวัด/ทุกร้าน"
  // ทั่วประเทศแทนจังหวัดเดียว (ดู initialScope ใน dashboard-runtime.ts + getViewerScopeLabel ใน auth-types.ts)
  {
    password: "admin01123",
    sessionId: "nsp_ad1_1a2b3c4d5e6f70819203a4b5c6d7e8f9",
    viewer: {
      id: "viewer-admin01",
      username: "admin01",
      displayName: "Admin 01",
      role: "province",
    },
  },
  {
    password: "admin02123",
    sessionId: "nsp_ad2_2b3c4d5e6f70819203a4b5c6d7e8f9a1",
    viewer: {
      id: "viewer-admin02",
      username: "admin02",
      displayName: "Admin 02",
      role: "province",
    },
  },
  {
    password: "admin03123",
    sessionId: "nsp_ad3_3c4d5e6f70819203a4b5c6d7e8f9a1b2",
    viewer: {
      id: "viewer-admin03",
      username: "admin03",
      displayName: "Admin 03",
      role: "province",
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
  return MOCK_ACCOUNTS.map(({ password, viewer }) => ({
    id: viewer.id,
    username: viewer.username,
    displayName: viewer.displayName,
    role: viewer.role,
    scope: getViewerScopeLabel(viewer),
    // เพิ่มตามที่ขอ — ส่ง password ออกไปให้ admin สูงสุดเห็นในหน้า Users & Menu Access
    password,
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
