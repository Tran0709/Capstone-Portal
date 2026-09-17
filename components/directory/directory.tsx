"use client";

import * as React from "react";
import { directoryCss } from "./directory-styles";
import { initDirectory } from "./directory-logic";

export function Directory() {
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
          if (!controller.signal.aborted) initDirectory(projects, controller.signal);
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        setStatus("error");
        console.error(e);
      }
    })();
    return () => controller.abort();
  }, []);

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
    </>
  );
}
