import { useTranslations } from "next-intl";

import { ctaBase, ctaVariants } from "@/components/ui/ctaStyles";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

// «Стати партнером» — the page's one action, repeated at the foot of four
// sections. One component so the four never drift, and so the address is
// built in a single place.
//
// A plain <a>, not CtaLink: this leaves the app entirely, and next/link has
// no routing to do for a mailto. The subject is what makes one shared inbox
// usable — it says who the mail is for before anyone opens it, the same way
// the contacts page's third card used to before it started pointing here.
export function BecomePartnerCta({ className }: { className?: string }) {
  const t = useTranslations("partners");

  return (
    <a
      href={`mailto:${SITE.email}?subject=${encodeURIComponent(t("ctaSubject"))}`}
      className={cn(ctaBase, ctaVariants.primary, className)}
    >
      {t("cta")}
    </a>
  );
}
