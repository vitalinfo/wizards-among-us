import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getMyVolunteers } from "@/features/applications/queries";
import { recordAuditLog } from "@/features/audit/log";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { resolveUserContact } from "@/features/users/contact";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// "Who is helping my child, and how do I reach them?"
//
// The only disclosure that runs volunteer → parent. Everywhere else the family's
// details flow outward; a family that has handed over a child's address deserves
// the same courtesy back. Audit-logged like any other contact reveal.
export default async function MyVolunteerPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/parent/my-volunteer"));
  }

  const t = await getTranslations("parent.myVolunteer");
  const tBack = await getTranslations("parent");
  const campaign = await getActiveCampaignForIntake();
  const rows = campaign ? await getMyVolunteers(actor.id, campaign.id) : [];
  const format = await getFormatter();

  if (rows.length > 0) {
    await recordAuditLog({
      actor,
      action: "volunteer.contact_viewed",
      targetType: "user",
      targetId: actor.id,
    });
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-8">
        <Link
          href="/parent/applications"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {tBack("backToApplications")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>

        {rows.length === 0 ? (
          <>
            <p className="text-muted-foreground mt-4">{t("empty")}</p>
          </>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {rows.map((row) => {
              const contact = resolveUserContact({
                username: row.volunteerUsername,
                phone: row.volunteerPhone,
              });
              // A Telegram first name is optional, so fall back to the handle —
              // but then don't print it twice, once as the name and again as
              // the contact.
              const name = row.volunteerFirstName;
              return (
                <li
                  key={row.applicationId}
                  className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-4"
                >
                  <h2 className="font-semibold">{row.childName}</h2>
                  <p className="text-sm">
                    {t("helper", { who: name ?? t("unnamed") })}
                  </p>
                  {contact ? (
                    <p className="text-sm">
                      {contact.method === "telegram" ? (
                        <a
                          href={`https://t.me/${contact.value}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary font-semibold underline underline-offset-4"
                        >
                          @{contact.value}
                        </a>
                      ) : (
                        <a
                          href={`tel:${contact.value}`}
                          className="text-primary font-semibold underline underline-offset-4"
                        >
                          {contact.value}
                        </a>
                      )}
                    </p>
                  ) : (
                    // Should be unreachable: the claim gate requires a contact.
                    <p className="text-muted-foreground text-sm">
                      {t("noContact")}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {t("since", {
                      date: format.dateTime(row.claimedAt, "short"),
                    })}
                  </p>
                  {row.status === "claimed" ? (
                    <Link
                      href={`/parent/applications/${row.applicationId}/confirm`}
                      className="text-primary mt-1 w-fit text-sm font-semibold underline underline-offset-4"
                    >
                      {t("confirmCta")}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
