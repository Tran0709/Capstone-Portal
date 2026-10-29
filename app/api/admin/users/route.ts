import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { listUsers, setUserRole, countLecturers } from "@/lib/users";

export const runtime = "nodejs";

async function requireLecturer() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (!session) return { ok: false as const, status: 401, error: "Not signed in." };
  if (session.role !== "Lecturer")
    return { ok: false as const, status: 403, error: "Lecturer access required." };
  return { ok: true as const, session };
}

export async function GET() {
  const auth = await requireLecturer();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ users: await listUsers() });
}

export async function PATCH(req: Request) {
  const auth = await requireLecturer();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let email = "";
  let role: "Student" | "Lecturer" = "Student";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    if (body?.role !== "Student" && body?.role !== "Lecturer") throw new Error("bad role");
    role = body.role;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (email === auth.session.email.toLowerCase() && role === "Student") {
    return NextResponse.json({ error: "You cannot remove your own lecturer access." }, { status: 400 });
  }

  try {
    if (role === "Student" && (await countLecturers()) <= 1) {
      return NextResponse.json({ error: "At least one lecturer must remain." }, { status: 400 });
    }
    const ok = await setUserRole(email, role);
    if (!ok) return NextResponse.json({ error: "User not found." }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: "Could not update (database is read-only). Set DATABASE_URL on the server." },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, email, role });
}
