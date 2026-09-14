import { db } from "@/lib/db";

export type StoredUser = {
  email: string;
  name: string;
  role: string;
  salt?: string;
  hash?: string;
};

export type SessionUser = { email: string; name: string; role: string };

export async function findUser(email: string): Promise<StoredUser | undefined> {
  const key = email.trim().toLowerCase();
  const conn = await db();
  const res = await conn.execute({
    sql: "SELECT email,name,role,salt,hash FROM users WHERE email = ? LIMIT 1",
    args: [key],
  });
  const row = res.rows[0] as unknown as StoredUser | undefined;
  return row ? { ...row } : undefined;
}

export function toSessionUser(user: StoredUser): SessionUser {
  return { email: user.email, name: user.name, role: user.role };
}
