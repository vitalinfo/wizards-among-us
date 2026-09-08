// Site-wide configuration (non-translatable values like contact links).
export const SITE = {
  // Canonical URL — used by robots.txt, sitemap and metadataBase.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wizards-among-us.pp.ua",
  // Public contact channels (provided by the project owner).
  telegramUrl: "https://t.me/+XlZ9JMfByQZhMTU6",
  instagramUrl: "https://www.instagram.com/wizards.among.us/",
  email: "charivnyky.org@gmail.com",
  // The design links the consent line and the footer's policy line. The page
  // itself does not exist yet — this is the one place to repoint them once it
  // does (or once there is an external document to link).
  privacyUrl: "/privacy",
} as const;
