export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({
    ok: true,
    env: process.env.PORTAL_ENV ?? "dev",
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  });
}
