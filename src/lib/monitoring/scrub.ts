import type { ErrorEvent } from "@sentry/nextjs";

// What we refuse to send to Sentry.
//
// This app's error contexts can carry data about children: an unhandled error
// inside the application form has a child's name, town and the family's
// delivery address in the request body; the volunteer search puts a name in the
// query string; every authenticated request carries a session cookie, which is
// a live credential.
//
// Sentry stores whatever we send, on infrastructure we do not control, with a
// retention we do not set. So the default is to send the SHAPE of a failure —
// where it happened and what threw — and none of its content.
const SAFE_HEADERS = new Set([
  "user-agent",
  "referer",
  "accept-language",
  "content-type",
]);

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    // The form body IS the child's data.
    delete event.request.data;
    // A session cookie is a live credential: leaking it into a third party's
    // issue tracker would let anyone with issue access impersonate that user.
    delete event.request.cookies;

    // Query strings carry search terms (a volunteer looked up by name) and
    // filters. Keep the path, drop the parameters.
    delete event.request.query_string;
    if (event.request.url) {
      event.request.url = event.request.url.split("?")[0];
    }

    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([name]) =>
          SAFE_HEADERS.has(name.toLowerCase()),
        ),
      );
    }
  }

  // Breadcrumbs record fetches and console output on the way to a failure —
  // the same content by another route.
  event.breadcrumbs = event.breadcrumbs?.map((crumb) => ({
    ...crumb,
    data: undefined,
    message: crumb.message?.split("?")[0],
  }));

  // Identify a user by id only — never a name, handle, email or address. The id
  // is enough to correlate with our own audit log, which is where the identity
  // lives under our control.
  if (event.user) {
    event.user = { id: event.user.id };
  }

  // Local variables captured from a stack frame are the last place a child's
  // name can hide.
  for (const value of event.exception?.values ?? []) {
    for (const frame of value.stacktrace?.frames ?? []) {
      delete frame.vars;
    }
  }

  return event;
}
