"use client";

import { useEffect } from "react";

// Last-resort boundary: catches failures in the ROOT LAYOUT itself, so it
// replaces <html>/<body> and renders outside NextIntlClientProvider and outside
// globals.css.
//
// The copy is therefore inlined rather than read from messages/uk.json — a
// documented exception to the no-hardcoded-strings rule, because the i18n
// provider is exactly what has failed by the time this renders. Reaching for
// useTranslations here would throw inside the error handler. Keep it to a few
// words, and keep the styles inline for the same reason.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root layout error", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="uk">
      <body
        style={{
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
          fontFamily: "system-ui, sans-serif",
          color: "#1c1c1c",
          background: "#f6f7f9",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Щось пішло не так
          </h1>
          <p style={{ lineHeight: 1.6, marginBottom: "1.25rem" }}>
            Сталася непередбачена помилка. Спробуйте оновити сторінку.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              borderRadius: "0.375rem",
              border: "1.5px solid #1c1c1c",
              background: "transparent",
              color: "inherit",
            }}
          >
            Спробувати ще раз
          </button>
        </div>
      </body>
    </html>
  );
}
