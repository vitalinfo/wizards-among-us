import { IconBase, type IconProps } from "./IconBase";

// akar-icons:plus, from the design's own export. Drawn on a 20 grid there;
// rescaled to the set's 24 so it takes the same `size-*` as every other icon.
export function PlusIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      {...props}
    >
      <path d="M12 20V4M4 12h16" />
    </IconBase>
  );
}
