// Locale, time zone and named formats — the values, with NO dependency on
// next-intl/server.
//
// Split out of request.ts so they can be imported without pulling in
// `getRequestConfig`. A test that mocks `next-intl/server` and reads these from
// request.ts deadlocks: the mock factory imports the helper, the helper imports
// request.ts, request.ts imports the module being mocked. request.ts re-exports
// everything here, so existing imports are unaffected.

// Single active UI locale for now (Ukrainian). The app is structured so more
// locales can be added later: all copy lives in messages/<locale>.json and
// nothing user-facing is hardcoded. When a second language is introduced,
// switch to next-intl's i18n-routing setup and resolve `locale` per request.
export const locale = "uk" as const;

// Our users and the team are in Ukraine, and the server runs in UTC on Heroku.
// Pinning the zone means a date renders the same for everyone and doesn't shift
// with the deploy environment — important when "submitted two days ago" is a
// promise we make.
export const timeZone = "Europe/Kyiv" as const;

// Named date/number formats, declared once so every screen formats alike.
// next-intl requires named formats to exist — `format.dateTime(d, "short")`
// throws MISSING_FORMAT otherwise, which is how this was found.
export const formats = {
  dateTime: {
    short: { day: "2-digit", month: "2-digit", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    withTime: {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  },
} as const;
