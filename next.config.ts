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

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
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
