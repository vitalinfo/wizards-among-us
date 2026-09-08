import Image from "next/image";

// The «Чарівники поруч» logotype.
//
// A single SVG in /public rather than inline JSX: it is a traced script
// wordmark, ~42KB of path data, which belongs in a cacheable file and not in
// every page's HTML.
//
// `unoptimized` because the file IS the optimised form — routing an SVG through
// the image optimizer either rasterises it or (for SVG, off by default) fails.
//
// Decorative by default: the header wraps it in a link that carries the
// accessible name, and repeating «Чарівники поруч» there would have a screen
// reader read the brand twice. Pass a label where it stands alone.
export function SiteLogo({
  width,
  height,
  label,
  className,
  priority = false,
}: {
  width: number;
  height: number;
  // Only when the logo is not already inside something that names it.
  label?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.svg"
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={width}
      height={height}
      unoptimized
      priority={priority}
      className={className}
    />
  );
}
