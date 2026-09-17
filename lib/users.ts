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
