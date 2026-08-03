import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// Pill badge (tinted). Used for section/context labels ("Для батьків", campaign).
export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-primary-tint text-primary-tint-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}
