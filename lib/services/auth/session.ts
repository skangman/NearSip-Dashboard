import { cookies } from "next/headers";
import type { Viewer } from "@/lib/domain/viewer";
import { MOCK_ACCOUNTS } from "./mock-accounts";
import { endPartnerSession, getPartnerViewer } from "./partner-session";

export const SESSION_COOKIE_NAME = "nearsip_mock_session";

const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function sessionCookieOptions(remember: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE_SECONDS } : {}),
  };
}

export async function getCurrentViewer(): Promise<Viewer | null> {
  const sessionId = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  // เดิม: if (!sessionId) return null; แล้วคืน mock viewer หรือ null
  // ตอนนี้: บัญชีเดิมตรวจก่อนเหมือนเดิม — ไม่มี/ไม่ตรงค่อยดู session บัญชีร้าน (cookie แยก ดู partner-session.ts)
  const mockViewer = sessionId
    ? MOCK_ACCOUNTS.find((account) => account.sessionId === sessionId)?.viewer ?? null
    : null;
  if (mockViewer) return mockViewer;
  return getPartnerViewer().catch((err) => {
    console.error("partner session check failed", err);
    return null;
  });
}

export async function startSession(sessionId: string, remember: boolean): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(remember));
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  // logout บัญชีร้านด้วย (cookie แยก)
  await endPartnerSession();
}
