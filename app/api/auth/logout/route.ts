import { endSession } from "@/lib/services/auth/session";

export async function POST() {
  await endSession();
  return Response.json({ success: true });
}
