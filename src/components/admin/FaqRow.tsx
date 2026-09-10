import { getTranslations } from "next-intl/server";
import Link from "next/link";

import type { AdminFaq } from "@/features/faqs/adminQueries";

import { moveFaqAction } from "@/app/admin/faqs/actions";

const ACTION =
  "border-border hover:bg-surface-muted focus-visible:outline-ring rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const STATUS_TONE: Record<AdminFaq["status"], string> = {
  active: "bg-primary/10 text-primary border-primary/30",
  inactive: "bg-surface-muted text-muted-foreground border-border",
};

// One FAQ entry with its actions.
//
// Reordering is two buttons posting a server action, not drag-and-drop: the
// list is a handful of rows, and native buttons are keyboard- and
// screen-reader-operable with nothing to reimplement. The button at each end of
// the list is `disabled` rather than hidden, so the control doesn't move under
// the pointer as rows shuffle.
//
// Deleting confirms first (?confirm=delete&id=… → the page renders the modal),
// which needs no client JavaScript.
//
// Every per-row control carries an aria-label naming WHICH entry it acts on.
// The visible text is «Вгору» / «Редагувати» on every row, so without it a
// screen-reader user gets a list of identical controls and no way to tell them
// apart.
export async function FaqRow({
  faq,
  isFirst,
  isLast,
}: {
  faq: AdminFaq;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = await getTranslations("admin.faqs");

  return (
    <li className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-semibold">{faq.title}</h2>
        {/* Status by text, not colour alone. */}
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[faq.status]}`}
        >
          {t(`status.${faq.status}`)}
        </span>
      </div>

      <p className="text-body text-sm whitespace-pre-wrap">{faq.description}</p>

      <div className="flex flex-wrap items-center gap-2">
        <form action={moveFaqAction.bind(null, faq.id, "up")}>
          <button
            type="submit"
            disabled={isFirst}
            aria-label={t("moveUpFor", { title: faq.title })}
            className={`${ACTION} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {t("moveUp")}
          </button>
        </form>
        <form action={moveFaqAction.bind(null, faq.id, "down")}>
          <button
            type="submit"
            disabled={isLast}
            aria-label={t("moveDownFor", { title: faq.title })}
            className={`${ACTION} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {t("moveDown")}
          </button>
        </form>
        <Link
          href={`/admin/faqs/${faq.id}/edit`}
          aria-label={t("editCtaFor", { title: faq.title })}
          className={ACTION}
        >
          {t("editCta")}
        </Link>
        <Link
          href={`/admin/faqs?confirm=delete&id=${faq.id}`}
          aria-label={t("deleteCtaFor", { title: faq.title })}
          className={ACTION}
        >
          {t("deleteCta")}
        </Link>
      </div>
    </li>
  );
}
