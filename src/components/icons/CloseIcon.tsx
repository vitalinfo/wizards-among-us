import { IconBase, type IconProps } from "./IconBase";

// Closes the mobile menu (lets-icons:close-round in the design).
export function CloseIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      {...props}
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </IconBase>
  );
}
