import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminApplicationForm } from "@/components/admin/AdminApplicationForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { getApplicationForAdmin } from "@/features/applications/adminQueries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function AdminEditApplicationPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const detail = await getApplicationForAdmin(applicationId);
  if (!detail) {
    notFound();
  }
  const { application, campaignTitle } = detail;
  const t = await getTranslations("admin.applications");

  const giftUrls = Array.isArray(
    (application.typeFields as { giftUrls?: unknown } | null)?.giftUrls,
  )
    ? (application.typeFields as { giftUrls: string[] }).giftUrls
    : [];

  // A claimed application has already been shown to a volunteer, who may be out
  // buying the gift right now. Changing the details under them is sometimes
  // exactly right (a corrected address) and sometimes not (a different gift), so
  // say so rather than silently allowing it.
  const claimed =
    application.status === "claimed" || application.status === "fulfilled";

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
        <Link
          href={`/admin/applications/${applicationId}`}
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("edit.backCta")}
        </Link>

        <div>
          <h1 className="text-3xl font-semibold">{t("edit.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {application.childName ?? t("detailTitle")}
            {" · "}
            {campaignTitle}
          </p>
        </div>

        <div className="border-border bg-surface-muted rounded-lg border p-4">
          <p className="text-sm">{t("edit.intro")}</p>
        </div>

        {claimed ? (
          <p
            role="alert"
            className="border-border bg-surface rounded-lg border p-4 text-sm font-medium"
          >
            {t("edit.claimedWarning")}
          </p>
        ) : null}

        <AdminApplicationForm application={application} giftUrls={giftUrls} />
      </main>
    </>
  );
}
