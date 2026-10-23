import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl wires request-scoped locale + messages via ./src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Hosts allowed to reach Next's DEV resources (HMR, the dev overlay) from an
// origin other than the one the server listens on. Comma-separated, set in
// .env.local — the hostname is per-developer (a tunnel, an internal DNS name),
// so it does not belong in a committed config.
//
// Why this matters beyond a warning: reaching the dev server through another
// origin gets /_next/webpack-hmr blocked, the browser then never receives module
// updates, and Turbopack's client chunk graph goes stale — "module factory is
// not available", "Module not found" for files that exist. The page still
// server-renders, so it LOOKS fine, but nothing hydrates: every client
// component is inert with no visible error. We burned a long debugging session
// on exactly that (see README, Admin → confirmations).
//
// Dev only — Next ignores it in a production build.
const allowedDevOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Every signed-in page moved under /account. The old paths are kept alive
// because they are not only bookmarks: a Telegram sign-in that was already in
// flight carries `?next=%2Fparent%2Fapplications`, and `safeReturnPath` will
// happily return it — so without these, finishing a login started before the
// deploy lands on a 404 instead of the anketa the parent came to file.
//
// 308, not 307: the move is permanent and these are GETs, so a cached redirect
// is correct. `/parent` and `/volunteer` THEMSELVES are untouched — they are
// the public explainers and must not redirect anywhere.
const ACCOUNT_MOVES = [
  "/parent/applications",
  "/parent/my-volunteer",
  "/parent/review",
  "/volunteer/children",
  "/volunteer/claims",
  "/volunteer/contact",
];

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  async redirects() {
    return ACCOUNT_MOVES.flatMap((from) => [
      { source: from, destination: `/account${from}`, permanent: true },
      {
        source: `${from}/:path*`,
        destination: `/account${from}/:path*`,
        permanent: true,
      },
    ]);
  },
  // Keep the app portable: standard Next.js output that runs on any Node host.
  // Nothing host-specific is baked into app code — swapping hosts is a deploy
  // concern (Procfile + docs), not a code change.
  images: {
    // No image optimizer wired yet (sharp is disabled). Serve originals until we
    // set one up.
    unoptimized: true,
  },
};

// Source-map upload is gated on the AUTH TOKEN, not on a flag someone has to
// remember. Without it a build produces minified traces and makes no network
// calls; with it, uploads happen automatically wherever it is configured
// (locally, CI, the Heroku build). One variable, no second switch to forget.
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN);

// Sentry wraps the config last so it sees the final one. Inert without
// SENTRY_DSN — no instrumentation, no build-time network calls.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Route browser events through our own origin, so an ad blocker doesn't
  // silently swallow client-side errors — the ones we are least likely to hear
  // about any other way.
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: !uploadSourceMaps,
    // Uploaded maps make the original TypeScript readable to anyone with access
    // to the Sentry project — acceptable here (no proprietary logic), but there
    // is no reason to also leave them served from our own origin afterwards.
    deleteSourcemapsAfterUpload: true,
  },
});
