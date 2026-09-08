import { IconBase, type IconProps } from "./IconBase";

// bitcoin-icons:arrow-left-filled in the design, turned around. Used by the
// FAQ disclosures and by the gallery's paging controls (mirrored with a
// rotation for "previous").
export function ArrowRightIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 12h13M12.5 5.5L19 12l-6.5 6.5" />
    </IconBase>
  );
}
