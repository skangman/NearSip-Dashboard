/** อ่าน query param เป็นเลข — ไม่มี/ไม่ใช่เลข/0 = undefined (ให้ service ใช้ค่า default) */
export function numberParam(searchParams: URLSearchParams, name: string): number | undefined {
  return Number(searchParams.get(name)) || undefined;
}

/** อ่าน query param เป็น string — ไม่มี/ว่าง = undefined */
export function stringParam(searchParams: URLSearchParams, name: string): string | undefined {
  return searchParams.get(name) || undefined;
}

/** ?page=&limit= สำหรับ endpoint แบบแบ่งหน้า */
export function pageParams(searchParams: URLSearchParams): { page?: number; limit?: number } {
  return { page: numberParam(searchParams, "page"), limit: numberParam(searchParams, "limit") };
}
