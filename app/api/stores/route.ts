import { getCurrentViewer } from "@/lib/mock-auth";
import { fetchStoreLocations, BackendRequestError } from "@/lib/backend-client";

/** GET /api/stores → proxy ของ {BACKEND_BASE}/api/set-location (ข้อมูลร้านจริง) */
export async function GET() {
  const viewer = await getCurrentViewer();
  if (!viewer) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const stores = await fetchStoreLocations();
    return Response.json({ stores });
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
