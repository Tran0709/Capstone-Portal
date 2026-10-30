"use client";

import * as React from "react";
import { Download, FileText, Loader2, PlayCircle, Plus, Search, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { FilePicker } from "@/components/ui/file-picker";

type LessonFile = { id: string; kind: "document" | "video"; filename: string; mime: string; size: number };
type Lesson = {
  id: string;
  title: string;
  description: string;
  section: string;
  youtubeId: string | null;
  createdBy: string;
  createdAt: string;
  files: LessonFile[];
};

const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const inputCls = "h-10 w-full rounded-md border bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

export function LessonsBrowser({ isLecturer }: { isLecturer: boolean }) {
  const [lessons, setLessons] = React.useState<Lesson[] | null>(null);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState("all");
  const [open, setOpen] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const fetchLessons = React.useCallback(async (): Promise<Lesson[]> => {
    const res = await fetch("/api/lessons", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load lessons.");
    return data.lessons;
  }, []);

  const load = React.useCallback(async () => {
    try {
      setLessons(await fetchLessons());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load lessons.");
      setLessons([]);
    }
  }, [fetchLessons]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadInitialLessons() {
      try {
        const result = await fetchLessons();
        if (!cancelled) {
          setLessons(result);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load lessons.");
          setLessons([]);
        }
      }
    }
    void loadInitialLessons();
    return () => {
      cancelled = true;
    };
  }, [fetchLessons]);

  const sections = React.useMemo(
    () => [...new Set((lessons ?? []).map((l) => l.section).filter(Boolean))].sort(),
    [lessons]
  );
  const q = query.trim().toLowerCase();
  const shown = (lessons ?? []).filter(
    (l) =>
      (section === "all" || l.section === section) &&
      (!q || `${l.title} ${l.description} ${l.section}`.toLowerCase().includes(q))
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Drop empty file inputs so the server does not see zero-byte parts.
    for (const key of ["documents", "video"]) {
      fd.getAll(key).forEach((f) => {
        if (f instanceof File && f.size === 0) fd.delete(key);
      });
    }
    setBusy(true);
    try {
      const res = await fetch("/api/lessons", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast.success("Lesson added.");
      formRef.current?.reset();
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(l: Lesson) {
    if (!window.confirm(`Delete "${l.title}" and its files?`)) return;
    const res = await fetch(`/api/lessons/${l.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Lesson deleted.");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Could not delete.");
    }
  }

  return (
    <div>
      {isLecturer && (
        <div className="mb-6 rounded-xl border bg-surface p-4">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            <Plus className="size-4" /> {showForm ? "Close" : "Add lesson"}
          </button>
          {showForm && (
            <form ref={formRef} onSubmit={onSubmit} className="mt-4 grid gap-3">
              <input name="title" required maxLength={160} placeholder="Lesson title" className={inputCls} />
              <input name="section" maxLength={80} placeholder="Section / module (optional, e.g. Module 12)" className={inputCls} />
              <textarea
                name="description"
                maxLength={2000}
                rows={3}
                placeholder="Short description (optional)"
                className="w-full rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">YouTube link (optional)</span>
                <input name="youtube" placeholder="https://www.youtube.com/watch?v=…" className={inputCls} />
              </label>
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">Video file (optional) · .mp4 or .webm · up to 20 MB</span>
                <FilePicker name="video" accept=".mp4,.webm,video/mp4,video/webm" buttonLabel="Choose video file" />
              </div>
              <div className="grid gap-1 text-sm">
                <span className="text-muted-foreground">
                  Documents (optional, up to 5) · PDF, Word, PowerPoint, Excel, text, zip, images · up to 10 MB each
                </span>
                <FilePicker
                  name="documents"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.zip,.png,.jpg,.jpeg"
                  buttonLabel="Choose documents"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} {busy ? "Uploading…" : "Save lesson"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lessons…"
            className="h-10 w-full rounded-md border bg-surface pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {sections.length > 0 && (
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="h-10 rounded-md border bg-surface px-3 text-sm"
            aria-label="Filter by section"
          >
            <option value="all">All sections</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {lessons === null && <p className="mt-6 text-sm text-muted-foreground">Loading lessons…</p>}
      {error && <p className="mt-6 text-sm text-destructive">{error}</p>}
      {lessons && !error && lessons.length === 0 && (
        <div className="mt-6 rounded-xl border bg-surface p-8 text-center text-sm text-muted-foreground">
          No lessons yet.{isLecturer ? " Use “Add lesson” to upload the first documents and videos." : " Your lecturer will add them soon."}
        </div>
      )}

      <ul className="mt-4 grid gap-3">
        {shown.map((l) => {
          const isOpen = open === l.id;
          const video = l.files.find((f) => f.kind === "video");
          const docs = l.files.filter((f) => f.kind === "document");
          return (
            <li key={l.id} className="rounded-xl border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">
                    {l.section ? `${l.section} · ` : ""}
                    {new Date(l.createdAt).toLocaleDateString()}
                  </div>
                  <h2 className="mt-0.5 font-medium">{l.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {(l.youtubeId || video) && (
                      <span className="inline-flex items-center gap-1">
                        <Video className="size-3.5" /> Video
                      </span>
                    )}
                    {docs.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="size-3.5" /> {docs.length} document{docs.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : l.id)}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2"
                    aria-expanded={isOpen}
                  >
                    <PlayCircle className="size-4" /> {isOpen ? "Hide" : l.youtubeId || video ? "Watch" : "Open"}
                  </button>
                  {isLecturer && (
                    <button
                      type="button"
                      onClick={() => remove(l)}
                      className="inline-flex items-center rounded-md border px-2.5 py-1.5 text-sm text-destructive hover:bg-surface-2"
                      aria-label={`Delete ${l.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 grid gap-4">
                  {l.description && <p className="text-sm text-muted-foreground whitespace-pre-line">{l.description}</p>}
                  {l.youtubeId && (
                    <div className="aspect-video overflow-hidden rounded-lg border bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${l.youtubeId}`}
                        title={l.title}
                        loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="size-full"
                      />
                    </div>
                  )}
                  {video && (
                    <video controls preload="metadata" className="w-full rounded-lg border bg-black" src={`/api/lessons/files/${video.id}`} />
                  )}
                  {docs.map((d) => (
                    <div key={d.id} className="flex items-center gap-3 rounded-lg border bg-surface-2 p-3">
                      <FileText className="size-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{d.filename}</div>
                        <div className="text-xs text-muted-foreground">{fmtSize(d.size)}</div>
                      </div>
                      <a
                        href={`/api/lessons/files/${d.id}`}
                        download={d.filename}
                        className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface"
                      >
                        <Download className="size-4" /> Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
