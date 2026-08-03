import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "outlineStrong";

const base =
  "inline-flex h-13 items-center justify-center gap-2 rounded-md px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border-[1.5px] border-border text-body hover:bg-surface-muted",
  outlineStrong:
    "border-[1.5px] border-foreground text-foreground hover:bg-foreground/5",
};

// Anchor/navigation button (renders next/link).
export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: { variant?: Variant } & ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}

// Action button. Used for auth-gated actions whose handler lands in Phase 3
// (Telegram login) — rendered visually complete, wired later.
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: { variant?: Variant } & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}
