import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { updateProject, deleteProject } from "@/lib/projects-store";

export const runtime = "nodejs";

async function requireLecturer() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) return { ok: false as const, status: 401, error: "Not signed in." };
  if (session.role !== "Lecturer")
    return { ok: false as const, status: 403, error: "Lecturer access required." };
  return { ok: true as const };
}

const DB_HINT = " (If this keeps failing, set DATABASE_URL and DATABASE_AUTH_TOKEN on the server.)";

export async function PATCH(req: Request) {
  const auth = await requireLecturer();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let id = "";
  let fields: Record<string, unknown> = {};
  try {
    const body = await req.json();
    id = String(body?.id ?? "");
    fields = body?.fields ?? {};
    if (!id) throw new Error("no id");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const project = await updateProject(id, fields);
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : "Could not save.") + DB_HINT },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireLecturer();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let id = "";
  try {
    id = String((await req.json())?.id ?? "");
    if (!id) throw new Error("no id");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const ok = await deleteProject(id);
    if (!ok) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : "Could not delete.") + DB_HINT },
      { status: 500 }
    );
  }
}
