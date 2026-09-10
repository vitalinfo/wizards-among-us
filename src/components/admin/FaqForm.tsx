"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState } from "react";

import { createFaqAction, updateFaqAction } from "@/app/admin/faqs/actions";
import { SelectField } from "@/components/forms/SelectField";
import { TextAreaField } from "@/components/forms/TextAreaField";
import { TextField } from "@/components/forms/TextField";
import { FAQ_STATUSES } from "@/db/enums";
import type { AdminFaq } from "@/features/faqs/adminQueries";
import { initialFaqActionState } from "@/features/faqs/formState";

// Create and edit are the same three fields, so they're the same form.
//
// There is no position field: order is set by the move buttons on the list,
// which renumber every row. A number input here could claim a slot another row
// already holds, so "save" and "move up" would disagree about the order.
export function FaqForm({ faq }: { faq?: AdminFaq }) {
  const t = useTranslations("admin.faqs");
  const editing = faq !== undefined;

  const [state, formAction, pending] = useActionState(
    editing ? updateFaqAction.bind(null, faq.id) : createFaqAction,
    initialFaqActionState,
  );

  const error =
    state.status === "invalid" || state.status === "not_found"
      ? t(`errors.${state.status}`)
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <TextField
        id="title"
        name="title"
        label={t("fields.title")}
        hint={t("fields.titleHint")}
        defaultValue={faq?.title ?? ""}
        required
      />
      <TextAreaField
        id="description"
        name="description"
        rows={5}
        label={t("fields.description")}
        hint={t("fields.descriptionHint")}
        defaultValue={faq?.description ?? ""}
        required
      />
      <SelectField
        id="status"
        name="status"
        label={t("fields.status")}
        hint={t("fields.statusHint")}
        placeholder={t("fields.status")}
        // A new entry defaults to active: an admin filling this in wants it on
        // the page, and hiding it is the deliberate act.
        defaultValue={faq?.status ?? "active"}
        options={FAQ_STATUSES.map((status) => ({
          value: status,
          label: t(`status.${status}`),
        }))}
        required
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary-hover focus-visible:outline-ring rounded-md px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        >
          {editing ? t("save") : t("create")}
        </button>
        <Link
          href="/admin/faqs"
          className="text-primary text-sm font-semibold underline underline-offset-4"
        >
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
