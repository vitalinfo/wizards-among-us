import { afterEach, describe, expect, it } from "vitest";

import { sentryEnabled, sentryOptions } from "../sentry";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

describe("sentryOptions", () => {
  // Each of these is a decision about what we export about children, not a
  // preference. A future "let's just turn tracing on to debug this" should
  // fail here first.
  it("never sends default PII", () => {
    expect(sentryOptions().sendDefaultPii).toBe(false);
  });

  it("does not sample traces — they carry urls describing real families", () => {
    expect(sentryOptions().tracesSampleRate).toBe(0);
  });

  it("routes every event through the scrubber", () => {
    expect(sentryOptions().beforeSend).toBeTypeOf("function");
  });

  it("keeps few breadcrumbs, since each one is a chance to leak", () => {
    expect(sentryOptions().maxBreadcrumbs).toBeLessThanOrEqual(20);
  });
});

describe("environment tagging", () => {
  // Both Heroku apps run as NODE_ENV=production. Without an explicit value they
  // are indistinguishable in one shared issue stream — which is the whole
  // reason a single project works.
  it("prefers SENTRY_ENV over NODE_ENV", () => {
    process.env.SENTRY_ENV = "staging";
    expect(sentryOptions().environment).toBe("staging");
  });

  it("falls back to NODE_ENV when unset", () => {
    delete process.env.SENTRY_ENV;
    expect(sentryOptions().environment).toBe(process.env.NODE_ENV);
  });
});

describe("sentryEnabled", () => {
  // No DSN means init() is never called: nothing collected, nothing sent, and
  // a local checkout or CI never talks to Sentry.
  it("is off without a DSN", () => {
    delete process.env.SENTRY_DSN;
    expect(sentryEnabled()).toBe(false);
  });

  it("is on with one", () => {
    process.env.SENTRY_DSN = "https://key@example.ingest.sentry.io/1";
    expect(sentryEnabled()).toBe(true);
  });
});
