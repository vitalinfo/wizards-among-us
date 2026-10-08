// Shared styling for the redesign's large pill call to action — used by both
// CtaLink and CtaButton so the two stay visually identical. Not a component,
// so it stays a plain (camelCase) module, like buttonStyles.ts.
//
// Deliberately separate from that older `buttonStyles`: the public pages speak
// in the 2026 design's language and the signed-in app has not been redrawn
// yet, so collapsing them would drag the redesign into every admin screen
// ahead of the design for those screens.
export type CtaVariant = "accent" | "primary" | "outline";

// Sizes are the design's own: 64px tall / 16px label on a phone, 78px / 20px
// from lg, 44px of horizontal padding at both.
export const ctaBase =
  "focus-visible:outline-ring inline-flex h-16 items-center justify-center rounded-full px-11 text-center text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:h-[78px] lg:text-xl";

// A single action standing on its own, as «Батькам» and «Волонтерам» draw it:
// full width up to 271px on a phone, shrink-to-fit from lg. 271 is the figure
// the landing hero and InitiativeCtas already share (a 271 wrapper inset 28
// either side of a 328 column), so every page's lone button is the same size.
// The control inside takes `w-full`.
export const ctaShell =
  "mx-auto w-full max-w-[271px] lg:mx-0 lg:w-fit lg:max-w-none";

export const ctaVariants: Record<CtaVariant, string> = {
  accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  // The design's second pill (it draws one on the initiative cards): the
  // primary's colours inverted onto the page. Hovers to --canvas rather than
  // --primary-tint because that is the pairing contrast.test.ts asserts.
  outline: "bg-surface text-primary hover:bg-canvas",
};
