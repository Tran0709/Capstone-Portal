import { NextResponse } from "next/server";
import { getProjects } from "@/lib/projects-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await getProjects();
  return NextResponse.json(projects, {
    headers: { "Cache-Control": "no-store" },
  });
}
