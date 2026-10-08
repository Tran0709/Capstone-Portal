// Run by the agent workflow AFTER the gate passes. Adds a user-facing entry to data/changelog.json.
// Usage: node scripts/add-changelog.mjs "<kind>"   (kind: maintenance | fix)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const kind = process.argv[2] === "fix" ? "fix" : "maintenance";
const report = existsSync("agent/last-report.md") ? readFileSync("agent/last-report.md", "utf8") : "";
const m = report.match(/^USER_NOTE:\s*(.+)$/m);
let note = (m?.[1] ?? "").replace(/[<>`]/g, "").trim().slice(0, 280);
if (!note) note = kind === "fix" ? "A reported problem was fixed." : "Routine weekly maintenance and security checks were completed.";
const date = new Date().toISOString().slice(0, 10);
const id = `${date}-${process.env.GITHUB_RUN_ID || Date.now()}`;
const file = "data/changelog.json";
const list = JSON.parse(readFileSync(file, "utf8"));
list.unshift({ id, date, title: kind === "fix" ? "Fix applied" : "Weekly maintenance", summary: note, kind });
writeFileSync(file, JSON.stringify(list.slice(0, 50), null, 2) + "\n");
console.log("changelog entry added:", id);
