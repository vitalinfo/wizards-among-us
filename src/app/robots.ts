import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

// §10 crawler policy: allow crawling, reference the sitemap, and do NOT
// Disallow the noindex routes — a disallowed URL can't be crawled, so Google
// never sees the `noindex` and may still list the bare URL. Auth + per-page
// noindex handle exclusion instead.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
