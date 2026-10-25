import { useTranslations } from "next-intl";

import type { ApplicationStatus } from "@/db/enums";
import { cn } from "@/lib/utils";

// An application's status on «Мої заявки» (Figma 139:4543) — the redesign's
// pill, not ApplicationStatusBadge, which the admin screens still use and
// which has not been redrawn.
//
// The FILLS are the design's. Its labels are not where they fall under AA on
// those fills (pink 2.12:1, green 2.52:1, blue 2.48:1, red 3.74:1), so they are
// the tokens in globals.css that clear it. Fulfilled is not drawn; it takes
// the claim pills' «completed» green, the same state from the other side.
//
// The status is the WORD, not the colour — the pill says the same thing to
// someone who cannot tell the tints apart.
const TONE: Record<ApplicationStatus, string> = {
  draft: "bg-status-draft-tint text-status-draft",
  submitted: "bg-status-review-tint text-status-review",
  approved: "bg-status-done-tint text-status-done",
  rejected: "bg-status-rejected-tint text-foreground",
  claimed: "bg-status-progress-tint text-primary",
  fulfilled: "bg-status-done-tint text-status-done",
};

export function ApplicationStatusPill({
  status,
}: {
  status: ApplicationStatus;
}) {
  const t = useTranslations("parent.applications.status");
  return (
    // 32 tall with a 12px label on a phone, 44 and 14 from lg, as drawn.
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-full px-4 text-xs leading-4 font-medium whitespace-nowrap lg:h-11 lg:px-5 lg:text-sm",
        TONE[status],
      )}
    >
      {t(status)}
    </span>
  );
}
