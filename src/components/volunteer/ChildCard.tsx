import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { BrowseRow } from "@/features/claims/queries";
import { cn } from "@/lib/utils";

import { ChildPhoto } from "./ChildPhoto";

// One browsable child (Figma 118:420). Photo of the letter on the left from lg,
// under the button on a phone, with the family's own account of what happened
// between them.
//
// Renders ONLY what BrowseRow carries (the projection from toBrowseCard), so
// there is no path by which the delivery address, the parent's name or the
// family's contact could reach this markup — the letter photo and the shop
// links reach it because they were moved into that projection deliberately,
// not because this component reaches around it.
export async function ChildCard({
  row,
  claimHref,
}: {
  row: BrowseRow;
  claimHref: string;
}) {
  const t = await getTranslations("volunteer.children");
  const tCard = await getTranslations("volunteer.children.card");
  const tRegions = await getTranslations("regions");

  const name = row.childFirstName ?? t("noName");
  // Either part can be missing on an older application, so this is not a
  // template — it is whichever parts exist, joined.
  const homePlace =
    [row.homeTown, row.homeRegion ? tRegions(row.homeRegion) : null]
      .filter(Boolean)
      .join(", ") || null;

  return (
    <li className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-[18px]">
      {/* Below the text on a phone and beside it from lg — the design moves it
          rather than shrinking it, because a letter is unreadable at 328px
          wide anyway and the words are what someone chooses on. */}
      {row.letterPhotoId ? (
        <ChildPhoto
          applicationId={row.id}
          fileId={row.letterPhotoId}
          // Opens over the page, as the claim card's photos do — a letter is
          // unreadable at this size and is one of the things a volunteer is
          // choosing on, so «відкрити в новій вкладці» should not be the only
          // way to read it.
          title={tCard("letterTitle")}
          // Names the OBJECT, not the child: a volunteer reading this card with
          // a screen reader is told a letter is here, which is all the photo
          // conveys to anyone who cannot see it. Never «фото Олени».
          alt={tCard("letterAlt")}
          className="order-last w-full lg:order-first lg:w-[257px] lg:shrink-0"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {/* The name alone. There is no icon here: the 118:420 card draws
              «Олена» and nothing beside it, and the gender the column was added
              for is not drawn on this card at all. It stays in the projection
              for the screen that does draw it; inventing a place for it here
              was mine, not the design's. */}
          <h3 className="font-display text-[44px] leading-[44px] font-bold tracking-[-0.03em]">
            {name}
          </h3>
          {row.childAge !== null ? (
            <span className="text-base leading-5 tracking-[-0.03em]">
              {tCard("age", { age: row.childAge })}
            </span>
          ) : null}
        </div>

        {/* Oblast with the town (Vital): «Маріуполь, Донецька область». The
            label asks for a city, and the oblast is what the filter above is
            set to — a volunteer looking for families from their own region
            should see the region they matched on. */}
        <Field label={tCard("homeTown")} value={homePlace} />
        <Field label={tCard("story")} value={row.familyStory} stacked />
        <Field label={tCard("gift")} value={row.giftDescription} />

        {row.giftUrls.length > 0 ? (
          <Field label={tCard("giftUrls")}>
            <ul className="flex flex-wrap gap-x-[21px] gap-y-1">
              {row.giftUrls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    // noreferrer as well as noopener: these are shops a parent
                    // chose, and they have no business learning which page of
                    // ours someone came from.
                    rel="noreferrer noopener"
                    className="text-primary focus-visible:outline-ring block max-w-[200px] truncate underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {shopLabel(url)}
                  </a>
                </li>
              ))}
            </ul>
          </Field>
        ) : null}

        <Link
          href={claimHref}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring mt-2 inline-flex h-[47px] w-fit items-center justify-center rounded-full px-10 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-[51px]"
        >
          {t("claimCta")}
        </Link>
      </div>
    </li>
  );
}

// A labelled line. Side by side from lg, stacked on a phone — except the family
// story, which is stacked at every width because it is a paragraph and a
// 203px label beside it would leave the text a third of the card.
function Field({
  label,
  value,
  stacked = false,
  children,
}: {
  label: string;
  value?: string | null;
  stacked?: boolean;
  children?: React.ReactNode;
}) {
  if (!children && !value) {
    return null;
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-sm tracking-[-0.06em]",
        stacked ? "lg:gap-[9px]" : "lg:flex-row lg:gap-[21px]",
      )}
    >
      {/* --muted-foreground, not the design's #403d3a at 56%: that composites
          to 3.40:1 on white, and these labels are 14px text carrying meaning
          («Історія родини»), not decoration. Same call globals.css already
          makes for the accent button's label. */}
      <span
        className={cn(
          "text-muted-foreground",
          stacked ? null : "lg:w-[203px] lg:shrink-0",
        )}
      >
        {label}
      </span>
      {children ?? <span className="min-w-0 whitespace-pre-wrap">{value}</span>}
    </div>
  );
}

// «https://rozetka.com.ua/…» — the design shows the shop, not the whole url,
// and a real product url is 80 characters of slug and tracking parameters.
// Falls back to the raw string only if it somehow isn't parseable; the mapper
// has already dropped anything that isn't http(s).
function shopLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const rest = parsed.pathname === "/" && !parsed.search ? "" : "/…";
    return `${parsed.protocol}//${parsed.host}${rest}`;
  } catch {
    return url;
  }
}
