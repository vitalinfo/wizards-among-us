import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// The landing page's call to action: a large pill, quite unlike the app's
// square-cornered `Button`. The two are deliberately separate — the public
// page speaks in the redesign's language, the signed-in app has not been
// redrawn yet, and collapsing them would drag the redesign into every admin
// screen ahead of the design for those screens.
export type CtaVariant = "accent" | "primary";

// Sizes are the design's own: 64px tall / 16px label on a phone, 78px / 20px
// from lg, 44px of horizontal padding at both.
const ctaBase =
  "focus-visible:outline-ring inline-flex h-16 items-center justify-center rounded-full px-11 text-center text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-[78px] lg:text-xl";

const ctaVariants: Record<CtaVariant, string> = {
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
};

export function CtaLink({
  variant = "primary",
  className,
  ...props
}: { variant?: CtaVariant } & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(ctaBase, ctaVariants[variant], className)} {...props} />
  );
}
