import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

// Shared base for the icon set. Icons are decorative by default (aria-hidden);
// when an icon carries meaning, label the parent control instead.
export function IconBase({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}
