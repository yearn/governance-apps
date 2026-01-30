import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: "https://styfi.yearn.fi",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://veyfi.yearn.fi",
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://yearn.fi",
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
