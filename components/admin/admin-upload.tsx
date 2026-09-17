"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Upload, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminUpload() {
  const [file, setFile] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState<"merge" | "replace">("merge");
  const [moduleName, setModuleName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("mode", mode);
      body.append("module", moduleName);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed.");
        setResult(data.error ?? "Upload failed.");
        return;
      }
      toast.success(`Uploaded ${data.added} projects. Directory now has ${data.total}.`);
      setResult(`Success — added ${data.added}, total is now ${data.total}.`);
      setFile(null);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-surface p-6">
      <div className="mb-1 flex items-center gap-2">
        <FileUp className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Upload projects</h1>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Upload a <strong>.json</strong> array or a <strong>.csv</strong> of projects. Rows are
        matched to existing projects by their <code>id</code> — merge updates/adds those; replace
        swaps the whole directory. The count and listing update automatically.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center hover:border-primary/50">
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-sm">
            {file ? (
              <span className="text-foreground">{file.name}</span>
            ) : (
              <>Click to choose a <strong>.json</strong> or <strong>.csv</strong> file</>
            )}
          </span>
          <input
            type="file"
            accept=".json,.csv,application/json,text/csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="grid gap-2">
          <label htmlFor="module" className="text-sm text-muted-foreground">
            Module (optional — tags the uploaded projects, e.g. &quot;ISAD3000&quot;)
          </label>
          <input
            id="module"
            type="text"
            placeholder="default"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring"
          />
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Mode:</span>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} />
            Merge (add / update by id)
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
            Replace all
          </label>
        </div>

        <Button type="submit" disabled={loading || !file} className="w-full sm:w-auto">
          {loading && <Loader2 className="animate-spin" />}
          Upload
        </Button>

        {result && <p className="text-sm text-muted-foreground">{result}</p>}
      </form>

      <div className="mt-6 border-t pt-4 text-xs text-muted-foreground">
        Persisting uploads requires a Vercel Blob store (env var{" "}
        <code>BLOB_READ_WRITE_TOKEN</code>). Without it the directory still runs on the bundled
        dataset. See DEPLOY.md.
      </div>
    </div>
  );
}
