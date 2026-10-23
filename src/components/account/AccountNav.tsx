"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { UserIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type CabinetKey = "volunteer" | "parent";

export type Cabinet = {
  key: CabinetKey;
  href: string;
  emoji: string;
  // Whether this person holds the role. The design greys the cabinet they do
  // not have and marks the one they do with a ✅, so this drives both.
  available: boolean;
  // The cabinet's own sub-navigation, shown under the divider. Only the
  // CURRENT cabinet's links appear; the design lists «Знайти історію» and
  // «Мої підопічні» under the selected «Кабінет Чарівника».
  // `labelKey` is a path under the `account` namespace, translated in here —
  // the server hands over keys, not copy, so a label and its page cannot drift
  // apart in two files.
  links: readonly {
    key: string;
    href: string;
    labelKey: string;
    emoji: string;
  }[];
};

// The account sidebar: who you are, which cabinets you hold, and what you can
// do inside the one you are in.
//
// A <nav> with one list, because that is what it is — and the two cabinets are
// in the same list as the actions under them, separated by a rule, so a screen
// reader gets the grouping the divider draws.
//
// A cabinet you do NOT hold is not a link. The design greys it out, and a
// greyed link that still navigates is worse than no link: it would take a
// volunteer to a parent cabinet they have no application in.
//
// The ONE client component in the account chrome, and only because of
// `usePathname`: a server layout cannot know which page is under it, and which
// cabinet is current decides both the tinted row and which sub-navigation
// shows. Everything else here — the roles, the shell, sign-out — stays on the
// server.
export function AccountNav({
  cabinets,
  identity,
  className,
}: {
  cabinets: readonly Cabinet[];
  // The signed-in person's handle, if Telegram gave us one. Shown under «Мій
  // профіль» in place of the generic «Telegram акаунт».
  identity: string | null;
  className?: string;
}) {
  const t = useTranslations("account");
  const pathname = usePathname();
  // A cabinet is current when the page sits inside it, so /account/volunteer
  // and /account/volunteer/children both light the same row.
  const isCurrent = (cabinet: Cabinet) =>
    pathname === cabinet.href || pathname.startsWith(`${cabinet.href}/`);
  const current = cabinets.find(isCurrent);

  return (
    <nav aria-label={t("nav.label")} className={cn("flex flex-col", className)}>
      {/* Not a link: there is no profile page to go to yet, and a row that
          looks clickable and is not is worse than a row that does not. It is
          here because the design uses it to say «you are signed in, through
          Telegram» — so it states that and nothing more. */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* White on the accent yellow is 1.54:1 — which globals.css rejects
            for a LABEL, and rightly. It stands here because this is a stroked
            decorative glyph, hidden from assistive tech and saying nothing the
            two lines beside it do not, and because it is what the design
            draws. Nothing is lost if a reader cannot make it out. */}
        <span
          aria-hidden="true"
          className="bg-accent flex size-11 shrink-0 items-center justify-center rounded-full text-white"
        >
          <UserIcon className="size-6" />
        </span>
        <span className="flex flex-col">
          <span className="text-base font-semibold">
            {t("nav.profile.title")}
          </span>
          <span className="text-muted-foreground text-base">
            {identity ?? t("nav.profile.subtitle")}
          </span>
        </span>
      </div>

      <ul className="mt-2 flex flex-col gap-1">
        {cabinets.map((cabinet) => (
          <li key={cabinet.key}>
            <CabinetRow
              cabinet={cabinet}
              current={isCurrent(cabinet)}
              label={t(`cabinets.${cabinet.key}`)}
            />
          </li>
        ))}
      </ul>

      {current && current.links.length > 0 ? (
        <>
          <hr className="border-divider my-6" />
          {/* 69px between the two rows in the design, which is the line box
              plus this gap — not the 16 a default list rhythm would give. */}
          <ul className="flex flex-col gap-12">
            {current.links.map((link) => (
              <li key={link.key}>
                <Link
                  href={link.href}
                  className="hover:text-primary focus-visible:outline-ring flex items-center gap-3 rounded px-4 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span aria-hidden="true">{link.emoji}</span>
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </nav>
  );
}

function CabinetRow({
  cabinet,
  current,
  label,
}: {
  cabinet: Cabinet;
  current: boolean;
  label: string;
}) {
  const t = useTranslations("account");

  const row =
    "flex items-center gap-4 rounded-2xl px-4 py-3 text-base transition-colors";
  const disc =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-lg";

  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          disc,
          cabinet.available
            ? "bg-primary text-primary-foreground"
            : // The design's grey for a cabinet you do not hold. A literal
              // rather than a token: it appears exactly here, and the greys we
              // do have are either lighter (--divider) or blue (--primary-soft).
              "bg-[#dddddd]",
        )}
      >
        {cabinet.emoji}
      </span>
      <span className="flex items-center gap-2">
        {label}
        {/* The ✅ says «this cabinet is yours», not «you are here» —
            aria-current says where you are. Read out, because it is the only
            thing distinguishing the two rows for someone who cannot see that
            the other one is grey. */}
        {cabinet.available ? (
          <span role="img" aria-label={t("nav.available")}>
            ✅
          </span>
        ) : null}
      </span>
    </>
  );

  if (!cabinet.available) {
    return (
      <span
        className={cn(row, "text-muted-faint")}
        title={t("nav.unavailable")}
      >
        {body}
      </span>
    );
  }

  return (
    <Link
      href={cabinet.href}
      aria-current={current ? "page" : undefined}
      className={cn(
        row,
        "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
        current ? "bg-canvas" : "hover:bg-canvas/60",
      )}
    >
      {body}
    </Link>
  );
}
