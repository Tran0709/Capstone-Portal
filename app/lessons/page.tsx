import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LessonsBrowser } from "@/components/lessons/lessons-browser";

export const metadata = { title: "Lessons | Curtin ISAD 3000 Portal" };
export const dynamic = "force-dynamic";

export default async function LessonsPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  const isLecturer = session?.role === "Lecturer";

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-surface/80 backdrop-blur">
        <div className="flex h-[60px] items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={32} />
            <span className="font-semibold tracking-tight">Lessons &amp; Videos</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-surface-2"
          >
            <ArrowLeft className="size-4" /> Back to directory
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <h1 className="text-xl font-semibold">Curtin ISAD 3000 lessons</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLecturer
            ? "Add lessons with documents and videos. Students and mentors can watch and download them."
            : "Watch lecture videos and download lesson documents."}
        </p>
        <div className="mt-6">
          <LessonsBrowser isLecturer={isLecturer} />
        </div>
      </main>
    </div>
  );
}
