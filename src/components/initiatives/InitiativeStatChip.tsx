import { cn } from "@/lib/utils";

// One of the tilted figure cards the school and family heroes put either side
// of the title. A card rather than a line in the stats row because the design
// treats them as marginalia — rotated a few degrees, in two different warm
// tints, flanking the heading rather than sitting under it.
//
// Real text, not an exported image: these are numbers somebody will want to
// correct, and a picture of «305+» is not correctable.
export function InitiativeStatChip({
  value,
  label,
  tone,
  className,
}: {
  value: string;
  label: string;
  // cream-soft on the left, the page's blue canvas on the right — the design
  // alternates them so the pair does not read as one block.
  tone: "cream" | "canvas";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-3xl px-8 py-6 text-center",
        tone === "cream" ? "bg-cream-soft" : "bg-canvas",
        className,
      )}
    >
      <span className="text-muted-foreground text-[56px] leading-none tracking-[-0.03em] lg:text-[min(4.6875vw,90px)]">
        {value}
      </span>
      <span className="text-muted-foreground text-sm leading-5 tracking-[-0.03em] lg:text-base">
        {label}
      </span>
    </div>
  );
}
