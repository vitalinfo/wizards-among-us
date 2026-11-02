import { IconBase, type IconProps } from "./IconBase";

// A clockwise turn. Mirror it (`-scale-x-100`) for the counter-clockwise one.
export function RotateIcon(props: IconProps) {
  return (
    <IconBase
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 4v4h-4" />
    </IconBase>
  );
}
