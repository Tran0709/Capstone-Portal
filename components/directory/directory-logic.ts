/* Directory search / filter / modal logic, ported from the original
   vanilla script.js. Operates on the markup rendered by <Directory/>.
   Returns a cleanup function that removes listeners. */
/* eslint-disable @typescript-eslint/no-explicit-any */

type P = Record<string, any>;

export function initDirectory(
  projects: P[],
  signal: AbortSignal
): void {
  const $ = (id: string) => document.getElementById(id)!;
  const searchBar = $("search-bar") as HTMLInputElement;
  const filterButtonsContainer = $("filter-buttons");
  const projectsList = $("projects-list");
  const modal = $("projectModal");
  const closeModalBtn = $("closeModalBtn");
  const modalTitle = $("modalTitle");
  const modalCat = $("modalCat");
  const modalMetadata = $("modalMetadata");
  const modalFullDesc = $("modalFullDesc");
  const modalFrontend = $("modalFrontend");
  const modalBackend = $("modalBackend");
  const modalMiddleware = $("modalMiddleware");
  const projectCountSubtitle = $("project-count-subtitle");
  const countChip = document.getElementById("count-chip");

  const MAX_AVERAGE_OPTION_LENGTH = 40;
  const MAX_UNIQUE_RATIO = 0.6;

  let filterGroups: any[] = [];
  let projectCards: HTMLElement[] = [];
  let catalogProjects: P[] = [];
  let selectionState: Record<string, string> = {};

  const on = (el: Element, ev: string, fn: any) =>
    el.addEventListener(ev, fn, { signal });

  function renderCategoryFilters(groups: any[]) {
    filterButtonsContainer.innerHTML = "";
    groups.forEach((group) => {
      const groupEl = document.createElement("div");
      groupEl.className = "filter-group";
      const header = document.createElement("button");
      header.className = "filter-group-header";
      header.type = "button";
      header.innerHTML = `<span>${group.title}</span><span>&#9662;</span>`;
      header.addEventListener("click", () => {
        groupEl.querySelector(".filter-group-body")!.classList.toggle("collapsed");
      }, { signal });
      const body = document.createElement("div");
      body.className = "filter-group-body collapsed";
      const currentSelection = selectionState[group.key] || "all";
      const allOption = document.createElement("button");
      allOption.className = `filter-chip ${currentSelection === "all" ? "active" : ""}`.trim();
      allOption.type = "button";
      allOption.textContent = "All";
      allOption.addEventListener("click", () => selectFilter(group.key, "all", allOption), { signal });
      body.appendChild(allOption);
      group.options.forEach((optionText: string) => {
        const chip = document.createElement("button");
        chip.className = "filter-chip";
        chip.type = "button";
        chip.textContent = optionText;
        if (optionText === currentSelection) chip.classList.add("active");
        chip.addEventListener("click", () => selectFilter(group.key, optionText, chip), { signal });
        body.appendChild(chip);
      });
      groupEl.appendChild(header);
      groupEl.appendChild(body);
      filterButtonsContainer.appendChild(groupEl);
    });
  }

  function selectFilter(groupKey: string, value: string, selectedChip: HTMLElement) {
    selectionState[groupKey] = value;
    const groupEl = selectedChip.closest(".filter-group")!;
    groupEl.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    selectedChip.classList.add("active");
    filterProjects();
  }

  const normalizeValue = (v: any) => String(v ?? "").trim().toLowerCase();
  const normalizeText = (v: any) =>
    String(v ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").trim();

  function rankVisibleItems(items: P[], query = "", facetSelection: any = {}) {
    const terms = tokenize(query);
    const rules = collectFilterRules(facetSelection);
    return items
      .map((item) => {
        const ev = evaluateItem(item, terms, rules);
        return ev.visible ? { item, relevance: ev.relevance } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.relevance - a.relevance || a.item.title.localeCompare(b.item.title))
      .map((e: any) => e.item);
  }

  function evaluateItem(item: P, terms: string[], rules: any[]) {
    const searchableText = gatherSearchableText(item);
    const queryCoverage = terms.length === 0 ? 1 :
      terms.reduce((c, t) => c + (searchableText.includes(t) ? 1 : 0), 0) / terms.length;
    const facetCoverage = rules.length === 0 ? 1 :
      rules.reduce((c, rule) => {
        const vals = getNormalizedFieldValues(item, rule.field);
        return c + (vals.some((v) => rule.allowedValues.includes(v)) ? 1 : 0);
      }, 0) / rules.length;
    const titleLift = terms.length === 0 ? 0 : (titleMatches(item.title, terms) ? 0.12 : 0);
    // Query must actually match when a search term is present.
    const queryOk = terms.length === 0 || queryCoverage > 0;
    const relevance = queryCoverage * 0.74 + facetCoverage * 0.26 + titleLift;
    const matchesAllFacets = rules.every((rule) => {
      const vals = getNormalizedFieldValues(item, rule.field);
      return vals.some((v) => rule.allowedValues.includes(v));
    });
    return { relevance, visible: matchesAllFacets && queryOk && relevance > 0 };
  }

  function getNormalizedFieldValues(item: P, field: string) {
    const raw = item[field];
    if (Array.isArray(raw)) return raw.map(normalizeValue).filter(Boolean);
    const n = normalizeValue(raw);
    return n ? [n] : [];
  }

  function gatherSearchableText(item: P) {
    const stacks = [
      ...(Array.isArray(item.frontendStack) ? item.frontendStack : []),
      ...(Array.isArray(item.backendStack) ? item.backendStack : []),
      ...(Array.isArray(item.middlewareStack) ? item.middlewareStack : []),
    ];
    const chunks = [
      item.id, item.title, item.shortdesc, item.fulldesc, item.tech,
      item.frontend, item.backend, item.middleware, item.categoryLabel,
      item.category, item.industry, item.applicationType, item.teamSize,
      item.skillLevel, ...(Array.isArray(item.categories) ? item.categories : []), ...stacks,
    ];
    return chunks.filter(Boolean).map(normalizeValue).join(" ");
  }

  function collectFilterRules(facetSelection: any) {
    return Object.entries(facetSelection).reduce((acc: any[], [field, values]: any) => {
      const cleaned = Array.isArray(values) ? values.filter(Boolean) : [];
      if (!Array.isArray(values)) {
        const sel = normalizeValue(values);
        if (sel && sel !== "all") cleaned.push(sel);
      }
      if (cleaned.length > 0) acc.push({ field, allowedValues: cleaned.map(normalizeValue) });
      return acc;
    }, []);
  }

  const tokenize = (v: any) => normalizeText(v).split(/\s+/).filter(Boolean);
  const titleMatches = (title: any, terms: string[]) => {
    const t = normalizeText(title);
    return terms.some((term) => t.includes(term));
  };

  function getSelectedFacets(state: any = {}) {
    return Object.entries(state).reduce((acc: any, [field, raw]: any) => {
      if (field === "query") return acc;
      const chosen = normalizeValue(raw);
      if (chosen && chosen !== "all") acc[field] = [chosen];
      return acc;
    }, {});
  }

  function filterCatalogItems(items: P[], state: any = {}) {
    return rankVisibleItems(items, normalizeValue(state.query), getSelectedFacets(state));
  }

  const escapeHtml = (v: any) =>
    String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  const cleanProjectTitle = (v: any) =>
    String(v || "").replace(/\s+#\s*\d+$/i, "").replace(/\s+\(\d+\)$/i, "").replace(/\s+\|\s*\d+$/i, "").trim();

  function formatCategoryLabel(project: P) {
    const raw = String(project.categoryLabel || formatCat(project.category || "") || "").trim();
    const cleaned = raw.replace(/\bcategory\s+\d+\b/gi, "").replace(/\s+/g, " ").trim();
    return cleaned || formatCat(project.category || "") || "";
  }

  function getUniqueSortedOptions(projects: P[], key: string) {
    return [...new Set(projects.flatMap((p) => {
      const v = p[key];
      if (Array.isArray(v)) return v.map((i) => String(i ?? "").trim()).filter(Boolean);
      const n = String(v ?? "").trim();
      return n ? [n] : [];
    }))].sort((a, b) => a.localeCompare(b));
  }

  const toFilterTitle = (key: string) =>
    String(key).replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ").trim().replace(/\b\w/g, (l) => l.toUpperCase());

  function isFilterCandidate(projects: P[], key: string, options: string[]) {
    if (options.length < 2) return false;
    const nonEmpty = projects.reduce((c, p) => {
      const v = p[key];
      if (Array.isArray(v)) return c + (v.some((i) => String(i ?? "").trim()) ? 1 : 0);
      return c + (String(v ?? "").trim() ? 1 : 0);
    }, 0);
    if (nonEmpty === 0) return false;
    if (options.length / nonEmpty > MAX_UNIQUE_RATIO) return false;
    const avg = options.reduce((s, o) => s + o.length, 0) / options.length;
    return avg <= MAX_AVERAGE_OPTION_LENGTH;
  }

  function buildFilterGroups(projects: P[]) {
    const allKeys = [...new Set(projects.flatMap((p) => Object.keys(p || {})))];
    return allKeys
      .map((key) => ({ key, title: toFilterTitle(key), options: getUniqueSortedOptions(projects, key) }))
      .filter((g) => isFilterCandidate(projects, g.key, g.options))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  function resetSelectionState(groups: any[]) {
    selectionState = groups.reduce((acc: any, g) => { acc[g.key] = "all"; return acc; }, {});
  }

  function joinStack(project: P, field: string) {
    const v = project[field];
    return Array.isArray(v) ? v.join(", ") : String(v || "");
  }

  function renderProjects(projects: P[]) {
    projectsList.innerHTML = "";
    projectCards = [];
    catalogProjects = projects;
    projects.forEach((project, index) => {
      const categories = Array.isArray(project.categories) && project.categories.length
        ? project.categories : [project.category || "general"];
      const projectKey = String(project.id || project.title || `project-${index}`);
      const displayTitle = cleanProjectTitle(project.title || "");
      const displayCategory = formatCategoryLabel(project);
      const card = document.createElement("div");
      card.className = "project-card";
      card.dataset.category = categories.join(",");
      card.dataset.id = projectKey;
      card.innerHTML = `
        <h3>${escapeHtml(displayTitle)}</h3>
        ${displayCategory ? `<span class="category">${escapeHtml(displayCategory)}</span>` : ""}
        <div class="project-metadata">
          <span class="meta-pill"><span class="meta-label">App</span>${escapeHtml(project.applicationType || "Platform")}</span>
          <span class="meta-pill"><span class="meta-label">Team</span>${escapeHtml(project.teamSize || "Mid Size Team")}</span>
          <span class="meta-pill"><span class="meta-label">Skill</span>${escapeHtml(project.skillLevel || "Intermediate")}</span>
          <span class="meta-pill"><span class="meta-label">Industry</span>${escapeHtml(project.industry || "Technology")}</span>
        </div>
        <p>${escapeHtml(project.shortdesc || "")}</p>`;
      card.addEventListener("click", () => openModal(project), { signal });
      projectsList.appendChild(card);
      projectCards.push(card);
    });
    filterProjects();
  }

  function filterProjects() {
    const visible = filterCatalogItems(catalogProjects, { query: searchBar.value, ...selectionState });
    const rankingMap = new Map(visible.map((p, i) => [String(p.id || p.title || `project-${i}`), i]));
    const visibleCards: HTMLElement[] = [];
    const hiddenCards: HTMLElement[] = [];
    projectCards.forEach((card) => {
      const key = String(card.dataset.id || "");
      const isVisible = rankingMap.has(key);
      card.classList.toggle("hidden", !isVisible);
      (isVisible ? visibleCards : hiddenCards).push(card);
    });
    visibleCards.sort((a, b) =>
      (rankingMap.get(String(a.dataset.id || "")) ?? 1e9) - (rankingMap.get(String(b.dataset.id || "")) ?? 1e9));
    projectsList.innerHTML = "";
    visibleCards.forEach((c) => projectsList.appendChild(c));
    hiddenCards.forEach((c) => projectsList.appendChild(c));
    projectCountSubtitle.textContent = `Showing ${visible.length} of ${catalogProjects.length} projects.`;
    if (countChip) countChip.textContent = `${catalogProjects.length}`;
  }

  function openModal(project: P) {
    modalTitle.textContent = cleanProjectTitle(project.title || "");
    const cat = project.category || "";
    const displayCategory = formatCategoryLabel(project);
    modalCat.className = "modal-category";
    ["retail","education","cybersecurity","market","supplychain","iot","ai","radio"].forEach((c) => {
      if (cat === c) modalCat.classList.add(c);
    });
    modalCat.textContent = displayCategory;
    (modalCat as HTMLElement).style.display = displayCategory ? "inline-block" : "none";
    modalMetadata.innerHTML = `
      <span class="modal-meta-pill"><span class="modal-meta-label">App</span>${escapeHtml(project.applicationType || "Platform")}</span>
      <span class="modal-meta-pill"><span class="modal-meta-label">Team</span>${escapeHtml(project.teamSize || "Mid Size Team")}</span>
      <span class="modal-meta-pill"><span class="modal-meta-label">Skill</span>${escapeHtml(project.skillLevel || "Intermediate")}</span>
      <span class="modal-meta-pill"><span class="modal-meta-label">Industry</span>${escapeHtml(project.industry || "Technology")}</span>`;
    modalFullDesc.innerHTML = buildOverview(project)
      .map((para) => escapeHtml(para))
      .join("<br><br>");
    renderStackChips(modalFrontend, techList(project, "frontendStack", project.frontend, "React"));
    renderStackChips(modalBackend, techList(project, "backendStack", project.backend, "Node.js"));
    renderStackChips(modalMiddleware, techList(project, "middlewareStack", project.middleware, "REST API"));
    modal.classList.add("open");
  }

  function sentenceList(arr: string[]) {
    const a = arr.filter(Boolean);
    if (a.length <= 1) return a.join("");
    return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
  }

  // Auto-expand each project's overview into a richer multi-paragraph text
  // built from its own fields (no external data needed).
  function buildOverview(project: P): string[] {
    const title = cleanProjectTitle(project.title || "This project");
    const base = String(project.fulldesc || project.shortdesc || "").trim();
    const cat = (formatCategoryLabel(project) || "software").toLowerCase();
    const industry = String(project.industry || "technology").toLowerCase();
    const app = String(project.applicationType || "platform").toLowerCase();
    const team = String(project.teamSize || "project team").toLowerCase();
    const skill = String(project.skillLevel || "intermediate").toLowerCase();
    const fe = techList(project, "frontendStack", project.frontend, "a modern web front end");
    const be = techList(project, "backendStack", project.backend, "a scalable back end");
    const mw = techList(project, "middlewareStack", project.middleware, "standard middleware");
    const paras: string[] = [];
    if (base) paras.push(base);
    paras.push(
      `${title} is a ${skill} ${cat} project delivered as a ${app} for the ${industry} sector. ` +
        `It is scoped for a ${team} and tackles a well-defined, real-world problem end to end — ` +
        `from data capture and processing through to the user-facing experience.`
    );
    paras.push(
      `On the technical side, the front end is built with ${sentenceList(fe)}, the back end with ${sentenceList(be)}, ` +
        `and integration is handled through ${sentenceList(mw)}. This stack was chosen to balance developer ` +
        `productivity, maintainability, and performance at the scale the project targets.`
    );
    paras.push(
      `Key outcomes include a clear separation of concerns across the layers, an emphasis on secure and reliable ` +
        `data handling, and a user experience designed around the day-to-day needs of its ${industry} users. ` +
        `The result is practical to build within the module timeframe while remaining realistic and extensible.`
    );
    return paras;
  }

  function techList(project: P, field: string, single: any, fallback: string): string[] {
    const v = project[field];
    let arr: string[] = [];
    if (Array.isArray(v)) arr = v.map((x) => String(x).trim()).filter(Boolean);
    else if (typeof v === "string" && v.trim())
      arr = v.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
    if (arr.length === 0 && single)
      arr = String(single).split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
    if (arr.length === 0 && fallback) arr = [fallback];
    return arr;
  }

  function techColor(name: string) {
    let h = 0;
    const s = String(name);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return `oklch(0.74 0.13 ${h})`;
  }

  function monogram(name: string) {
    const s = String(name).trim();
    const parts = s.match(/[A-Za-z0-9]+/g) || [s];
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return s.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
  }

  function renderStackChips(container: HTMLElement, techs: string[]) {
    if (!techs.length) {
      container.textContent = "—";
      return;
    }
    container.innerHTML = techs
      .map((t) => {
        const c = techColor(t);
        return (
          `<span class="tech-chip"><span class="tech-badge" style="` +
          `background:color-mix(in oklch, ${c} 22%, transparent);color:${c};` +
          `border:1px solid color-mix(in oklch, ${c} 45%, transparent)">${escapeHtml(monogram(t))}</span>` +
          `${escapeHtml(t)}</span>`
        );
      })
      .join("");
  }

  function closeModal() { modal.classList.remove("open"); }

  function formatCat(c: string) {
    const map: Record<string, string> = {
      cybersecurity: "Cybersecurity Simulators", education: "Education ERP / SaaS",
      market: "Smart Market Systems", supplychain: "Supply Chain Simulation",
      iot: "IoT Critical Infrastructure", ai: "AI Adaptive Learning",
      radio: "Radio Antenna Data Platforms", retail: "Retail SaaS",
    };
    return map[c] || c;
  }

  on(closeModalBtn, "click", closeModal);
  on(modal, "click", (e: any) => { if (e.target === modal) closeModal(); });
  on(searchBar, "input", filterProjects);

  document.querySelectorAll(".stack-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = (button as HTMLElement).getAttribute("data-target")!;
      const content = document.getElementById(targetId)!;
      const collapsed = content.classList.toggle("collapsed");
      const arrow = button.querySelector("span:last-child")!;
      arrow.textContent = collapsed ? "▸" : "▾";
    }, { signal });
  });

  filterGroups = buildFilterGroups(projects);
  resetSelectionState(filterGroups);
  renderCategoryFilters(filterGroups);
  renderProjects(projects);
  projectCountSubtitle.textContent =
    `Browse ${projects.length} projects with quick search and category filters.`;
}
