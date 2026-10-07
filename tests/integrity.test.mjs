import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const j = (p) => JSON.parse(readFileSync(p, "utf8"));

test("projects: non-empty, unique ids, have titles", () => {
  const ps = j("data/projects.json");
  assert.ok(ps.length >= 2000);
  const ids = new Set(ps.map((p) => String(p.id)));
  assert.equal(ids.size, ps.length, "duplicate project ids");
  assert.ok(ps.every((p) => p.title || p.name), "project missing title");
});
test("users: lecturers are exactly the authorised pair", () => {
  const lec = j("data/users.json").filter((u) => u.role === "Lecturer").map((u) => u.email).sort();
  assert.deepEqual(lec, ["goladin@gmail.com", "murphy.choy@icloud.com"]);
});
test("no secrets committed", () => {
  const bad = [/re_[A-Za-z0-9]{20,}/, /sk-ant-[A-Za-z0-9_-]{20,}/, /\b\d{8,}:[A-Za-z0-9_-]{30,}\b/, /^SMTP_PASS=[^\s#]+/m];
  const skip = new Set(["node_modules", ".next", ".git", "data"]);
  const walk = (d) => readdirSync(d).flatMap((f) => {
    if (skip.has(f)) return []; const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|mjs|json|md|yml|example)$/.test(f) ? [p] : [];
  });
  for (const f of walk(".")) { const t = readFileSync(f, "utf8"); for (const r of bad) assert.ok(!r.test(t), `secret-like text in ${f}`); }
});
