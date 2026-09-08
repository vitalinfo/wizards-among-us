import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { ctaBase, ctaVariants, type CtaVariant } from "./ctaStyles";

// The same pill as CtaLink, as a real <button>. For the one action on these
// pages that is not navigation — the error boundary's "try again", which calls
// React's `reset` rather than going anywhere.
export function CtaButton({
  variant = "primary",
  className,
  type = "button",
  ...props
}: { variant?: CtaVariant } & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(ctaBase, ctaVariants[variant], className)}
      {...props}
    />
  );
}
