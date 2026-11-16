import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { resolveFileLink } from "@/features/applications/fileLinkQueries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  // The token is in this page's url: never send it on as a Referer.
  return { referrer: "no-referrer" };
}

// Where a photo link from the queue export opens — a page around the image,
// not the image itself. Pasted into a chat, a link straight to a JPEG unfurls
// as that photo and Telegram keeps a copy on its servers; this page unfurls as
// the site's generic card. Reading the page reads no file and logs nothing:
// only the image route below does.
export default async function PhotoLinkPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveFileLink(token);
  if (!resolved) {
    notFound();
  }

  const t = await getTranslations("photoLink");
  const label = t(resolved.kind);

  return (
    <main className="bg-background flex min-h-dvh flex-col items-center justify-center p-4">
      <h1 className="sr-only">{label}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element -- served by a signed-link route, not an optimizable static asset */}
      <img
        src={`/photos/${encodeURIComponent(token)}/file`}
        alt={label}
        className="max-h-[calc(100dvh-2rem)] w-auto max-w-full object-contain"
      />
    </main>
  );
}
