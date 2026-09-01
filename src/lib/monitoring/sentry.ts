import type { NodeOptions } from "@sentry/nextjs";

import { scrubEvent } from "./scrub";

// Shared Sentry options for every runtime (server, edge, browser).
//
// Everything here is off unless SENTRY_DSN is set: no DSN means init() is never
// called, nothing is collected and nothing leaves the process.
export function sentryOptions(): NodeOptions {
  return {
    dsn: process.env.SENTRY_DSN,

    // Both Heroku apps run as NODE_ENV=production, so without this staging and
    // production are indistinguishable in one issue stream — which is what
    // makes a single shared project workable at all.
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,

    // NEVER on. sendDefaultPii attaches IP addresses, cookies and request
    // bodies automatically — precisely the data this app must not export.
    sendDefaultPii: false,

    // Errors only for now. Performance tracing samples real requests and would
    // carry urls and parameters describing real families.
    tracesSampleRate: 0,

    // The last gate before anything is transmitted (see scrub.ts).
    beforeSend: scrubEvent,

    // Breadcrumbs are capped low: they are a rolling log of what happened
    // before a failure, and the fewer we keep the less there is to leak.
    maxBreadcrumbs: 20,
  };
}

export const sentryEnabled = (): boolean => Boolean(process.env.SENTRY_DSN);
