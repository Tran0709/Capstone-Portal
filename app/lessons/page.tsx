import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LessonsBrowser, type Lesson } from "@/components/lessons/lessons-browser";
import lessons from "@/data/lessons.json";

export const metadata = { title: "Lessons | Curtin ISAD 3000 Portal" };

export default function LessonsPage() {
  const withVideo = (lessons as Lesson[]).filter((l) => l.videos.length > 0).length;
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
          {withVideo} lecture videos and 88 lesson documents across {lessons.length} modules. Modules 89–90 are coming soon.
        </p>
        <div className="mt-6">
          <LessonsBrowser lessons={lessons as Lesson[]} />
        </div>
      </main>
    </div>
  );
}
