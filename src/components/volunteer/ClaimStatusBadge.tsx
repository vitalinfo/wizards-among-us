import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

// «Допомога триває» / «Допомогу завершено» — the two states a child a volunteer
// holds can be in (Figma 130:2506).
//
// The fills are the design's (#e4f0ff and #e9ffe4, now tokens). The LABELS are
// not: the design sets them in a light blue and a light green that read 1.85:1
// and 1.74:1 on those fills, so they are --primary and --status-done instead.
// See globals.css.
//
// The state is the word, not the colour — the pill says the same thing to
// someone who cannot tell the two tints apart.
export type ClaimState = "active" | "completed";

const TONE: Record<ClaimState, string> = {
  active: "bg-status-progress-tint text-primary",
  completed: "bg-status-done-tint text-status-done",
};

export function ClaimStatusBadge({
  state,
  label,
}: {
  state: ClaimState;
  // The same two states seen from the family's side read differently
  // («Допомога в процесі» on «Мої Чарівники»); the pill does not.
  label?: string;
}) {
  const t = useTranslations("volunteer.claims.state");
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-full px-4 text-xs leading-4 font-medium whitespace-nowrap lg:h-11 lg:px-5 lg:text-sm",
        TONE[state],
      )}
    >
      {label ?? t(state)}
    </span>
  );
}
