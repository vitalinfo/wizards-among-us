import type { MetadataRoute } from "next";

import { SITE } from "@/lib/site";

// §10 crawler policy: allow crawling, reference the sitemap, and do NOT
// Disallow the noindex routes — a disallowed URL can't be crawled, so Google
// never sees the `noindex` and may still list the bare URL. Auth + per-page
// noindex handle exclusion instead.
//
// The one Disallow is for IMAGE files, where that reasoning does not apply:
// the gallery holds real photos of children — families' photos with the gift,
// served from /gallery/<review>/photo (and, until they are removed, the old
// static public/gallery-N.webp). Disallowed, they stay out of image search and
// cannot be picked as the result thumbnail. Not a privacy control — the photos
// are public and the pages still show them.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/gallery" },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
