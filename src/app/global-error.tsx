"use client";

import { NextIntlClientProvider } from "next-intl";
import { useEffect } from "react";

import { GlobalErrorContent } from "@/components/errors/GlobalErrorContent";

// Messages are imported statically rather than fetched through next-intl's
// server config: this boundary catches failures in the ROOT LAYOUT, so it
// replaces <html>/<body> and renders outside the provider (and outside the
// server-side i18n request config, which may be the very thing that failed).
// We're single-locale, so a direct import is both correct and the most robust
// option available here. Add locale negotiation only if we add locales.
import messages from "../../messages/uk.json";

// globals.css is imported by the root layout, which is bypassed here — import it
// so the page keeps the app's styling. If it somehow fails to load, the markup
// is still semantic and readable, just unstyled.
import "./globals.css";

const LOCALE = "uk";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Digest, not message: the raw error can carry a DB error or personal data.
    // The real stack trace stays in the server log.
    console.error("Root layout error", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang={LOCALE}>
      <body>
        <NextIntlClientProvider locale={LOCALE} messages={messages}>
          <GlobalErrorContent reset={reset} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
