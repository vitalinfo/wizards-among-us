import { useTranslations } from "next-intl";

import { SITE_CONTAINER } from "@/components/site/layout";
import { cn } from "@/lib/utils";

import { PartnerCard } from "./PartnerCard";
import { PARTNERS } from "./partners";
import { SectionHeading } from "./SectionHeading";

export function PartnersList() {
  const t = useTranslations("partners.list");

  return (
    // The soft blue canvas the public pages sit on — the only section of this
    // page that leaves white.
    <section className="bg-canvas">
      <div className={cn(SITE_CONTAINER, "py-15 lg:py-25")}>
        <SectionHeading
          label={t("label")}
          title={t("title")}
          subtitle={t("subtitle")}
        />

        {/* Two columns from lg. The design centres the odd fifth card under
            the pair above it, which `col-span-2` plus a half-width cap does
            without knowing that five is the count — add a sixth partner and
            the row simply fills. */}
        <ul className="mt-8 grid gap-6 lg:mt-20 lg:grid-cols-2">
          {PARTNERS.map((partner, i) => (
            <PartnerCard
              key={partner.key}
              partner={partner}
              name={t(`items.${partner.key}.name`)}
              description={t(`items.${partner.key}.description`)}
              badge={t(`items.${partner.key}.badge`)}
              logoAlt={t("logoAlt", { name: t(`items.${partner.key}.name`) })}
              className={
                i === PARTNERS.length - 1 && PARTNERS.length % 2 === 1
                  ? "lg:col-span-2 lg:w-[calc(50%-12px)] lg:justify-self-center"
                  : undefined
              }
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
