import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteLogo } from "@/components/site/SiteLogo";
import { cn } from "@/lib/utils";

// The briefing itself, separated from the page so the page stays about
// authorization and this stays about words. Every paragraph is a message key;
// the blocks are hand-written rather than mapped over a list, because they are
// not a list — each one says a different kind of thing and two of them carry
// their own heading.
export async function ClaimBriefing({
  backHref,
  giftPriceCap,
  deadline,
  action,
}: {
  backHref: string;
  giftPriceCap: string | null;
  // Already formatted («5 грудня»), or null when the campaign has no end date.
  deadline: string | null;
  // null when this child can no longer be taken — the page then explains
  // instead of offering a button that would be refused.
  action: (() => Promise<void>) | null;
}) {
  const t = await getTranslations("volunteer.claim");
  const tCommon = await getTranslations("common");

  return (
    <div className={cn(SITE_CONTAINER, "relative py-6 lg:py-10")}>
      <div className="flex items-start justify-between gap-4">
        <Link
          href="/"
          aria-label={tCommon("brand")}
          className="focus-visible:outline-ring shrink-0 rounded"
        >
          <SiteLogo width={135} height={135} className="h-14 w-auto lg:h-20" />
        </Link>

        {/* A link, not a dialog's close button: this is a page, and «×» goes
            back to the list the volunteer came from. */}
        <Link
          href={backHref}
          aria-label={t("close")}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:size-[60px]"
        >
          <CloseIcon className="size-5 lg:size-6" />
        </Link>
      </div>

      <div className="mx-auto mt-6 max-w-[1116px] lg:mt-10">
        <h1 className="font-display text-center text-[40px] leading-10 font-bold tracking-[-0.03em] lg:text-[64px] lg:leading-[64px]">
          {t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>
        <p className="mt-4 text-center text-base tracking-[-0.03em] lg:text-lg">
          {t.rich("subtitle", {
            b: (chunks) => (
              <strong className="text-danger font-semibold">{chunks}</strong>
            ),
          })}
        </p>

        <div className="mt-10 flex flex-col gap-8">
          <Block emoji="🎁">
            <p>
              {giftPriceCap === null
                ? t("gift.bodyNoCap")
                : t("gift.body", { cap: Number(giftPriceCap) })}
            </p>
            <p className="mt-4">{t("gift.optionsTitle")}</p>
            <Bullets>
              <li>{t("gift.option1")}</li>
              <li>
                {t.rich("gift.option2", {
                  b: (chunks) => (
                    <strong className="font-semibold">{chunks}</strong>
                  ),
                })}
              </li>
              <li>{t("gift.option3")}</li>
            </Bullets>
          </Block>

          <Block emoji="✨">
            <p>{t("remember")}</p>
          </Block>

          <Block emoji="🍬">
            <p>{t("extras.body")}</p>
            <p className="mt-4">{t("extras.note")}</p>
          </Block>

          <Block emoji="❤️">
            <p>{t("contact")}</p>
          </Block>

          <Block emoji="✉️" title={t("letter.title")}>
            <p>{t("letter.body")}</p>
            <p className="mt-4">{t("letter.note")}</p>
          </Block>

          <Block emoji="📦" title={t("delivery.title")}>
            <p>{t("delivery.body")}</p>
            <p className="mt-4">{t("delivery.optionsTitle")}</p>
            <Bullets>
              <li>{t("delivery.option1")}</li>
              <li>{t("delivery.option2")}</li>
              <li>{t("delivery.option3")}</li>
            </Bullets>
          </Block>

          <Block emoji="❤️">
            <p>{t("agree")}</p>
          </Block>

          <Block emoji="🚚">
            <p>{t("shipping")}</p>
          </Block>

          {deadline ? (
            <Block emoji="📅">
              <p className="text-danger font-semibold">{t("deadline.label")}</p>
              <p className="mt-2">
                {t.rich("deadline.body", {
                  date: deadline,
                  b: (chunks) => (
                    <strong className="font-semibold">{chunks}</strong>
                  ),
                })}
              </p>
              <p className="mt-2">{t("deadline.why")}</p>
            </Block>
          ) : null}

          <Block emoji="✨" title={t("thanks.title")}>
            <p>{t("thanks.body")}</p>
          </Block>
        </div>

        <div className="mt-12 flex justify-center">
          {action ? (
            <form action={action}>
              <button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex h-14 items-center justify-center rounded-full px-10 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {t("cta")}
              </button>
            </form>
          ) : (
            // Refused before it was offered: say which reason, and send them
            // back rather than leaving a dead button on the page.
            <p className="text-muted-foreground max-w-[600px] text-center text-sm">
              {t("blocked.notAvailable")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// One point in the briefing: an emoji in a tinted disc, and the words beside
// it. The emoji is decorative — each block says in text what it is about, so an
// icon repeated into the accessibility tree would only add noise.
function Block({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4 lg:gap-6">
      <span
        aria-hidden="true"
        className="bg-primary-tint flex size-8 shrink-0 items-center justify-center rounded-full text-base lg:size-10"
      >
        {emoji}
      </span>
      <div className="min-w-0 text-sm leading-relaxed tracking-[-0.03em] lg:text-base">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}

function Bullets({ children }: { children: ReactNode }) {
  return (
    <ul className="marker:text-muted-faint mt-2 list-disc pl-5">{children}</ul>
  );
}
