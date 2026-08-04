// Site-wide configuration (non-translatable values like contact links).
export const SITE = {
  // Canonical URL — used by robots.txt / sitemap. Override via
  // NEXT_PUBLIC_SITE_URL; placeholder until the real domain is set.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://wizards.xyz",
  // Public contact channel (provided by the project owner).
  telegramUrl: "https://t.me/+XlZ9JMfByQZhMTU6",
  // Placeholder — replace with a real inbox before launch.
  email: "hello@wizards.xyz",
} as const;
