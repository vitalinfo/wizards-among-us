import * as Sentry from "@sentry/nextjs";

import { sentryEnabled, sentryOptions } from "@/lib/monitoring/sentry";

// Edge runtime (middleware). Same options; the middleware only does host and
// scheme canonicalisation, so there is little here to leak — but it can still
// throw, and a middleware error takes down every request.
if (sentryEnabled()) {
  Sentry.init(sentryOptions());
}
