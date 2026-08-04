import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { buttonBase, buttonVariants, type ButtonVariant } from "./buttonStyles";

// Action button. Used for auth-gated actions whose handler lands in Phase 3
// (Telegram login) — rendered visually complete, wired later.
export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: { variant?: ButtonVariant } & ComponentProps<"button">) {
  return (
    <button
      type={type}
      className={cn(buttonBase, buttonVariants[variant], className)}
      {...props}
    />
  );
}
