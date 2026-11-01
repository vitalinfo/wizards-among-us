import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { toggleProcessedAction } from "@/app/volunteer/actions";
import { Modal } from "@/components/ui/Modal";
import {
  claimsHref,
  type ClaimDialog,
  type ClaimsQuery,
} from "@/features/claims/claimTabs";
import { cn } from "@/lib/utils";

// The confirmation for the optional «Опрацьовано» mark, drawn over «Мої
// підопічні»: setting it on a claimed child, or taking it off a processed one.
// Whether it may open was decided by the page; this only draws.
export async function ClaimDialogModal({
  dialog,
  applicationId,
  childName,
  view,
}: {
  dialog: ClaimDialog;
  applicationId: string;
  childName: string;
  // The list's tab, page and size — × and «Скасувати» go back to it, and the
  // action lands there.
  view: ClaimsQuery;
}) {
  const t = await getTranslations("volunteer.claims.processDialog");
  const tCommon = await getTranslations("common");
  const close = claimsHref(view);

  return (
    <Modal
      title={t(`${dialog}.title`)}
      description={t(`${dialog}.body`, { name: childName })}
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
          action={toggleProcessedAction.bind(
            null,
            applicationId,
            dialog === "process",
            view,
          )}
          className="lg:flex-1"
        >
          <button
            type="submit"
            className={cn(
              BUTTON,
              "bg-primary hover:bg-primary-hover text-primary-foreground w-full",
            )}
          >
            {t(`${dialog}.confirm`)}
          </button>
        </form>
      </div>
    </Modal>
  );
}

const BUTTON =
  "focus-visible:outline-ring inline-flex h-16 items-center justify-center rounded-full px-[18px] text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-[51px]";
