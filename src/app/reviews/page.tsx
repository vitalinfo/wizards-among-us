import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ReviewList, ReviewsClosing, ReviewsHero } from "@/components/reviews";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ListPager } from "@/components/ui/ListPager";
import {
  countPublishedReviews,
  listPublishedReviews,
} from "@/features/reviews/queries";
import {
  parsePublicReviewsQuery,
  publicReviewsHref,
} from "@/features/reviews/publicQuery";
import { pageCount as countPages } from "@/lib/pageSize";
import { cn } from "@/lib/utils";

// Reads the database on every request: a review an admin publishes appears on
// the next load, and one they take down disappears.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reviews.meta");
  return { title: t("title"), description: t("description") };
}

// «Відгуки» (Figma 186:2) — the reviews an admin has published, newest first.
//
// Public, and noindex like every page but «/» (§10). What a review shows is
// decided in toPublicReview: the parent's first name, never the child's; the
// family's photo with the gift only with `social_media_consent`.
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; per?: string }>;
}) {
  const t = await getTranslations("reviews");
  const tNav = await getTranslations("common.nav");
  const query = parsePublicReviewsQuery(await searchParams);
  const { per } = query;

  const total = await countPublishedReviews();
  const pageCount = countPages(total, per);
  // A stale ?page= past the end lands on the last page, not on an empty one.
  const page = Math.min(query.page, pageCount);
  const reviews =
    total > 0
      ? await listPublishedReviews({ limit: per, offset: (page - 1) * per })
      : [];
  const from = total === 0 ? 0 : (page - 1) * per + 1;

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb
          label={tNav("breadcrumb")}
          items={[
            { label: t("breadcrumbHome"), href: "/" },
            { label: tNav("reviews") },
          ]}
          className={cn(SITE_CONTAINER, "pt-3.5 lg:pt-6")}
        />

        <ReviewsHero />

        {/* 1472 of the design's 1920: the list is narrower than the page
            gutter, centred. */}
        <section className={SITE_CONTAINER}>
          <div className="mx-auto lg:max-w-[min(76.67vw,1472px)]">
            <ReviewList reviews={reviews} />
            <ListPager
              label={t("list.pager")}
              page={page}
              pageCount={pageCount}
              total={total}
              from={from}
              to={from + reviews.length - 1}
              per={per}
              hrefFor={(target) => publicReviewsHref({ page: target, per })}
              sizeHref={(size) => publicReviewsHref({ per: size })}
            />
          </div>
        </section>

        <ReviewsClosing />
      </main>

      <SiteFooter />
    </>
  );
}
