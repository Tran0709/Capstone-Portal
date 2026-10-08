import changelog from "@/data/changelog.json";

export const dynamic = "force-dynamic";

// Protected by proxy.ts (not excluded from the auth matcher): signed-in users only.
export function GET() {
  const items = [...changelog]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 20);
  return Response.json({ items });
}
