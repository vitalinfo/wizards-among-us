import * as Sentry from "@sentry/nextjs";

// Next's instrumentation hook: loads the right Sentry config per runtime.
// Both are no-ops without SENTRY_DSN.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    // Deployed apps only: locally it would print into the dev server's output
    // every minute.
    if (process.env.NODE_ENV === "production") {
      const { startMemoryLog } = await import("./lib/monitoring/memory");
      startMemoryLog();
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Reports errors thrown while rendering a server component or route handler —
// the ones that otherwise only reach Heroku's log stream. Sentry scrubs the
// payload through beforeSend before anything is sent (see lib/monitoring/scrub).
export const onRequestError = Sentry.captureRequestError;
