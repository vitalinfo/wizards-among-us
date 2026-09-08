import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { ctaBase, ctaVariants, type CtaVariant } from "./ctaStyles";

// Anchor/navigation call to action (renders next/link).
export function CtaLink({
  variant = "primary",
  className,
  ...props
}: { variant?: CtaVariant } & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(ctaBase, ctaVariants[variant], className)} {...props} />
  );
}
