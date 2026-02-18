import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/_next/", "/debug/"],
    },
    sitemap: [
      "https://styfi.yearn.fi/sitemap.xml",
      "https://veyfi.yearn.fi/sitemap.xml",
    ],
  };
}
