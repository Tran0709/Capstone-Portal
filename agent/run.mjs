// Minimal AI maintenance agent on the OpenAI API (no SDK). Usage: node agent/run.mjs <prompt-file>
// Env: OPENAI_API_KEY (required), OPENAI_MODEL (default gpt-4.1), OPENAI_BASE_URL (tests only), MAX_TURNS.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname, sep } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
const BASE = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MAX_TURNS = Number(process.env.MAX_TURNS || 30);
if (!KEY) { console.error("OPENAI_API_KEY is not set"); process.exit(1); }

// Paths the agent may never read or write.
const BLOCK = [/^\.git(\/|$)/, /^\.github(\/|$)/, /^node_modules(\/|$)/, /^\.next(\/|$)/, /^\.env/, /^data\/users\.json$/, /^data\/.*\.db$/, /^agent\/(run\.mjs|MAINTENANCE\.md|FEEDBACK\.md)$/];
function safe(p) {
  const abs = resolve(ROOT, p || ".");
  const rel = relative(ROOT, abs).split(sep).join("/");
  if (rel.startsWith("..")) throw new Error("path outside project");
  if (rel && BLOCK.some((r) => r.test(rel))) throw new Error(`access to ${rel} is not allowed`);
  return { abs, rel };
}
// Only these exact commands may run.
const ALLOWED = new Set(["npm run typecheck", "npm run lint", "npm test", "npm run build", "npm audit --omit=dev", "npm outdated", "npm update"]);
const cut = (s, n = 6000) => (s.length > n ? s.slice(0, n) + `\n...[truncated ${s.length - n} chars]` : s);

const tools = {
  list_dir: ({ path }) => {
    const { abs } = safe(path);
    return readdirSync(abs).filter((f) => f !== "node_modules" && f !== ".git" && f !== ".next").map((f) => (statSync(resolve(abs, f)).isDirectory() ? f + "/" : f)).join("\n");
  },
  read_file: ({ path }) => cut(readFileSync(safe(path).abs, "utf8"), 20000),
  write_file: ({ path, content }) => {
    const { abs, rel } = safe(path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
    return `wrote ${rel} (${content.length} chars)`;
  },
  run: ({ command }) => {
    const cmd = String(command).trim().replace(/\s+/g, " ");
    if (!ALLOWED.has(cmd)) throw new Error(`command not allowed. Allowed: ${[...ALLOWED].join(" | ")}`);
    const [bin, ...args] = cmd.split(" ");
    try { return cut(execFileSync(bin, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 600000, env: process.env })); }
    catch (e) { return cut(`EXIT ${e.status}\n${e.stdout || ""}\n${e.stderr || ""}`); }
  },
};
const defs = [
  ["list_dir", "List files in a directory (relative path, '.' for root).", { path: { type: "string" } }, ["path"]],
  ["read_file", "Read a text file.", { path: { type: "string" } }, ["path"]],
  ["write_file", "Create or overwrite a file with full new content.", { path: { type: "string" }, content: { type: "string" } }, ["path", "content"]],
  ["run", "Run one allowed command: " + [...ALLOWED].join(", "), { command: { type: "string" } }, ["command"]],
].map(([name, description, properties, required]) => ({ type: "function", function: { name, description, parameters: { type: "object", properties, required } } }));

const messages = [
  { role: "system", content: "You are an autonomous maintenance engineer working inside a git checkout. Use the tools to inspect, edit and verify the project. Be concise. When finished, reply with a short plain-English report (no tool call)." },
  { role: "user", content: readFileSync(process.argv[2], "utf8") },
];
let final = "";
for (let turn = 1; turn <= MAX_TURNS; turn++) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, tools: defs }),
  });
  if (!res.ok) { console.error(`OpenAI error ${res.status}: ${(await res.text()).slice(0, 300)}`); process.exit(1); }
  const msg = (await res.json()).choices?.[0]?.message;
  messages.push(msg);
  if (!msg.tool_calls?.length) { final = msg.content || ""; break; }
  for (const call of msg.tool_calls) {
    let out;
    try { out = String(tools[call.function.name]?.(JSON.parse(call.function.arguments || "{}")) ?? "ok"); }
    catch (e) { out = `ERROR: ${e.message}`; }
    console.log(`[${turn}] ${call.function.name} -> ${out.split("\n")[0].slice(0, 100)}`);
    messages.push({ role: "tool", tool_call_id: call.id, content: out });
  }
}
mkdirSync("agent", { recursive: true });
writeFileSync("agent/last-report.md", final || "Agent stopped without a final report (turn limit reached).");
console.log("\n" + (final || "(no report)"));
