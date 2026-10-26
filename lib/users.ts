import { db } from "@/lib/db";
import usersSeed from "@/data/users.json";

export type StoredUser = {
  email: string;
  name: string;
  role: string;
  salt?: string;
  hash?: string;
};

export type SessionUser = { email: string; name: string; role: string };

const bundledUsers = usersSeed as StoredUser[];

/**
 * Looks up a user by email. Reads the database first; if that fails (e.g. a
 * read-only host with no writable DB), falls back to the bundled user list so
 * sign-in and roles keep working.
 */
export async function findUser(email: string): Promise<StoredUser | undefined> {
  const key = email.trim().toLowerCase();
  try {
    const conn = await db();
    const res = await conn.execute({
      sql: "SELECT email,name,role,salt,hash FROM users WHERE email = ? LIMIT 1",
      args: [key],
    });
    const row = res.rows[0] as unknown as StoredUser | undefined;
    if (row) return { ...row };
  } catch (err) {
    console.warn("User DB lookup failed; using bundled users:", (err as Error)?.message);
  }
  return bundledUsers.find((u) => String(u.email).toLowerCase() === key);
}

export function toSessionUser(user: StoredUser): SessionUser {
  return { email: user.email, name: user.name, role: user.role };
}

/** True if this email may register/sign in as a lecturer. */
export async function isApprovedLecturer(email: string): Promise<boolean> {
  const key = email.trim().toLowerCase();
  if (bundledUsers.some((u) => String(u.email).toLowerCase() === key && u.role === "Lecturer")) return true;
  const list = (process.env.LECTURER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(key);
}

export async function createUser(email: string, name: string, role: "Student" | "Lecturer"): Promise<StoredUser> {
  const key = email.trim().toLowerCase();
  const display = name.trim() || key.split("@")[0];
  const conn = await db();
  await conn.execute({
    sql: "INSERT INTO users (email,name,role) VALUES (?,?,?) ON CONFLICT(email) DO NOTHING",
    args: [key, display, role],
  });
  return { email: key, name: display, role };
}
