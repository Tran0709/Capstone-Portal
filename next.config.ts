import type { NextConfig } from "next";

// Security response headers applied to every route.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Allow the dev server's HMR resources to be reached from your machine's
  // LAN IP (shown as "Network:" when you run `npm run dev`). Not used in production.
  allowedDevOrigins: ["26.47.134.25"],

  // Keep the native libSQL client out of the bundle so it loads at runtime.
  serverExternalPackages: ["@libsql/client", "libsql"],

  // Bundle the seeded SQLite file so file-based reads work on Vercel even
  // before a hosted (Turso) DATABASE_URL is set. Writes still require Turso.
  outputFileTracingIncludes: {
    "/api/projects": ["./data/portal.db"],
    "/api/admin/upload": ["./data/portal.db"],
    "/api/auth/verify": ["./data/portal.db"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
