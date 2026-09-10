import { IconBase, type IconProps } from "./IconBase";

// weui:arrow-outlined in the design — the bare chevron that separates
// breadcrumb steps. Distinct from ArrowRightIcon, which has a shaft and
// carries an action; this one is punctuation.
export function ChevronRightIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 5l7 7-7 7" />
    </IconBase>
  );
}
