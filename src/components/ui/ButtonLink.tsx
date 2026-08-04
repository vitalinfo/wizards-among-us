import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { buttonBase, buttonVariants, type ButtonVariant } from "./buttonStyles";

// Anchor/navigation button (renders next/link).
export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: { variant?: ButtonVariant } & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(buttonBase, buttonVariants[variant], className)}
      {...props}
    />
  );
}
