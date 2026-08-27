import { useTranslations } from "next-intl";

import type { applications } from "@/db/schema";
import { cn } from "@/lib/utils";

type Status = (typeof applications.$inferSelect)["status"];

// Status is conveyed by TEXT, never by colour alone (accessibility rules) — the
// colour is a redundant cue on top of the label.
const TONE: Record<Status, string> = {
  draft: "bg-surface-muted text-muted-foreground border-border",
  submitted: "bg-primary/10 text-primary border-primary/30",
  approved: "bg-primary/10 text-primary border-primary/30",
  rejected: "bg-surface-muted text-body border-border",
  claimed: "bg-primary/10 text-primary border-primary/30",
  fulfilled: "bg-primary/10 text-primary border-primary/30",
};

export function ApplicationStatusBadge({ status }: { status: Status }) {
  const t = useTranslations("parent.applications.status");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE[status],
      )}
    >
      {t(status)}
    </span>
  );
}
