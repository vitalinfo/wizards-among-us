import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  InitiativeQuote,
  InitiativeSplit,
  InitiativeSteps,
  type Step,
} from "@/components/initiatives";
import { Gallery } from "@/components/landing/Gallery";
import { Initiatives } from "@/components/landing/Initiatives";
import { BlobArt } from "@/components/site/BlobArt";
import { Breadcrumb } from "@/components/site/Breadcrumb";
import { SITE_CONTAINER } from "@/components/site/layout";
import { PageHero } from "@/components/site/PageHero";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CtaLink } from "@/components/ui/CtaLink";
import { ctaShell } from "@/components/ui/ctaStyles";
import { getCampaignStates } from "@/features/campaigns/queries";
import { getResolvedSettings } from "@/features/settings/queries";
import { isUser } from "@/lib/actor";
import { loginPathFor } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("parent.info.meta");
  return { title: t("title"), description: t("description") };
}

// The initiative cards read the live campaign state, and the action reads the
// session.
export const dynamic = "force-dynamic";

// Where every action on this page goes once the visitor is a signed-in parent.
const APPLY = "/parent/applications";

const STEPS = [
  { key: "story", emoji: "✍️" },
  { key: "review", emoji: "📄" },
  { key: "match", emoji: "🪄", accent: true },
  { key: "support", emoji: "🎁" },
  { key: "personal", emoji: "❤️" },
] as const;

