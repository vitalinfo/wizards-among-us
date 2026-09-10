import { InstagramIcon, TelegramIcon } from "@/components/icons";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

// Instagram + Telegram as a pair of filled discs. Extracted because the design
// draws the same pair in four places — the footer, the mobile menu, and twice
// on the contacts page — differing only in disc size, and the three that
// already existed had started to drift (one had a border and a hover, one had
// neither).
//
// Each link is named by the NETWORK, not by the icon: «Instagram» is what a
// screen-reader user needs to hear, and the glyph carries no accessible name.
// The labels are passed in rather than read here so this stays usable from
// both a server tree and a client one without pulling a provider into either.
export function SocialLinks({
  instagramLabel,
  telegramLabel,
  size = 48,
  className,
}: {
  instagramLabel: string;
  telegramLabel: string;
  // The disc diameter in px — 44 in the mobile menu, 48 in the footer, 56 on
  // the contacts page. An arbitrary value rather than a `size-N` utility so a
  // caller can ask for the design's number without a lookup table here.
  size?: number;
  className?: string;
}) {
  const disc =
    "bg-primary text-primary-foreground border-primary hover:bg-surface hover:text-primary focus-visible:outline-ring inline-flex items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
  const style = { width: size, height: size };
  const glyph = size >= 56 ? "size-6" : "size-5";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <a
        href={SITE.instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={instagramLabel}
        className={disc}
        style={style}
      >
        <InstagramIcon className={glyph} />
      </a>
      <a
        href={SITE.telegramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={telegramLabel}
        className={disc}
        style={style}
      >
        <TelegramIcon className={glyph} />
      </a>
    </div>
  );
}
