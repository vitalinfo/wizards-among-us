import type { Metadata } from "next";
import { Caveat, Raleway } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { SITE } from "@/lib/site";
import "./globals.css";

// The 2026 redesign's two faces. Both are Google Fonts with a Cyrillic subset,
// which matters more here than anywhere — the entire product is in Ukrainian,
// and a display face without Cyrillic would silently fall back on every heading.
//
// Raleway carries everything: body, labels, buttons, tables.
const raleway = Raleway({
  subsets: ["latin", "cyrillic"],
  variable: "--font-raleway",
  display: "swap",
});

// Caveat is the handwritten display face, used for headings only. Deliberately
// NOT available as a body option: it is barely legible at small sizes, and this
// is an app that stressed people read on phones.
const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  weight: ["700"],
  variable: "--font-caveat",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    // og:image must be ABSOLUTE. Without this Next falls back to whatever
    // origin served the request.
    //
    // Read from CANONICAL_HOST — the host the middleware already redirects to —
    // rather than NEXT_PUBLIC_SITE_URL, because NEXT_PUBLIC_* is inlined at
    // BUILD time: a staging slug promoted through the Heroku pipeline would
    // otherwise advertise staging's host in every share card in production.
    metadataBase: new URL(
      process.env.CANONICAL_HOST
        ? `https://${process.env.CANONICAL_HOST}`
        : SITE.url,
    ),
    title: t("title"),
    description: t("description"),
    // Default: keep the whole app out of search indexes. Only the landing page
    // (app/page.tsx) opts back in — see the §10 crawler policy.
    robots: { index: false, follow: false },
    icons: {
      icon: [
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    },
    // The card any link to this app unfurls as — Telegram above all, since that
    // is where families and volunteers actually share things.
    //
    // On the ROOT layout, so every page has one. Deliberately generic: it
    // inherits down to authenticated routes, and `noindex` does NOT stop an
    // unfurler fetching them. Nothing here may describe a particular child, and
    // the image is brand artwork only.
    //
    // No `images` key: src/app/opengraph-image.png supplies it by file
    // convention, and Next reads the file's real dimensions for
    // og:image:width/:height and derives the whole twitter:* set from this
    // block. A hand-written url gets none of that.
    openGraph: {
      type: "website",
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      locale: "uk_UA",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${raleway.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
