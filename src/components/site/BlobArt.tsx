import Image from "next/image";

import { Blob } from "@/components/landing/Blob";
import { cn } from "@/lib/utils";

// A cut-out illustration floating over the cream organic shape — the hero
// figure on «Батькам» and «Волонтерам».
//
// Same composition as the landing's HeroArt, but that one hardcodes its
// picture and its offsets; these two pages place the same pair at two slightly
// different proportions, so the blob's box is a prop.
//
// The blob is given an EXPLICIT width and height, never `inset-x-0`. An <svg>
// is a replaced element and `width: auto` on one of those ignores `right`,
// taking the intrinsic size instead — which is how a blob 865px wide ended up
// inside a 720px wrapper and grew the document sideways (see InitiativeSplit).
export function BlobArt({
  src,
  alt,
  width,
  height,
  blobClassName,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  // Position and size of the cream shape, as percentages of THIS box — so the
  // pair scales as one object at any width.
  blobClassName: string;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate", className)}>
      <Blob className={cn("text-cream absolute -z-10", blobClassName)} />
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="mx-auto h-auto w-full"
      />
    </div>
  );
}
