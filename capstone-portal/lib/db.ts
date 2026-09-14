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
  const url = process.env.DATABASE_URL?.trim() || "file:data/portal.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;
  client = createClient({ url, authToken });
  return client;
}

async function initSchemaAndSeed(db: Client): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY, name TEXT, role TEXT, salt TEXT, hash TEXT
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, module TEXT, data TEXT NOT NULL
    )`
  );
  // Keep the authorised-user list in sync with data/users.json (tiny + fast).
  // Projects are NOT seeded here — the bundled dataset is the base and uploads
  // are stored on top (see lib/projects-store.ts), so there is no large seed.
  const rows = usersSeed as Array<Record<string, unknown>>;
  for (const u of rows) {
    await db.execute({
      sql: `INSERT INTO users (email,name,role,salt,hash) VALUES (?,?,?,?,?)
            ON CONFLICT(email) DO UPDATE SET name=excluded.name, role=excluded.role`,
      args: [
        String(u.email ?? "").toLowerCase(),
        String(u.name ?? ""),
        String(u.role ?? ""),
        (u.salt as string) ?? null,
        (u.hash as string) ?? null,
      ],
    });
  }
}

/**
 * Returns a client. Schema creation + user sync run once; if they fail (e.g.
 * a read-only filesystem with no hosted DB configured) the error is swallowed
 * so reads can still proceed against bundled fallbacks.
 */
export async function db(): Promise<Client> {
  const c = getClient();
  if (!readyPromise) {
    readyPromise = initSchemaAndSeed(c).catch((err) => {
      console.warn("DB init skipped (read-only or unavailable):", err?.message ?? err);
    });
  }
  await readyPromise;
  return c;
}
