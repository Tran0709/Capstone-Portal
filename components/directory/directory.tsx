"use client";

import * as React from "react";
import { directoryCss } from "./directory-styles";
import { initDirectory } from "./directory-logic";
import { toast } from "sonner";

type Proj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const listText = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
const FIELDS: [string, string, "line" | "area" | "list"][] = [
  ["title", "Title", "line"],
  ["shortdesc", "Short description", "area"],
  ["fulldesc", "Full overview", "area"],
  ["category", "Category", "line"],
  ["categoryLabel", "Category label", "line"],
  ["categories", "Categories (comma separated)", "list"],
  ["applicationType", "Application type", "line"],
  ["teamSize", "Team size", "line"],
  ["skillLevel", "Skill level", "line"],
  ["industry", "Industry", "line"],
  ["frontendStack", "Front end (comma separated)", "list"],
  ["backendStack", "Back end (comma separated)", "list"],
  ["middlewareStack", "Middleware (comma separated)", "list"],
];

export function Directory({ isLecturer = false }: { isLecturer?: boolean }) {
  const [version, setVersion] = React.useState(0);
  const [editing, setEditing] = React.useState<Proj | null>(null);
  const [form, setForm] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const startEdit = (p: Proj) => {
    setForm(Object.fromEntries(FIELDS.map(([k]) => [k, listText(p[k])])));
    setEditing(p);
  };
  const removeProject = async (p: Proj) => {
    if (!window.confirm(`Delete "${p.title}"? This removes it from the directory.`)) return;
    const res = await fetch("/api/admin/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error ?? "Could not delete.");
    toast.success("Project deleted.");
    setVersion((v) => v + 1);
  };
  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    const res = await fetch("/api/admin/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, fields: form }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast.error(data.error ?? "Could not save.");
    toast.success("Project updated.");
    setEditing(null);
    setVersion((v) => v + 1);
  };

  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");

  React.useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/projects", { signal: controller.signal });
        if (!res.ok) throw new Error("failed to load projects");
        const projects = await res.json();
        if (controller.signal.aborted) return;
        setStatus("ready");
        requestAnimationFrame(() => {
          if (!controller.signal.aborted) initDirectory(projects, controller.signal, { isLecturer, onEdit: startEdit, onDelete: removeProject });
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        setStatus("error");
        console.error(e);
      }
    })();
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, isLecturer]);

  return (
    <>
      <style>{directoryCss}</style>
      <div className="dash-root">
        <div className="dash-grid">
          <aside className="dash-sidebar">
            <div className="sidebar-label">Search</div>
            <input
              type="text"
              id="search-bar"
              placeholder="Title, tech, ID…"
            />
            <div className="sidebar-label">Sort by</div>
            <select id="sort-select" defaultValue="relevance">
              <option value="relevance">Best match</option>
              <option value="newest">Newest uploaded first</option>
              <option value="oldest">Oldest uploaded first</option>
            </select>
            <div className="sidebar-label">Filters</div>
            <div className="filter-buttons" id="filter-buttons" />
          </aside>

          <main className="dash-main">
            <div className="dash-headline">
              <h2>
                Project Directory
                <span className="count-chip" id="count-chip">—</span>
              </h2>
              <p id="project-count-subtitle">
                {status === "error" ? "Unable to load project data." : "Loading projects…"}
              </p>
            </div>

            <div className="projects-container" id="projects-list" style={{ marginTop: "1.25rem" }} />

            <div className="modal-overlay" id="projectModal">
              <div className="modal-box">
                <button className="close-modal" id="closeModalBtn" aria-label="Close">&times;</button>
                <div className="modal-details">
                  <h2 id="modalTitle" />
                  <span className="modal-category" id="modalCat" />
                  <div className="modal-metadata" id="modalMetadata" />
                  <div className="modal-actions" id="modalActions" />
                  <div className="modal-section">
                    <strong>Full Project Overview</strong>
                    <p id="modalFullDesc" />
                  </div>
                  <div className="modal-section">
                    <strong>Recommended Technology Stack</strong>
                    <div className="modal-stack-grid">
                      <div>
                        <button className="stack-toggle" type="button" data-target="modalFrontend">
                          <span>Front End</span><span>&#9656;</span>
                        </button>
                        <div className="stack-content collapsed" id="modalFrontend" />
                      </div>
                      <div>
                        <button className="stack-toggle" type="button" data-target="modalBackend">
                          <span>Back End</span><span>&#9656;</span>
                        </button>
                        <div className="stack-content collapsed" id="modalBackend" />
                      </div>
                      <div>
                        <button className="stack-toggle" type="button" data-target="modalMiddleware">
                          <span>Middleware</span><span>&#9656;</span>
                        </button>
                        <div className="stack-content collapsed" id="modalMiddleware" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      {editing && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal-box" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <button className="close-modal" aria-label="Close" onClick={() => setEditing(null)}>&times;</button>
            <div className="modal-details edit-form">
              <h2>Edit project</h2>
              {FIELDS.map(([key, label, kind]) => (
                <div key={key}>
                  <label htmlFor={`edit-${key}`}>{label}</label>
                  {kind === "area" ? (
                    <textarea id={`edit-${key}`} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  ) : (
                    <input id={`edit-${key}`} value={form[key] ?? ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                  )}
                </div>
              ))}
              <div className="edit-buttons">
                <button type="button" className="modal-action" onClick={() => setEditing(null)}>Cancel</button>
                <button type="button" className="modal-action edit" disabled={saving} onClick={saveEdit}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
