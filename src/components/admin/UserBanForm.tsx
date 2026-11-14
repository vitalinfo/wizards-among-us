"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { setUserBanAction } from "@/app/admin/users/actions";
import { initialUserBanState } from "@/features/users/banState";

// Ban / unban, on the person's own page. One button whose meaning is bound
// from what the page showed — never a value the form posts.
//
// The action revalidates rather than redirects, so the page re-renders in
// place with the new state; this only ever renders the one failure it can
// return — a person deleted between loading the page and pressing the button.
export function UserBanForm({
  userId,
  bannedSince,
  applicationCount,
  claimCount,
}: {
  userId: string;
  // Already formatted by the page; null when the person is not banned.
  bannedSince: string | null;
  applicationCount: number;
  claimCount: number;
}) {
  const t = useTranslations("admin.users.ban");
  const banned = bannedSince !== null;
  const action = setUserBanAction.bind(null, userId, !banned);
  const [state, formAction, pending] = useActionState(
    action,
    initialUserBanState,
  );

  const headingId = `ban-${userId}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-xs font-medium">
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
      <form action={formAction} className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {pending ? t("saving") : banned ? t("unban") : t("ban")}
        </button>
        {state.status === "not_found" ? (
          <p role="alert" className="text-xs text-red-700">
            {t("notFound")}
          </p>
        ) : null}
      </form>
    </section>
  );
}
