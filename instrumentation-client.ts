import * as Sentry from "@sentry/nextjs";

import { sentryEnabled, sentryOptions } from "@/lib/monitoring/sentry";

// Browser runtime.
//
// Session Replay is deliberately NOT enabled: it records the DOM of real
// sessions, which on this app means a parent typing their child's name and
// address. No amount of masking configuration is worth that risk here.
if (sentryEnabled()) {
  Sentry.init(sentryOptions());
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
