"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { saveUserRolesAction } from "@/app/admin/users/actions";
import { USER_ROLES, type UserRole } from "@/db/enums";
import { initialUserRolesState } from "@/features/users/roleState";

// The person's roles, set by hand. A role that is in use — `parent` with any
// application, `volunteer` with a claim held — can't be taken away, so its
// checkbox is disabled; the server refuses the same revoke on its own.
//
// The action ends in redirect() on success, so this only renders the FAILURE
// states.
export function UserRolesForm({
  userId,
  roles,
  applicationCount,
  claimCount,
  returnTo,
}: {
  userId: string;
  roles: readonly UserRole[];
  applicationCount: number;
  claimCount: number;
  // Bound here rather than posted in the form, so it cannot be turned into an
  // open redirect.
  returnTo: string;
}) {
  const t = useTranslations("admin.users.roleForm");
  const tRoles = useTranslations("admin.users.roles");
  const action = saveUserRolesAction.bind(null, userId, returnTo);
  const [state, formAction, pending] = useActionState(
    action,
    initialUserRolesState,
  );

  const lockHint: Record<UserRole, string | null> = {
    parent:
      roles.includes("parent") && applicationCount > 0
        ? t("lockedParent")
        : null,
    volunteer:
      roles.includes("volunteer") && claimCount > 0
        ? t("lockedVolunteer")
        : null,
  };

  const messageId = `roles-${userId}-message`;
  const message =
    state.status === "locked"
      ? t("lockedError", { role: tRoles(state.role) })
      : state.status === "not_found"
        ? t("notFound")
        : null;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={message ? messageId : undefined}
      >
        <legend className="mb-1 text-xs font-medium">{t("legend")}</legend>
        {USER_ROLES.map((role) => {
          const id = `role-${userId}-${role}`;
          const hint = lockHint[role];
          const hintId = `${id}-hint`;
          return (
            <div key={role} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="checkbox"
                  name="role"
                  value={role}
                  defaultChecked={roles.includes(role)}
                  disabled={hint !== null}
                  aria-describedby={hint ? hintId : undefined}
                  className="accent-primary size-4"
                />
                <label htmlFor={id} className="text-sm">
                  {tRoles(role)}
                </label>
              </div>
              {hint ? (
                <>
                  {/* A disabled checkbox is not submitted; this keeps the
                      locked role in the form, so its absence is never read as
                      "revoke". */}
                  <input type="hidden" name="role" value={role} />
                  <p id={hintId} className="text-muted-foreground ml-6 text-xs">
                    {hint}
                  </p>
                </>
              ) : null}
            </div>
          );
        })}
      </fieldset>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
        {message ? (
          <p id={messageId} role="alert" className="text-xs text-red-700">
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
