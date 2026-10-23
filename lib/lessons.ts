import type { Client } from "@libsql/client";
import { db } from "@/lib/db";

export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB per document
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024; // 20 MB per video file
export const MAX_DOCS_PER_LESSON = 5;

export const DOC_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};
export const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i < 0 ? "" : name.slice(i).toLowerCase();
}

export function cleanFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "file";
}

/** Accepts a YouTube URL (watch, youtu.be, embed, shorts) or a bare 11-character id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

let ready: Promise<void> | null = null;

async function ensureSchema(c: Client): Promise<void> {
  await c.execute(
    `CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      section TEXT,
      youtube_id TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
  await c.execute(
    `CREATE TABLE IF NOT EXISTS lesson_files (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL,
      data BLOB NOT NULL
    )`
  );
  await c.execute(`CREATE INDEX IF NOT EXISTS idx_lesson_files_lesson ON lesson_files (lesson_id)`);
}

export async function lessonsDb(): Promise<Client> {
  const c = await db();
  if (!ready) {
    ready = ensureSchema(c).catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
  return c;
}

export type LessonFileMeta = { id: string; kind: "document" | "video"; filename: string; mime: string; size: number };
export type LessonItem = {
  id: string;
  title: string;
  description: string;
  section: string;
  youtubeId: string | null;
  createdBy: string;
  createdAt: string;
  files: LessonFileMeta[];
};

export async function listLessons(): Promise<LessonItem[]> {
  const c = await lessonsDb();
  const lessons = await c.execute(
    `SELECT id,title,description,section,youtube_id,created_by,created_at FROM lessons ORDER BY created_at DESC`
  );
  const files = await c.execute(`SELECT id,lesson_id,kind,filename,mime,size FROM lesson_files ORDER BY rowid`);
  const byLesson = new Map<string, LessonFileMeta[]>();
  for (const f of files.rows) {
    const key = String(f.lesson_id);
    const arr = byLesson.get(key) ?? [];
    arr.push({
      id: String(f.id),
      kind: f.kind === "video" ? "video" : "document",
      filename: String(f.filename),
      mime: String(f.mime),
      size: Number(f.size),
    });
    byLesson.set(key, arr);
  }
  return lessons.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    description: String(r.description ?? ""),
    section: String(r.section ?? ""),
    youtubeId: r.youtube_id ? String(r.youtube_id) : null,
    createdBy: String(r.created_by),
    createdAt: String(r.created_at),
    files: byLesson.get(String(r.id)) ?? [],
  }));
}
