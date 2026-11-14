import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { logout } from "@/app/auth/actions";
import { BarePageHeader } from "@/components/account/BarePageHeader";
import { CabinetIntro } from "@/components/account/CabinetIntro";
import { CtaLink } from "@/components/ui/CtaLink";
import { ctaBase, ctaVariants } from "@/components/ui/ctaStyles";
import { isBanned } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.banned");
  return { title: t("meta") };
}

export const dynamic = "force-dynamic";

// Where every account page sends a banned user (the /account layout does the
// sending). Bare, not inside the cabinet's shell: its sidebar would offer
// pages that only lead back here.
//
// Sign-out is on the page because nothing else here offers it — without the
// shell a banned person could not end the session on a shared phone.
export default async function BannedPage() {
  const actor = await getSessionActor();
  // Signed-out visitors never reach this — the layout sends them to sign in.
  // Someone who is not (or no longer) banned has the whole account instead.
  if (!isBanned(actor)) {
    redirect("/account");
  }

  const [t, tCommon] = await Promise.all([
    getTranslations("account.banned"),
    getTranslations("common"),
  ]);

  return (
    <>
      <BarePageHeader closeHref="/" closeLabel={t("close")} />
      <main>
        <CabinetIntro
          title={t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
          body={t("body")}
          bodyWidth="lg:max-w-[560px]"
          action={
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <CtaLink href="/contacts">{t("contact")}</CtaLink>
              <form action={logout}>
                <button
                  type="submit"
                  // The outline pill has no edge of its own — it is drawn for
                  // a coloured section — and on white it read as a text link,
                  // on the one page where it is the way out.
                  className={cn(
                    ctaBase,
                    ctaVariants.outline,
                    "border-primary border-2",
                  )}
                >
                  {tCommon("signOut")}
                </button>
              </form>
            </div>
          }
        />
      </main>
    </>
  );
}
