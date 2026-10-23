import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

// «Допомога триває» / «Допомогу завершено» — the two states a child a volunteer
// holds can be in (Figma 130:2506). Blue while the gift is on its way, green
// once the family has confirmed it arrived.
//
// The STATE is the word, not the colour: the pill reads the same to someone who
// cannot tell the two tints apart, which is the rule for every status in this
// app. The green is --status-open, the one green the system already has, at
// 4.52:1 on white.
export type ClaimState = "active" | "completed";

const TONE: Record<ClaimState, string> = {
  active: "bg-primary/10 text-primary",
  completed: "bg-status-open/12 text-status-open",
};

export function ClaimStatusBadge({ state }: { state: ClaimState }) {
  const t = useTranslations("volunteer.claims.state");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-4 py-2 text-xs font-medium tracking-[-0.03em]",
        TONE[state],
      )}
    >
      {t(state)}
    </span>
  );
}
