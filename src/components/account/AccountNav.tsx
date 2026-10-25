"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { UserIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type CabinetKey = "volunteer" | "parent";

export type Cabinet = {
  key: CabinetKey;
  href: string;
  emoji: string;
  // Whether this cabinet is open to this person. The design greys the one
  // that is not.
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
  // The cabinet's one call to action, shown only while it is current — the
  // parent cabinet's «Подати заявку». Rendered on the SERVER and handed in as
  // nodes, because whether it may show at all is an intake decision this
  // client component has no business making. Two, because the design draws
  // it differently in the sidebar and in the phone menu.
  action?: { sidebar: ReactNode; panel: ReactNode };
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
  placement,
  className,
}: {
  cabinets: readonly Cabinet[];
  // The signed-in person's handle, if Telegram gave us one. Shown under «Мій
  // профіль» in place of the generic «Telegram акаунт».
  identity: string | null;
  // Which drawing of the cabinet's action to use: the desktop sidebar's or
  // the phone menu's.
  placement: "sidebar" | "panel";
  className?: string;
}) {
  const t = useTranslations("account");
  const pathname = usePathname();
  // A cabinet is current when the page sits inside it, so /account/volunteer
  // and /account/volunteer/children both light the same row.
  const isCurrent = (cabinet: Cabinet) =>
    pathname === cabinet.href || pathname.startsWith(`${cabinet.href}/`);
  // «page» belongs to exactly ONE element. Now that the sub-link claims it for
  // the page you are on, the cabinet row above it can only claim to be the
  // SECTION you are in — `location` — unless the cabinet's own front page is
  // where you are. Two elements both announcing "current page" is a defect a
  // sighted reader never sees.
  const currentKind = (cabinet: Cabinet): "page" | "location" | undefined =>
    pathname === cabinet.href
      ? "page"
      : isCurrent(cabinet)
        ? "location"
        : undefined;
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
              currentKind={currentKind(cabinet)}
              label={t(`cabinets.${cabinet.key}`)}
            />
          </li>
        ))}
      </ul>

      {current && current.links.length > 0 ? (
        <>
          <hr className="border-divider my-6" />
          {/* 69px between the two rows in the design, which is the line box
              plus this gap — not the 16 a default list rhythm would give. 60
              in the phone menu, which only ever renders below lg, as the
              sidebar only ever renders from it. */}
          <ul className="flex flex-col gap-9 lg:gap-12">
            {current.links.map((link) => {
              // The page you are ON, not just the cabinet: the design sets this
              // row in the primary blue, and aria-current says the same thing
              // to a screen reader — colour alone would say it to nobody else.
              const here = pathname === link.href;
              return (
                <li key={link.key}>
                  <Link
                    href={link.href}
                    aria-current={here ? "page" : undefined}
                    className={cn(
                      "hover:text-primary focus-visible:outline-ring flex items-center gap-3 rounded px-4 text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                      here && "text-primary font-medium",
                    )}
                  >
                    <span aria-hidden="true">{link.emoji}</span>
                    {t(link.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {/* Pinned to the foot of the VIEWPORT, where the design draws it — not
          to the foot of the page. The sidebar is at least the viewport's
          height, so on a short page `mt-auto` puts it there; on a long one
          the sidebar stretches with the page and `sticky` holds it 100px off
          the bottom of the screen, the same 100 the shell's padding gives. In
          the phone menu it follows the links instead, with the menu's own
          sign-out below it. */}
      {current?.action ? (
        placement === "sidebar" ? (
          <div className="sticky bottom-[100px] mt-auto flex justify-center pt-12">
            {current.action.sidebar}
          </div>
        ) : (
          <div className="mt-14 px-4">{current.action.panel}</div>
        )
      ) : null}
    </nav>
  );
}

function CabinetRow({
  cabinet,
  current,
  currentKind,
  label,
}: {
  cabinet: Cabinet;
  // Drives the tint: the row stays lit for any page inside the cabinet.
  current: boolean;
  // Drives aria-current, which is narrower — see currentKind above.
  currentKind?: "page" | "location";
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
          // Blue marks the cabinet you are IN, not every cabinet you hold —
          // someone with both roles would otherwise see two blue discs and no
          // difference between them. A literal grey rather than a token: it
          // appears exactly here, and the greys we do have are either lighter
          // (--divider) or blue (--primary-soft).
          current ? "bg-primary text-primary-foreground" : "bg-[#dddddd]",
        )}
      >
        {cabinet.emoji}
      </span>
      {/* No ✅. The tinted row says «you are here» and aria-current says it to
          a screen reader; the cabinet you do NOT hold is distinguished by not
          being a link at all, plus its muted label, so nothing
          here rests on colour alone. Dropped on Vital's call, agreed with the
          designers. */}
      <span>{label}</span>
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
      aria-current={currentKind}
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
