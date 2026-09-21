import { BackendRequestError } from "@/lib/clients/backend-client";
import type { Viewer } from "@/lib/domain/viewer";
import { BadRequestError } from "@/lib/http/errors";
import { getCurrentViewer } from "@/lib/services/auth/session";

type ApiContext<P> = { viewer: Viewer; params: P; searchParams: URLSearchParams };

type ApiHandlerOptions = {
  /** ข้อความตอบกลับ (502) เมื่อ service ล้มเหลวโดยไม่ใช่ error จาก backend */
  failureMessage: string;
  /** ชื่อไว้ prefix ใน log ของ error ที่ไม่คาดคิด */
  logLabel: string;
};

function backendErrorStatus(status: number): number {
  return status >= 400 && status < 600 ? status : 502;
}

function toErrorResponse(err: unknown, { failureMessage, logLabel }: ApiHandlerOptions): Response {
  if (err instanceof BadRequestError) {
    return Response.json({ message: err.message }, { status: 400 });
  }
  if (err instanceof BackendRequestError) {
    return Response.json(
      { message: err.message, backend: err.body },
      { status: backendErrorStatus(err.status) },
    );
  }
  console.error(`${logLabel} failed`, err);
  return Response.json({ message: failureMessage }, { status: 502 });
}

/**
 * ห่อ Route Handler แบบ GET ที่ต้อง login: เช็ค viewer (401) → เรียก handler → ตอบ JSON
 * และแปลง error เป็น Response เดียวกันทุก route (BackendRequestError คง status จาก backend,
 * อื่นๆ = 502) เพื่อให้ไฟล์ route มีแค่การอ่าน request แล้วเรียก service
 */
export function authenticatedRoute<P = Record<string, never>>(
  handler: (ctx: ApiContext<P>) => Promise<unknown>,
  options: ApiHandlerOptions,
) {
  return async (request: Request, context?: { params: Promise<P> }): Promise<Response> => {
    const viewer = await getCurrentViewer();
    if (!viewer) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
      const params = (context ? await context.params : {}) as P;
      const searchParams = new URL(request.url).searchParams;
      return Response.json(await handler({ viewer, params, searchParams }));
    } catch (err) {
      return toErrorResponse(err, options);
    }
  };
}
