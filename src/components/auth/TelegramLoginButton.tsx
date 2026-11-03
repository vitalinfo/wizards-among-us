import { useTranslations } from "next-intl";

import { TelegramIcon } from "@/components/icons";
import { ctaBase, ctaVariants } from "@/components/ui/ctaStyles";
import { cn } from "@/lib/utils";

// A plain link to Telegram's auth page, which returns to /login with the
// result in the fragment (see lib/auth/telegramLogin.ts for why this replaced
// Telegram's Login Widget). A plain <a>, not next/link: it leaves the site.
export function TelegramLoginButton({ href }: { href: string | null }) {
  const t = useTranslations("login");

  if (!href) {
    return null;
  }
  return (
    <a href={href} className={cn(ctaBase, ctaVariants.primary, "gap-3")}>
      <TelegramIcon className="size-6" />
      {t("cta")}
    </a>
  );
}
