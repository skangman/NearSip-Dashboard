// Server-only, READ-ONLY connection pool to the NearSip Postgres database.
//
// Never import this from a Client Component — it reads DATABASE_URL, which must
// stay on the server. Every query under lib/db MUST be a plain SELECT: this
// layer only ever reads, it never writes to the DB.

import { Pool, type PoolClient } from "pg";

// เก็บบน globalThis กัน dev HMR สร้าง pool ซ้ำทุกครั้งที่ module ถูก reload
const globalForPool = globalThis as unknown as { nearsipPgPool?: Pool };

export function getPool(): Pool {
  if (!globalForPool.nearsipPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured");
    }
    globalForPool.nearsipPgPool = new Pool({ connectionString, max: 3 });
  }
  return globalForPool.nearsipPgPool;
}

/** ยืม connection มาใช้แล้วคืนเสมอ — query บน client เดียวกันรันได้ทีละตัว (ห้ามใช้ Promise.all) */
export async function withClient<T>(run: (db: Queryable) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await run(client);
  } finally {
    client.release();
  }
}

export type Queryable = Pick<PoolClient, "query">;
