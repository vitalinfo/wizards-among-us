import { IconBase, type IconProps } from "./IconBase";

// A filled circle with a check — an application marked «Опрацьовано».
export function ProcessedIcon(props: IconProps) {
  return (
    <IconBase fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19ZM9.03 11.97L11 13.94L14.94 9.5A.75.75 0 0 1 16.06 10.5L11 16.06L7.97 13.03A.75.75 0 0 1 9.03 11.97Z"
      />
    </IconBase>
  );
}
