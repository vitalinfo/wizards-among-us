import { IconBase, type IconProps } from "./IconBase";

// Three sliders — the filter control on the browse list (mage:filter in the
// design). Decorative: the control beside it is labelled in words.
export function FiltersIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      {...props}
    >
      <path d="M3 7h5M13 7h8M3 17h8M16 17h5" />
      <circle cx="10.5" cy="7" r="2.5" />
      <circle cx="13.5" cy="17" r="2.5" />
    </IconBase>
  );
}
