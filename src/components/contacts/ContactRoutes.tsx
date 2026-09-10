import Link from "next/link";
import { useTranslations } from "next-intl";

import { ArrowRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

// The three ways in. None of them is email: the app has a working volunteer
// sign-up, a working parent flow, and — soon — a partners page, and dropping
// someone who wants to help into an inbox instead of the form that signs them
// up would be a worse product than the one we have.
//
// /partners does not exist yet (Vital, this change). Until it does the third
// card lands on our own 404, which is a designed page in Ukrainian rather than
// a dead end — the same bet SITE_NAV already makes for the landing anchors.
const ROUTES = [
  { key: "volunteer", href: "/volunteer" },
  { key: "parent", href: "/parent" },
  { key: "company", href: "/partners" },
] as const;

// All three rest white. The blue fill on the middle card in the design is the
// HOVER state, drawn on one card so the file shows both — not a card that is
// permanently different from its neighbours.
const CARD =
  "group bg-surface border-divider hover:bg-primary focus-visible:outline-ring flex items-center justify-between gap-4 rounded-[20px] border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:rounded-3xl lg:p-6";

export function ContactRoutes({ className }: { className?: string }) {
  const t = useTranslations("contacts.routes");

  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {ROUTES.map(({ key, href }) => (
        <li key={key}>
          <Link href={href} className={CARD}>
            <span className="text-foreground group-hover:text-primary-foreground text-base leading-5 font-semibold tracking-[-0.03em] transition-colors lg:text-2xl lg:leading-[30px]">
              {t(key)}
            </span>
            {/* Decorative: the label beside it already names where this goes.
                Inverts with the card, so the arrow stays legible against
                whichever fill is underneath it. */}
            <span className="bg-primary text-primary-foreground group-hover:bg-surface group-hover:text-primary inline-flex size-14 shrink-0 items-center justify-center rounded-full transition-colors lg:size-[73px]">
              <ArrowRightIcon className="size-6" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
