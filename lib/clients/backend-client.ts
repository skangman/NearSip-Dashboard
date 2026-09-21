// Server-only client for the NearSip .NET backend.
//
// Never import this from a Client Component / "use client" file — it reads
// BACKEND_INTERNAL_API_KEY, which must stay on the server. Only services under
// lib/services call these functions (Route Handlers reach them through a
// service), so the key is never exposed to the browser.
//
// The backend itself (../backend, .NET) is read-only from here: this file only
// calls it over HTTP with the shared API key, it never touches backend source.

const BACKEND_BASE = process.env.BACKEND_BASE ?? "http://localhost:5100";
const BACKEND_INTERNAL_API_KEY = process.env.BACKEND_INTERNAL_API_KEY ?? "";
const API_KEY_HEADER = "X-API-KEY";

export class BackendRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "BackendRequestError";
  }
}

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BACKEND_INTERNAL_API_KEY) {
    throw new Error("BACKEND_INTERNAL_API_KEY is not configured");
  }

  const res = await fetch(`${BACKEND_BASE}${path}`, {
    ...init,
    headers: {
      [API_KEY_HEADER]: BACKEND_INTERNAL_API_KEY,
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    throw new BackendRequestError(
      `Backend request failed: ${init?.method ?? "GET"} ${path} → ${res.status}`,
      res.status,
      body,
    );
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Paged list endpoints ({ status, message, total?, data[] } envelope)
// ---------------------------------------------------------------------------

export type PageOptions = { page?: number; limit?: number };

type PagedEnvelope<T> = {
  status: boolean;
  message: string | null;
  total?: number;
  data: T[] | null;
};

export type PagedResult<T> = { items: T[]; total: number };

function pageQueryString({ page, limit }: PageOptions): string {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  return params.size ? `?${params.toString()}` : "";
}

/**
 * GET รายการแบบแบ่งหน้าจาก backend — backend ตอบ 400 (BadRequest) พร้อม { status:false }
 * เมื่อไม่มีข้อมูล จึงถือว่าเป็นผลว่าง ไม่ใช่ error
 */
async function fetchPagedList<T>(path: string, opts: PageOptions): Promise<PagedResult<T>> {
  try {
    const envelope = await backendFetch<PagedEnvelope<T>>(`${path}${pageQueryString(opts)}`);
    return { items: envelope.data ?? [], total: envelope.total ?? envelope.data?.length ?? 0 };
  } catch (err) {
    if (err instanceof BackendRequestError && err.status === 400) {
      return { items: [], total: 0 };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// GET /api/set-location — รายชื่อร้าน (backend.Controllers.SetLocationController)
// ---------------------------------------------------------------------------

export type BackendLocationStatus = "ACTIVE" | "INAVTIVE";

/** camelCase wire shape of backend.Models.LocationResponseModel */
export type BackendStoreLocation = {
  storeId: string;
  name: string | null;
  locationName: string | null;
  latitud: number;
  longitude: number;
  radius: number;
  status: BackendLocationStatus;
};

type SetLocationEnvelope = {
  status: boolean;
  message: string | null;
  data: BackendStoreLocation[] | null;
};

/** GET {BACKEND_BASE}/api/set-location — รายชื่อร้านทั้งหมดจาก backend จริง */
export async function fetchStoreLocations(): Promise<BackendStoreLocation[]> {
  const envelope = await backendFetch<SetLocationEnvelope>("/api/set-location");
  return envelope.data ?? [];
}

// ---------------------------------------------------------------------------
// GET /api/cheers/{storeId}/{responderUserId} — backend.Controllers.CheersController
// ---------------------------------------------------------------------------

export type BackendCheerStatus = "Pending" | "Accepted" | "Refuse";

export type BackendCheerItem = {
  id: string;
  storeId: string;
  inittiatorUserId: string;
  status: BackendCheerStatus;
  createAt: string;
  userId: string;
  userName: string | null;
  userAge: number | null;
  userGender: string | null;
  userImage: string | null;
  userAboutMe: string | null;
  userAccountType: string | null;
};

export type BackendCheersResult = PagedResult<BackendCheerItem>;

/**
 * GET {BACKEND_BASE}/api/cheers/{storeId}/{responderUserId} — cheers ที่ pending
 * อยู่ของร้านนั้น (รอ responderUserId ตอบรับ)
 */
export function fetchStoreCheers(
  storeId: string,
  responderUserId: string,
  opts: PageOptions = {},
): Promise<BackendCheersResult> {
  return fetchPagedList<BackendCheerItem>(
    `/api/cheers/${encodeURIComponent(storeId)}/${encodeURIComponent(responderUserId)}`,
    opts,
  );
}

// ---------------------------------------------------------------------------
// GET /api/feed — ประกาศ/feed (backend.Controllers.FeedController)
// ---------------------------------------------------------------------------

export type BackendFeedType = "Global" | "Store";
export type BackendFeedDisplayType = "Text" | "Image";

export type BackendFeedItem = {
  id: string;
  feedType: BackendFeedType;
  feedDisplayType: BackendFeedDisplayType;
  storeId: string | null;
  imageGen: string | null;
  imageBtnText: string | null;
  imageTitleText: string | null;
  description: string | null;
  feedDate: string;
};

export type BackendFeedResult = PagedResult<BackendFeedItem>;

/**
 * GET {BACKEND_BASE}/api/feed (หรือ /api/feed/{storeId} ถ้าระบุ storeId) — รายการ feed จริง
 * (ไม่ระบุ storeId = feed ทุกร้าน)
 */
export function fetchFeed(
  storeId?: string,
  opts: PageOptions = {},
): Promise<BackendFeedResult> {
  const path = storeId ? `/api/feed/${encodeURIComponent(storeId)}` : "/api/feed";
  return fetchPagedList<BackendFeedItem>(path, opts);
}
