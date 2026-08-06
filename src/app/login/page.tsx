import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { CheckIcon } from "@/components/icons";
import { getSessionActor } from "@/lib/auth/session";

// Session-dependent → dynamic; inherits the root noindex default.
export const dynamic = "force-dynamic";

const POINTS = ["dataPoint", "privacyPoint"] as const;

export default async function LoginPage() {
  if (await getSessionActor()) {
    redirect("/");
  }
  const t = await getTranslations("login");

  return (
    <main className="bg-surface-muted flex min-h-svh items-center justify-center p-6">
      <div className="border-border bg-surface flex w-full max-w-md flex-col gap-5 rounded-lg border p-6">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground leading-relaxed">{t("body")}</p>
        <TelegramLoginButton />
        <ul className="flex flex-col gap-2">
          {POINTS.map((key) => (
            <li key={key} className="text-body flex items-start gap-2 text-sm">
              <CheckIcon className="text-primary mt-0.5 size-4 shrink-0" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">{t("consent")}</p>
      </div>
    </main>
  );
}
