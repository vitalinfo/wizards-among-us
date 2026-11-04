import { SITE } from "@/lib/site";

// schema.org JSON-LD for the landing page: who runs the site (logo, and the
// Instagram/Telegram accounts that are the same organisation), the site's name,
// and which image represents the page in search results.
//
// Every URL is production's, like the canonical: staging serves this same page
// but is noindex, so it must not describe itself.
export function landingJsonLd({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  const organization = `${SITE.url}/#organization`;
  const website = `${SITE.url}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organization,
        name,
        url: SITE.url,
        logo: `${SITE.url}/icon-192.png`,
        sameAs: [SITE.instagramUrl, SITE.telegramUrl],
      },
      {
        "@type": "WebSite",
        "@id": website,
        name,
        url: SITE.url,
        inLanguage: "uk",
        publisher: { "@id": organization },
      },
      {
        "@type": "WebPage",
        "@id": `${SITE.url}/#webpage`,
        url: SITE.url,
        name,
        description,
        inLanguage: "uk",
        isPartOf: { "@id": website },
        about: { "@id": organization },
        // The share-card artwork: brand only, no child in it. The landing's
        // gallery holds real photos of children, and this is the hint that
        // asks Google to use the brand image as the thumbnail instead.
        primaryImageOfPage: {
          "@type": "ImageObject",
          url: `${SITE.url}/opengraph-image.png`,
        },
      },
    ],
  };
}

// For a <script type="application/ld+json">: JSON.stringify leaves `<` as is,
// so a value containing "</script>" would close the tag early.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
