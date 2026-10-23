import { type IconProps } from "./IconBase";

// iconoven:baby-heart — the face on a claimed child's avatar (Figma 130:2694),
// transcribed from the design's own export. Stroked, so it takes the colour
// from `currentColor` like the rest of the set.
//
// The viewBox is the icon's own 19×19 rather than the set's 24: the paths come
// straight from the export, and rescaling them by hand is how a stroke width
// stops matching everything around it.
export function ChildIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 19 19"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9.5 18.25A8.75 8.75 0 1 0 9.5.75a8.75 8.75 0 0 0 0 17.5Z" />
      <path d="M9.5.75C8.4.75 7.75 1.5 7.75 2.25c0 .75.6 1.25 1.25 1.25" />
      <path strokeWidth={2} d="M6.5 8.5h.01M12.5 8.5h.01" />
      <path d="M7.25 12.5c1.25 1 3.25 1 4.5 0" />
    </svg>
  );
}
