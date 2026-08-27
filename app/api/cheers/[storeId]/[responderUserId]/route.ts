import { getCurrentViewer } from "@/lib/mock-auth";
import { fetchStoreCheers, BackendRequestError } from "@/lib/backend-client";

type Params = { storeId: string; responderUserId: string };

/**
 * GET /api/cheers/[storeId]/[responderUserId]
 * → proxy ของ {BACKEND_BASE}/api/cheers/{storeId}/{responderUserId}
 * รองรับ query ?page=&limit= (ส่งต่อไปที่ backend)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { storeId, responderUserId } = await params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || undefined;
  const limit = Number(searchParams.get("limit")) || undefined;

  try {
    const result = await fetchStoreCheers(storeId, responderUserId, {
      page,
      limit,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return Response.json(
        { message: err.message, backend: err.body },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    return Response.json(
      { message: "Failed to reach backend" },
      { status: 502 },
    );
  }
}
