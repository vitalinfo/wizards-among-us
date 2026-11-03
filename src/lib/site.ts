// Site-wide configuration (non-translatable values like contact links).
export const SITE = {
  // PRODUCTION's URL — used by robots.txt and the sitemap, which only production
  // should advertise. A constant on purpose: those two routes are rendered at
  // build time, and this module also ships to the browser, so an env read here
  // would be frozen into the build. For "the host this deploy serves" (links,
  // metadataBase) use siteOrigin() below.
  url: "https://wizards-among-us.pp.ua",
  // The year the initiative started. Drives the landing page's "4+ years"
  // figure, which is COMPUTED — a hardcoded 4 quietly becomes a lie every
  // January, and nobody is watching a marketing number for that.
  foundedYear: 2022,
  // Public contact channels (provided by the project owner).
  telegramUrl: "https://t.me/charivnyky_poruch",
  telegramChatUrl: "https://t.me/+XlZ9JMfByQZhMTU6",
  // /partners points its Telegram disc at a person rather than the channel.
  partnersTelegramUrl: "https://t.me/helen_0104",
  instagramUrl: "https://www.instagram.com/wizards.among.us/",
  email: "charivnyky.org@gmail.com",
  // The consent line on /login and the footer's policy line both point here,
  // and as of the policy page they land somewhere: /privacy carries the
  // project's own policy document. Still the one place to repoint them if it
  // ever moves to an external URL.
  privacyUrl: "/privacy",
} as const;

// The origin THIS deploy is served on — staging's on staging. SERVER ONLY, and
// call it per request: CANONICAL_HOST is a runtime config var (the host the
// middleware redirects to), absent from the browser bundle. Falls back to
// production's URL where it isn't set.
export function siteOrigin(): string {
  const host = process.env.CANONICAL_HOST;
  return host ? `https://${host}` : SITE.url;
}
