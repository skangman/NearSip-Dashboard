// Server-only client for the presence tracker of the NearSip frontend app
// (in-memory tracker — no DB/schema involved). Reads NEARSIP_FRONTEND_URL and
// PRESENCE_INTERNAL_KEY; never import this from a Client Component.

/**
 * GET {NEARSIP_FRONTEND_URL}/api/presence/count → จำนวนผู้ใช้ที่ active ตอนนี้
 * คืน null เมื่อไม่ได้ตั้งค่า env, response ไม่ ok หรือรูปแบบไม่ตรง — network error จะ throw
 */
export async function fetchPresenceActiveCount(): Promise<number | null> {
  const frontendUrl = process.env.NEARSIP_FRONTEND_URL;
  const presenceKey = process.env.PRESENCE_INTERNAL_KEY;
  if (!frontendUrl || !presenceKey) return null;

  const res = await fetch(`${frontendUrl}/api/presence/count`, {
    headers: { "x-api-key": presenceKey },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json: unknown = await res.json();
  if (json && typeof json === "object" && "activeCount" in json && typeof json.activeCount === "number") {
    return json.activeCount;
  }
  return null;
}

/**
 * GET {NEARSIP_FRONTEND_URL}/api/presence/users → user id ที่ active ตอนนี้ (เกณฑ์เดียวกับ /count)
 * ใช้กับหน้า "ผู้ใช้ตอนนี้" ปุ่ม "ออนไลน์ตอนนี้" — คืน null / throw ตามกติกาเดียวกับ fetchPresenceActiveCount()
 */
export async function fetchPresenceActiveUserIds(): Promise<string[] | null> {
  const frontendUrl = process.env.NEARSIP_FRONTEND_URL;
  const presenceKey = process.env.PRESENCE_INTERNAL_KEY;
  if (!frontendUrl || !presenceKey) return null;

  const res = await fetch(`${frontendUrl}/api/presence/users`, {
    headers: { "x-api-key": presenceKey },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json: unknown = await res.json();
  if (
    json && typeof json === "object" && "userIds" in json && Array.isArray(json.userIds) &&
    json.userIds.every((id) => typeof id === "string")
  ) {
    return json.userIds;
  }
  return null;
}
