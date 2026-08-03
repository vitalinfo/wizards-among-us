import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

// Only the landing page is indexable (§10), so the sitemap lists just `/`.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
