import { db } from "@/lib/db";
import bundled from "@/data/projects.json";

export type Project = Record<string, unknown>;

const bundledProjects = bundled as Project[];

/**
 * Returns all projects: the bundled dataset as the base, overlaid with any
 * uploaded projects stored in the database (matched by `id`; new ids appended).
 * If the database is unavailable, the bundled dataset is returned as-is — so
 * the directory always works, even on a read-only host with no hosted DB.
 */
export async function getProjects(): Promise<Project[]> {
  let uploaded: Project[] = [];
  try {
    const conn = await db();
    const res = await conn.execute("SELECT data FROM projects ORDER BY rowid");
    uploaded = res.rows.map((r) => JSON.parse(String((r as unknown as { data: string }).data)));
  } catch (err) {
    console.warn("Reading uploaded projects failed; using bundled only:", (err as Error)?.message);
    return bundledProjects;
  }
  if (uploaded.length === 0) return bundledProjects;

  const byId = new Map<string, number>();
  const result = bundledProjects.slice();
  result.forEach((p, i) => {
    if (p?.id != null) byId.set(String(p.id), i);
  });
  for (const item of uploaded) {
    const id = item?.id != null ? String(item.id) : null;
    if (id && byId.has(id)) result[byId.get(id)!] = item;
    else {
      result.push(item);
      if (id) byId.set(id, result.length - 1);
    }
  }
  return result;
}

/**
 * Upserts uploaded projects into the database (Turso/libSQL), keyed by `id`.
 * mode "replace" clears previously-uploaded rows first. `module` tags each row.
 * Returns the resulting total project count (bundled + uploaded).
 */
export async function upsertProjects(
  incoming: Project[],
  module: string,
  mode: "merge" | "replace"
): Promise<number> {
  const conn = await db();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statements: { sql: string; args: any[] }[] = [];
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

  const CHUNK = 400;
  for (let i = 0; i < statements.length; i += CHUNK) {
    await conn.batch(statements.slice(i, i + CHUNK), "write");
  }

  return (await getProjects()).length;
}
