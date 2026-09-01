import * as Sentry from "@sentry/nextjs";

import { sentryEnabled, sentryOptions } from "@/lib/monitoring/sentry";

// Server runtime. Skipped entirely without a DSN, so a local checkout and CI
// never talk to Sentry.
if (sentryEnabled()) {
  Sentry.init(sentryOptions());
}
