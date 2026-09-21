import { login } from "@/lib/services/auth/auth-service";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ message: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" }, { status: 400 });
  }

  const result = await login(payload);
  if (!result.ok) {
    return Response.json({ message: result.message }, { status: result.status });
  }

  return Response.json({ viewer: result.viewer });
}
