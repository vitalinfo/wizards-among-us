import { getTranslations } from "next-intl/server";

import { ContactLink } from "@/components/applications/ContactLink";
import { DetailRow } from "@/components/applications/DetailRow";
import { DetailSection } from "@/components/applications/DetailSection";
import type { ContactMethod } from "@/db/enums";

// «Чарівник» on the family's own card, under «Доставка»: who holds this child
// and how to reach them, without going to «Мої Чарівники» to look it up. The
// page decides whether there is one to show, and logs that it was shown.
export async function WizardSection({
  name,
  contact,
}: {
  name: string | null;
  contact: { method: ContactMethod; value: string } | null;
}) {
  const t = await getTranslations("parent.applications.wizard");
  const tVolunteer = await getTranslations("parent.myVolunteer");

  return (
    <DetailSection title={t("title")}>
      <DetailRow label={t("name")} value={name} />
      <DetailRow label={t("contact")}>
        {contact ? (
          <ContactLink contact={contact} />
        ) : (
          // Should be unreachable: the claim gate requires a contact.
          <span className="text-muted-foreground">
            {tVolunteer("noContact")}
          </span>
        )}
      </DetailRow>
    </DetailSection>
  );
}
