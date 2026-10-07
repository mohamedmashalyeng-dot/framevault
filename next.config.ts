import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const noIndex = { key: "X-Robots-Tag", value: "noindex, nofollow" };

const nextConfig: NextConfig = {
  // The end-to-end suite builds into its own folder so it never disturbs .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    // Admin uploads (source archives up to 50 MB, demo bundles up to 40 MB)
    // are sent through Server Actions, which pass the /admin proxy matcher.
    serverActions: { bodySizeLimit: "100mb" },
    proxyClientMaxBodySize: "100mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Product demos are static files served from private storage by a route
  // handler. They are never bundled or executed by the application server.
  outputFileTracingExcludes: {
    "*": ["./storage/**", "./content/**", "./data/**"],
  },
  async headers() {
    return [
      {
        // The storefront itself may only be framed by itself.
        source: "/((?!demo/).*)",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      { source: "/account/:path*", headers: [noIndex] },
      { source: "/admin/:path*", headers: [noIndex] },
      { source: "/checkout/:path*", headers: [noIndex] },
      { source: "/api/:path*", headers: [noIndex] },
    ];
  },
};

export default nextConfig;
