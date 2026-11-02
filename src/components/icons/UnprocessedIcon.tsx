import { IconBase, type IconProps } from "./IconBase";

// A half-filled circle — a claimed application not yet marked «Опрацьовано».
export function UnprocessedIcon(props: IconProps) {
  return (
    <IconBase fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19ZM12 4.25a7.75 7.75 0 1 0 0 15.5a7.75 7.75 0 1 0 0-15.5ZM12 6a6 6 0 0 1 0 12Z"
      />
    </IconBase>
  );
}
