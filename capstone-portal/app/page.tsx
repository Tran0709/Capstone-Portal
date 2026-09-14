import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { Directory } from "@/components/directory/directory";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LogOut, Upload } from "lucide-react";

export default async function Home() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const initials = (session?.name || session?.email || "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-surface/80 backdrop-blur">
        <div className="flex h-[60px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={32} />
            <span className="font-semibold tracking-tight">
              Curtin ISAD 3000 Project Portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="grid size-8 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                {initials}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium">{session?.name ?? session?.email}</div>
                {session?.role && (
                  <div className="text-xs text-muted-foreground">{session.role}</div>
                )}
              </div>
            </div>
            {session?.role === "Lecturer" && (
              <a
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2"
              >
                <Upload className="size-4" />
                <span className="hidden sm:inline">Upload</span>
              </a>
            )}
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <Directory />
    </div>
  );
}
