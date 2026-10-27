import { getTranslations } from "next-intl/server";

import type { BriefingBodyProps } from "./briefings";
import {
  Block,
  BriefingBlocks,
  BriefingTitle,
  Bullets,
  Heading,
  Lead,
  Note,
} from "./parts";

// «Святий Миколай» — what a volunteer reads before taking a child, from Figma
// 118:1806 «Погодження».
//
// Every paragraph is a message key under this campaign's own namespace; the
// blocks are hand-written rather than mapped over a list, because they are not
// a list — each one says a different kind of thing and three of them carry
// their own heading.
//
// This copy is NOT campaign-neutral and must not be reused as a default: it
// talks about a letter to Святий Миколай, a gift under the pillow and the
// morning of the 6th. A back-to-school campaign that fell through to it would
// be telling volunteers to post a letter to St Nicholas.
export async function SaintNicholasBriefing({
  giftPriceCap,
  deadline,
}: BriefingBodyProps) {
  const t = await getTranslations(
    "volunteer.claim.briefings.saint_nicholas_day",
  );

  return (
    <>
      <BriefingTitle
        title={t.rich("title", {
          em: (chunks) => <span className="text-primary">{chunks}</span>,
          // A TYPED break: «Чарівником» is on its own line in the design and no
          // measure reproduces that — the line above it is shorter than the one
          // below would be. Paired tags, because next-intl requires them.
          br: () => <br />,
        })}
        subtitle={t.rich("subtitle", {
          b: (chunks) => (
            <strong className="text-danger font-bold">{chunks}</strong>
          ),
        })}
      />

      <BriefingBlocks>
        <Block emoji="🎁">
          <Lead>
            {giftPriceCap === null
              ? t("gift.bodyNoCap")
              : t.rich("gift.body", {
                  cap: Number(giftPriceCap),
                  // The cap is the one number on this page a volunteer has to
                  // carry away, and the design sets it apart in the primary
                  // blue rather than only bolding it.
                  b: (chunks) => (
                    <strong className="text-primary font-bold">{chunks}</strong>
                  ),
                })}
          </Lead>
          <Note>
            <p>{t("gift.optionsTitle")}</p>
            <Bullets>
              <li>{t("gift.option1")}</li>
              <li>
                {t.rich("gift.option2", {
                  b: (chunks) => (
                    <strong className="font-semibold">{chunks}</strong>
                  ),
                })}
              </li>
              <li>
                {t.rich("gift.option3", {
                  b: (chunks) => (
                    <strong className="font-semibold">{chunks}</strong>
                  ),
                })}
              </li>
            </Bullets>
          </Note>
        </Block>

        <Block emoji="✨">
          <p className="font-semibold">{t("remember")}</p>
        </Block>

        {/* The one block the design centres on its disc, and the one whose two
            sentences run on without a gap — they are a single paragraph there,
            not two. */}
        <Block emoji="🍫" align="center">
          <div>
            <Lead>{t("extras.body")}</Lead>
            <Lead>
              {t.rich("extras.note", {
                b: (chunks) => (
                  <strong className="font-semibold">{chunks}</strong>
                ),
              })}
            </Lead>
          </div>
        </Block>

        <Block emoji="💌">
          <Lead>{t("contact")}</Lead>
        </Block>

        <Block emoji="📮">
          <Heading>{t("letter.title")}</Heading>
          <Note>
            <p>{t("letter.body")}</p>
          </Note>
          <Note>
            <p>{t("letter.note")}</p>
          </Note>
        </Block>

        <Block emoji="📦">
          <Heading>{t("delivery.title")}</Heading>
          <Note>
            <p>{t("delivery.body")}</p>
          </Note>
          <Note>
            <p>{t("delivery.optionsTitle")}</p>
            <Bullets>
              <li>{t("delivery.option1")}</li>
              <li>{t("delivery.option2")}</li>
              <li>{t("delivery.option3")}</li>
            </Bullets>
          </Note>
        </Block>

        <Block emoji="❤️">
          <Lead>{t("agree")}</Lead>
        </Block>

        <Block emoji="🚚">
          <Lead>{t("shipping")}</Lead>
        </Block>

        {deadline ? (
          <Block emoji="⏰">
            <Heading className="text-danger">{t("deadline.label")}</Heading>
            <Note>
              <p>
                {t.rich("deadline.body", {
                  date: deadline,
                  b: (chunks) => (
                    <strong className="font-bold">{chunks}</strong>
                  ),
                })}
              </p>
            </Note>
            <Note>
              <p>
                {t.rich("deadline.why", {
                  b: (chunks) => (
                    <strong className="font-semibold">{chunks}</strong>
                  ),
                })}
              </p>
            </Note>
          </Block>
        ) : null}

        {/* Two lines of one paragraph again, so no gap between them — and the
            thanks stays in the foreground colour rather than dropping to the
            muted one the explanatory blocks use. */}
        <Block emoji="✨">
          <div>
            <p className="font-semibold">{t("thanks.title")}</p>
            <p className="font-normal">{t("thanks.body")}</p>
          </div>
        </Block>
      </BriefingBlocks>
    </>
  );
}
