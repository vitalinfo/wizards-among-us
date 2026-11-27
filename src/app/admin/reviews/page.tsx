import { getFormatter, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { ReviewConfirmationPhoto } from "@/components/admin/ReviewConfirmationPhoto";
import { ReviewFilterForm } from "@/components/admin/ReviewFilterForm";
import { Pager } from "@/components/ui/Pager";
import {
  parseReviewsPage,
  parseReviewStatusFilter,
  REVIEWS_PAGE_SIZE,
  reviewsHref,
  reviewsPageCount,
} from "@/features/reviews/listFilter";
import {
  countReviewsForModeration,
  listReviewsForModeration,
} from "@/features/reviews/queries";
import { getSessionActor } from "@/lib/auth/session";
import { isAdmin } from "@/lib/authz";

import { setReviewPublishedAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const actor = await getSessionActor();
  if (!isAdmin(actor)) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const status = parseReviewStatusFilter(params.status);

  // Count before fetching: a stale ?page= (or publishing the last review on a
  // filtered page) would otherwise render an empty list that reads as "there
  // are no reviews".
  const total = await countReviewsForModeration(status);
  const pageCount = reviewsPageCount(total);
  const page = Math.min(parseReviewsPage(params.page), pageCount);
  const offset = (page - 1) * REVIEWS_PAGE_SIZE;

  const [t, format, rows] = await Promise.all([
    getTranslations("admin.reviews"),
    getFormatter(),
    listReviewsForModeration(status, { limit: REVIEWS_PAGE_SIZE, offset }),
  ]);

  return (
    <>
      <AdminNav />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("intro")}</p>
        </div>

        <ReviewFilterForm status={status} />

        {rows.length === 0 ? (
          <p className="text-muted-foreground">
            {status === "all" ? t("empty") : t("emptyFiltered")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((review) => (
              <li
                key={review.id}
                className="border-border bg-surface flex gap-4 rounded-lg border p-4"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
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
                    <p className="text-muted-foreground text-sm">
                      {t("noBody")}
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    {/* The full identity is visible HERE, to an admin deciding —
                        only the first name is ever published. */}
                    {t.rich("byline", {
                      author:
                        review.authorFirstName ??
                        (review.authorUsername
                          ? `@${review.authorUsername}`
                          : t("anonymous")),
                      child: review.childName ?? "—",
                      date: format.dateTime(review.createdAt, "short"),
                      authorLink: (chunks) => (
                        <Link
                          href={`/admin/users/${review.authorId}`}
                          className="text-primary font-semibold underline underline-offset-4"
                        >
                          {chunks}
                        </Link>
                      ),
                      childLink: (chunks) =>
                        review.applicationId ? (
                          <Link
                            href={`/admin/applications/${review.applicationId}`}
                            className="text-primary font-semibold underline underline-offset-4"
                          >
                            {chunks}
                          </Link>
                        ) : (
                          chunks
                        ),
                    })}
                  </p>
                  <form
                    action={setReviewPublishedAction.bind(
                      null,
                      review.id,
                      !review.isPublished,
                      status,
                      page,
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
                </div>
                {review.confirmationPhoto && review.applicationId ? (
                  <ReviewConfirmationPhoto
                    applicationId={review.applicationId}
                    photo={review.confirmationPhoto}
                    title={t("photoTitle", { child: review.childName ?? "—" })}
                    alt={t("photoAlt")}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <Pager
          label={t("pager.label")}
          page={page}
          pageCount={pageCount}
          total={total}
          from={offset + 1}
          to={offset + rows.length}
          hrefFor={(target) => reviewsHref(status, target)}
        />
      </main>
    </>
  );
}
