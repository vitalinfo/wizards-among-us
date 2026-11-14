import { useTranslations } from "next-intl";
import Link from "next/link";

// Ban / unban, on the person's own page: whether they are banned, and the
// control that asks to change it.
//
// The control is a LINK to the confirmation, not a form — the page renders the
// prompt (ConfirmModal) from its url and the prompt posts the action. No client
// JavaScript anywhere on the path, so the question cannot be skipped by a
// hydration that did not happen (see ConfirmModal).
//
// Plain, not async, so the page's spec can render it inside the page's tree.
export function UserBanSection({
  bannedSince,
  applicationCount,
  claimCount,
  confirmHref,
}: {
  // Already formatted by the page; null when the person is not banned.
  bannedSince: string | null;
  applicationCount: number;
  claimCount: number;
  confirmHref: string;
}) {
  const t = useTranslations("admin.users.ban");
  const banned = bannedSince !== null;

  return (
    <section
      id="ban"
      aria-labelledby="ban-title"
      className="flex scroll-mt-6 flex-col gap-2"
    >
      <h2 id="ban-title" className="text-xs font-medium">
        {t("title")}
      </h2>
      <p className="text-sm">
        {banned ? t("bannedSince", { date: bannedSince }) : t("notBanned")}
      </p>
      {/* What a ban does NOT do, said where it is done: a banned volunteer's
          child would otherwise wait for a gift nobody is going to buy. */}
      {!banned && (claimCount > 0 || applicationCount > 0) ? (
        <p className="text-muted-foreground text-xs">
          {t("inUse", { claims: claimCount, applications: applicationCount })}
        </p>
      ) : null}
      <div>
        <Link
          href={confirmHref}
          className="border-border hover:bg-surface-muted focus-visible:outline-ring inline-block rounded-md border px-3 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {banned ? t("unban") : t("ban")}
        </Link>
      </div>
    </section>
  );
}
