// Shared button styling — used by both Button and ButtonLink so the two stay
// visually identical. Not a component, so it stays a plain (camelCase) module.
export type ButtonVariant = "primary" | "outline" | "outlineStrong";

export const buttonBase =
  "inline-flex h-13 items-center justify-center gap-2 rounded-md px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border-[1.5px] border-border text-body hover:bg-surface-muted",
  outlineStrong:
    "border-[1.5px] border-foreground text-foreground hover:bg-foreground/5",
};

// A square, icon-only control — the photo viewer's toolbar. 36px: above the
// 24px target minimum (WCAG 2.5.8) with room for a thumb. Its name comes from
// an aria-label and its visible label from a Tooltip.
export const iconButton =
  "grid size-9 place-items-center rounded-md border border-border text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50";
