import { getFormatter, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { listReviewsForModeration } from "@/features/reviews/queries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { setReviewPublishedAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const [t, format, rows] = await Promise.all([
    getTranslations("admin.reviews"),
    getFormatter(),
    listReviewsForModeration(),
  ]);

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((review) => (
              <li
                key={review.id}
                className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {t("rating", { rating: review.rating })}
                  </span>
                  {/* State by text, not colour alone. */}
                  <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    {review.isPublished ? t("published") : t("hidden")}
                  </span>
                </div>
                {review.body ? (
                  <p className="text-body text-sm whitespace-pre-wrap">
                    {review.body}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">{t("noBody")}</p>
                )}
                <p className="text-muted-foreground text-xs">
                  {/* The full identity is visible HERE, to an admin deciding —
                      only the first name is ever published. */}
                  {t("byline", {
                    author:
                      review.authorFirstName ??
                      (review.authorUsername
                        ? `@${review.authorUsername}`
                        : t("anonymous")),
                    child: review.childName ?? "—",
                    date: format.dateTime(review.createdAt, "short"),
                  })}
                </p>
                <form
                  action={setReviewPublishedAction.bind(
                    null,
                    review.id,
                    !review.isPublished,
                  )}
                  className="mt-1"
                >
                  <button
                    type="submit"
                    className="border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
                  >
                    {review.isPublished ? t("unpublishCta") : t("publishCta")}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
