import { describe, expect, it } from "vitest";
import type { ErrorEvent } from "@sentry/nextjs";

import { scrubEvent } from "../scrub";

// Sentry stores whatever we send, on infrastructure we do not control, with a
// retention we do not set. These tests are the gate: they describe exactly what
// is allowed to leave the process, using the real data this app handles.
function scrub(event: Partial<ErrorEvent>): ErrorEvent {
  return scrubEvent(event as ErrorEvent);
}

describe("scrubEvent", () => {
  it("drops the request body — it IS the child's data", () => {
    const event = scrub({
      request: {
        data: {
          childName: "Софійка Коваль",
          currentTown: "Дрогобич",
          deliveryInformation: "Нова пошта, відділення 12",
        },
      },
    });
    expect(event.request?.data).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("Софійка");
    expect(JSON.stringify(event)).not.toContain("Дрогобич");
  });

  // A session cookie is a live credential: anyone with issue access could
  // impersonate that user.
  it("drops cookies and every header but a safe few", () => {
    const event = scrub({
      request: {
        cookies: { wau_session: "a-real-session-token" },
        headers: {
          cookie: "wau_session=a-real-session-token",
          authorization: "Bearer secret",
          "x-forwarded-for": "203.0.113.7",
          "user-agent": "Mozilla/5.0",
          referer: "https://example.test/parent",
        },
      },
    });
    expect(event.request?.cookies).toBeUndefined();
    expect(Object.keys(event.request?.headers ?? {}).sort()).toEqual([
      "referer",
      "user-agent",
    ]);
    expect(JSON.stringify(event)).not.toContain("a-real-session-token");
  });

  // The volunteer search puts a person's name in the query string.
  it("keeps the path but drops query parameters", () => {
    const event = scrub({
      request: {
        url: "https://x.test/admin/applications/abc?volunteer=Богдан&status=all",
        query_string: "volunteer=Богдан&status=all",
      },
    });
    expect(event.request?.url).toBe("https://x.test/admin/applications/abc");
    expect(event.request?.query_string).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("Богдан");
  });

  it("strips breadcrumb data and breadcrumb query strings", () => {
    const event = scrub({
      breadcrumbs: [
        {
          message: "fetch /api/applications/1/files?kind=idp_certificate",
          data: { body: { childName: "Данило" } },
        },
      ],
    });
    expect(event.breadcrumbs?.[0].data).toBeUndefined();
    expect(event.breadcrumbs?.[0].message).toBe(
      "fetch /api/applications/1/files",
    );
    expect(JSON.stringify(event)).not.toContain("Данило");
  });

  // We correlate with our own audit log, which holds the identity under our
  // control. Sentry gets an opaque id and nothing else.
  it("reduces the user to an id", () => {
    const event = scrub({
      user: {
        id: "u1",
        username: "olena",
        email: "olena@example.test",
        ip_address: "203.0.113.7",
      },
    });
    expect(event.user).toEqual({ id: "u1" });
  });

  it("drops local variables captured from stack frames", () => {
    const event = scrub({
      exception: {
        values: [
          {
            type: "Error",
            stacktrace: {
              frames: [
                { filename: "actions.ts", vars: { childName: "Софійка" } },
              ],
            },
          },
        ],
      },
    });
    expect(
      event.exception?.values?.[0].stacktrace?.frames?.[0].vars,
    ).toBeUndefined();
    expect(JSON.stringify(event)).not.toContain("Софійка");
  });

  it("survives an event with none of these fields", () => {
    expect(() => scrub({})).not.toThrow();
  });
});
