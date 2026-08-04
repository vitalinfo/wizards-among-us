"use client";

import { StarIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={cn("size-4", i < rating ? "text-star" : "text-border")}
        />
      ))}
    </div>
  );
}
