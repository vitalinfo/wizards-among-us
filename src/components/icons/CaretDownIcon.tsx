import { IconBase, type IconProps } from "./IconBase";

// ic:round-arrow-left from the design's own export (Figma 147:7166), turned to
// point down as the design turns it — the caret on the form's selects.
export function CaretDownIcon(props: IconProps) {
  return (
    <IconBase fill="currentColor" {...props}>
      <path
        transform="rotate(-90 12 12)"
        d="M12.29 8.71L9.7 11.3C9.6073 11.3925 9.53375 11.5024 9.48357 11.6234C9.43339 11.7443 9.40756 11.874 9.40756 12.005C9.40756 12.136 9.43339 12.2657 9.48357 12.3866C9.53375 12.5076 9.6073 12.6175 9.7 12.71L12.29 15.3C12.92 15.93 14 15.48 14 14.59V9.41C14 8.52 12.92 8.08 12.29 8.71Z"
      />
    </IconBase>
  );
}
