import { IconBase, type IconProps } from "./IconBase";

// «Переглянути» on a row of the claims table (basil:eye-solid in the design).
// Decorative: the link around it carries the name.
export function EyeIcon(props: IconProps) {
  return (
    <IconBase fill="currentColor" {...props}>
      <path d="M12 5c-4.5 0-8.1 2.8-9.8 6.4a1.4 1.4 0 0 0 0 1.2C3.9 16.2 7.5 19 12 19s8.1-2.8 9.8-6.4a1.4 1.4 0 0 0 0-1.2C20.1 7.8 16.5 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z" />
      <circle cx="12" cy="12" r="2" fill="var(--surface)" />
    </IconBase>
  );
}
