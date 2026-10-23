import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import {
  DOC_TYPES,
  MAX_DOCS_PER_LESSON,
  MAX_DOC_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_TYPES,
  cleanFilename,
  extOf,
  lessonsDb,
  listLessons,
  parseYouTubeId,
} from "@/lib/lessons";

export const runtime = "nodejs";

async function session() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function GET() {
  const s = await session();
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  try {
    return NextResponse.json({ lessons: await listLessons() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not load lessons." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const s = await session();
  if (!s) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (s.role !== "Lecturer") return NextResponse.json({ error: "Lecturer access required." }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim().slice(0, 160);
  const description = String(form.get("description") ?? "").trim().slice(0, 2000);
  const section = String(form.get("section") ?? "").trim().slice(0, 80);
  const youtubeRaw = String(form.get("youtube") ?? "").trim();
  if (!title) return NextResponse.json({ error: "Please enter a title." }, { status: 400 });

  let youtubeId: string | null = null;
  if (youtubeRaw) {
    youtubeId = parseYouTubeId(youtubeRaw);
    if (!youtubeId) return NextResponse.json({ error: "That does not look like a YouTube link." }, { status: 400 });
  }

  const docs = form.getAll("documents").filter((f): f is File => typeof f !== "string" && f.size > 0);
  const videoEntry = form.get("video");
  const video = videoEntry && typeof videoEntry !== "string" && videoEntry.size > 0 ? videoEntry : null;

  if (!docs.length && !video && !youtubeId)
    return NextResponse.json({ error: "Add at least one document, video file or YouTube link." }, { status: 400 });
  if (docs.length > MAX_DOCS_PER_LESSON)
    return NextResponse.json({ error: `You can attach up to ${MAX_DOCS_PER_LESSON} documents per lesson.` }, { status: 400 });

  const rows: { kind: "document" | "video"; filename: string; mime: string; data: Uint8Array }[] = [];
  for (const f of docs) {
    const ext = extOf(f.name);
    if (!DOC_TYPES[ext]) return NextResponse.json({ error: `Document type ${ext || "(none)"} is not allowed.` }, { status: 400 });
    if (f.size > MAX_DOC_BYTES)
      return NextResponse.json({ error: `${f.name} is larger than ${MAX_DOC_BYTES / 1048576} MB.` }, { status: 400 });
    rows.push({ kind: "document", filename: cleanFilename(f.name), mime: DOC_TYPES[ext], data: new Uint8Array(await f.arrayBuffer()) });
  }
  if (video) {
    const ext = extOf(video.name);
    if (!VIDEO_TYPES[ext]) return NextResponse.json({ error: "Video files must be .mp4 or .webm." }, { status: 400 });
    if (video.size > MAX_VIDEO_BYTES)
      return NextResponse.json(
        { error: `The video is larger than ${MAX_VIDEO_BYTES / 1048576} MB. Upload it to YouTube and paste the link instead.` },
        { status: 400 }
      );
    rows.push({ kind: "video", filename: cleanFilename(video.name), mime: VIDEO_TYPES[ext], data: new Uint8Array(await video.arrayBuffer()) });
  }

  try {
    const c = await lessonsDb();
    const id = crypto.randomUUID();
    const stmts = [
      {
        sql: `INSERT INTO lessons (id,title,description,section,youtube_id,created_by,created_at) VALUES (?,?,?,?,?,?,?)`,
        args: [id, title, description, section, youtubeId, s.email, new Date().toISOString()],
      },
      ...rows.map((r) => ({
        sql: `INSERT INTO lesson_files (id,lesson_id,kind,filename,mime,size,data) VALUES (?,?,?,?,?,?,?)`,
        args: [crypto.randomUUID(), id, r.kind, r.filename, r.mime, r.data.byteLength, r.data],
      })),
    ];
    await c.batch(stmts, "write");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          (err instanceof Error ? err.message : "Could not save the lesson.") +
          " (On a hosted deployment, set DATABASE_URL + DATABASE_AUTH_TOKEN to a writable libSQL/Turso database so uploads persist.)",
      },
      { status: 500 }
    );
  }
}
