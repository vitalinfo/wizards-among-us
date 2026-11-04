import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

// §10 crawler policy: allow crawling, reference the sitemap, and do NOT
// Disallow the noindex routes — a disallowed URL can't be crawled, so Google
// never sees the `noindex` and may still list the bare URL. Auth + per-page
// noindex handle exclusion instead.
//
// The one Disallow is for IMAGE files, where that reasoning does not apply:
// the gallery (public/gallery-N.webp, on the landing and /about) holds real
// photos of children. Disallowed, they stay out of image search and cannot be
// picked as the result thumbnail. Not a privacy control — the files are public
// and the page still shows them.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/gallery-" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
