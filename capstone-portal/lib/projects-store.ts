import { db } from "@/lib/db";

export type Project = Record<string, unknown>;

/** Returns all projects from the SQLite database. */
export async function getProjects(): Promise<Project[]> {
  const conn = await db();
  const res = await conn.execute("SELECT data FROM projects ORDER BY rowid");
  return res.rows.map((r) => JSON.parse(String((r as unknown as { data: string }).data)));
}

/**
 * Upserts uploaded projects into the database, keyed by `id`.
 * - mode "merge": insert/replace each incoming project (existing ids updated).
 * - mode "replace": clear the table first, then insert.
 * `module` tags which module each uploaded project belongs to.
 * Returns the new total project count.
 */
export async function upsertProjects(
  incoming: Project[],
  module: string,
  mode: "merge" | "replace"
): Promise<number> {
  const conn = await db();
  const statements = [];
  if (mode === "replace") {
    statements.push({ sql: "DELETE FROM projects", args: [] });
  }
  incoming.forEach((p, i) => {
    const id = p?.id != null ? String(p.id) : `upload-${Date.now()}-${i}`;
    const mod = String((p.module as string) ?? module ?? "default");
    statements.push({
      sql: "INSERT OR REPLACE INTO projects (id,module,data) VALUES (?,?,?)",
      args: [id, mod, JSON.stringify({ ...p, id, module: mod })],
    });
  });

  // Apply in chunks so batches stay small.
  const CHUNK = 400;
  for (let i = 0; i < statements.length; i += CHUNK) {
    await conn.batch(statements.slice(i, i + CHUNK), "write");
  }

  const res = await conn.execute("SELECT COUNT(*) AS n FROM projects");
  return Number((res.rows[0] as unknown as { n: number }).n);
}
