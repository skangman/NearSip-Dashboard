import { cookies } from "next/headers";
import {
  authenticateMockAccount,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/mock-auth";

export async function POST(request: Request) {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return Response.json(
      { message: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  if (
    !credentials ||
    typeof credentials !== "object" ||
    !("username" in credentials) ||
    !("password" in credentials) ||
    typeof credentials.username !== "string" ||
    typeof credentials.password !== "string" ||
    ("remember" in credentials && typeof credentials.remember !== "boolean") ||
    credentials.username.length > 64 ||
    credentials.password.length > 128
  ) {
    return Response.json(
      { message: "กรุณากรอก Username และ Password" },
      { status: 400 },
    );
  }

  const authenticated = authenticateMockAccount(
    credentials.username,
    credentials.password,
  );

  if (!authenticated) {
    return Response.json(
      { message: "Username หรือ Password ไม่ถูกต้อง" },
      { status: 401 },
    );
  }

  const remember =
    "remember" in credentials && credentials.remember === true;

  (await cookies()).set(
    SESSION_COOKIE_NAME,
    authenticated.sessionId,
    sessionCookieOptions(remember),
  );

  return Response.json({ viewer: authenticated.viewer });
}
