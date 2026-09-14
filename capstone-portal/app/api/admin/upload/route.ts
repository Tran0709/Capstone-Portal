import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Papa from "papaparse";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { upsertProjects, type Project } from "@/lib/projects-store";

export const runtime = "nodejs";

async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) return { ok: false as const, status: 401, error: "Not signed in." };
  if (session.role !== "Lecturer")
    return { ok: false as const, status: 403, error: "Lecturer access required." };
  return { ok: true as const, session };
}

function parseProjects(text: string, filename: string): Project[] {
  const name = filename.toLowerCase();
  if (name.endsWith(".json") || text.trim().startsWith("[") || text.trim().startsWith("{")) {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [data];
  }
  const result = Papa.parse<Project>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  if (result.errors?.length) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }
  return result.data.filter((r) => r && Object.keys(r).length > 0);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let text = "";
  let filename = "upload.json";
  let mode: "merge" | "replace" = "merge";
  let moduleName = "default";

  try {
    const form = await req.formData();
    const file = form.get("file");
    mode = form.get("mode") === "replace" ? "replace" : "merge";
    moduleName = String(form.get("module") || "default").trim() || "default";
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    filename = (file as File).name || filename;
    text = await (file as File).text();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  let incoming: Project[];
  try {
    incoming = parseProjects(text, filename);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not parse file." },
      { status: 400 }
    );
  }
  if (!incoming.length) {
    return NextResponse.json({ error: "No project rows found in file." }, { status: 400 });
  }

  try {
    const total = await upsertProjects(incoming, moduleName, mode);
    return NextResponse.json({ ok: true, added: incoming.length, total });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          (err instanceof Error ? err.message : "Could not save projects.") +
          " (On Vercel, set DATABASE_URL + DATABASE_AUTH_TOKEN to a hosted libSQL/Turso database so writes persist.)",
      },
      { status: 500 }
    );
  }
}
