// Site-wide configuration (non-translatable values like contact links).
export const SITE = {
  // Canonical URL — used by robots.txt, sitemap and metadataBase.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wizards-among-us.pp.ua",
  // The year the initiative started. Drives the landing page's "4+ years"
  // figure, which is COMPUTED — a hardcoded 4 quietly becomes a lie every
  // January, and nobody is watching a marketing number for that.
  foundedYear: 2022,
  // Public contact channels (provided by the project owner).
  telegramUrl: "https://t.me/+XlZ9JMfByQZhMTU6",
  instagramUrl: "https://www.instagram.com/wizards.among.us/",
  email: "charivnyky.org@gmail.com",
  // The consent line on /login and the footer's policy line both point here,
  // and as of the policy page they land somewhere: /privacy carries the
  // project's own policy document. Still the one place to repoint them if it
  // ever moves to an external URL.
  privacyUrl: "/privacy",
} as const;
