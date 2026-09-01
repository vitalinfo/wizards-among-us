import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { recordAuditLog } from "@/features/audit/log";
import { getActiveCampaignForIntake } from "@/features/campaigns/queries";
import { listApplicationFiles } from "@/features/applications/fileQueries";
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
  const tBack = await getTranslations("volunteer");
  const tFields = await getTranslations("admin.applications.fields");
  const campaign = await getActiveCampaignForIntake();
  const rows = campaign ? await listMyClaims(actor.id, campaign.id) : [];
  const format = await getFormatter();

  // The confirmation photo the family uploaded. Showing it to the volunteer who
  // paid for the gift is the whole reason that photo has this audience
  // (Vital, Phase 7) — the authorization existed before this page did.
  const photos = new Map(
    await Promise.all(
      rows.map(async ({ application }) => {
        const files = await listApplicationFiles(application.id);
        // findLast: listApplicationFiles is oldest-first, so this is the most
        // recent photo the family uploaded.
        const photo = files.findLast((file) => file.kind === "confirmation");
        return [application.id, photo?.id ?? null] as const;
      }),
    ),
  );

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
        <Link
          href="/volunteer/children"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {tBack("backToChildren")}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>

        {rows.length === 0 ? (
          <p className="text-muted-foreground mt-4">{t("empty")}</p>
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
                      {/* Status by text, not colour alone. */}
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          application.status === "fulfilled"
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-surface-muted text-muted-foreground border-border"
                        }`}
                      >
                        {application.status === "fulfilled"
                          ? t("fulfilled")
                          : t("inProgress")}
                      </span>
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
                    {photos.get(application.id) ? (
                      <figure className="mt-3">
                        <figcaption className="text-sm font-medium">
                          {t("photoTitle")}
                        </figcaption>
                        {/* Streams through the authorized route, which
                            re-checks this volunteer holds the claim and logs
                            the read. Never a direct storage url. */}
                        {/* eslint-disable-next-line @next/next/no-img-element -- served by an authorized route, not an optimizable static asset */}
                        <img
                          src={`/api/applications/${application.id}/files/${photos.get(application.id)}`}
                          alt={t("photoAlt", {
                            child: application.childName ?? "",
                          })}
                          className="border-border mt-2 max-h-80 w-auto rounded-md border"
                        />
                      </figure>
                    ) : null}

                    <p className="text-muted-foreground mt-2 text-xs">
                      {application.status === "fulfilled"
                        ? t("thanks")
                        : t("releaseNote")}
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
