// Smoke test a running environment: node scripts/smoke.mjs https://host
const base = (process.argv[2] || process.env.SMOKE_URL || "http://localhost:3000").replace(/\/$/, "");
let fail = 0; const ok = (c, m) => { console.log(c ? "PASS" : "FAIL", m); if (!c) fail++; };
const h = await fetch(`${base}/api/health`); ok(h.status === 200, "health 200");
const l = await fetch(`${base}/login`); ok(l.status === 200, "login page 200");
ok(l.headers.get("x-frame-options") === "DENY", "security headers present");
const p = await fetch(`${base}/api/projects`, { redirect: "manual" }); ok([307, 308, 401, 302].includes(p.status), "projects API is protected");
const a = await fetch(`${base}/api/admin/upload`, { method: "POST", redirect: "manual" }); ok(a.status !== 200, "upload not open");
process.exit(fail ? 1 : 0);