// «Батькам», from Figma 66:953 — the public explainer a family lands on before
// applying. Public but noindex, like every page except «/» (§10).
//
// Every action goes to /parent/applications rather than straight at the form:
// a parent who has already applied sees their anketas there instead of being
// pushed into a second one.
//
// For a visitor who is NOT a signed-in parent the href is resolved here, so
// the button points at the sign-in page itself instead of relying on the
// destination to bounce them. The status bar and open-in-new-tab then tell the
// truth, and there is one less round trip on the click. «Волонтерам» has
// always worked this way — it has to, because its middle state is a form and
// not a link at all — and the two reading differently was the inconsistency.
//
// loginPathFor, NOT the signedOutRedirect that /parent/applications guards
// itself with. The two answer different questions. The guard asks "you cannot
// be here, where do you belong?" and sends an admin to /admin — right for a
// page an admin has no business on. This is a call to action on a public page,
// and teleporting someone to the admin panel from a button reading «Отримати
// допомогу» explains nothing. /login does explain it: it carries a notice
// telling an admin that signing in here through Telegram would end their admin
// session, and offers the panel as a link. It no longer bounces them back, so
// there is no loop to re-create.
//
// ⚠️ /parent/my-volunteer is now linked from NOWHERE. This page was its only
// entry point; Vital is placing it elsewhere, and until he does, a parent can
// only reach «Мій чарівник» by typing the URL.
export default async function ParentPage() {
  const [campaigns, settings, actor] = await Promise.all([
    getCampaignStates(),
    getResolvedSettings(),
    getSessionActor(),
  ]);
  const applyHref = isUser(actor) ? APPLY : loginPathFor(APPLY);

  const t = await getTranslations("parent.info");
  const tParent = await getTranslations("parent");
  const tInit = await getTranslations("initiatives");
  const tNav = await getTranslations("common.nav");

  const steps: Step[] = STEPS.map((s) => ({
    key: s.key,
    emoji: s.emoji,
    ...("accent" in s ? { accent: true as const } : {}),
    title: t(`steps.items.${s.key}.title`),
    body: t(`steps.items.${s.key}.body`),
  }));

  const applyCta = (
    <CtaLink
      href={applyHref}
      variant="accent"
      className="w-full whitespace-nowrap"
    >
      {t("applyCta")}
    </CtaLink>
  );

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        <Breadcrumb
          label={tNav("breadcrumb")}
          items={[
            { label: tInit("breadcrumbHome"), href: "/" },
            { label: t("breadcrumb") },
          ]}
          className={cn(SITE_CONTAINER, "pt-3.5 lg:pt-6")}
        />

        <PageHero
          title={t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
          titleClassName="lg:max-w-[min(26.5vw,508px)]"
          lead={t("lead")}
          cta={
            <div className={ctaShell}>
              <CtaLink
                href={applyHref}
                variant="accent"
                className="w-full whitespace-nowrap"
              >
                {t("heroCta")}
              </CtaLink>
            </div>
          }
          below={
            <div className="bg-cream-soft w-full rounded-3xl px-5 py-6 text-left lg:max-w-[483px] lg:px-[29px]">
              <p className="text-muted-foreground text-sm leading-5 font-bold tracking-[-0.03em] lg:text-base">
                {t("note.title")}
              </p>
              <p className="text-muted-foreground mt-3 text-sm leading-5 tracking-[-0.03em] lg:text-base">
                {t("note.body")}
              </p>
              <p className="text-muted-foreground text-sm leading-5 tracking-[-0.03em] lg:text-base">
                {t("note.extra")}
              </p>
            </div>
          }
          art={
            <BlobArt
              src="/parent-hero.webp"
              alt={t("heroAlt")}
              width={1213}
              height={1541}
              className="lg:mx-auto lg:w-[71.5%]"
              blobClassName="-left-[8%] top-[3.9%] h-[80%] w-[114%]"
            />
          }
        />

        <InitiativeQuote
          cta={
            <div className={cn(ctaShell, "mt-10 lg:mx-auto lg:mt-15")}>
              {applyCta}
            </div>
          }
        >
          {t.rich("quote", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </InitiativeQuote>

        <Initiatives campaigns={campaigns} settings={settings} />

        <InitiativeSplit
          image="/parent-no-initiative.webp"
          imageAlt={t("noInitiative.imageAlt")}
          imageWidth={1720}
          imageHeight={1377}
          label={t("noInitiative.label")}
          title={t("noInitiative.title")}
        >
          <p className="text-muted-foreground text-xl leading-7 font-semibold tracking-[-0.03em] lg:text-[26px] lg:leading-[30px]">
            {t.rich("noInitiative.lead", {
              b: (chunks) => <b className="text-foreground">{chunks}</b>,
              faint: (chunks) => (
                <span className="text-muted-faint">{chunks}</span>
              ),
            })}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("noInitiative.body")}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("noInitiative.watch")}
          </p>
          <p className="text-muted-foreground text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
            {t("noInitiative.publish")}
          </p>
        </InitiativeSplit>

        <InitiativeSteps
          label={t("steps.label")}
          title={t("steps.title")}
          subtitle={t("steps.subtitle")}
          steps={steps}
          tone="cream-soft"
        />

        {/* NOT in the design, and kept anyway: this is the sentence a family
            consents on the basis of, and the three-tier exposure model in
            CLAUDE.md says the copy and the behaviour move together. Dropping
            it would leave the promise stated only inside the application form
            the parent reaches after deciding. */}
        <section className={cn(SITE_CONTAINER, "pb-15 lg:pb-25")}>
          <div className="bg-cream-soft mx-auto max-w-[691px] rounded-3xl px-5 py-6 lg:px-8 lg:py-8">
            <h2 className="text-lg leading-[30px] font-semibold tracking-[-0.03em] lg:text-2xl">
              {tParent("privacyCard.title")}
            </h2>
            <p className="text-muted-foreground mt-4.5 text-base leading-[22px] tracking-[-0.03em] lg:text-lg">
              {tParent("privacyCard.body")}
            </p>
          </div>
        </section>

        <InitiativeQuote
          cta={
            <div className={cn(ctaShell, "mt-10 lg:mx-auto lg:mt-15")}>
              {applyCta}
            </div>
          }
        >
          {t.rich("closing", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </InitiativeQuote>

        <Gallery />
      </main>

      <SiteFooter />
    </>
  );
}
