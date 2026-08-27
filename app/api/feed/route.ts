import { getCurrentViewer } from "@/lib/mock-auth";
import { fetchFeed, BackendRequestError } from "@/lib/backend-client";

/** GET /api/feed → proxy ของ {BACKEND_BASE}/api/feed (ประกาศ/feed จริง) */
export async function GET(request: Request) {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || undefined;
  const limit = Number(searchParams.get("limit")) || undefined;

  try {
    const result = await fetchFeed(undefined, { page, limit });
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
