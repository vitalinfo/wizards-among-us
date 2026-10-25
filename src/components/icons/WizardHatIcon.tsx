import { IconBase, type IconProps } from "./IconBase";

// selfhst:file-wizard, from the design's own export (Figma 142:6503) — the hat
// in the disc beside each volunteer on «Мої Чарівники». The export draws it at
// (12, 12) inside its 48px disc, so the viewBox crops to that square.
export function WizardHatIcon(props: IconProps) {
  return (
    <IconBase viewBox="12 12 24 24" fill="currentColor" {...props}>
      <path d="M20.6344 28.5188L17.9297 28.3969L20.6672 20.9016L25.9594 16.6922L28.3828 17.2031L32.2734 20.775L27.4922 20.1375L26.7891 21.4125L28.7297 27.2578L20.6344 28.5188ZM35.0578 29.4L30.1406 27.9844L20.3859 29.4094L13.1484 29.0766L12 30.7219L20.3438 31.2703L30.7969 29.7563L36.0047 31.3031L35.0578 29.4Z" />
    </IconBase>
  );
}
