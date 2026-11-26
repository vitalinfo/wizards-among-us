import { StarIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const MAX_RATING = 5;

// Five stars, `rating` of them filled. One image to assistive tech — «Оцінка:
// 4 з 5» — rather than five unlabelled shapes.
export function ReviewStars({
  rating,
  label,
}: {
  rating: number;
  label: string;
}) {
  return (
    <span role="img" aria-label={label} className="flex gap-2 lg:gap-[13px]">
      {Array.from({ length: MAX_RATING }, (_, i) => (
        <StarIcon
          key={i}
          className={cn(
            "size-[18px] lg:size-6",
            i < rating ? "text-accent" : "text-surface-idle",
          )}
        />
      ))}
    </span>
  );
}
