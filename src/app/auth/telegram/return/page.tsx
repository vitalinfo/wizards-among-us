import { useTranslations } from "next-intl";

import { BrandMark } from "@/components/site/BrandMark";
import { TELEGRAM_RETURN_SCRIPT } from "@/lib/auth/telegramReturnScript";

// Where Telegram sends a person back after they accept the login. It says one
// thing — that we are signing them in — while the inline script forwards the
// login data to /auth/telegram. No login button here: on /login, the page this
// replaced, people tapped it again while waiting and started over.
//
// Inherits the root noindex default.
export default function TelegramReturnPage() {
  const t = useTranslations("login");

  return (
    <main className="bg-surface flex flex-1 flex-col items-center justify-center gap-8 px-5 py-16 text-center">
      <BrandMark className="h-[70px] w-auto" />
      <div role="status" className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="border-primary size-6 shrink-0 rounded-full border-[3px] border-t-transparent motion-safe:animate-spin"
        />
        <h1 className="text-xl font-semibold">{t("returning")}</h1>
      </div>
      {/* After the markup, so the status is already on screen while the
          browser leaves for /auth/telegram. */}
      <script dangerouslySetInnerHTML={{ __html: TELEGRAM_RETURN_SCRIPT }} />
    </main>
  );
}
