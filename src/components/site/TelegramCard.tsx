import { TelegramIcon } from "@/components/icons";

// One of the login screen's floating Telegram cards: a tilted rounded square
// with the plane glyph and a soft shadow. Pure decoration — hidden from
// assistive tech, and it must never sit over anything clickable.
export function TelegramCard({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      // No display utility here on purpose: `grid` in the base and `hidden`
      // from the caller are the same Tailwind layer, so which one wins is
      // decided by stylesheet order, not by the class list — the card stayed
      // visible on mobile. The caller owns display (`hidden lg:grid`).
      className={`pointer-events-none absolute -z-10 place-items-center rounded-[22%] shadow-[0_18px_40px_-12px_rgba(30,82,153,0.35)] ${className}`}
    >
      <TelegramIcon className="size-[42%]" />
    </div>
  );
}
