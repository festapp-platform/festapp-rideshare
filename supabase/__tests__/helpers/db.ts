import { Client } from "pg";

const DB_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

/** Execute raw SQL against the local database (bypasses triggers if needed). */
export async function execSQL(sql: string, params?: unknown[]): Promise<void> {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    await client.query(sql, params);
  } finally {
    await client.end();
  }
}
