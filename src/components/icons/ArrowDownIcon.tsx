import { IconBase, type IconProps } from "./IconBase";

// ci:arrow-down-sm, from the design's own export — the arrow on the parent
// cabinet's «Подати заявку» pill.
export function ArrowDownIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 7v10M8 13l4 4 4-4" />
    </IconBase>
  );
}
