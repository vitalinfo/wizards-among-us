import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { CaretDownIcon } from "@/components/icons";

const STEPS = ["open", "confirm", "return"] as const;
const NEVER = ["code", "password", "forward", "vote"] as const;

// What happens after the Telegram button, and what we never ask for. Phishing
// clones of a login page can copy this text but not the address bar, so the
// hosts are named exactly: the page teaches people to check them.
//
// A native <details>, so it works before hydration and with no JS at all, and
// the browser gives it keyboard and screen-reader semantics. Closed by
// default — it is for the cautious, and keeps the designed page as drawn.
export async function LoginSafety({
  telegramHost,
  siteHost,
}: {
  telegramHost: string;
  siteHost: string;
}) {
  const t = await getTranslations("login.safety");
  const b = (chunks: ReactNode) => (
    <b className="text-foreground font-semibold">{chunks}</b>
  );

  return (
    <details className="group border-border bg-surface w-full rounded-2xl border text-left">
      <summary className="focus-visible:outline-ring text-muted-foreground flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        {t("summary")}
        <CaretDownIcon className="size-6 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="text-muted-foreground flex flex-col gap-4 px-4 pb-4 text-base">
        <section>
          <h2 className="text-foreground mb-2 font-semibold">
            {t("stepsTitle")}
          </h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {STEPS.map((key) => (
              <li key={key}>
                {t.rich(`steps.${key}`, { telegramHost, siteHost, b })}
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="text-foreground mb-2 font-semibold">
            {t("neverTitle")}
          </h2>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {NEVER.map((key) => (
              <li key={key}>{t(`never.${key}`)}</li>
            ))}
          </ul>
          <p className="text-foreground mt-2 font-medium">{t("warning")}</p>
        </section>
      </div>
    </details>
  );
}
