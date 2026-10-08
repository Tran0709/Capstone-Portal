"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

type Item = { id: string; date: string; title: string; summary: string; kind?: string };
const KEY = "portal:lastSeenUpdate";

function read(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function write(v: string) {
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
}

export function NotificationBell({ userKey }: { userKey: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  const storeKey = `${KEY}:${userKey}`;

  useEffect(() => {
    let alive = true;
    fetch("/api/updates")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: Item[] }) => {
        if (!alive) return;
        setItems(d.items);
        let last: string | null = null;
        try { last = localStorage.getItem(storeKey); } catch { /* ignore */ }
        setSeen(last);
        const fresh = d.items.filter((i) => !last || i.id !== last).length;
        const newest = d.items[0];
        if (newest && last !== newest.id) {
          // first sign-in on this browser: everything counts as new, show only the newest in the toast
          toast(`What's new: ${newest.title}`, { description: newest.summary, duration: 8000 });
        }
        void fresh;
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [storeKey]);

  const lastIdx = seen ? items.findIndex((i) => i.id === seen) : -1;
  const unread = seen ? (lastIdx === -1 ? items.length : lastIdx) : items.length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items[0]) {
      try { localStorage.setItem(storeKey, items[0].id); } catch { /* ignore */ }
      // keep the badge until the panel closes so the user can see what is new
    }
  }
  function close() {
    setOpen(false);
    if (items[0]) setSeen(items[0].id);
  }
  void read; void write;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={open ? close : toggle}
        aria-label={`Notifications${unread ? `, ${unread} new` : ""}`}
        className="relative inline-flex size-9 items-center justify-center rounded-md border hover:bg-surface-2"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border bg-surface p-2 shadow-lg">
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Portal updates</div>
          <ul className="max-h-80 overflow-auto">
            {items.length === 0 && <li className="px-2 py-3 text-sm text-muted-foreground">No updates yet.</li>}
            {items.map((i, idx) => (
              <li key={i.id} className="rounded-md px-2 py-2 hover:bg-surface-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{i.title}</span>
                  {seen !== i.id && idx < unread && (
                    <span className="rounded bg-red-600/10 px-1.5 text-[10px] font-semibold text-red-600">NEW</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{i.date}</div>
                <p className="mt-0.5 text-sm">{i.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
