import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Modal } from "@/components/ui/Modal";

// Drawn over the browse list when a volunteer was sent back because another
// volunteer took the child first (`?notice=taken`) — by claimAction, or by the
// briefing page for a card left on a list drawn before that claim. Without it
// the redirect looked like the click did nothing.
//
// A Modal, so it is page state like every other dialog in the cabinet: × and
// the button are links back to the same view without the notice, and nothing
// here waits on hydration. Focus lands on the dialog, which reads its title and
// description out.
export async function ClaimTakenModal({ closeHref }: { closeHref: string }) {
  const t = await getTranslations("volunteer.children.claimTaken");
  const tCommon = await getTranslations("common");

  return (
    <Modal
      title={t("title")}
      description={t("body")}
      closeHref={closeHref}
      closeLabel={tCommon("close")}
    >
      <Link
        href={closeHref}
        className="bg-primary hover:bg-primary-hover text-primary-foreground focus-visible:outline-ring mt-6 inline-flex h-16 w-full items-center justify-center rounded-full px-[18px] text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-[51px]"
      >
        {t("back")}
      </Link>
    </Modal>
  );
}
