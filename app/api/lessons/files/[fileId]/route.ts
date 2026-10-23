import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { lessonsDb } from "@/lib/lessons";

export const runtime = "nodejs";

function toBytes(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  if (ArrayBuffer.isView(v)) return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  return new Uint8Array(0);
}

export async function GET(req: Request, ctx: { params: Promise<{ fileId: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) return new Response("Not signed in.", { status: 401 });

  const { fileId } = await ctx.params;
  const c = await lessonsDb();
  const res = await c.execute({
    sql: `SELECT kind,filename,mime,data FROM lesson_files WHERE id = ?`,
    args: [fileId],
  });
  const row = res.rows[0];
  if (!row) return new Response("File not found.", { status: 404 });

  const bytes = toBytes(row.data);
  const total = bytes.byteLength;
  const isVideo = row.kind === "video";
  const name = String(row.filename).replace(/"/g, "");
  const headers: Record<string, string> = {
    "Content-Type": String(row.mime),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `${isVideo ? "inline" : "attachment"}; filename="${name}"`,
  };

  // Byte-range support so uploaded videos can be seeked.
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    let start = range[1] ? parseInt(range[1], 10) : total - parseInt(range[2], 10);
    let end = range[1] && range[2] ? parseInt(range[2], 10) : total - 1;
    start = Math.max(0, start);
    end = Math.min(total - 1, end);
    if (start > end || start >= total)
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    const part = bytes.slice(start, end + 1);
    return new Response(part as BodyInit, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(part.byteLength) },
    });
  }
  return new Response(bytes as BodyInit, { headers: { ...headers, "Content-Length": String(total) } });
}
