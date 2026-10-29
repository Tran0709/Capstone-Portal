"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type U = { email: string; name: string; role: string };

export function AdminUsers({ me }: { me: string }) {
  const [users, setUsers] = useState<U[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setUsers(data.users);
    else toast.error(data.error ?? "Could not load accounts.");
  }
  useEffect(() => {
    let cancelled = false;
    async function loadInitialUsers() {
      const res = await fetch("/api/admin/users");
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (res.ok) setUsers(data.users);
      else toast.error(data.error ?? "Could not load accounts.");
    }
    void loadInitialUsers();
    return () => {
      cancelled = true;
    };
  }, []);

  async function change(email: string, role: "Student" | "Lecturer") {
    setBusy(email);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast.error(data.error ?? "Update failed.");
    toast.success(`${email} is now a ${role.toLowerCase()}. They see it after their next sign-in.`);
    load();
  }

  const shown = (users ?? []).filter((u) =>
    `${u.email} ${u.name}`.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <section className="mt-10 rounded-2xl border bg-surface p-6">
      <h2 className="text-lg font-semibold">Manage accounts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Change an account between Student and Lecturer. The change applies the next time that person signs in.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or email…"
        className="mt-4 w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <ul className="mt-4 divide-y">
        {users === null && <li className="py-3 text-sm text-muted-foreground">Loading…</li>}
        {users && shown.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">No accounts found.</li>
        )}
        {shown.map((u) => {
          const isLect = u.role === "Lecturer";
          const self = u.email.toLowerCase() === me.toLowerCase();
          return (
            <li key={u.email} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{u.name || u.email}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {u.email} · {u.role}
                </div>
              </div>
              <button
                disabled={busy === u.email || (self && isLect)}
                onClick={() => change(u.email, isLect ? "Student" : "Lecturer")}
                className="shrink-0 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2 disabled:opacity-50"
              >
                {isLect ? "Make student" : "Make lecturer"}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
