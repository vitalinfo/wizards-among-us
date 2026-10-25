import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplicationDetail } from "@/components/applications/ApplicationDetail";
import { ApplicationPhoto } from "@/components/applications/ApplicationPhoto";
import { listApplicationFiles } from "@/features/applications/fileQueries";
import { latestByKind } from "@/features/applications/files";
import {
  getMyApplication,
  getUserContactFields,
} from "@/features/applications/queries";
import { resolveUserContact } from "@/features/users/contact";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.applications");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

// «Картка дитини — повна» for the family that wrote it (Figma 139:4543) — the
// eye on a row of «Мої заявки». The same card a volunteer holding the child
// sees, read-only, in every status; editing is the pencil, which goes to the
// form.
//
// Authorization is the query: getMyApplication is scoped to this parent, so
// someone else's id comes back as null and 404s. Not audit-logged — this is a
// family reading what they wrote themselves, which is not a disclosure.
export default async function ApplicationViewPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(
      signedOutRedirect(
        actor,
        `/account/parent/applications/${applicationId}/view`,
      ),
    );
  }

  const application = await getMyApplication(applicationId, actor.id);
  // 404, not 403: someone probing ids must not learn which of them exist.
  if (!application) {
    notFound();
  }

  const t = await getTranslations("parent.applications");
  const tConfirm = await getTranslations("parent.confirm");
  const tRejected = await getTranslations("parent.applications.rejected");
  const [files, contactFields] = await Promise.all([
    listApplicationFiles(applicationId),
    getUserContactFields(actor.id),
  ]);

  // The two portraits, and — once the family has sent it — the photo of the
  // gift arriving, under its own heading at the foot of the page, where the
  // volunteer's card puts it too. Not the ВПО certificate: it is the family's
  // own as well, but it is a state document and this page is the one most
  // likely to be shown to someone else over a shoulder.
  const portraits = latestByKind(files, [
    "child_with_letter_photo",
    "letter_photo",
  ]);
  const gift = latestByKind(files, ["confirmation"])[0];
  const child = application.childName ?? "";

  return (
    <ApplicationDetail
      application={application}
      photos={portraits}
      contact={resolveUserContact(contactFields)}
      closeHref="/account/parent/applications"
      closeLabel={t("close")}
      notice={
        // Rejection is final (Phase 5): the parent cannot edit and resubmit,
        // so the note is the only explanation they get, verbatim — and the way
        // forward is a new application.
        application.status === "rejected" ? (
          <div
            role="note"
            className="border-border bg-surface-muted rounded-lg border p-4"
          >
            <h2 className="font-semibold">{tRejected("title")}</h2>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {application.rejectionNote ?? tRejected("noNote")}
            </p>
            <Link
              href="/account/parent/applications/new"
              className="text-primary mt-3 inline-block text-sm font-semibold underline underline-offset-4"
            >
              {tRejected("cta")}
            </Link>
          </div>
        ) : null
      }
      after={
        gift ? (
          <section className="mx-auto mt-12 max-w-[1066px]">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              {tConfirm("photo.label")}
            </h2>
            <div className="mt-4 lg:w-[306px]">
              <ApplicationPhoto
                applicationId={application.id}
                fileId={gift.id}
                title={tConfirm("photo.label")}
                alt={tConfirm("photo.alt", { child })}
                height={340}
                mobileHeight={443}
              />
            </div>
          </section>
        ) : null
      }
    />
  );
}
