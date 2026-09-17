import Link from "next/link";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { AdminUpload } from "@/components/admin/admin-upload";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ArrowLeft } from "lucide-react";

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const isLecturer = session?.role === "Lecturer";

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-surface/80 backdrop-blur">
        <div className="flex h-[60px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={32} />
            <span className="font-semibold tracking-tight">Lecturer · Project Upload</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            <ArrowLeft className="size-4" /> Back to directory
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 md:px-6">
        {isLecturer ? (
          <AdminUpload />
        ) : (
          <div className="rounded-2xl border bg-surface p-8 text-center">
            <h1 className="text-lg font-semibold">Lecturer access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You are signed in as {session?.email ?? "a viewer"}. Only Lecturer
              accounts can upload projects.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
