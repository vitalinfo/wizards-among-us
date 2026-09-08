import { IconBase, type IconProps } from "./IconBase";

// The mobile menu toggle (gg:menu in the design).
export function MenuIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      {...props}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </IconBase>
  );
}
