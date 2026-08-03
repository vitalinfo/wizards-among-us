"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

import { StarIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = ["tell", "verify", "choose", "done"] as const;
const STATS = [
  { value: "1 240", key: "dreams" },
  { value: "860", key: "wizards" },
  { value: "18", key: "regions" },
] as const;
const REVIEWS = [
  { key: "one", rating: 5 },
  { key: "two", rating: 5 },
  { key: "three", rating: 4 },
] as const;

export function Landing() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <HowItWorks />
      <Stats />
      <Reviews />
    </main>
  );
}

function Hero() {
  const t = useTranslations("landing");

  return (
    <section
      id="about"
      className="bg-surface-muted border-divider scroll-mt-20 border-b"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1fr_440px]">
        <div className="flex flex-col items-start gap-4.5">
          <Badge>{t("campaignBadge")}</Badge>
          <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-[44px] sm:leading-[1.1]">
            {t("hero.title")}
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg leading-relaxed text-pretty">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col gap-3 pt-1.5 sm:flex-row">
            <ButtonLink href="/parent">{t("hero.parentCta")}</ButtonLink>
            <ButtonLink href="/volunteer" variant="outlineStrong">
              {t("hero.volunteerCta")}
            </ButtonLink>
          </div>
          <span className="text-muted-foreground text-[13px]">
            {t("hero.privacyNote")}
          </span>
        </div>

        {/* Brand logo lockup «Чарівники Поруч». */}
        <div className="flex items-center justify-center">
          <Image
            src="/logo.png"
            alt={t("hero.imageAlt")}
            width={440}
            height={440}
            priority
            className="h-44 w-auto lg:h-[340px]"
          />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useTranslations("landing.how");

  return (
    <section
      id="how"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-14 sm:px-8"
    >
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="border-border flex flex-col gap-2.5 rounded-lg border p-5.5"
          >
            <span className="bg-primary-tint text-primary-tint-foreground flex size-8 items-center justify-center rounded-full text-[15px] font-bold">
              {i + 1}
            </span>
            <h3 className="text-[17px] font-semibold">
              {t(`steps.${step}.title`)}
            </h3>
            <p className="text-muted-foreground text-[15px] leading-normal">
              {t(`steps.${step}.body`)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Stats() {
  const t = useTranslations("landing.stats");

  return (
    <section className="bg-surface-muted border-divider border-y">
      <dl className="mx-auto grid w-full max-w-6xl grid-cols-3">
        {STATS.map((stat, i) => (
          <div
            key={stat.key}
            className={cn(
              "flex flex-col gap-1 px-4 py-6 sm:px-8 sm:py-7",
              i > 0 && "border-divider border-l",
            )}
          >
            <dt className="text-primary order-2 text-[13px] sm:text-sm">
              {t(stat.key)}
            </dt>
            <dd className="text-primary order-1 text-2xl font-semibold sm:text-[32px]">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Reviews() {
  const t = useTranslations("landing.reviews");

  return (
    <section
      id="reviews"
      className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-14 sm:px-8"
    >
      <h2 className="text-2xl font-semibold">{t("title")}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {REVIEWS.map((review) => (
          <figure
            key={review.key}
            className="border-border flex flex-col gap-3 rounded-lg border p-5.5"
          >
            <StarRating rating={review.rating} />
            <blockquote className="text-body text-[15px] leading-relaxed">
              {t(`items.${review.key}.body`)}
            </blockquote>
            <figcaption className="text-muted-foreground text-sm">
              {t(`items.${review.key}.author`)}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={cn("size-4", i < rating ? "text-star" : "text-border")}
        />
      ))}
    </div>
  );
}
