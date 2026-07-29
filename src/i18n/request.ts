import { getRequestConfig } from "next-intl/server";

// Single active UI locale for now (Ukrainian). The app is structured so more
// locales can be added later: all copy lives in messages/<locale>.json and
// nothing user-facing is hardcoded. When a second language is introduced,
// switch to next-intl's i18n-routing setup and resolve `locale` per request.
export const locale = "uk" as const;

export default getRequestConfig(async () => ({
  locale,
  messages: (await import(`../../messages/${locale}.json`)).default,
}));
