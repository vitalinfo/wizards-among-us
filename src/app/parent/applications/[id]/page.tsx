import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import { ApplicationForm } from "@/components/parent/applicationForm/ApplicationForm";
import { ApplicationStatusBadge } from "@/components/parent/ApplicationStatusBadge";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { canEditApplication } from "@/features/applications/authz";
import { getMyApplication } from "@/features/applications/queries";
import { isUser } from "@/lib/actor";
import { getSessionActor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect("/login");
  }

  // Scoped to this parent. A wrong id 404s rather than revealing that someone
  // else's application exists.
  const application = await getMyApplication(id, actor.id);
  if (!application) {
    notFound();
  }

  const tSteps = await getTranslations("parent.form.steps");
  const tBlocked = await getTranslations("parent.applications.blocked");
  const editable = canEditApplication(actor, application);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{tSteps("child.title")}</h1>
          <ApplicationStatusBadge status={application.status} />
        </div>

        <div className="mt-8">
          {editable ? (
            <ApplicationForm application={application} />
          ) : (
            <p className="text-muted-foreground">{tBlocked("locked")}</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
