import { useTranslations } from "next-intl";

import { TelegramIcon } from "@/components/icons";
import { ctaBase, ctaVariants } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";

// A plain link to /auth/telegram/start, which sends the browser on to
// Telegram's auth page (see lib/auth/telegramLogin.ts for why this replaced
// Telegram's Login Widget). A plain <a>, not next/link: it leaves the site.
export function TelegramLoginButton({ href }: { href: string | null }) {
  const t = useTranslations("login");

  if (!href) {
    return null;
  }
  return (
    <a href={href} className={cn(ctaBase, ctaVariants.primary, "gap-3")}>
      <TelegramIcon className="size-6" />
      {/* One span: inside the flex row, a bare text node and the <b> would be
          separate items, with the gap between them. */}
      <span>
        {t.rich("cta", {
          b: (chunks) => <b className="font-semibold">{chunks}</b>,
        })}
      </span>
    </a>
  );
}
