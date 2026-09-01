import { getRequestConfig } from "next-intl/server";

import { formats, locale, timeZone } from "./config";

// The values live in ./config so they can be read without importing
// next-intl/server (see the note there). Re-exported here because that is where
// the rest of the app already imports them from.
export { formats, locale, timeZone } from "./config";

export default getRequestConfig(async () => ({
  locale,
  timeZone,
  formats,
  messages: (await import(`../../messages/${locale}.json`)).default,
}));
