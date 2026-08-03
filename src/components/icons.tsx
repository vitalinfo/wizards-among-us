import type { SVGProps } from "react";

// Icon set used across the public site (paths from the design). Decorative by
// default (aria-hidden); when an icon carries meaning, label the parent control.
type IconProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function TelegramIcon(props: IconProps) {
  return (
    <Svg fill="currentColor" {...props}>
      <path d="M21.9 4.3 18.7 20c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.3-.1-.5-.6-.2L6.3 13.1 1.5 11.6c-1-.3-1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5Z" />
    </Svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Svg fill="currentColor" {...props}>
      <path d="m12 2 3 6.5 7 .9-5 4.8 1.2 7L12 17.8 5.8 21.2 7 14.2 2 9.4l7-.9L12 2Z" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Svg
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}
