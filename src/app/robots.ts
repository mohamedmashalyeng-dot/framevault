import type { MetadataRoute } from "next";

const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/admin", "/checkout", "/api/", "/dev/", "/demo/", "/preview/", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
