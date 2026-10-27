import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { CloseIcon } from "@/components/icons";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteLogo } from "@/components/site/SiteLogo";
import type { CampaignType } from "@/db/enums";
import { cn } from "@/lib/utils";

import { briefingForCampaignType } from "./briefings";

// The chrome around a briefing — logo, «×», and the button at the bottom — with
// the words themselves coming from whichever briefing the campaign's TYPE
// selects. Separated from the page so the page stays about authorization and
// this stays about layout.
export async function ClaimBriefing({
  backHref,
  campaignType,
  giftPriceCap,
  deadline,
  action,
}: {
  backHref: string;
  // null when the application's campaign has gone missing — treated exactly
  // like a type we have no briefing for.
  campaignType: CampaignType | null;
  giftPriceCap: string | null;
  deadline: string | null;
  // null when this child can no longer be taken — the page then explains
  // instead of offering a button that would be refused.
  action: (() => Promise<void>) | null;
}) {
  const t = await getTranslations("volunteer.claim");
  const tCommon = await getTranslations("common");

  const Body = briefingForCampaignType(campaignType);

  return (
    <div className={cn(SITE_CONTAINER, "relative pb-16 lg:pb-20")}>
      {/* A 107px band with a 135px logotype in it: the design lets the logo
          overflow the header top and bottom rather than shrinking it, so the
          row is a fixed height and the logo is centred past its edges. */}
      <div className="flex h-20 items-center justify-between gap-4 lg:h-[107px]">
        <Link
          href="/"
          aria-label={tCommon("brand")}
          className="focus-visible:outline-ring shrink-0 rounded"
        >
          <SiteLogo
            width={135}
            height={135}
            className="h-14 w-auto lg:h-[135px]"
          />
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

      <div className="mx-auto mt-2 max-w-[1116px] lg:mt-[7px]">
        {Body ? (
          // CALLED and awaited rather than rendered as <Body />. Both work in a
          // server tree, but an async component nested as an element cannot be
          // rendered by React Testing Library — awaiting it here leaves only
          // resolved elements, so the whole screen stays testable without
          // splitting the copy out into a client island (rules/testing.md).
          await Body({ giftPriceCap, deadline })
        ) : (
          // A campaign type we have no briefing for. Say so and send them back,
          // rather than showing the briefing for a different campaign — and
          // offer no claim button, because a volunteer cannot agree to terms
          // they were never shown.
          <p className="text-muted-foreground mx-auto max-w-[600px] py-10 text-center text-base">
            {t("blocked.noBriefing")}
          </p>
        )}

        {Body ? (
          <div className="mt-10 flex justify-center lg:mt-11">
            {action ? (
              <form action={action}>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring inline-flex h-14 items-center justify-center rounded-full px-10 text-base leading-6 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-16 lg:px-7"
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
        ) : null}
      </div>
    </div>
  );
}
