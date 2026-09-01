import { createFormatter, createTranslator } from "next-intl";

import { formats, locale, timeZone } from "@/i18n/config";
import messages from "../../messages/uk.json";

// Lets a spec render an async SERVER component directly.
//
// Two things otherwise stop it. React Testing Library cannot render an async
// component, which `render(await Component(props))` gets around — the component
// is just a function returning JSX. And `next-intl/server` resolves to its
// CLIENT build under vitest's conditions, so `getTranslations` throws
// "`getTranslations` is not supported in Client Components" before a single
// assertion runs.
//
// This replaces ONLY the request-scoped plumbing. The translator and formatter
// are next-intl's real ones, built from the real messages/uk.json and the real
// formats — so a spec still fails when a key is missing or copy changes, which
// is the whole point of asserting against `messages.*`. Nothing here asserts
// mocked behaviour.
//
// Use it as:
//   vi.mock("next-intl/server", async () =>
//     (await import("@/test/serverIntl")).serverIntl(),
//   );
//
// (a dynamic import, because vi.mock factories are hoisted above the file's own
// imports).
//
// Prefer this to splitting a server component into a client island purely so a
// test can reach it — an island ships JS to the browser for markup that had no
// reason to be interactive.
export function serverIntl() {
  const namespaceOf = (input?: string | { namespace?: string }) =>
    typeof input === "string" ? input : input?.namespace;

  return {
    getTranslations: async (input?: string | { namespace?: string }) =>
      createTranslator({
        locale,
        messages,
        formats,
        // next-intl types the namespace as a key union derived from the
        // messages; here it arrives as whatever the component asked for, which
        // is only known at runtime. The real getTranslations has the same
        // signature at runtime — a wrong namespace still throws.
        namespace: namespaceOf(input) as never,
      }),
    getFormatter: async () => createFormatter({ locale, timeZone, formats }),
    getLocale: async () => locale,
    getMessages: async () => messages,
    getTimeZone: async () => timeZone,
    getFormats: async () => formats,
  };
}
