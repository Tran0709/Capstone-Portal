"use client";

import * as React from "react";
import { Download, FileText, PlayCircle, Search, Video } from "lucide-react";

export type LessonVideo = { id: string; title: string };
export type Lesson = {
  id: number;
  title: string;
  domain: string;
  domainLabel: string;
  videos: LessonVideo[];
  summary?: string;
  doc?: { file: string; name: string };
};

export function LessonsBrowser({ lessons }: { lessons: Lesson[] }) {
  const [query, setQuery] = React.useState("");
  const [domain, setDomain] = React.useState("all");
  const [onlyVideos, setOnlyVideos] = React.useState(false);
  const [open, setOpen] = React.useState<number | null>(null);

  const domains = React.useMemo(() => {
    const seen = new Map<string, string>();
    lessons.forEach((l) => seen.set(l.domain, l.domainLabel));
    return [...seen.entries()];
  }, [lessons]);

  const q = query.trim().toLowerCase();
  const shown = lessons.filter(
    (l) =>
      (domain === "all" || l.domain === domain) &&
      (!onlyVideos || l.videos.length > 0) &&
      (!q || `${l.id} ${l.title} ${l.domainLabel}`.toLowerCase().includes(q))
  );

  return (
    <div>
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
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="h-10 rounded-md border bg-surface px-3 text-sm"
          aria-label="Filter by domain"
        >
          <option value="all">All domains</option>
          {domains.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyVideos}
            onChange={(e) => setOnlyVideos(e.target.checked)}
          />
          Only with video
        </label>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {shown.length} of {lessons.length} modules
      </p>

      <ul className="mt-4 grid gap-3">
        {shown.map((l) => {
          const isOpen = open === l.id;
          return (
            <li key={l.id} className="rounded-xl border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Module {l.id} · {l.domainLabel}
                  </div>
                  <h2 className="mt-0.5 font-medium">{l.title}</h2>
                </div>
                {l.videos.length > 0 || l.doc ? (
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : l.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2"
                    aria-expanded={isOpen}
                  >
                    <PlayCircle className="size-4" />
                    {isOpen ? "Hide" : l.videos.length > 0 ? "Watch" : "Open"}
                  </button>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Video className="size-4" /> Coming soon
                  </span>
                )}
              </div>

              {isOpen && l.summary && (
                <p className="mt-4 text-sm text-muted-foreground">{l.summary}</p>
              )}
              {isOpen &&
                l.videos.map((v) => (
                  <div key={v.id} className="mt-4">
                    <div className="mb-2 text-sm text-muted-foreground">{v.title}</div>
                    <div className="aspect-video overflow-hidden rounded-lg border bg-black">
                      <iframe
                        src={`https://www.youtube.com/embed/${v.id}`}
                        title={v.title}
                        loading="lazy"
                        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="size-full"
                      />
                    </div>
                    <a
                      className="mt-1 inline-block text-xs text-muted-foreground underline"
                      href={`https://www.youtube.com/watch?v=${v.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on YouTube
                    </a>
                  </div>
                ))}
              {isOpen && l.doc && (
                <div className="mt-4 flex items-center gap-3 rounded-lg border bg-surface-2 p-3">
                  <FileText className="size-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{l.doc.name}</div>
                    <div className="text-xs text-muted-foreground">Lesson document · Word (.docx)</div>
                  </div>
                  <a
                    href={l.doc.file}
                    download={l.doc.name}
                    className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface"
                  >
                    <Download className="size-4" /> Download
                  </a>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
