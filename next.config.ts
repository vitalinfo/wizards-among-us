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

// Sentry wraps the config last so it sees the final one. It is inert without
// SENTRY_DSN — no upload, no instrumentation, no build-time network calls.
//
// Source maps are NOT uploaded: that needs @sentry/cli's binary (declined in
// pnpm-workspace.yaml) plus SENTRY_AUTH_TOKEN/ORG/PROJECT. The cost is that
// production stack traces stay minified; wire it up when that starts hurting.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  // Route browser events through our own origin, so an ad blocker doesn't
  // silently swallow client-side errors — the ones we are least likely to hear
  // about any other way.
  tunnelRoute: "/monitoring",
  disableLogger: true,
  // We upload nothing, so there is nothing to widen or hide.
  sourcemaps: { disable: true },
});
