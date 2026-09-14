import { createClient, type Client } from "@libsql/client";
import usersSeed from "@/data/users.json";
import projectsSeed from "@/data/projects.json";

/**
 * SQLite (libSQL) data layer.
 *
 * - Local dev: uses a file database (DATABASE_URL defaults to file:data/portal.db).
 * - Vercel / production: set DATABASE_URL to a hosted libSQL/Turso URL
 *   (libsql://...) plus DATABASE_AUTH_TOKEN, so reads AND writes persist.
 *
 * The schema is created and seeded from the bundled JSON on first use
 * (idempotent — safe to run repeatedly).
 */

let client: Client | null = null;
let readyPromise: Promise<void> | null = null;

function getClient(): Client {
  if (client) return client;
  const url = process.env.DATABASE_URL?.trim() || "file:data/portal.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim() || undefined;
  client = createClient({ url, authToken });
  return client;
}

async function initSchemaAndSeed(db: Client): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      name  TEXT,
      role  TEXT,
      salt  TEXT,
      hash  TEXT
    )`
  );
  await db.execute(
    `CREATE TABLE IF NOT EXISTS projects (
      id     TEXT PRIMARY KEY,
      module TEXT,
      data   TEXT NOT NULL
    )`
  );

  // Always ensure the seed users exist (idempotent). Running this every start
  // keeps the authorised-accounts list in sync with data/users.json — new
  // Admins added there appear on the next run, even in an existing database.
  {
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

  const pCount = await db.execute("SELECT COUNT(*) AS n FROM projects");
  if (Number((pCount.rows[0] as unknown as { n: number }).n) === 0) {
    const rows = projectsSeed as Array<Record<string, unknown>>;
    // Seed in chunks to keep each batch small.
    const CHUNK = 400;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      await db.batch(
        slice.map((p, idx) => ({
          sql: "INSERT OR IGNORE INTO projects (id,module,data) VALUES (?,?,?)",
          args: [
            String(p.id ?? `seed-${i + idx}`),
            String((p.module as string) ?? "default"),
            JSON.stringify(p),
          ],
        })),
        "write"
      );
    }
  }
}

/** Returns a ready client (schema created + seeded once). */
export async function db(): Promise<Client> {
  const c = getClient();
  if (!readyPromise) {
    readyPromise = initSchemaAndSeed(c).catch((err) => {
      // Reset so a later call can retry (e.g. transient connect error).
      readyPromise = null;
      throw err;
    });
  }
  await readyPromise;
  return c;
}
