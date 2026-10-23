import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SparklesArt } from "@/components/account/SparklesArt";
import { ctaVariants } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";
import { canBrowseChildren } from "@/lib/authz";
import { isUser } from "@/lib/actor";
import { signedOutRedirect } from "@/lib/auth/returnPath";
import { getSessionActor } from "@/lib/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.meta");
  return { title: t("title"), description: t("description") };
}

export const dynamic = "force-dynamic";

// «Кабінет Чарівника», from Figma 109:2 — the front page of the volunteer's
// cabinet, and what the header's account button lands a volunteer on.
//
// The role is checked here as well as in the layout. A layout is not a
// security boundary (see the note there), and the cabinet nav greys out a
// cabinet you do not hold — but greying a link is UX, so the page itself
// refuses: someone who types the URL without the role goes to the explainer
// that tells them how to get it.
export default async function VolunteerCabinetPage() {
  const actor = await getSessionActor();
  if (!isUser(actor)) {
    redirect(signedOutRedirect(actor, "/account/volunteer"));
  }
  if (!canBrowseChildren(actor)) {
    // The role is self-serve, so send them where they can opt in rather than
    // showing a dead end.
    redirect("/volunteer");
  }

  const t = await getTranslations("account.volunteer");

  return (
    // The star field spans the whole cabinet area, not the text block: the
    // design places its six stars between y=191 and y=920 of a 1080 frame,
    // which is most of the height below the header and well past the button.
    // So the wrapper takes that area and the section keeps its own rhythm.
    <div className="relative isolate h-full overflow-hidden">
      <SparklesArt />

      <section className="flex min-h-[60vh] flex-col items-center justify-center py-12 text-center lg:py-20">
        {/* 106, not the 100 a canvas measurement suggested: canvas measureText
            over-predicts the rendered ink by its side bearings, and at 100 both
            drawn lines came out 34px narrow. Scaled to the widths the browser
            actually paints — 616 and 534 — which is what the design was measured
            from. The cap ends line one at «частиною», as drawn.
            50 on a phone is the same heading scaled by the design's own ratio
            (its mobile line one is 295 of the desktop's 616), not a smaller
            setting — which is also what puts the break back at «частиною»: at 40
            the third word still fitted. */}
        <h1 className="font-display max-w-[334px] text-[50px] leading-[44px] font-bold tracking-[-0.06em] lg:max-w-[700px] lg:text-[min(5.52vw,106px)] lg:leading-[min(4.84vw,93px)]">
          {t.rich("title", {
            em: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
        </h1>

        {/* 14/18 on a phone against 16/22 from lg, and no cap of its own below
            lg: the design runs this paragraph to the gutter on both sides (320
            of its 360 frame) and lands it on three lines. Capped at 334 like the
            heading it took four. */}
        <p className="text-muted-foreground mt-6 text-sm leading-[18px] tracking-[-0.03em] lg:max-w-[670px] lg:text-base lg:leading-[22px]">
          {t("body")}
        </p>

        {/* 64 tall at every width, which is what the design draws here — the
            shared ctaBase grows to 78 from lg, and overriding that would put two
            height utilities in one class string for Tailwind's emit order to
            settle. Colours stay shared; only the geometry is local. */}
        <Link
          href="/account/volunteer/children"
          className={cn(
            ctaVariants.primary,
            "focus-visible:outline-ring mt-8 inline-flex h-16 items-center justify-center gap-2 rounded-full px-8 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:mt-10 lg:px-14",
          )}
        >
          <span aria-hidden="true">🔍</span>
          {t("cta")}
        </Link>
      </section>
    </div>
  );
}
