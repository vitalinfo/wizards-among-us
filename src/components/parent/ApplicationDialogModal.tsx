import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { deleteDraftAction } from "@/app/account/(shell)/parent/applications/actions";
import { ConfirmReceiptForm } from "@/components/parent/ConfirmReceiptForm";
import { ReviewForm } from "@/components/parent/ReviewForm";
import { Modal } from "@/components/ui/Modal";
import {
  applicationsHref,
  type ApplicationsQuery,
} from "@/features/applications/applicationTabs";
import type { LoadedDialog } from "@/features/applications/dialogs";
import { cn } from "@/lib/utils";

// The dialog «Мої заявки» has open, drawn in the cabinet's modal: deleting a
// draft, confirming the gift arrived (Figma 142:5726), or the review that
// follows. What may open was decided by loadApplicationDialog; this only draws.
export async function ApplicationDialogModal({
  loaded,
  view,
  blocked,
}: {
  loaded: LoadedDialog;
  // The list's tab, page and size — × goes back to it, and each action lands there.
  view: ApplicationsQuery;
  // A refusal the confirm action echoed back.
  blocked: string | null;
}) {
  const t = await getTranslations("parent");
  const tCommon = await getTranslations("common");
  const close = applicationsHref(view);
  const name = loaded.application.childName ?? t("applications.childFallback");

  if (loaded.dialog === "delete") {
    return (
      <Modal
        title={t("applications.deleteDraft.title")}
        description={t("applications.deleteDraft.body", { name })}
        closeHref={close}
        closeLabel={tCommon("close")}
      >
        {/* Cancel first, in reading order as well as on screen. */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <Link
            href={close}
            className={cn(BUTTON, "border-border border lg:flex-1")}
          >
            {tCommon("confirm.cancel")}
          </Link>
          <form
            action={deleteDraftAction.bind(null, loaded.application.id, view)}
            className="lg:flex-1"
          >
            <button
              type="submit"
              className={cn(
                BUTTON,
                "bg-status-draft hover:bg-status-draft/90 text-primary-foreground w-full",
              )}
            >
              {t("applications.deleteDraft.confirm")}
            </button>
          </form>
        </div>
      </Modal>
    );
  }

  if (loaded.dialog === "receive") {
    return (
      <Modal
        title={t("confirm.title")}
        description={t("confirm.body")}
        closeHref={close}
        closeLabel={tCommon("close")}
      >
        <ConfirmReceiptForm
          applicationId={loaded.application.id}
          view={view}
          photo={loaded.photo}
          blocked={blocked}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title={t("review.title")}
      description={t("review.intro", { child: name })}
      closeHref={close}
      closeLabel={tCommon("close")}
    >
      <ReviewForm applicationId={loaded.application.id} view={view} />
    </Modal>
  );
}

const BUTTON =
  "focus-visible:outline-ring inline-flex h-16 items-center justify-center rounded-full px-[18px] text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-[51px]";
