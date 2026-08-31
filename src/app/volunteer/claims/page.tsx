import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { recordAuditLog } from "@/features/audit/log";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { listMyClaims } from "@/features/claims/queries";
import { resolveUserContact } from "@/features/users/contact";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

// The children this volunteer holds — and the ONLY place they see tier-2 data:
// current town, delivery information, the parent's name and the family's
// contact. Every render is audit-logged, because this is a reveal of a child's
// sensitive details, not a neutral list.
export default async function MyClaimsPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/volunteer/claims"));
  }

  const t = await getTranslations("volunteer.claims");
  const tFields = await getTranslations("admin.applications.fields");
  const campaign = await getActiveCampaignForIntake();
  const rows = campaign ? await listMyClaims(actor.id, campaign.id) : [];
  const format = await getFormatter();

  if (rows.length > 0) {
    await recordAuditLog({
      actor,
      action: "claim.details_viewed",
      targetType: "user",
      targetId: actor.id,
    });
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-8">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>

        {rows.length === 0 ? (
          <>
            <p className="text-muted-foreground mt-4">{t("empty")}</p>
            <Link
              href="/volunteer/children"
              className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
            >
              {t("browseCta")}
            </Link>
          </>
        ) : (
          <>
            <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
            <ul className="mt-6 flex flex-col gap-4">
              {rows.map(({ application, claimedAt, ...parent }) => {
                const contact = resolveUserContact({
                  username: parent.parentUsername,
                  phone: parent.parentPhone,
                });
                return (
                  <li
                    key={application.id}
                    className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{application.childName}</h2>
                      <span className="text-muted-foreground text-xs">
                        {t("claimedAt", {
                          date: format.dateTime(claimedAt, "short"),
                        })}
                      </span>
                    </div>
                    <dl className="mt-1 text-sm">
                      {[
                        [
                          tFields("giftDescription"),
                          application.giftDescription,
                        ],
                        [tFields("giftPrice"), application.giftPrice],
                        [tFields("parentName"), application.parentName],
                        // The family's own words about what happened to them.
                        // Tier 2: this volunteer holds the claim, so they
                        // already see the town, address and contact.
                        [tFields("familyStory"), application.familyStory],
                        [tFields("currentTown"), application.currentTown],
                        [
                          tFields("deliveryInformation"),
                          application.deliveryInformation,
                        ],
                        [
                          tFields("contact"),
                          contact === null
                            ? null
                            : contact.method === "telegram"
                              ? `@${contact.value}`
                              : contact.value,
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="border-border border-b py-1.5 last:border-b-0"
                        >
                          <dt className="text-muted-foreground text-xs">
                            {label}
                          </dt>
                          <dd className="mt-0.5 whitespace-pre-wrap">
                            {value ?? "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t("releaseNote")}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
