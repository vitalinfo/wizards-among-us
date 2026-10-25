import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BarePageHeader } from "@/components/account/BarePageHeader";
import { CabinetIntro } from "@/components/account/CabinetIntro";
import { SITE_CONTAINER } from "@/components/site/layout";
import { ctaVariants } from "@/components/ui/ctaStyles";
import { getMyApplication } from "@/features/applications/queries";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.submitted");
  return { title: t("cta") };
}

export const dynamic = "force-dynamic";

// «Вітаємо! Заявку успішно подано» (Figma 147:7166) — where a FIRST submit
// lands. Saving an edit to one already sent goes back to the list instead:
// this page announces a submission, and an edit is not one.
//
// Scoped to this parent; a draft has not been submitted, so it goes back to
// its form rather than being congratulated.
export default async function SubmittedPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(
      signedOutRedirect(
        actor,
        `/account/parent/applications/${applicationId}/submitted`,
      ),
    );
  }

  const application = await getMyApplication(applicationId, actor.id);
  if (!application) {
    notFound();
  }
  if (application.status === "draft") {
    redirect(`/account/parent/applications/${applicationId}`);
  }

  const t = await getTranslations("parent.submitted");
  const tForm = await getTranslations("parent.form");

  return (
    <>
      <BarePageHeader
        closeHref="/account/parent/applications"
        closeLabel={tForm("close")}
      />
      <div className={cn(SITE_CONTAINER, "pb-16 lg:pb-24")}>
        <CabinetIntro
          title={t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
            // The desktop frame breaks after «Заявку»; the phone frame breaks
            // on its own, after «Вітаємо!» and «успішно».
            br: () => <br className="hidden lg:inline" />,
          })}
          body={t("body")}
          action={
            <Link
              href="/account/parent/applications"
              className={cn(
                ctaVariants.primary,
                "focus-visible:outline-ring inline-flex h-16 items-center justify-center rounded-full px-11 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {t("cta")}
            </Link>
          }
        />
      </div>
    </>
  );
}
