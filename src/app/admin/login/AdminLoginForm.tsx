"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { type AdminLoginState, adminLogin } from "./actions";

const INITIAL: AdminLoginState = { error: null };

export function AdminLoginForm() {
  const t = useTranslations("admin");
  const [state, formAction, pending] = useActionState(adminLogin, INITIAL);

  return (
    <form
      action={formAction}
      className="border-border bg-surface flex w-full max-w-sm flex-col gap-4 rounded-lg border p-6"
    >
      <h1 className="text-xl font-semibold">{t("login.title")}</h1>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {t("login.emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border-border rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          {t("login.passwordLabel")}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          className="border-border rounded-md border px-3 py-2"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-md px-4 py-2 font-semibold transition-colors disabled:opacity-60"
      >
        {t("login.submit")}
      </button>
    </form>
  );
}
