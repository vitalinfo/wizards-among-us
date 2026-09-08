import Image from "next/image";

// The heart mark — the logotype's symbol on its own, used above a page's
// heading where the full wordmark would be a second brand statement under the
// one already in the header.
//
// Decorative by default, for that reason: the header names the brand, and a
// screen reader should not hear it twice on one screen.
export function BrandMark({
  width = 64,
  height = 70,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) {
  return (
    <Image
      src="/heart.svg"
      alt=""
      aria-hidden
      width={width}
      height={height}
      unoptimized
      className={className}
    />
  );
}
