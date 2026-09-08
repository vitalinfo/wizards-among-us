import type { Metadata } from "next";
import { Caveat, Raleway } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
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
    title: t("title"),
    description: t("description"),
    // Default: keep the whole app out of search indexes. Only the landing page
    // (app/page.tsx) opts back in — see the §10 crawler policy.
    robots: { index: false, follow: false },
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
