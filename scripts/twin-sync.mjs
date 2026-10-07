// Digital twin: copy live data into the twin DB with emails anonymised.
// Usage: LIVE_DATABASE_URL/_TOKEN -> TWIN_DATABASE_URL/_TOKEN  (twin defaults to file:data/twin.db)
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
const live = process.env.LIVE_DATABASE_URL
  ? createClient({ url: process.env.LIVE_DATABASE_URL, authToken: process.env.LIVE_DATABASE_AUTH_TOKEN }) : null;
const twin = createClient({ url: process.env.TWIN_DATABASE_URL || "file:data/twin.db", authToken: process.env.TWIN_DATABASE_AUTH_TOKEN });
if (live && live.close && process.env.TWIN_DATABASE_URL === process.env.LIVE_DATABASE_URL) throw new Error("Refusing: twin must not equal live");
await twin.execute("CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, name TEXT, role TEXT, salt TEXT, hash TEXT)");
await twin.execute("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, module TEXT, data TEXT NOT NULL)");
await twin.execute("DELETE FROM projects"); await twin.execute("DELETE FROM users");
let users, projects = [];
if (live) {
  users = (await live.execute("SELECT email,name,role FROM users")).rows;
  projects = (await live.execute("SELECT id,module,data FROM projects")).rows;
} else users = JSON.parse(readFileSync("data/users.json", "utf8"));
let i = 0;
for (const u of users) {
  const email = u.role === "Lecturer" ? `lecturer${++i}@twin.test` : `student${++i}@twin.test`; // no real emails in the twin
  await twin.execute({ sql: "INSERT INTO users (email,name,role) VALUES (?,?,?)", args: [email, `Twin ${u.role}`, String(u.role)] });
}
for (const p of projects) await twin.execute({ sql: "INSERT INTO projects (id,module,data) VALUES (?,?,?)", args: [String(p.id), String(p.module), String(p.data)] });
console.log(`twin synced: ${users.length} users (anonymised), ${projects.length} uploaded projects`);
