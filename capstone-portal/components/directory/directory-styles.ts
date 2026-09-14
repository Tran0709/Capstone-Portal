// Dark dashboard styles for the directory (classes produced by directory-logic).
export const directoryCss = `.dash-root { color: var(--foreground); }

.dash-grid {
  display: grid;
  grid-template-columns: 288px minmax(0, 1fr);
  align-items: start;
  gap: 0;
  min-height: calc(100svh - 61px);
}

.dash-sidebar {
  position: sticky;
  top: 61px;
  align-self: start;
  height: calc(100svh - 61px);
  overflow-y: auto;
  border-right: 1px solid var(--border);
  background: var(--surface);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dash-main { padding: 1.5rem clamp(1rem, 3vw, 2rem) 3rem; min-width: 0; }

.dash-headline h2 {
  font-size: clamp(1.4rem, 2.4vw, 1.9rem);
  font-weight: 700;
  letter-spacing: -0.02em;
}
.dash-headline p { color: var(--muted-foreground); margin-top: 0.35rem; font-size: 0.95rem; }

.sidebar-label {
  font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em;
  color: var(--muted-foreground); font-weight: 600;
}

#search-bar {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border-radius: 0.7rem;
  border: 1px solid var(--input);
  background: var(--background);
  color: var(--foreground);
  font-size: 0.92rem;
  outline: none;
}
#search-bar::placeholder { color: var(--muted-foreground); }
#search-bar:focus { border-color: var(--ring); box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 30%, transparent); }

.filter-buttons { display: flex; flex-direction: column; gap: 0.5rem; }

.filter-group { border: 1px solid var(--border); border-radius: 0.7rem; background: var(--background); overflow: hidden; }
.filter-group-header {
  width: 100%; border: none; background: transparent; cursor: pointer;
  padding: 0.7rem 0.85rem; display: flex; align-items: center; justify-content: space-between;
  color: var(--foreground); font-weight: 600; font-size: 0.85rem;
}
.filter-group-header:hover { background: var(--surface-2); }
.filter-group-body { padding: 0 0.6rem 0.6rem; display: grid; gap: 0.35rem; max-height: 15rem; overflow-y: auto; }
.filter-group-body.collapsed { display: none; }

.filter-chip {
  display: flex; width: 100%; align-items: center; justify-content: flex-start;
  padding: 0.45rem 0.65rem; border-radius: 0.55rem; border: 1px solid transparent;
  background: transparent; color: var(--muted-foreground); cursor: pointer;
  font-size: 0.83rem; text-align: left; transition: background .15s, color .15s;
}
.filter-chip:hover { background: var(--surface-2); color: var(--foreground); }
.filter-chip.active { background: color-mix(in oklch, var(--primary) 22%, transparent); color: var(--foreground); border-color: color-mix(in oklch, var(--primary) 45%, transparent); }

.projects-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.project-card {
  position: relative;
  display: flex; flex-direction: column; gap: 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.9rem;
  padding: 1.15rem 1.15rem 1.25rem;
  cursor: pointer;
  transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
  overflow: hidden;
  min-height: 210px;
}
.project-card::before {
  content: ""; position: absolute; inset: 0 auto 0 0; width: 3px;
  background: var(--accent-color, var(--primary));
}
.project-card:hover { transform: translateY(-3px); border-color: color-mix(in oklch, var(--primary) 40%, var(--border)); box-shadow: 0 12px 30px rgba(0,0,0,0.35); }
.project-card.hidden { display: none !important; }

.project-card h3 { font-size: 1.02rem; font-weight: 650; line-height: 1.3; padding-left: 0.4rem; }
.project-card .category {
  align-self: flex-start; margin-left: 0.4rem;
  padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600;
  background: color-mix(in oklch, var(--accent-color, var(--primary)) 20%, transparent);
  color: color-mix(in oklch, var(--accent-color, var(--primary)) 85%, white);
}
.project-card p { color: var(--muted-foreground); font-size: 0.88rem; line-height: 1.55; padding-left: 0.4rem; flex: 1; }

.project-metadata, .modal-metadata { display: flex; flex-wrap: wrap; gap: 0.4rem; padding-left: 0.4rem; }
.meta-pill, .modal-meta-pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.28rem 0.55rem; border-radius: 999px;
  background: var(--surface-2); border: 1px solid var(--border);
  color: var(--foreground); font-size: 0.72rem; font-weight: 500;
}
.meta-label, .modal-meta-label { color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.04em; font-size: 0.62rem; }

/* category accent colors */
.project-card[data-category*="ai"]           { --accent-color: oklch(0.8 0.15 85); }
.project-card[data-category*="analytics"]    { --accent-color: oklch(0.78 0.13 190); }
.project-card[data-category*="automation"]   { --accent-color: oklch(0.72 0.15 280); }
.project-card[data-category*="cloud"]        { --accent-color: oklch(0.72 0.15 250); }
.project-card[data-category*="compliance"]   { --accent-color: oklch(0.74 0.14 300); }
.project-card[data-category*="crm"]          { --accent-color: oklch(0.72 0.18 10); }
.project-card[data-category*="cybersecurity"]{ --accent-color: oklch(0.7 0.17 295); }
.project-card[data-category*="education"]    { --accent-color: oklch(0.78 0.15 150); }
.project-card[data-category*="erp"]          { --accent-color: oklch(0.76 0.15 60); }
.project-card[data-category*="iot"]          { --accent-color: oklch(0.8 0.16 145); }
.project-card[data-category*="mobile"]       { --accent-color: oklch(0.78 0.13 200); }
.project-card[data-category*="payments"]     { --accent-color: oklch(0.74 0.16 350); }
.project-card[data-category*="retail"]       { --accent-color: oklch(0.72 0.18 25); }
.project-card[data-category*="supplychain"]  { --accent-color: oklch(0.72 0.04 260); }
.project-card[data-category*="market"]       { --accent-color: oklch(0.76 0.15 45); }
.project-card[data-category*="radio"]        { --accent-color: oklch(0.75 0.13 220); }

/* modal */
.modal-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(5, 7, 12, 0.7); backdrop-filter: blur(4px);
  display: none; align-items: center; justify-content: center; padding: 1.25rem;
}
.modal-overlay.open { display: flex; }
.modal-box {
  background: var(--surface); border: 1px solid var(--border);
  max-width: 820px; width: 100%; max-height: 88vh; overflow-y: auto;
  border-radius: 1.1rem; padding: 1.75rem; position: relative;
  box-shadow: 0 30px 80px rgba(0,0,0,0.55);
}
.close-modal {
  position: absolute; top: 1rem; right: 1rem; width: 2.1rem; height: 2.1rem;
  border-radius: 999px; border: 1px solid var(--border); background: var(--surface-2);
  color: var(--muted-foreground); cursor: pointer; font-size: 1.2rem; display: grid; place-items: center;
}
.close-modal:hover { color: var(--foreground); }
.modal-box h2 { font-size: 1.4rem; font-weight: 700; padding-right: 2.5rem; margin-bottom: 0.6rem; }
.modal-category {
  display: inline-block; padding: 0.35rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600;
  background: color-mix(in oklch, var(--primary) 22%, transparent); color: var(--foreground); margin-bottom: 0.75rem;
}
.modal-metadata { margin: 0.5rem 0 1rem; padding-left: 0; }
.modal-section { margin: 1rem 0; padding: 1rem; background: var(--background); border: 1px solid var(--border); border-radius: 0.8rem; }
.modal-section strong { color: var(--foreground); font-size: 0.95rem; }
.modal-details p { color: var(--muted-foreground); line-height: 1.7; margin-top: 0.4rem; }
.modal-stack-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; margin-top: 0.5rem; }
.modal-stack-grid > div { background: var(--surface); border: 1px solid var(--border); border-radius: 0.7rem; overflow: hidden; }
.stack-toggle {
  width: 100%; border: none; background: transparent; cursor: pointer;
  padding: 0.7rem 0.8rem; display: flex; align-items: center; justify-content: space-between;
  color: var(--foreground); font-weight: 600; font-size: 0.9rem;
}
.stack-toggle span:last-child { color: var(--muted-foreground); }
.stack-content { padding: 0 0.8rem 0.8rem; color: var(--muted-foreground); font-size: 0.88rem; line-height: 1.5; }
.stack-content.collapsed { display: none; }

.count-chip { display:inline-flex; align-items:center; margin-left:.6rem; padding:.15rem .6rem; border-radius:999px; font-size:.72rem; font-weight:600; vertical-align:middle; background:color-mix(in oklch, var(--primary) 20%, transparent); color:var(--foreground); border:1px solid color-mix(in oklch, var(--primary) 40%, transparent); }
.stack-content { display:flex; flex-wrap:wrap; gap:.4rem; }
.tech-chip { display:inline-flex; align-items:center; gap:.4rem; padding:.28rem .55rem .28rem .3rem; border-radius:999px; background:var(--background); border:1px solid var(--border); font-size:.8rem; color:var(--foreground); }
.tech-badge { display:grid; place-items:center; width:1.35rem; height:1.35rem; border-radius:.4rem; font-size:.62rem; font-weight:700; letter-spacing:.02em; }

@media (max-width: 900px) {
  .dash-grid { grid-template-columns: 1fr; }
  .dash-sidebar { position: static; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
}
`;
