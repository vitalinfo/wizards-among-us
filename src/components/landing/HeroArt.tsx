import Image from "next/image";

import { cn } from "@/lib/utils";

import { Blob } from "./Blob";

// The hero illustration and the cream blob behind it.
//
// Every offset below is a PERCENTAGE OF THE PICTURE, so the pair scales as one
// object at any width. The picture is the only element in the flow, so it sets
// the height and the blob's percentages resolve against it:
//
//              desktop (of 689x850)      mobile (of 328x348)
//   picture    98.69% wide, flush left   84.85% wide, 7.58% from the left
//   blob       100% wide, top 8.82%,     100% wide, top 10.06%,
//              70.59% tall               86.24% tall
export function HeroArt({
  alt,
  className,
}: {
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative isolate", className)}>
      <Blob className="text-cream absolute top-[10.06%] left-0 -z-10 h-[86.24%] w-full lg:top-[8.82%] lg:h-[70.59%]" />
      <Image
        src="/hero-family.webp"
        alt={alt}
        width={1360}
        height={1700}
        priority
        className="ml-[7.58%] w-[84.85%] lg:ml-0 lg:w-[98.69%]"
      />
    </div>
  );
}
