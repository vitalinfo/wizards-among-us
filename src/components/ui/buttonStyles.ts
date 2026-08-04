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
