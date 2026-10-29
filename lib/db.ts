import { createClient, type Client } from "@libsql/client";
import usersSeed from "@/data/users.json";

/**
 * SQLite (libSQL) data layer.
 *
 * - Local dev: file database (DATABASE_URL defaults to file:data/portal.db).
 * - Vercel / production: set DATABASE_URL to a hosted libSQL/Turso URL
 *   (libsql://...) + DATABASE_AUTH_TOKEN so writes (uploads) persist.
 *
 * The app is resilient: user roles and project data have bundled fallbacks,
 * so reads work even when the database is read-only or unavailable. A writable
 * database is only required to persist admin uploads.
 */

let client: Client | null = null;
let readyPromise: Promise<void> | null = null;

export function getClient(): Client {
  if (client) return client;
  let url = process.env.DATABASE_URL?.trim() || "file:data/portal.db";
  // Workers cannot reliably hold the WebSocket that libsql:// uses; HTTPS works everywhere.
  if (url.startsWith("libsql://")) url = "https://" + url.slice("libsql://".length);
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;
  client = createClient({ url, authToken });
  return client;
}

async function initSchemaAndSeed(db: Client): Promise<void> {
  const rows = usersSeed as Array<Record<string, unknown>>;
  // One round trip: create tables and seed users that do not exist yet.
  // Existing rows (and roles changed by an admin) are never overwritten.
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY, name TEXT, role TEXT, salt TEXT, hash TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, module TEXT, data TEXT NOT NULL
      )`,
      ...rows.map((u) => ({
        sql: `INSERT INTO users (email,name,role,salt,hash) VALUES (?,?,?,?,?)
              ON CONFLICT(email) DO NOTHING`,
        args: [
          String(u.email ?? "").toLowerCase(),
          String(u.name ?? ""),
          String(u.role ?? ""),
          ((u.salt as string) ?? null) as string | null,
          ((u.hash as string) ?? null) as string | null,
        ],
      })),
    ],
    "write"
  );
}

/**
 * Returns a client. Schema creation + user sync run once; if they fail (e.g.
 * a read-only filesystem with no hosted DB configured) the error is swallowed
 * so reads can still proceed against bundled fallbacks.
 */
export async function db(): Promise<Client> {
  const c = getClient();
  if (!readyPromise) {
    const timeout = new Promise<void>((_, rej) =>
      setTimeout(() => rej(new Error("database init timed out")), 8000)
    );
    readyPromise = Promise.race([initSchemaAndSeed(c), timeout]).catch((err) => {
      console.warn("DB init skipped (read-only or unavailable):", err?.message ?? err);
    });
  }
  await readyPromise;
  return c;
}
