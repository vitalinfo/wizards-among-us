import { IconBase, type IconProps } from "./IconBase";

export function StarIcon(props: IconProps) {
  return (
    <IconBase fill="currentColor" {...props}>
      <path d="m12 2 3 6.5 7 .9-5 4.8 1.2 7L12 17.8 5.8 21.2 7 14.2 2 9.4l7-.9L12 2Z" />
    </IconBase>
  );
}
