import { cn } from "@/lib/utils";

// The organic cream shape the design puts behind its illustrations — under the
// hero family, and inside every initiative card.
//
// ONE path, used at both sizes. The design exports it twice, at 328x300 and at
// 742x726, but the two are the same outline to four decimal places: with
// preserveAspectRatio="none" the viewBox is only a coordinate space, so the
// shape stretches to whatever box it is given. The design relies on exactly
// that — the hero's copy is 689x600 and the card's is 742x726, which are
// different proportions, not a scale.
//
// Filled with currentColor so the caller picks the token (`text-cream`).
export function Blob({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 328 300.17"
      preserveAspectRatio="none"
      className={cn("pointer-events-none", className)}
    >
      <path
        fill="currentColor"
        d="M164.948 300.164C191.991 300.416 218.823 291.867 240.472 273.259C252.685 262.762 257.855 249.389 264.54 235.568C275.364 213.193 285.9 190.702 296.144 168.097C305.002 148.548 316.971 129.704 324.08 109.567C340.466 63.1167 303.084 22.6744 256.455 9.73141C162.564 -16.3308 38.5033 8.38726 4.40344 102.931C-7.16801 135.012 5.99539 171.637 21.5869 200.765C38.0835 231.586 63.4742 258.223 93.7807 278.213C115.29 292.401 139.164 299.924 164.948 300.164Z"
      />
    </svg>
  );
}
