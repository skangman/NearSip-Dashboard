import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/mock-auth";

export async function POST() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return Response.json({ success: true });
}
