import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { startApplication } from "@/app/account/(shell)/parent/applications/actions";
import { BarePageHeader } from "@/components/account/BarePageHeader";
import { SITE_CONTAINER } from "@/components/site/layout";
import { ctaVariants } from "@/components/ui/ctaStyles";
import type { CampaignType } from "@/db/enums";
import { canStartApplication } from "@/features/applications/authz";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { isUser } from "@/lib/actor";
import { CHILD_AGE_MAX, CHILD_AGE_MIN } from "@/lib/applicationFieldOptions";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.briefing");
  return { title: t("cta") };
}

export const dynamic = "force-dynamic";

// «Перед заповненням анкети» (Figma 147:7166) — what a family reads before
// starting an application: who can take part, what the letter is, what to
// attach, what a gift may be.
//
// Every «Подати заявку» leads here; «Заповнити анкету» is the form that
// creates the draft. Its copy belongs to a CAMPAIGN TYPE — it talks about St
// Nicholas and 6 December — so it is keyed by type like the form's steps, and
// a type with no briefing goes straight on rather than showing the wrong one.
// The gift cap and the ages come from the campaign and the form, not from the
// copy, so the page cannot promise a budget the form then refuses.
const BRIEFED: readonly CampaignType[] = ["saint_nicholas_day"];

type Item = { emoji: string; title: string; body?: string; list?: string[] };

export default async function BriefingPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/parent/applications/new"));
  }

  const [campaign, settings] = await Promise.all([
    getActiveCampaignForIntake(),
    getResolvedSettings(),
  ]);
  // Nothing to brief for when intake is closed: the list says so.
  if (!campaign || !canStartApplication(actor, { campaign, settings })) {
    redirect("/account/parent/applications");
  }

  const t = await getTranslations("parent.briefing");
  const type = BRIEFED.includes(campaign.type) ? campaign.type : null;
  const cap =
    campaign.giftPriceCap === null ? null : Number(campaign.giftPriceCap);
  const price =
    cap !== null && Number.isFinite(cap) ? `${cap} грн` : t("noCap");
  const items = type ? (t.raw(`${type}.items`) as Item[]) : [];

  const rich = (key: string) =>
    t.rich(key, {
      price: (chunks) => (
        <strong className="text-primary font-bold">{chunks}</strong>
      ),
      cap: price,
      min: CHILD_AGE_MIN,
      max: CHILD_AGE_MAX,
    });

  return (
    <>
      <BarePageHeader
        closeHref="/account/parent/applications"
        closeLabel={t("close")}
      />
      <div className={cn(SITE_CONTAINER, "pb-16 lg:pb-24")}>
        <div className="mx-auto flex max-w-[1022px] flex-col">
          <h1 className="font-display text-center text-[46px] leading-[44px] font-bold tracking-[-0.06em] lg:text-[74px] lg:leading-[60px]">
            {t.rich("title", {
              em: (chunks) => <span className="text-primary">{chunks}</span>,
            })}
          </h1>
          <p className="mt-3 text-center text-base tracking-[-0.03em] lg:text-xl">
            {t.rich("subtitle", {
              strong: (chunks) => (
                <strong className="text-danger font-bold">{chunks}</strong>
              ),
            })}
          </p>

          {/* A list, because it is one: ten things to know, each with its
              emoji as decoration — the words carry every point. */}
          <ul className="mt-10 flex flex-col gap-7 lg:mt-12 lg:px-[30px]">
            {items.map((item, index) => (
              <li key={item.title} className="flex items-start gap-3 lg:gap-4">
                <span
                  aria-hidden="true"
                  className="bg-canvas flex size-8 shrink-0 items-center justify-center rounded-full text-sm"
                >
                  {item.emoji}
                </span>
                <div className="flex min-w-0 flex-col gap-2 pt-1.5 text-sm tracking-[-0.03em]">
                  <p className="font-medium">
                    {rich(`${type}.items.${index}.title`)}
                  </p>
                  {item.body ? (
                    <p className="text-muted-foreground">
                      {rich(`${type}.items.${index}.body`)}
                    </p>
                  ) : null}
                  {item.list ? (
                    <ul className="text-muted-foreground list-disc pl-5">
                      {item.list.map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {/* The form that creates the draft — a POST, since starting writes
              a row. startApplication re-checks intake itself. */}
          <form
            action={startApplication}
            className="mt-10 flex justify-center lg:mt-12"
          >
            <button
              type="submit"
              className={cn(
                ctaVariants.primary,
                "focus-visible:outline-ring inline-flex h-16 items-center justify-center rounded-full px-11 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
              )}
            >
              {t("cta")}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
