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
  const deleted = new Set<string>();
  for (const item of uploaded) {
    const id = item?.id != null ? String(item.id) : null;
    if (item?._deleted) {
      if (id) deleted.add(id);
      continue;
    }
    if (id) deleted.delete(id);
    if (id && byId.has(id)) result[byId.get(id)!] = item;
    else {
      result.push(item);
      if (id) byId.set(id, result.length - 1);
    }
  }
  return deleted.size ? result.filter((p) => !deleted.has(String(p?.id))) : result;
}

const ALIASES: Record<string, string[]> = {
  id: ["id", "projectid", "code", "ref"],
  title: ["title", "projecttitle", "name", "projectname"],
  shortdesc: ["shortdesc", "shortdescription", "summary", "description", "desc"],
  fulldesc: ["fulldesc", "fulldescription", "longdescription", "details", "overview"],
  category: ["category"],
  categoryLabel: ["categorylabel"],
  categories: ["categories", "tags"],
  applicationType: ["applicationtype", "apptype", "type"],
  teamSize: ["teamsize", "team"],
  skillLevel: ["skilllevel", "skill", "level"],
  industry: ["industry", "sector"],
  frontendStack: ["frontendstack", "frontend"],
  backendStack: ["backendstack", "backend"],
  middlewareStack: ["middlewarestack", "middleware"],
};
const LIST_FIELDS = new Set(["categories", "frontendStack", "backendStack", "middlewareStack"]);

const squash = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");
const toList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => String(x ?? "").trim()).filter(Boolean)
    : String(v ?? "")
        .split(/[,;|]/)
        .map((x) => x.trim())
        .filter(Boolean);

/**
 * Maps whatever column names an uploaded file uses (Title, Project Title,
 * Description, ...) onto the fields the directory expects, so uploaded projects
 * are always searchable, filterable and counted.
 */
export function normalizeProject(raw: Project, module: string, index: number): Project {
  const out: Project = {};
  const lookup = new Map<string, unknown>();
  for (const [k, v] of Object.entries(raw ?? {})) {
    const key = squash(k);
    if (!lookup.has(key) && v != null && String(v).trim() !== "") lookup.set(key, v);
  }
  const known = new Set<string>();
  for (const [field, names] of Object.entries(ALIASES)) {
    for (const n of names) {
      known.add(n);
      if (lookup.has(n)) {
        out[field] = LIST_FIELDS.has(field) ? toList(lookup.get(n)) : String(lookup.get(n)).trim();
        break;
      }
    }
  }
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (!known.has(squash(k)) && v != null && String(v).trim() !== "") out[k] = v;
  }

  out.title = String(out.title || out.id || `Untitled project ${index + 1}`);
  out.shortdesc = String(out.shortdesc || String(out.fulldesc ?? "").slice(0, 200));
  out.category = String(out.category || (Array.isArray(out.categories) && out.categories[0]) || "Uploaded");
  const cats = Array.isArray(out.categories) && out.categories.length ? (out.categories as string[]) : [out.category as string];
  out.categories = cats;
  out.module = String(out.module || module || "default");
  return out;
}

/**
 * Upserts uploaded projects into the database (Turso/libSQL), keyed by `id`.
 * mode "replace" clears previously-uploaded rows first. `module` tags each row.
 * An uploaded id that already belongs to a different bundled project gets a new
 * id, so new projects are added instead of silently overwriting existing ones.
 * Returns the resulting total project count (bundled + uploaded).
 */
export async function upsertProjects(
  incoming: Project[],
  module: string,
  mode: "merge" | "replace"
): Promise<number> {
  const conn = await db();
  const bundledTitles = new Map<string, string>();
  for (const b of bundledProjects) if (b?.id != null) bundledTitles.set(String(b.id), String(b.title ?? ""));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statements: { sql: string; args: any[] }[] = [];
  if (mode === "replace") {
    statements.push({ sql: "DELETE FROM projects", args: [] });
  }
  const stamp = Date.now().toString(36);
  const uploadedAt = new Date().toISOString();
  incoming.forEach((raw, i) => {
    const p = normalizeProject(raw, module, i);
    let id = p.id ? String(p.id) : "";
    const clash = id && bundledTitles.has(id) && bundledTitles.get(id) !== String(p.title);
    if (!id || clash) id = `UPL-${stamp}-${String(i + 1).padStart(4, "0")}`;
    p.id = id;
    p.uploadedAt = uploadedAt;
    statements.push({
      sql: "INSERT OR REPLACE INTO projects (id,module,data) VALUES (?,?,?)",
      args: [id, String(p.module), JSON.stringify(p)],
    });
  });

  const CHUNK = 400;
  for (let i = 0; i < statements.length; i += CHUNK) {
    await conn.batch(statements.slice(i, i + CHUNK), "write");
  }

  return (await getProjects()).length;
}

const EDITABLE = [
  "title", "shortdesc", "fulldesc", "category", "categoryLabel", "applicationType",
  "teamSize", "skillLevel", "industry", "frontendStack", "backendStack", "middlewareStack", "categories",
] as const;

/** Edits one project (bundled or uploaded) by saving an updated copy under the same id. */
export async function updateProject(id: string, patch: Project): Promise<Project | null> {
  const current = (await getProjects()).find((p) => String(p?.id) === id);
  if (!current) return null;
  const next: Project = { ...current };
  for (const k of EDITABLE) {
    if (!(k in patch)) continue;
    const v = patch[k];
    next[k] = Array.isArray(current[k]) || k === "categories" ? toList(v) : String(v ?? "").trim();
  }
  if (!String(next.title ?? "").trim()) throw new Error("Title is required.");
  if (!Array.isArray(next.categories) || !(next.categories as unknown[]).length) {
    next.categories = [String(next.category || "Uploaded")];
  }
  const conn = await db();
  await conn.execute({
    sql: "INSERT OR REPLACE INTO projects (id,module,data) VALUES (?,?,?)",
    args: [id, String(next.module ?? "default"), JSON.stringify(next)],
  });
  return next;
}

/** Removes a project from the directory (bundled ones are hidden with a marker). */
export async function deleteProject(id: string): Promise<boolean> {
  const exists = (await getProjects()).some((p) => String(p?.id) === id);
  if (!exists) return false;
  const conn = await db();
  await conn.execute({
    sql: "INSERT OR REPLACE INTO projects (id,module,data) VALUES (?,?,?)",
    args: [id, "deleted", JSON.stringify({ id, _deleted: true })],
  });
  return true;
}
