import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { lessonsDb } from "@/lib/lessons";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const s = await verifySessionToken(token);
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (s.role !== "Lecturer") return NextResponse.json({ error: "Lecturer access required." }, { status: 403 });
  const { id } = await ctx.params;
  try {
    const c = await lessonsDb();
    await c.batch(
      [
        { sql: `DELETE FROM lesson_files WHERE lesson_id = ?`, args: [id] },
        { sql: `DELETE FROM lessons WHERE id = ?`, args: [id] },
      ],
      "write"
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not delete." }, { status: 500 });
  }
}
