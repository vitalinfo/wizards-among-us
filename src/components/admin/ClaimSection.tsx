import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";

import { getClaimHolder, searchVolunteers } from "@/features/claims/queries";
import { resolveUserContact } from "@/features/users/contact";

// Who holds this child, and the controls to change that.
//
// Everything here is links and forms — the search is a GET form, assignment and
// release confirm through the same page-state modal as the rest of the admin
// surface — so none of it depends on client JavaScript.
export async function ClaimSection({
  applicationId,
  status,
  search,
  assignError,
}: {
  applicationId: string;
  status: string;
  // The volunteer search term from the query string, if any.
  search: string | null;
  assignError: string | null;
}) {
  const t = await getTranslations("admin.applications.claim");
  const format = await getFormatter();

  const holder = await getClaimHolder(applicationId);
  const results = search ? await searchVolunteers(search) : [];

  // Only an approved or already-claimed application can be assigned — the same
  // states the write path accepts.
  const assignable = status === "approved" || status === "claimed";

  const base = `/admin/applications/${applicationId}`;
  // Every control here returns to THIS section rather than the top of a long
  // page. A GET form keeps the fragment from its action (verified in a
  // browser), so searching lands back on the results instead of scrolling away
  // from them — and the same anchor is appended to the assign/release links so
  // cancelling a confirmation returns here too.
  const anchor = "claim";
  const withSearch = (extra: string) =>
    `${base}?${search ? `volunteer=${encodeURIComponent(search)}&` : ""}${extra}#${anchor}`;

  return (
    <section
      id={anchor}
      className="border-border bg-surface scroll-mt-4 rounded-lg border p-4"
    >
      <h2 className="font-semibold">{t("title")}</h2>

      {holder ? (
        <div className="mt-3">
          <p className="text-sm">
            {t("heldBy", {
              who: holder.username
                ? `@${holder.username}`
                : (holder.firstName ?? t("unnamed")),
            })}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("heldSince", {
              date: format.dateTime(holder.claimedAt, "short"),
            })}
            {resolveUserContact(holder) === null ? ` · ${t("noContact")}` : ""}
          </p>
          <Link
            href={withSearch("release=1")}
            className="border-border hover:bg-surface-muted focus-visible:outline-ring mt-3 inline-block rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("releaseCta")}
          </Link>
        </div>
      ) : (
        <p className="text-muted-foreground mt-2 text-sm">{t("unclaimed")}</p>
      )}

      {!assignable ? (
        <p className="text-muted-foreground mt-3 text-sm">
          {t("notAssignable")}
        </p>
      ) : (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">
            {holder ? t("reassignTitle") : t("assignTitle")}
          </h3>
          <p className="text-muted-foreground mt-1 text-xs">
            {t("assignHint")}
          </p>

          {assignError === "no_contact" ? (
            <p role="alert" className="mt-2 text-sm font-medium text-red-700">
              {t("errors.no_contact")}
            </p>
          ) : null}

          {/* The fragment survives a GET submit (verified in a browser), so
              searching lands back on these results instead of the page top. */}
          <form
            method="get"
            action={`${base}#${anchor}`}
            className="mt-3 flex flex-wrap gap-2"
          >
            <label htmlFor="volunteer" className="sr-only">
              {t("searchLabel")}
            </label>
            <input
              id="volunteer"
              name="volunteer"
              defaultValue={search ?? ""}
              placeholder={t("searchPlaceholder")}
              className="border-border bg-surface focus-visible:outline-ring rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            />
            <button
              type="submit"
              className="border-border hover:bg-surface-muted rounded-md border px-3 py-2 text-sm font-medium"
            >
              {t("searchCta")}
            </button>
          </form>

          {search ? (
            results.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                {t("noResults")}
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {results.map((volunteer) => {
                  const contact = resolveUserContact(volunteer);
                  const name = [volunteer.firstName, volunteer.lastName]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li
                      key={volunteer.id}
                      className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        {volunteer.username
                          ? `@${volunteer.username}`
                          : name || t("unnamed")}
                        {volunteer.username && name ? ` · ${name}` : ""}
                        {/* An unreachable volunteer is shown but cannot be
                            assigned — saying why beats a button that fails. */}
                        {contact === null ? (
                          <span className="text-muted-foreground">
                            {" · "}
                            {t("noContact")}
                          </span>
                        ) : null}
                      </span>
                      {contact === null ? null : (
                        <Link
                          href={withSearch(`assign=${volunteer.id}`)}
                          className="border-border hover:bg-surface-muted rounded-md border px-3 py-1 font-medium"
                        >
                          {t("assignCta")}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          ) : null}
        </div>
      )}
    </section>
  );
}
